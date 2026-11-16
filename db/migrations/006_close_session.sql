CREATE FUNCTION vsip.close_session(token text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
 DELETE FROM vsip.workspace_sessions WHERE token_hash=token;
$$;
REVOKE ALL ON FUNCTION vsip.close_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vsip.close_session(text) TO vsip_runtime;
