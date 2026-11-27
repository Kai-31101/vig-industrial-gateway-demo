// Local API runner for development/QA: serves server/handler.ts on 127.0.0.1:8787 (Vite proxies /api).
// Reads DATABASE_URL (and optional ADMIN_ACCESS_TOKEN / SESSION_SECRET) from PORTAL_DEV_ENV_FILE, which must
// live OUTSIDE the repository and point at a loopback database. Refuses non-loopback databases.
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const envFile=process.env.PORTAL_DEV_ENV_FILE;
if(!envFile)throw new Error('PORTAL_DEV_ENV_FILE is required');
for(const line of readFileSync(envFile,'utf8').split(/\r?\n/)){const m=/^([A-Z_]+)=(.*)$/.exec(line.trim());if(m&&!process.env[m[1]])process.env[m[1]]=m[2]}
const db=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost','::1'].includes(db.hostname))throw new Error('dev-api only runs against a loopback database');
process.env.SESSION_SECRET||=randomBytes(32).toString('hex');
process.env.NODE_ENV='development';
const {default:handler}=await import('../../server/handler');
const port=Number(process.env.PORTAL_DEV_API_PORT||8787);
http.createServer(async(req,res)=>{
 const chunks:Buffer[]=[];for await(const c of req)chunks.push(c as Buffer);
 const raw=Buffer.concat(chunks).toString('utf8');
 const url=new URL(req.url||'/','http://127.0.0.1');
 const vreq:any=Object.assign(req,{query:Object.fromEntries(url.searchParams),body:raw?(()=>{try{return JSON.parse(raw)}catch{return raw}})():undefined});
 const vres:any=Object.assign(res,{status(code:number){res.statusCode=code;return vres},json(v:unknown){if(!res.getHeader('Content-Type'))res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v));return vres}});
 try{await handler(vreq,vres)}catch{if(!res.headersSent){res.statusCode=500;res.end('{"error":"server"}')}}
}).listen(port,'127.0.0.1',()=>console.log(`VIG local API on http://127.0.0.1:${port}`));
