// Batch "nearby places" for published parks on the LOCAL loopback database only.
// Usage (keys are loaded by the wrapper and never printed):
//   PORTAL_LOCAL_ADMIN_URL=postgres://owner:***@127.0.0.1:54329/vsip \
//   node scripts/geo/with-goong-env.mjs npx tsx scripts/geo/nearby-batch.ts [--dry-run] [--workspace catalogue] [--only id1,id2] [--out file.json]
// Writes places into payload + published_payload of the catalogue, internal and demo-template workspaces
// (revision+1, content_versions row) and mirrors the public projection (publishedBundle) into public_catalogue.
import pg from 'pg';
import {loadEnvFile} from 'node:process';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {findNearbyDetailed,newGeoCache} from '../../server/geo';
import {publishedBundle} from '../../src/contentRepository';
import {NEARBY_CATEGORIES} from '../../src/geoPlaces';
import {parks as seedParks} from '../../src/data';

const argv=process.argv.slice(2);
const flag=(n:string)=>argv.includes('--'+n),opt=(n:string,d='')=>{const i=argv.indexOf('--'+n);return i>=0?argv[i+1]:d};
// --coordinates-from-seed: also replace each park's coordinates with the seed value in src/data.ts (used to fix demo parks).
const fromSeed=flag('coordinates-from-seed'),seedCoords=new Map(seedParks.map(p=>[p.id,p.coordinates]));
const dryRun=flag('dry-run'),source=opt('workspace','catalogue'),only=opt('only')?opt('only').split(','):null;
const outFile=opt('out',dryRun?'outputs/idea-roadmap-2026-11-26/phase2/nearby-summary-dryrun.json':'outputs/idea-roadmap-2026-11-26/phase2/nearby-summary.json');
// --neon: explicit opt-in for the Neon VSIP database, loaded like the db:* scripts (DB_ENV_FILE, default .env.neon.dev;
// production: DB_ENV_FILE=.env.neon.production). Without it only a loopback database is accepted.
const neon=flag('neon');
if(neon){try{loadEnvFile(process.env.DB_ENV_FILE||'.env.neon.dev')}catch{}}
const adminUrl=neon?(()=>{const raw=process.env.DATABASE_URL_UNPOOLED;if(!raw)throw new Error('DATABASE_URL_UNPOOLED is required (DB_ENV_FILE)');const u=new URL(raw);if(u.hostname.includes('-pooler')||!u.hostname.endsWith('.neon.tech')||u.pathname!=='/vsip')throw new Error('Expected a direct connection to the Neon VSIP database');u.searchParams.set('sslmode','verify-full');return u.toString()})():process.env.PORTAL_LOCAL_ADMIN_URL;
if(!adminUrl)throw new Error('PORTAL_LOCAL_ADMIN_URL is required');
if(!neon&&!['127.0.0.1','localhost','::1'].includes(new URL(adminUrl).hostname))throw new Error('Refusing non-loopback database host');
console.log(neon?`Target: Neon (${process.env.DB_ENV_FILE||'.env.neon.dev'})`:'Target: local loopback database');
const maxFail=Number(opt('max-consecutive-failures','3'));
const TARGETS=['catalogue','internal','demo-template'];
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
// A pool, not one long-lived client: Neon closes idle connections while the Goong lookups run for minutes.
const db=new pg.Pool({connectionString:adminUrl,max:2,idleTimeoutMillis:10000});db.on('error',()=>{});
const summary:any={generatedAt:new Date().toISOString(),dryRun,sourceWorkspace:source,parks:[],totals:{}};
try{
 const rows=(await db.query(`SELECT id,published_payload FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' AND published_payload IS NOT NULL AND published_payload->>'publicationStatus'='published' ORDER BY id`,[source])).rows.filter(r=>!only||only.includes(r.id));
 console.log(`${rows.length} published parks in workspace ${source}${dryRun?' (dry run, nothing is written)':''}`);
 let first=true,consecutive=0;const cache=newGeoCache();
 for(const r of rows){
  if(consecutive>=maxFail){summary.parks.push({id:r.id,name:r.published_payload.name?.vi,status:'skipped',error:'aborted after '+consecutive+' consecutive Goong failures'});continue}
  if(!first)await sleep(3000);first=false;
  const seed=fromSeed?seedCoords.get(r.id):undefined;const p=seed?{...r.published_payload,coordinates:seed}:r.published_payload,entry:any={id:r.id,name:p.name?.vi,coordinates:p.coordinates,status:'failed'};summary.parks.push(entry);
  try{
   if(!p.coordinates)throw new Error('no_coordinates');
   const {places,warnings}=await findNearbyDetailed({id:r.id,province:p.province,coordinates:p.coordinates,name:p.name},{log:m=>console.log("  "+m),cache});
   entry.counts=Object.fromEntries(NEARBY_CATEGORIES.map(c=>[c,places.filter(x=>x.category===c).length]));entry.total=places.length;entry.warnings=warnings;
   entry.withDriving=places.filter(x=>x.drivingKm!=null).length;entry.routes=places.filter(x=>x.route).map(x=>x.category);
   entry.nearest=Object.fromEntries(NEARBY_CATEGORIES.map(c=>{const x=places.filter(y=>y.category===c).sort((a,b)=>(a.drivingKm??a.straightKm)-(b.drivingKm??b.straightKm))[0];return [c,x?{name:x.name.vi,drivingKm:x.drivingKm,drivingMinutes:x.drivingMinutes,straightKm:x.straightKm}:null]}));
   if(!dryRun){
    const c=await db.connect();c.on('error',()=>{});
    try{
    await c.query('BEGIN');
    await c.query("SELECT pg_advisory_xact_lock(hashtext('vsip-public-catalogue'))");
    let publicPlaces:unknown;
    for(const ws of TARGETS){
     const row=(await c.query(`SELECT revision,state,payload,published_payload FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' AND id=$2 FOR UPDATE`,[ws,r.id])).rows[0];
     if(!row)continue;
     const extra=seed?{coordinates:seed}:{},payload={...row.payload,...extra,places},published=row.published_payload?{...row.published_payload,...extra,places}:null,revision=row.revision+1;
     await c.query(`UPDATE vsip.content_items SET payload=$4,published_payload=$5,revision=$6,updated_at=now(),updated_by='Geo batch' WHERE workspace_id=$1 AND kind='park' AND id=$2 AND revision=$3`,[ws,r.id,row.revision,JSON.stringify(payload),published?JSON.stringify(published):null,revision]);
     await c.query(`INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,'park',$2,$3,$4,$5,'Geo batch') ON CONFLICT DO NOTHING`,[ws,r.id,revision,row.state,JSON.stringify(payload)]);
     if(ws==='internal'&&published)publicPlaces=(publishedBundle([{id:r.id,kind:'park',data:payload,published,state:row.state,revision}] as any).parks[0] as any)?.places;
    }
    if(publicPlaces)await c.query(`UPDATE vsip.public_catalogue SET payload=jsonb_set(payload,'{places}',$2::jsonb,true),revision=revision+1 WHERE kind='park' AND id=$1`,[r.id,JSON.stringify(publicPlaces)]);
    if(seed)await c.query(`UPDATE vsip.public_catalogue SET payload=jsonb_set(payload,'{coordinates}',$2::jsonb,true) WHERE kind='park' AND id=$1`,[r.id,JSON.stringify(seed)]);
    await c.query('COMMIT');
    }catch(e){await c.query('ROLLBACK').catch(()=>{});throw e}finally{c.release()}
   }
   entry.status='ok';consecutive=0;
   console.log(`OK   ${r.id}: ${entry.total} places (${NEARBY_CATEGORIES.map(c=>c[0]+c.slice(1,3)+'='+entry.counts[c]).join(' ')})${warnings.length?' warnings='+warnings.join(','):''}`);
  }catch(e:any){
   if((e as any)?.code==='goong_failed')consecutive++;else consecutive=0;
   entry.error=e instanceof Error?e.message+((e as any).detail?' ('+(e as any).detail+')':''):'error';console.log(`FAIL ${r.id}: ${entry.error}`);
  }
 }
 summary.totals={parks:rows.length,ok:summary.parks.filter((x:any)=>x.status==='ok').length,failed:summary.parks.filter((x:any)=>x.status!=='ok').length,perCategory:Object.fromEntries(NEARBY_CATEGORIES.map(c=>[c,summary.parks.reduce((n:number,x:any)=>n+(x.counts?.[c]||0),0)]))};
}finally{await db.end()}
await mkdir(dirname(outFile),{recursive:true});await writeFile(outFile,JSON.stringify(summary,null,1));
console.log('Summary written to',outFile,JSON.stringify(summary.totals));
