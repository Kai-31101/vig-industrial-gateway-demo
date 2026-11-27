import type {PoolClient} from 'pg';
import {initialAdmin,type AdminStore} from '../src/admin/model';
import {publishedBundle} from '../src/contentRepository';
import type {IndustrialRequest} from '../src/types';
import {normalizeMockContact,normalizeDemoIdentities} from '../src/mockContacts';
export async function state(c:PoolClient,w:string){
 await c.query("SELECT set_config('app.workspace_id',$1,true)",[w]);
 const items=(await c.query('SELECT kind,id,revision,state,payload,published_payload,updated_at,updated_by FROM vsip.content_items WHERE workspace_id=$1 ORDER BY kind DESC,id',[w])).rows;
 const store=initialAdmin(items.filter(r=>r.kind==='park').map(r=>normalizeMockContact(r.payload)),items.filter(r=>r.kind==='asset').map(r=>r.payload));
 store.drafts=items.map(r=>({id:r.id,kind:r.kind,revision:r.revision,state:r.state,data:normalizeMockContact(r.payload),...(r.published_payload?{published:normalizeMockContact(r.published_payload)}:{}),updatedAt:r.updated_at.toISOString(),updatedBy:r.updated_by}));
 const configs=(await c.query('SELECT key,value FROM vsip.workspace_config WHERE workspace_id=$1',[w])).rows;
 for(const r of configs){if(r.key==='adminMeta')Object.assign(store,r.value);if(r.key==='packages')store.packages=r.value}
 store.users=normalizeDemoIdentities(store.users);
 store.audit=(await c.query('SELECT id,actor,domain,target_id,action,before_data,after_data,reason,created_at FROM vsip.audit_events WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 300',[w])).rows.map(r=>({id:r.id,actor:r.actor,domain:r.domain,target:r.target_id,action:r.action,before:JSON.stringify(r.before_data),after:JSON.stringify(r.after_data),reason:r.reason,at:r.created_at.toISOString()}));
 store.batches=(await c.query('SELECT payload FROM vsip.import_batches WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 100',[w])).rows.map(r=>r.payload);
 const requests=(await c.query('SELECT payload FROM vsip.leasing_requests WHERE workspace_id=$1 ORDER BY submitted_at DESC,id',[w])).rows.map(r=>r.payload) as IndustrialRequest[];
 return {store,requests,inventory:publishedBundle(store.drafts)};
}
export async function persist(c:PoolClient,w:string,before:AdminStore,store:AdminStore,requests:IndustrialRequest[]){
 for(const d of store.drafts){if(before.drafts.find(x=>x.id===d.id)?.revision===d.revision)continue;
 const parkId=d.kind==='asset'?(d.data as any).parkId:null;
 await c.query('INSERT INTO vsip.content_items(workspace_id,kind,id,park_id,slug,revision,state,payload,published_payload,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(workspace_id,kind,id) DO UPDATE SET park_id=excluded.park_id,slug=excluded.slug,revision=excluded.revision,state=excluded.state,payload=excluded.payload,published_payload=excluded.published_payload,updated_by=excluded.updated_by,updated_at=now()',[w,d.kind,d.id,parkId,d.kind==='park'?(d.data as any).slug:null,d.revision,d.state,JSON.stringify(d.data),d.published?JSON.stringify(d.published):null,'VSIP Admin']);
 await c.query('INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',[w,d.kind,d.id,d.revision,d.state,JSON.stringify(d.data),'VSIP Admin']);
 }
 for(const a of store.audit.filter(a=>!before.audit.some(b=>b.id===a.id)))await c.query('INSERT INTO vsip.audit_events(workspace_id,id,actor,domain,target_id,action,before_data,after_data,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',[w,a.id,a.actor,a.domain,a.target,a.action,a.before||'null',a.after||'null',a.reason]);
 for(const b of store.batches)if(JSON.stringify(before.batches.find(x=>x.id===b.id))!==JSON.stringify(b))await c.query('INSERT INTO vsip.import_batches(workspace_id,id,fingerprint,state,payload) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id,id) DO UPDATE SET state=excluded.state,payload=excluded.payload',[w,b.id,b.fingerprint,b.state,JSON.stringify(b)]);
 for(const [key,value] of [['packages',store.packages],['adminMeta',{users:store.users,invites:store.invites,matrix:store.matrix,matrixRevision:store.matrixRevision}]])await c.query('INSERT INTO vsip.workspace_config(workspace_id,key,value) VALUES($1,$2,$3) ON CONFLICT(workspace_id,key) DO UPDATE SET value=excluded.value,revision=vsip.workspace_config.revision+1',[w,key,JSON.stringify(value)]);
 for(const r of requests)await c.query('UPDATE vsip.leasing_requests SET status=$3,revision=$4,payload=$5 WHERE workspace_id=$1 AND id=$2 AND revision<>$4',[w,r.id,r.status,r.revision||1,JSON.stringify(r)]);
}
