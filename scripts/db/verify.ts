import assert from 'node:assert/strict';
import {deploymentInventory,publishedBundle} from '../../src/contentRepository';
import {initialAdmin} from '../../src/admin/model';
import {initialRequests} from '../../src/requestFixtures';
import {client,run} from './connection';
const canonical=(v:unknown)=>JSON.parse(JSON.stringify(v,(key,value)=>key==='_rowId'?undefined:value));
const inventory=deploymentInventory(),admin=initialAdmin(inventory.parks,inventory.assets),published=publishedBundle(admin.drafts);
await run(async()=>{
 const rows=(await client.query("SELECT kind,id,payload,published_payload FROM vsip.content_items WHERE workspace_id='catalogue'")).rows;
 assert.equal(rows.length,admin.drafts.length);
 for(const draft of admin.drafts){const row=rows.find(r=>r.kind===draft.kind&&r.id===draft.id);assert(row);assert.deepEqual(canonical(row.payload),canonical(draft.data));assert.deepEqual(canonical(row.published_payload),canonical(draft.published))}
 const publicRows=(await client.query('SELECT kind,id,payload FROM vsip.public_catalogue')).rows;
 assert.equal(publicRows.length,published.parks.length+published.assets.length);
 for(const kind of ['park','asset'])for(const data of kind==='park'?published.parks:published.assets)assert.deepEqual(publicRows.find(r=>r.kind===kind&&r.id===data.id)?.payload,canonical(data));
 const requests=(await client.query("SELECT payload FROM vsip.leasing_requests WHERE workspace_id='demo-template' ORDER BY id")).rows;
 assert.deepEqual(requests.map(r=>r.payload),initialRequests);
 async function denied(sql:string,values:unknown[]=[]){await client.query('SAVEPOINT forbidden');let rejected=false;try{await client.query(sql,values)}catch{rejected=true}await client.query('ROLLBACK TO SAVEPOINT forbidden');assert(rejected,'Expected denial: '+sql)}
 await client.query('BEGIN');
 try{
  await client.query('SET LOCAL ROLE vsip_public');
  assert.equal((await client.query('SELECT * FROM vsip.public_catalogue')).rowCount,publicRows.length);
  await denied('SELECT * FROM vsip.customers');await denied('SELECT * FROM vsip.content_items');
  await denied("DELETE FROM vsip.public_catalogue WHERE id='does-not-exist'");
  await client.query('RESET ROLE');await client.query('SET LOCAL ROLE vsip_runtime');
  assert.equal((await client.query('SELECT * FROM vsip.content_items')).rowCount,0,'Missing workspace must see no rows');
  await client.query("SELECT set_config('app.workspace_id','demo-template',true)");
  assert.equal((await client.query('SELECT * FROM vsip.content_items')).rowCount,admin.drafts.length);
  const facts=(await client.query('SELECT * FROM vsip.asset_facts')).rows;assert.equal(facts.length,inventory.assets.length);
  for(const asset of inventory.assets){assert.equal(Number(facts.find(f=>f.id===asset.id)?.area_m2),asset.area*(asset.unit==='ha'?10000:1))}
  assert(facts.every(f=>f.workspace_id==='demo-template'));
  assert.equal((await client.query("SELECT * FROM vsip.content_items WHERE workspace_id='catalogue'")).rowCount,0);
  await denied("INSERT INTO vsip.workspace_config(workspace_id,key,value) VALUES('catalogue','forbidden','{}')");
  await denied("DELETE FROM vsip.public_catalogue WHERE id='does-not-exist'");
  const target=admin.drafts.find(d=>d.kind==='asset')!;
  assert.equal((await client.query('UPDATE vsip.content_items SET revision=revision+1 WHERE workspace_id=$1 AND kind=$2 AND id=$3 AND revision=1',['demo-template','asset',target.id])).rowCount,1);
  assert.equal((await client.query('UPDATE vsip.content_items SET revision=revision+1 WHERE workspace_id=$1 AND kind=$2 AND id=$3 AND revision=1',['demo-template','asset',target.id])).rowCount,0,'Stale update must not match');
  await denied("UPDATE vsip.content_items SET revision=0 WHERE workspace_id='demo-template'");
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  await denied("INSERT INTO vsip.content_items(workspace_id,kind,id,park_id,state,payload,updated_by) VALUES('demo-template','asset','qa-orphan','missing','draft','{\"id\":\"qa-orphan\"}','qa')");
  await client.query('ROLLBACK');
 }catch(e){await client.query('ROLLBACK');throw e}
 const catalogueCustomers=await client.query("SELECT count(*)::int AS n FROM vsip.customers WHERE workspace_id='catalogue'");assert.equal(catalogueCustomers.rows[0].n,0);
 console.log('PASS: exact fixture parity, public projection, isolated customers, public read-only access, workspace RLS, stale revisions, orphan rejection; QA writes rolled back.');
 console.log(JSON.stringify({parks:inventory.parks.length,assets:inventory.assets.length,publicRecords:publicRows.length,demoRequests:requests.length}));
});
