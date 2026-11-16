-- Query projections keep original multilingual JSON intact while providing
-- canonical fields for filtering and deterministic matching.
CREATE VIEW vsip.asset_facts WITH (security_invoker=true) AS
SELECT workspace_id,id,park_id,revision,state,
 payload->'name' AS name,
 payload->>'type' AS asset_type,
 payload->>'transaction' AS transaction_type,
 (payload->>'area')::numeric * CASE payload->>'unit' WHEN 'ha' THEN 10000 ELSE 1 END AS area_m2,
 nullif(payload->>'powerMva','')::numeric AS power_mva,
 nullif(payload->>'availableFrom','') AS available_from,
 payload->'pricing'->>'mode' AS price_mode,
 nullif(payload->'pricing'->>'amount','')::numeric AS price_amount,
 payload->'pricing'->>'currency' AS price_currency,
 payload->'pricing'->>'areaBasis' AS price_area_basis,
 payload->'pricing'->>'period' AS price_period,
 payload->'industries' AS industries
FROM vsip.content_items WHERE kind='asset';
CREATE VIEW vsip.park_facts WITH (security_invoker=true) AS
SELECT workspace_id,id,slug,revision,state,
 payload->'name' AS name,
 payload->>'region' AS region,
 payload->>'province' AS province,
 payload->>'status' AS operational_status,
 payload->'suitableIndustries' AS suitable_industries,
 payload->'restrictedIndustries' AS restricted_industries
FROM vsip.content_items WHERE kind='park';
GRANT SELECT ON vsip.asset_facts,vsip.park_facts TO vsip_runtime;
CREATE INDEX content_region ON vsip.content_items(workspace_id,(payload->>'region')) WHERE kind='park';
CREATE INDEX content_asset_type ON vsip.content_items(workspace_id,(payload->>'type')) WHERE kind='asset';
CREATE INDEX ai_usage_daily ON vsip.ai_usage(workspace_id,scope,created_at);
CREATE INDEX session_expiry ON vsip.workspace_sessions(expires_at);
CREATE INDEX ai_conversation_expiry ON vsip.ai_conversations(expires_at);
