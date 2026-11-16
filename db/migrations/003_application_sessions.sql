ALTER TABLE vsip.workspaces ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);
CREATE TABLE vsip.rate_limits (key text PRIMARY KEY, hits integer NOT NULL DEFAULT 0, expires_at timestamptz NOT NULL);
CREATE OR REPLACE FUNCTION vsip.limit_request(bucket text,max_hits integer,window_seconds integer) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
DECLARE n integer; BEGIN
 INSERT INTO vsip.rate_limits(key,hits,expires_at) VALUES(bucket,1,now()+make_interval(secs=>window_seconds))
 ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.hits+1 END,
 expires_at=CASE WHEN rate_limits.expires_at<now() THEN now()+make_interval(secs=>window_seconds) ELSE rate_limits.expires_at END RETURNING hits INTO n;
 RETURN n<=max_hits;
END $$;
CREATE OR REPLACE FUNCTION vsip.open_session(token text,mode text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
DECLARE w text; source text; BEGIN
 IF mode NOT IN ('demo','internal') OR length(token)<>64 THEN RAISE EXCEPTION 'invalid session'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vsip-session-'||token));
 SELECT workspace_id INTO w FROM vsip.workspace_sessions WHERE token_hash=token AND expires_at>now() AND scope=mode;
 IF w IS NOT NULL THEN RETURN w; END IF;
 w:=CASE WHEN mode='internal' THEN 'internal' ELSE 'demo-'||gen_random_uuid()::text END;
 source:=CASE WHEN mode='internal' THEN 'catalogue' ELSE 'demo-template' END;
 INSERT INTO vsip.workspaces(id,kind,name,expires_at) VALUES(w,mode,'VSIP '||mode,CASE WHEN mode='demo' THEN now()+interval '30 days' END) ON CONFLICT DO NOTHING;
 INSERT INTO vsip.content_items(workspace_id,kind,id,park_id,slug,revision,state,payload,published_payload,updated_at,updated_by)
 SELECT w,kind,id,park_id,slug,revision,state,payload,published_payload,updated_at,updated_by FROM vsip.content_items WHERE workspace_id=source ON CONFLICT DO NOTHING;
 INSERT INTO vsip.workspace_config(workspace_id,key,value,revision) SELECT w,key,value,revision FROM vsip.workspace_config WHERE workspace_id=source ON CONFLICT DO NOTHING;
 IF mode='demo' THEN
 INSERT INTO vsip.customers(workspace_id,id,organization,contact_name,email,phone,is_demo) SELECT w,id,organization,contact_name,email,phone,true FROM vsip.customers WHERE workspace_id=source ON CONFLICT DO NOTHING;
 INSERT INTO vsip.leasing_requests(workspace_id,id,customer_id,status,request_kind,area_min_m2,area_max_m2,payload,revision,submitted_at) SELECT w,id,customer_id,status,request_kind,area_min_m2,area_max_m2,payload,revision,submitted_at FROM vsip.leasing_requests WHERE workspace_id=source ON CONFLICT DO NOTHING;
 END IF;
 INSERT INTO vsip.workspace_sessions(token_hash,workspace_id,scope,expires_at) VALUES(token,w,mode,now()+interval '30 days') ON CONFLICT(token_hash) DO UPDATE SET workspace_id=w,scope=mode,expires_at=excluded.expires_at;
 RETURN w;
END $$;
CREATE OR REPLACE FUNCTION vsip.session_info(token text) RETURNS TABLE(workspace_id text,scope text,revision integer)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
 SELECT s.workspace_id,s.scope,w.revision FROM vsip.workspace_sessions s JOIN vsip.workspaces w ON w.id=s.workspace_id WHERE s.token_hash=token AND s.expires_at>now();
$$;
CREATE OR REPLACE FUNCTION vsip.bump_revision(token text,expected integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
DECLARE rev integer; BEGIN
 UPDATE vsip.workspaces w SET revision=w.revision+1 FROM vsip.workspace_sessions s WHERE s.workspace_id=w.id AND s.token_hash=token AND s.expires_at>now() AND w.revision=expected RETURNING w.revision INTO rev;
 IF rev IS NULL THEN RAISE EXCEPTION 'stale'; END IF; RETURN rev;
END $$;
CREATE OR REPLACE FUNCTION vsip.publish_catalogue(token text,bundle jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM vsip.workspace_sessions WHERE token_hash=token AND scope='internal' AND expires_at>now()) THEN RAISE EXCEPTION 'permission'; END IF;
 DELETE FROM vsip.public_catalogue;
 INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) SELECT 'park',p->>'id',NULL,p,1 FROM jsonb_array_elements(bundle->'parks') p;
 INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) SELECT 'asset',a->>'id',a->>'parkId',a,1 FROM jsonb_array_elements(bundle->'assets') a;
END $$;
REVOKE ALL ON FUNCTION vsip.limit_request(text,integer,integer),vsip.open_session(text,text),vsip.session_info(text),vsip.bump_revision(text,integer),vsip.publish_catalogue(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vsip.limit_request(text,integer,integer),vsip.open_session(text,text),vsip.session_info(text),vsip.bump_revision(text,integer),vsip.publish_catalogue(text,jsonb) TO vsip_runtime;
