-- Park management portal (/portal). Additive only: no existing table, policy or function is altered.
-- Authority model: per-user portal identity, per-park membership, Owner-only decisions.
-- Rollback (manual, after a decision): db/rollback/007_park_portal.down.sql

CREATE TABLE vsip.portal_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254 AND position('@' in email) > 1),
 display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 120),
 password_hash text NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX portal_users_email ON vsip.portal_users(email);

CREATE TABLE vsip.portal_sessions (
 token_hash text PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid NOT NULL REFERENCES vsip.portal_users(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE INDEX portal_sessions_user ON vsip.portal_sessions(user_id);

CREATE TABLE vsip.portal_roles (
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 park_id text NOT NULL,
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
 template text CHECK (template IN ('editor','viewer')),
 capabilities text[] NOT NULL,
 deleted_at timestamptz,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (park_id, id),
 UNIQUE (id),
 -- Reserved Owner capabilities can never be stored on a role.
 CHECK (NOT capabilities && ARRAY['review.decide','publish','members.manage','roles.manage']::text[]),
 CHECK (capabilities <@ ARRAY['park.view','property.view','review.view','activity.view','members.view','profile.edit','property.edit','property.create','revision.submit','archive.request']::text[]),
 CHECK (template IS NULL OR deleted_at IS NULL)
);
CREATE UNIQUE INDEX portal_roles_name ON vsip.portal_roles(park_id, lower(name)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX portal_roles_template ON vsip.portal_roles(park_id, template) WHERE template IS NOT NULL;

CREATE TABLE vsip.portal_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 park_id text NOT NULL,
 user_id uuid NOT NULL REFERENCES vsip.portal_users(id),
 role_id uuid,
 is_owner boolean NOT NULL DEFAULT false,
 status text NOT NULL CHECK (status IN ('active','suspended','removed')),
 assigned_by text NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (park_id, user_id),
 -- A role must belong to the same park as the membership.
 FOREIGN KEY (park_id, role_id) REFERENCES vsip.portal_roles(park_id, id),
 CHECK ((is_owner AND role_id IS NULL AND status <> 'removed') OR (NOT is_owner AND (role_id IS NOT NULL OR status = 'removed')))
);
-- At most one active Owner per park.
CREATE UNIQUE INDEX portal_one_active_owner ON vsip.portal_memberships(park_id) WHERE is_owner AND status = 'active';
CREATE INDEX portal_memberships_user ON vsip.portal_memberships(user_id);

CREATE TABLE vsip.portal_owner_state (
 park_id text PRIMARY KEY,
 decisions_suspended boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vsip.portal_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 park_id text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('member','owner')),
 email text NOT NULL CHECK (email = lower(email) AND position('@' in email) > 1),
 role_id uuid,
 previous_owner_role_id uuid,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','accepted','revoked','expired','superseded')),
 expires_at timestamptz NOT NULL,
 issued_by_kind text NOT NULL CHECK (issued_by_kind IN ('owner','platform')),
 issued_by_user uuid REFERENCES vsip.portal_users(id),
 accepted_by uuid REFERENCES vsip.portal_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 FOREIGN KEY (park_id, role_id) REFERENCES vsip.portal_roles(park_id, id),
 FOREIGN KEY (park_id, previous_owner_role_id) REFERENCES vsip.portal_roles(park_id, id),
 CHECK ((kind = 'member' AND role_id IS NOT NULL AND previous_owner_role_id IS NULL AND issued_by_kind = 'owner' AND issued_by_user IS NOT NULL)
     OR (kind = 'owner' AND role_id IS NULL AND issued_by_kind = 'platform'))
);
CREATE UNIQUE INDEX portal_one_pending_owner_invite ON vsip.portal_invitations(park_id) WHERE kind = 'owner' AND state = 'pending';
CREATE UNIQUE INDEX portal_one_pending_member_invite ON vsip.portal_invitations(park_id, email) WHERE kind = 'member' AND state = 'pending';

-- Portal version counter for published snapshots (base for stale checks).
CREATE TABLE vsip.portal_entity_meta (
 entity_kind text NOT NULL CHECK (entity_kind IN ('park','asset')),
 entity_id text NOT NULL,
 park_id text NOT NULL,
 published_version integer NOT NULL DEFAULT 0 CHECK (published_version >= 0),
 published_fingerprint text NOT NULL DEFAULT '',
 archived boolean NOT NULL DEFAULT false,
 PRIMARY KEY (entity_kind, entity_id)
);

-- One working draft per entity; saves are revision-checked.
CREATE TABLE vsip.portal_drafts (
 entity_kind text NOT NULL CHECK (entity_kind IN ('park','asset')),
 entity_id text NOT NULL,
 park_id text NOT NULL,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = entity_id),
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 is_new boolean NOT NULL DEFAULT false,
 author_id uuid NOT NULL REFERENCES vsip.portal_users(id),
 rejection_reason text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (entity_kind, entity_id)
);

CREATE SEQUENCE vsip.portal_revision_number START 100;
CREATE TABLE vsip.portal_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 number bigint NOT NULL UNIQUE DEFAULT nextval('vsip.portal_revision_number'),
 park_id text NOT NULL,
 entity_kind text NOT NULL CHECK (entity_kind IN ('park','asset')),
 entity_id text NOT NULL,
 change_type text NOT NULL CHECK (change_type IN ('create','update','archive')),
 base_version integer NOT NULL CHECK (base_version >= 0),
 base_fingerprint text NOT NULL,
 before_payload jsonb,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND payload->>'id' = entity_id),
 state text NOT NULL CHECK (state IN ('in_review','approved','rejected','withdrawn','published','superseded')),
 author_id uuid NOT NULL REFERENCES vsip.portal_users(id),
 author_role text NOT NULL,
 approved_by uuid REFERENCES vsip.portal_users(id),
 approved_membership uuid REFERENCES vsip.portal_memberships(id),
 approved_at timestamptz,
 self_approved boolean NOT NULL DEFAULT false,
 decided_by uuid REFERENCES vsip.portal_users(id),
 decided_at timestamptz,
 reason text,
 published_version integer,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (entity_kind = 'asset' OR change_type = 'update'),
 CHECK (state <> 'rejected' OR length(btrim(coalesce(reason,''))) > 0)
);
CREATE UNIQUE INDEX portal_one_open_revision ON vsip.portal_revisions(entity_kind, entity_id) WHERE state IN ('in_review','approved');
CREATE INDEX portal_revisions_park ON vsip.portal_revisions(park_id, created_at DESC);

-- Revisions are immutable snapshots: only decision columns may change.
CREATE FUNCTION vsip.portal_revision_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.payload IS DISTINCT FROM OLD.payload OR NEW.base_version IS DISTINCT FROM OLD.base_version
  OR NEW.base_fingerprint IS DISTINCT FROM OLD.base_fingerprint OR NEW.change_type IS DISTINCT FROM OLD.change_type
  OR NEW.entity_id IS DISTINCT FROM OLD.entity_id OR NEW.entity_kind IS DISTINCT FROM OLD.entity_kind
  OR NEW.park_id IS DISTINCT FROM OLD.park_id OR NEW.author_id IS DISTINCT FROM OLD.author_id
  OR NEW.before_payload IS DISTINCT FROM OLD.before_payload OR NEW.number IS DISTINCT FROM OLD.number THEN
  RAISE EXCEPTION 'revision_immutable';
 END IF;
 IF OLD.state IN ('rejected','withdrawn','published','superseded') AND NEW.state IS DISTINCT FROM OLD.state THEN
  RAISE EXCEPTION 'revision_final';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER portal_revision_immutable BEFORE UPDATE ON vsip.portal_revisions FOR EACH ROW EXECUTE FUNCTION vsip.portal_revision_immutable();

CREATE TABLE vsip.portal_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 park_id text NOT NULL,
 actor_kind text NOT NULL CHECK (actor_kind IN ('user','platform')),
 actor_user uuid REFERENCES vsip.portal_users(id),
 actor_name text NOT NULL CHECK (length(btrim(actor_name)) > 0),
 actor_role text NOT NULL CHECK (length(btrim(actor_role)) > 0),
 action text NOT NULL,
 entity_kind text,
 entity_id text,
 entity_name text,
 revision_id uuid,
 version text,
 reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_audit_park ON vsip.portal_audit(park_id, created_at DESC);

CREATE TABLE vsip.portal_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES vsip.portal_users(id) ON DELETE CASCADE,
 park_id text NOT NULL,
 revision_id uuid REFERENCES vsip.portal_revisions(id),
 kind text NOT NULL,
 body text NOT NULL,
 read_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX portal_notifications_user ON vsip.portal_notifications(user_id, created_at DESC);

-- Rebuild the public projection on behalf of a portal Owner. Authority is re-checked in SQL.
CREATE FUNCTION vsip.portal_publish_catalogue(session_hash text, owner_park text, bundle jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM vsip.portal_sessions s
  JOIN vsip.portal_users u ON u.id = s.user_id AND u.status = 'active'
  JOIN vsip.portal_memberships m ON m.user_id = u.id AND m.park_id = owner_park AND m.is_owner AND m.status = 'active'
  LEFT JOIN vsip.portal_owner_state o ON o.park_id = owner_park
  WHERE s.token_hash = session_hash AND s.expires_at > now() AND NOT coalesce(o.decisions_suspended, false)
 ) THEN RAISE EXCEPTION 'permission'; END IF;
 IF jsonb_typeof(bundle->'parks') <> 'array' OR jsonb_typeof(bundle->'assets') <> 'array' THEN RAISE EXCEPTION 'validation'; END IF;
 DELETE FROM vsip.public_catalogue;
 INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) SELECT 'park',p->>'id',NULL,p,1 FROM jsonb_array_elements(bundle->'parks') p;
 INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) SELECT 'asset',a->>'id',a->>'parkId',a,1 FROM jsonb_array_elements(bundle->'assets') a;
END $$;
REVOKE ALL ON FUNCTION vsip.portal_publish_catalogue(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vsip.portal_publish_catalogue(text,text,jsonb) TO vsip_runtime;

-- Runtime grants. Portal scoping is enforced per request by the server (membership + park_id).
GRANT SELECT,INSERT,UPDATE,DELETE ON vsip.portal_users,vsip.portal_sessions,vsip.portal_roles,vsip.portal_memberships,vsip.portal_owner_state,vsip.portal_invitations,vsip.portal_entity_meta,vsip.portal_drafts,vsip.portal_notifications TO vsip_runtime;
GRANT SELECT,INSERT,UPDATE ON vsip.portal_revisions TO vsip_runtime;
GRANT SELECT,INSERT ON vsip.portal_audit TO vsip_runtime;
GRANT USAGE ON SEQUENCE vsip.portal_revision_number TO vsip_runtime;
