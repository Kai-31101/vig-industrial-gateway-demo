-- Park portal hardening (additive). Platform-issued Owner invitations are bound to the platform authority
-- that issued them: an HMAC of the current internal access code (keyed by SESSION_SECRET), never the code itself.
-- Rotating the platform access code (or SESSION_SECRET) therefore invalidates outstanding platform invitations.
ALTER TABLE vsip.portal_invitations ADD COLUMN issuer_authority text CHECK (issuer_authority IS NULL OR issuer_authority ~ '^[a-f0-9]{64}$');
ALTER TABLE vsip.portal_invitations ADD CONSTRAINT portal_platform_invite_authority CHECK (kind <> 'owner' OR issuer_authority IS NOT NULL) NOT VALID;
