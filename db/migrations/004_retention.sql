-- Retain persistent demos for 30 days; prune expired isolated data in FK order.
CREATE FUNCTION vsip.cleanup_expired() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
DECLARE w text; n integer:=0; BEGIN
 DELETE FROM vsip.rate_limits WHERE expires_at<now()-interval '1 day';
 DELETE FROM vsip.ai_conversations WHERE expires_at<now();
 DELETE FROM vsip.workspace_sessions WHERE expires_at<now();
 FOR w IN SELECT id FROM vsip.workspaces WHERE kind='demo' AND expires_at<now() LIMIT 20 LOOP
 DELETE FROM vsip.match_runs WHERE workspace_id=w;
 DELETE FROM vsip.leasing_requests WHERE workspace_id=w;
 DELETE FROM vsip.content_versions WHERE workspace_id=w;
 DELETE FROM vsip.content_items WHERE workspace_id=w AND kind='asset';
 DELETE FROM vsip.content_items WHERE workspace_id=w AND kind='park';
 DELETE FROM vsip.workspaces WHERE id=w;n:=n+1;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION vsip.cleanup_expired() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vsip.cleanup_expired() TO vsip_runtime;
