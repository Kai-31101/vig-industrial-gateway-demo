// Adds the 20 demo leasing enquiries to the demo template (new demo sessions copy from it).
// Idempotent: existing ids are left untouched. Run: DB_ENV_FILE=.env.neon.production npx tsx scripts/db/seed-mock-requests.ts
import {mockLeasingRequests} from '../../src/requestMockData';
import {client,run} from './connection';
await run(async()=>{
 await client.query('BEGIN');
 try{
  let added=0;
  for(const r of mockLeasingRequests){
   const customerId='customer-'+r.id;
   await client.query('INSERT INTO vsip.customers(workspace_id,id,organization,contact_name,email,phone) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',['demo-template',customerId,r.organization,r.contactName,r.email,r.phone]);
   const res=await client.query('INSERT INTO vsip.leasing_requests(workspace_id,id,customer_id,status,request_kind,area_min_m2,area_max_m2,payload,revision,submitted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',['demo-template',r.id,customerId,r.status,r.kind,r.areaMin,r.areaMax,JSON.stringify(r),r.revision||1,r.submittedAt]);
   added+=res.rowCount||0;
  }
  await client.query('COMMIT');
  const total=await client.query("SELECT count(*)::int AS n FROM vsip.leasing_requests WHERE workspace_id='demo-template'");
  console.log(JSON.stringify({added,templateRequests:total.rows[0].n}));
 }catch(e){await client.query('ROLLBACK');throw e}
});
