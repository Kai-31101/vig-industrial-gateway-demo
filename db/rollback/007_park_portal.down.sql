-- MANUAL rollback for 007_park_portal.sql. Never run automatically.
-- Precondition: the portal routes are already undeployed (previous build redeployed).
-- Effect: removes portal identities, memberships, invitations, drafts, revisions, audit and notifications.
-- Public content already published through the portal stays in vsip.content_items / vsip.public_catalogue.
-- Take a Neon snapshot/branch first. After running, also delete the receipt row so a later re-apply is explicit:
--   DELETE FROM public.vsip_migrations WHERE name = '007_park_portal.sql';
BEGIN;
DROP FUNCTION IF EXISTS vsip.portal_publish_catalogue(text,text,jsonb);
DROP TABLE IF EXISTS vsip.portal_notifications;
DROP TABLE IF EXISTS vsip.portal_audit;
DROP TRIGGER IF EXISTS portal_revision_immutable ON vsip.portal_revisions;
DROP FUNCTION IF EXISTS vsip.portal_revision_immutable();
DROP TABLE IF EXISTS vsip.portal_revisions;
DROP SEQUENCE IF EXISTS vsip.portal_revision_number;
DROP TABLE IF EXISTS vsip.portal_drafts;
DROP TABLE IF EXISTS vsip.portal_entity_meta;
DROP TABLE IF EXISTS vsip.portal_invitations;
DROP TABLE IF EXISTS vsip.portal_owner_state;
DROP TABLE IF EXISTS vsip.portal_memberships;
DROP TABLE IF EXISTS vsip.portal_roles;
DROP TABLE IF EXISTS vsip.portal_sessions;
DROP TABLE IF EXISTS vsip.portal_users;
COMMIT;

-- Rollback for 008_park_portal_issuer_authority.sql alone (run BEFORE the 007 block if only 008 is reverted):
--   ALTER TABLE vsip.portal_invitations DROP CONSTRAINT IF EXISTS portal_platform_invite_authority;
--   ALTER TABLE vsip.portal_invitations DROP COLUMN IF EXISTS issuer_authority;
--   DELETE FROM public.vsip_migrations WHERE name = '008_park_portal_issuer_authority.sql';
