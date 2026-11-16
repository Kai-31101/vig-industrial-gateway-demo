import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {client,run} from './connection';
await run(async()=>{
 await client.query('BEGIN');
 try{
  await client.query("SELECT pg_advisory_xact_lock(hashtext('vsip-schema-migrations'))");
  await client.query('CREATE TABLE IF NOT EXISTS public.vsip_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of (await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort()){
   const sql=(await readFile('db/migrations/'+name,'utf8')).replace(/^\uFEFF/,'');const checksum=createHash('sha256').update(sql).digest('hex');
   const prior=await client.query('SELECT checksum FROM public.vsip_migrations WHERE name=$1',[name]);
   if(prior.rowCount){if(prior.rows[0].checksum!==checksum)throw new Error('Applied migration changed: '+name);console.log('Already applied: '+name);continue}
   await client.query(sql);await client.query('INSERT INTO public.vsip_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);console.log('Applied: '+name);
  }
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e}
});
