// Merge the NEW optional asset detail fields (lot code, zone, leasing status, water, specs, terms, gallery, ...)
// from the demo seed (src/data.ts) into assets that already exist in the database.
// Nothing else is touched, and a field that already holds a non-empty value is never overwritten (idempotent).
//
// Scope, per seed asset id:
//   - vsip.content_items in the catalogue, internal and demo-template workspaces and in visitor demo-session workspaces
//     (payload and published_payload when present): revision+1 and a content_versions row, like scripts/geo/nearby-batch.ts.
//   - vsip.public_catalogue: only the new keys of the existing public asset row are merged in (per-item update).
//     The public row is NOT rebuilt from the internal workspace: a rebuild would republish whatever the internal
//     workspace currently holds (unreviewed edits, withdrawn items) and could drop columns this script does not know about.
//     The new keys go through publishedBundle first, so the public allowlist and "approved gallery images only" still apply.
//
// Usage (prints counts only, never credentials):
//   PORTAL_LOCAL_ADMIN_URL=postgres://owner:***@127.0.0.1:54329/vsip npx tsx scripts/db/apply-asset-details.ts [--dry-run]
//   DB_ENV_FILE=.env.neon.production npx tsx scripts/db/apply-asset-details.ts --neon [--dry-run]
import pg from 'pg';
import {loadEnvFile} from 'node:process';
import {assets as seedAssets} from '../../src/data';
import {publishedBundle} from '../../src/contentRepository';
import {ASSET_DETAIL_KEYS,mergeMissingDetails,pickDetailKeys} from '../../src/assetFields';

const argv=process.argv.slice(2);
const dryRun=argv.includes('--dry-run'),neon=argv.includes('--neon');
// --neon: explicit opt-in for the Neon VSIP database, loaded like scripts/db/connection.ts (DB_ENV_FILE, default .env.neon.dev).
if(neon){try{loadEnvFile(process.env.DB_ENV_FILE||'.env.neon.dev')}catch{}}
function targetUrl():string{
 if(neon){
  const raw=process.env.DATABASE_URL_UNPOOLED;if(!raw)throw new Error('DATABASE_URL_UNPOOLED is required (DB_ENV_FILE)');
  const u=new URL(raw);if(u.hostname.includes('-pooler')||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/vsip')throw new Error('Expected a direct connection to the Neon VSIP database');
  u.searchParams.set('sslmode','verify-full');return u.toString();
 }
 const raw=process.env.PORTAL_LOCAL_ADMIN_URL;if(!raw)throw new Error('PORTAL_LOCAL_ADMIN_URL is required');
 if(!['127.0.0.1','localhost','::1'].includes(new URL(raw).hostname))throw new Error('Refusing non-loopback database host (use --neon for Neon)');
 return raw;
}
const url=targetUrl();
console.log(neon?`Target: Neon (${process.env.DB_ENV_FILE||'.env.neon.dev'})`:'Target: local loopback database',dryRun?'(dry run, nothing is written)':'');

const seed=new Map(seedAssets.map(a=>[a.id,pickDetailKeys(a)]));
const seedIds=[...seed.keys()];
const kindOf=(ws:string)=>ws==='catalogue'||ws==='internal'||ws==='demo-template'?ws:'demo-session';
const ACTOR='Asset details batch';
// A pool, not one long-lived client: Neon closes idle connections.
const db=new pg.Pool({connectionString:url,max:2,idleTimeoutMillis:10000,connectionTimeoutMillis:15000});db.on('error',()=>{});db.on('connect',cl=>{cl.on('error',()=>{})});

const totals={seedAssets:seedIds.length,workspacesScanned:0,rowsScanned:0,rowsUpdated:0,rowsUnchanged:0,fieldsFilled:0,publicRows:0,publicUpdated:0,publicUnchanged:0,failed:0};
const perWorkspaceKind:Record<string,{scanned:number;updated:number}>={};
try{
 const wsRows=(await db.query(`SELECT id FROM vsip.workspaces WHERE id IN ('catalogue','internal','demo-template') OR id LIKE 'demo-%' ORDER BY id`)).rows.map(r=>r.id as string);
 totals.workspacesScanned=wsRows.length;
 for(const id of seedIds){
  const details=seed.get(id)!;if(!Object.keys(details).length)continue;
  const c=await db.connect();
  try{
   await c.query('BEGIN');
   await c.query("SELECT pg_advisory_xact_lock(hashtext('vsip-public-catalogue'))");
   for(const ws of wsRows){
    const row=(await c.query(`SELECT revision,state,payload,published_payload FROM vsip.content_items WHERE workspace_id=$1 AND kind='asset' AND id=$2 ${dryRun?'':'FOR UPDATE'}`,[ws,id])).rows[0];
    if(!row)continue;
    const k=kindOf(ws);(perWorkspaceKind[k]??={scanned:0,updated:0}).scanned++;totals.rowsScanned++;
    const merged=mergeMissingDetails(row.payload,details),mergedPub=row.published_payload?mergeMissingDetails(row.published_payload,details):null;
    if(!merged.changed&&!mergedPub?.changed){totals.rowsUnchanged++;continue}
    totals.fieldsFilled+=merged.fields.length+(mergedPub?.fields.length||0);totals.rowsUpdated++;perWorkspaceKind[k].updated++;
    if(dryRun)continue;
    const revision=row.revision+1;
    await c.query(`UPDATE vsip.content_items SET payload=$4,published_payload=$5,revision=$6,updated_at=now(),updated_by=$7 WHERE workspace_id=$1 AND kind='asset' AND id=$2 AND revision=$3`,[ws,id,row.revision,JSON.stringify(merged.value),mergedPub?JSON.stringify(mergedPub.value):null,revision,ACTOR]);
    await c.query(`INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,'asset',$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,[ws,id,revision,row.state,JSON.stringify(merged.value),ACTOR]);
   }
   const pub=(await c.query(`SELECT payload FROM vsip.public_catalogue WHERE kind='asset' AND id=$1 ${dryRun?'':'FOR UPDATE'}`,[id])).rows[0];
   if(pub){
    totals.publicRows++;
    const parkId=String(pub.payload.parkId||'');
    // Project the new keys through the public bundle (allowlist + approved gallery images only); a stub published park satisfies its parent check.
    const stubPark={id:parkId,kind:'park',data:{},state:'published',revision:1,updatedAt:'',updatedBy:'',published:{id:parkId,publicationStatus:'published',documents:[],media:[]}};
    const projected=(publishedBundle([stubPark,{id,kind:'asset',data:{},state:'published',revision:1,updatedAt:'',updatedBy:'',published:{...pub.payload,...details}}] as any).assets[0]||{}) as Record<string,unknown>;
    const publicDetails=Object.fromEntries(ASSET_DETAIL_KEYS.filter(k=>projected[k]!==undefined).map(k=>[k,projected[k]]));
    const m=mergeMissingDetails(pub.payload,publicDetails);
    if(m.changed){
     totals.publicUpdated++;totals.fieldsFilled+=m.fields.length;
     if(!dryRun)await c.query(`UPDATE vsip.public_catalogue SET payload=$2,revision=revision+1,updated_at=now() WHERE kind='asset' AND id=$1`,[id,JSON.stringify(m.value)]);
    }else totals.publicUnchanged++;
   }
   await c.query(dryRun?'ROLLBACK':'COMMIT');
  }catch(e){
   await c.query('ROLLBACK').catch(()=>{});totals.failed++;
   console.log(`FAIL ${id}: ${e instanceof Error?e.message:'error'}`);
  }finally{c.release()}
 }
}finally{await db.end()}
console.log(JSON.stringify({dryRun,totals,perWorkspaceKind}));
if(totals.failed)process.exitCode=1;
