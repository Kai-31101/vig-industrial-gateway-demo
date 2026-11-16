-- VSIP PostgreSQL foundation. Application services must set the workspace
-- from a verified server session, never directly from a request body.
CREATE SCHEMA IF NOT EXISTS vsip;
REVOKE ALL ON SCHEMA vsip FROM PUBLIC;
CREATE ROLE vsip_runtime NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE ROLE vsip_public NOLOGIN NOSUPERUSER NOBYPASSRLS;
GRANT vsip_runtime, vsip_public TO CURRENT_USER;

CREATE TABLE vsip.workspaces (
 id text PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('catalogue','demo_template','demo','internal')),
 name text NOT NULL,
 expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE vsip.workspace_sessions (
 token_hash text PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 principal_id text,
 scope text NOT NULL CHECK (scope IN ('demo','internal')),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE vsip.content_items (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('park','asset')),
 id text NOT NULL,
 parent_kind text GENERATED ALWAYS AS (CASE WHEN kind='asset' THEN 'park' END) STORED,
 park_id text,
 slug text,
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 state text NOT NULL CHECK (state IN ('draft','in_review','approved','published')),
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
 published_payload jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text NOT NULL,
 PRIMARY KEY (workspace_id,kind,id),
 FOREIGN KEY (workspace_id,parent_kind,park_id) REFERENCES vsip.content_items(workspace_id,kind,id) DEFERRABLE INITIALLY DEFERRED,
 CHECK (payload->>'id'=id),
 CHECK ((kind='park' AND park_id IS NULL) OR (kind='asset' AND park_id IS NOT NULL)),
 CHECK (published_payload IS NULL OR published_payload->>'id'=id)
);
CREATE UNIQUE INDEX park_slug ON vsip.content_items(workspace_id,slug) WHERE kind='park' AND slug IS NOT NULL;
CREATE INDEX asset_parent ON vsip.content_items(workspace_id,park_id) WHERE kind='asset';
CREATE TABLE vsip.content_versions (
 workspace_id text NOT NULL,
 kind text NOT NULL,
 content_id text NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 state text NOT NULL CHECK(state IN ('draft','in_review','approved','published')),
 payload jsonb NOT NULL,
 actor text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,kind,content_id,revision),
 FOREIGN KEY(workspace_id,kind,content_id) REFERENCES vsip.content_items(workspace_id,kind,id)
);
-- Separate, allowlisted projection: no private documents, drafts, or customers.
CREATE TABLE vsip.public_catalogue (
 kind text NOT NULL CHECK(kind IN ('park','asset')),
 id text NOT NULL,
 park_id text,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND payload->>'id'=id),
 revision integer NOT NULL CHECK(revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,id)
);
CREATE INDEX public_asset_parent ON vsip.public_catalogue(park_id) WHERE kind='asset';
CREATE TABLE vsip.customers (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 id text NOT NULL,
 organization text NOT NULL,
 contact_name text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 phone text NOT NULL DEFAULT '',
 is_demo boolean NOT NULL DEFAULT true,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE vsip.leasing_requests (
 workspace_id text NOT NULL,
 id text NOT NULL,
 customer_id text NOT NULL,
 status text NOT NULL CHECK(status IN ('submitted','under_review','verified','matching','connection_scheduled','closed','rejected')),
 request_kind text NOT NULL CHECK(request_kind IN ('find_supply','find_demand')),
 area_min_m2 numeric CHECK(area_min_m2>=0),
 area_max_m2 numeric CHECK(area_max_m2>=area_min_m2),
 budget_amount numeric CHECK(budget_amount>=0),
 budget_currency text CHECK(budget_currency IN ('VND','USD')),
 budget_area_basis text CHECK(budget_area_basis IN ('m2','ha')),
 budget_period text CHECK(budget_period IN ('month','year','term')),
 payload jsonb NOT NULL CHECK(payload->>'id'=id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 submitted_at timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id,customer_id) REFERENCES vsip.customers(workspace_id,id)
);
CREATE INDEX request_reporting ON vsip.leasing_requests(workspace_id,status,submitted_at);
CREATE TABLE vsip.audit_events (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 actor text NOT NULL,
 domain text NOT NULL,
 target_id text NOT NULL,
 action text NOT NULL,
 before_data jsonb,
 after_data jsonb,
 reason text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE vsip.import_batches (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 id text NOT NULL,
 fingerprint text NOT NULL,
 state text NOT NULL CHECK(state IN ('preview','partial','complete')),
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE vsip.match_runs (
 workspace_id text NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 request_id text NOT NULL,
 rules_version text NOT NULL,
 input_revisions jsonb NOT NULL,
 results jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id,request_id) REFERENCES vsip.leasing_requests(workspace_id,id)
);
CREATE TABLE vsip.ai_conversations (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 scope text NOT NULL CHECK(scope IN ('public','admin')),
 owner_hash text NOT NULL,
 context_park_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE vsip.ai_messages (
 workspace_id text NOT NULL,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL,
 role text NOT NULL CHECK(role IN ('user','assistant')),
 content text NOT NULL CHECK(length(content)<=20000),
 citations jsonb NOT NULL DEFAULT '[]',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id),
 FOREIGN KEY(workspace_id,conversation_id) REFERENCES vsip.ai_conversations(workspace_id,id) ON DELETE CASCADE
);
CREATE TABLE vsip.ai_usage (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 id uuid NOT NULL DEFAULT gen_random_uuid(),
 scope text NOT NULL CHECK(scope IN ('public','admin')),
 model text NOT NULL,
 input_tokens integer NOT NULL DEFAULT 0 CHECK(input_tokens>=0),
 output_tokens integer NOT NULL DEFAULT 0 CHECK(output_tokens>=0),
 result text NOT NULL CHECK(result IN ('success','error','limited')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,id)
);
CREATE TABLE vsip.workspace_config (
 workspace_id text NOT NULL REFERENCES vsip.workspaces(id) ON DELETE CASCADE,
 key text NOT NULL,
 value jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 PRIMARY KEY(workspace_id,key)
);
CREATE TABLE vsip.seed_runs (
 name text PRIMARY KEY,
 checksum text NOT NULL,
 counts jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);

GRANT USAGE ON SCHEMA vsip TO vsip_public,vsip_runtime;
GRANT SELECT ON vsip.public_catalogue TO vsip_public,vsip_runtime;
-- Publishing public_catalogue and creating session workspaces require a distinct
-- server-side privileged service. Neither anonymous role can mutate them.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['content_items','content_versions','customers','leasing_requests','audit_events','import_batches','match_runs','ai_conversations','ai_messages','ai_usage','workspace_config'] LOOP
  EXECUTE format('ALTER TABLE vsip.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY workspace_isolation ON vsip.%I TO vsip_runtime USING (workspace_id = nullif(current_setting(''app.workspace_id'',true),'''')) WITH CHECK (workspace_id = nullif(current_setting(''app.workspace_id'',true),''''))',t);
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON vsip.%I TO vsip_runtime',t);
 END LOOP;
END $$;
REVOKE UPDATE,DELETE ON vsip.audit_events,vsip.content_versions FROM vsip_runtime;
