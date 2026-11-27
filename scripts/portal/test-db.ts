// Isolated LOCAL test database for the park portal. Refuses any non-loopback host.
// Usage: PORTAL_LOCAL_ADMIN_URL=postgres://owner:***@127.0.0.1:54329/vsip tsx scripts/portal/test-db.ts [--reset]
// Applies db/migrations (same files + checksum receipts as production), seeds the catalogue and the
// `internal` workspace from repository fixtures, and creates a restricted runtime login (IN vsip_runtime)
// so tests exercise the same RLS/grant boundary as production. Prints no secrets.
import pg from 'pg';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import {deploymentInventory,publishedBundle} from '../../src/contentRepository';
import {initialAdmin} from '../../src/admin/model';

const adminUrl=process.env.PORTAL_LOCAL_ADMIN_URL;
if(!adminUrl)throw new Error('PORTAL_LOCAL_ADMIN_URL is required');
const u=new URL(adminUrl);
if(!['127.0.0.1','localhost','::1'].includes(u.hostname))throw new Error('Refusing non-loopback database host');
const outFile=process.env.PORTAL_LOCAL_ENV_FILE;
if(!outFile)throw new Error('PORTAL_LOCAL_ENV_FILE is required (outside the repository)');

const reset=process.argv.includes('--reset');
const root=new pg.Client({connectionString:adminUrl});
await root.connect();
try{
 if(reset){await root.query('DROP SCHEMA IF EXISTS vsip CASCADE');await root.query('DROP TABLE IF EXISTS public.vsip_migrations');for(const r of ['vsip_runtime','vsip_public']){const x=await root.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[r]);if(x.rowCount){await root.query(`DROP OWNED BY ${r}`);await root.query(`DROP ROLE ${r}`)}}}
 await root.query('BEGIN');
 await root.query("SELECT pg_advisory_xact_lock(hashtext('vsip-schema-migrations'))");
 await root.query('CREATE TABLE IF NOT EXISTS public.vsip_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort()){
  const sql=(await readFile('db/migrations/'+name,'utf8')).replace(/^﻿/,'');const checksum=createHash('sha256').update(sql).digest('hex');
  const prior=await root.query('SELECT checksum FROM public.vsip_migrations WHERE name=$1',[name]);
  if(prior.rowCount){if(prior.rows[0].checksum!==checksum)throw new Error('Applied migration changed: '+name);continue}
  await root.query(sql);await root.query('INSERT INTO public.vsip_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);console.log('Applied',name);
 }
 const seeded=await root.query("SELECT 1 FROM vsip.workspaces WHERE id='catalogue'");
 if(!seeded.rowCount){
  const inv=deploymentInventory();const admin=initialAdmin(inv.parks,inv.assets);const pub=publishedBundle(admin.drafts);
  await root.query("INSERT INTO vsip.workspaces(id,kind,name) VALUES('catalogue','catalogue','VSIP public catalogue'),('demo-template','demo_template','VSIP isolated demo template')");
  for(const w of ['catalogue','demo-template'])for(const d of admin.drafts){
   const parkId=d.kind==='asset'?(d.data as any).parkId:null;const slug=d.kind==='park'?(d.data as any).slug:null;
   await root.query('INSERT INTO vsip.content_items(workspace_id,kind,id,park_id,slug,state,payload,published_payload,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[w,d.kind,d.id,parkId,slug,d.state,JSON.stringify(d.data),d.published?JSON.stringify(d.published):null,'Local test seed']);
  }
  for(const p of pub.parks)await root.query("INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) VALUES('park',$1,NULL,$2,1)",[p.id,JSON.stringify(p)]);
  for(const a of pub.assets)await root.query("INSERT INTO vsip.public_catalogue(kind,id,park_id,payload,revision) VALUES('asset',$1,$2,$3,1)",[(a as any).id,(a as any).parkId,JSON.stringify(a)]);
  // Create the authoritative `internal` workspace exactly like the internal admin session does.
  await root.query("SELECT vsip.open_session($1,'internal')",[randomBytes(32).toString('hex')]);
  console.log('Seeded catalogue + internal workspace:',admin.drafts.length,'items;',pub.parks.length,'public parks');
 }
 await root.query('COMMIT');
 // Restricted runtime login, equivalent to production vsip_app (IN vsip_runtime, NOBYPASSRLS).
 // Keep an existing runtime password stable so running local servers keep working across resets.
 const prior=await readFile(outFile,'utf8').then(s=>/^DATABASE_URL=(.+)$/m.exec(s)?.[1]).catch(()=>undefined);
 const pw=prior?decodeURIComponent(new URL(prior).password):randomBytes(24).toString('hex');
 const exists=await root.query("SELECT 1 FROM pg_roles WHERE rolname='vsip_app_test'");
 if(!exists.rowCount)await root.query(`CREATE ROLE vsip_app_test LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${pw}'`);else if(!prior)await root.query(`ALTER ROLE vsip_app_test LOGIN PASSWORD '${pw}'`);
 await root.query('GRANT vsip_runtime TO vsip_app_test');
 await root.query('GRANT CONNECT ON DATABASE '+u.pathname.slice(1).replace(/[^a-z0-9_]/g,'')+' TO vsip_app_test');
 const runtime=new URL(adminUrl);runtime.username='vsip_app_test';runtime.password=pw;
 if(!prior)await writeFile(outFile,'DATABASE_URL='+runtime.toString()+'\n',{mode:0o600});
 console.log('Runtime test role ready (credentials kept outside the repository)');
}catch(e){await root.query('ROLLBACK').catch(()=>{});throw e}finally{await root.end()}
