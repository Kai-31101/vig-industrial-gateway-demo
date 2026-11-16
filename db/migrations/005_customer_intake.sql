CREATE TABLE vsip.intake_receipts (
 token_hash text NOT NULL,
 request_key text NOT NULL,
 request_id text NOT NULL,
 input jsonb NOT NULL,
 payload jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(token_hash,request_key), UNIQUE(token_hash,request_id)
);
REVOKE ALL ON vsip.intake_receipts FROM PUBLIC,vsip_runtime;
CREATE FUNCTION vsip.submit_enquiry(token text,request_key text,input jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
DECLARE prior vsip.intake_receipts%ROWTYPE; w text; rid text; value jsonb; BEGIN
 IF NOT EXISTS(SELECT 1 FROM vsip.workspace_sessions WHERE token_hash=token AND expires_at>now()) THEN RAISE EXCEPTION 'session'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(token||request_key));
 SELECT * INTO prior FROM vsip.intake_receipts r WHERE r.token_hash=token AND r.request_key=submit_enquiry.request_key;
 IF prior.request_id IS NOT NULL THEN
  IF prior.input<>input THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
  RETURN prior.payload;
 END IF;
 -- Initialize the internal intake workspace independently of the public demo.
 IF NOT EXISTS(SELECT 1 FROM vsip.workspaces WHERE id='internal') THEN
  w:=vsip.open_session(md5(random()::text)||md5(random()::text),'internal');
 END IF;
 rid:='VSIP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
 value:=input||jsonb_build_object('id',rid,'status','submitted','revision',1,'direction','inbound','submittedAt',now(),'assignedTo','Unassigned','activities','[]'::jsonb);
 INSERT INTO vsip.customers(workspace_id,id,organization,contact_name,email,phone,is_demo) VALUES('internal',rid,input->>'organization',input->>'contactName',input->>'email',input->>'phone',false);
 INSERT INTO vsip.leasing_requests(workspace_id,id,customer_id,status,request_kind,area_min_m2,area_max_m2,budget_amount,budget_currency,budget_area_basis,budget_period,payload,submitted_at)
 VALUES('internal',rid,rid,'submitted','find_supply',(input->>'areaMin')::numeric,(input->>'areaMax')::numeric,
 CASE WHEN input->'budget'->>'mode'='specific' THEN (input->'budget'->>'amount')::numeric END,
 input->'budget'->>'currency',CASE input->'budget'->>'areaBasis' WHEN 'm²' THEN 'm2' ELSE 'ha' END,input->'budget'->>'period',value,now());
 INSERT INTO vsip.intake_receipts(token_hash,request_key,request_id,input,payload) VALUES(token,request_key,rid,input,value);
 INSERT INTO vsip.audit_events(workspace_id,actor,domain,target_id,action,after_data) VALUES('internal','Customer','request',rid,'submitted',jsonb_build_object('source',input->>'entrySource'));
 RETURN value;
END $$;
CREATE FUNCTION vsip.own_enquiries(token text) RETURNS SETOF jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,vsip AS $$
 SELECT q.payload||jsonb_build_object('status',r.status) FROM vsip.intake_receipts q JOIN vsip.leasing_requests r ON r.workspace_id='internal' AND r.id=q.request_id
 WHERE q.token_hash=token AND EXISTS(SELECT 1 FROM vsip.workspace_sessions WHERE token_hash=token AND expires_at>now()) ORDER BY q.created_at DESC LIMIT 100;
$$;
REVOKE ALL ON FUNCTION vsip.submit_enquiry(text,text,jsonb),vsip.own_enquiries(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vsip.submit_enquiry(text,text,jsonb),vsip.own_enquiries(text) TO vsip_runtime;
