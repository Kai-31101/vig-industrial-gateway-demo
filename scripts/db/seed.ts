import {createHash} from 'node:crypto';
import {deploymentInventory,publishedBundle} from '../../src/contentRepository';
import {initialAdmin} from '../../src/admin/model';
import {initialRequests} from '../../src/requestFixtures';
import {expos} from '../../src/data';
import {client,run} from './connection';
const inventory=deploymentInventory();
const admin=initialAdmin(inventory.parks,inventory.assets);
const publicData=publishedBundle(admin.drafts);
const counts={parks:inventory.parks.length,assets:inventory.assets.length,publicParks:publicData.parks.length,publicAssets:publicData.assets.length,requests:initialRequests.length};
const checksum=createHash('sha256').update(JSON.stringify({inventory,initialRequests,expos,packages:admin.packages})).digest('hex');
await run(async()=>{
 await client.query('BEGIN');
 try{
  await client.query("SELECT pg_advisory_xact_lock(hashtext('vsip-seed'))");
  const old=await client.query("SELECT checksum FROM vsip.seed_runs WHERE name='initial-demo-v1'");
  if(old.rowCount){if(old.rows[0].checksum!==checksum)throw new Error('Seed source changed: create an explicit data migration; existing records were not overwritten');console.log('Seed already applied; no overwrite',counts);await client.query('COMMIT');return}
  for(const [id,kind,name] of [['catalogue','catalogue','VSIP public catalogue'],['demo-template','demo_template','VSIP isolated demo template']]){
   await client.query('INSERT INTO vsip.workspaces(id,kind,name) VALUES($1,$2,$3)',[id,kind,name]);
   for(const d of admin.drafts){
    const parkId=d.kind==='asset'?(d.data as {parkId:string}).parkId:null;
    const slug=d.kind==='park'?(d.data as {slug:string}).slug:null;
    await client.query('INSERT INTO vsip.content_items(workspace_id,kind,id,park_id,slug,state,payload,published_payload,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,d.kind,d.id,parkId,slug,d.state,JSON.stringify(d.data),d.published?JSON.stringify(d.published):null,'Demo seed']);
    await client.query('INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,$2,$3,1,$4,$5,$6)',[id,d.kind,d.id,d.state,JSON.stringify(d.data),'Demo seed']);
   }
   for(const [key,value] of [['packages',admin.packages],['expos',expos],['permissionMatrix',admin.matrix]])await client.query('INSERT INTO vsip.workspace_config(workspace_id,key,value) VALUES($1,$2,$3)',[id,key,JSON.stringify(value)]);
  }
  for(const kind of ['park','asset'] as const)for(const data of kind==='park'?publicData.parks:publicData.assets){await client.query('INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) VALUES($1,$2,$3,$4,1)',[kind,data.id,kind==='asset'?data.parkId:null,JSON.stringify(data)])}
  for(const r of initialRequests){
   const customerId='customer-'+r.id;
   await client.query('INSERT INTO vsip.customers(workspace_id,id,organization,contact_name,email,phone) VALUES($1,$2,$3,$4,$5,$6)',['demo-template',customerId,r.organization,r.contactName,r.email,r.phone]);
   await client.query('INSERT INTO vsip.leasing_requests(workspace_id,id,customer_id,status,request_kind,area_min_m2,area_max_m2,payload,submitted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',['demo-template',r.id,customerId,r.status,r.kind,r.areaMin,r.areaMax,JSON.stringify(r),r.submittedAt]);
  }
  await client.query('INSERT INTO vsip.seed_runs(name,checksum,counts) VALUES($1,$2,$3)',['initial-demo-v1',checksum,JSON.stringify(counts)]);
  await client.query('COMMIT');console.log('Seeded:',counts);
 }catch(e){await client.query('ROLLBACK');throw e}
});
