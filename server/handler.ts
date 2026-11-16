import {validateLeasingRequest} from '../src/requestSchema';
import type {VercelRequest,VercelResponse} from '@vercel/node';
import {pool,tx,ApiError} from './db';
import {cookie,hash,newToken,setCookie,session,csrf,limited,validAdminKey} from './security';
import {state,persist} from './repository';
import {executeCommand} from '../src/admin/commands';
import {publishedBundle,parseContentSnapshot} from '../src/contentRepository';
import {answer} from './ai';
import {validEmail,validPhone} from '../src/admin/model';
export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  csrf(req);const path='/api/'+String(req.query.route||new URL(req.url!,'http://localhost').pathname.replace(/^\/api\//,''));const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(JSON.stringify(body).length>3_000_000)throw new ApiError(413,'size');
  if(path==='/api/catalogue'&&req.method==='GET'){const rows=(await pool.query('SELECT kind,payload FROM vsip.public_catalogue ORDER BY kind,id')).rows;return res.json({parks:rows.filter(r=>r.kind==='park').map(r=>r.payload),assets:rows.filter(r=>r.kind==='asset').map(r=>r.payload)})}
  if(path==='/api/session'&&req.method==='POST'){
   let token=cookie(req),scope='demo';
   if(body.internal){await limited(req,'login',5,900);if(!validAdminKey(body.accessToken))throw new ApiError(401,'credentials');token=newToken();scope='internal'}else {try{const s=await session(req);return res.json({scope:s.scope})}catch{await limited(req,'session',20,3600);token=newToken()}}
   await pool.query('SELECT vsip.cleanup_expired()');await tx(async c=>{await c.query('SELECT vsip.open_session($1,$2)',[hash(token),scope])});setCookie(res,token);return res.json({scope});
  }
  const s=await session(req);
  if(path==='/api/session/logout'&&req.method==='POST'){await pool.query('SELECT vsip.close_session($1)',[s.tokenHash]);res.setHeader('Set-Cookie','vsip_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(process.env.NODE_ENV==='production'?'; Secure':''));return res.json({ok:true})}
  if(path==='/api/admin/state'&&req.method==='GET')return res.json({...await tx(c=>state(c,s.workspace_id)),revision:s.revision,scope:s.scope});
  if(path==='/api/admin/command'&&req.method==='POST'){
   await limited(req,'write',120,3600);if(!Array.isArray(body.args)||!Number.isInteger(body.revision))throw new ApiError(400,'validation');
   const out=await tx(async c=>{
    const revision=(await c.query('SELECT vsip.bump_revision($1,$2) AS revision',[s.tokenHash,body.revision])).rows[0].revision;
    const old=await state(c,s.workspace_id);
    if(body.action==='save'){const data=body.args[0];parseContentSnapshot(JSON.stringify({version:1,revision:1,audit:[],batches:[],drafts:[{id:data?.id,kind:'slug'in(data||{})?'park':'asset',data,revision:1,state:'draft'}]}))}
    const changed=executeCommand(old.store,old.requests,body.action,body.args);
    if(!changed.result.ok)throw new ApiError(400,changed.result.error||'validation');
    await persist(c,s.workspace_id,old.store,changed.store,changed.requests);
    if(s.scope==='internal'&&body.action==='workflow'&&['publish','withdraw'].includes(body.args[2]))await c.query('SELECT vsip.publish_catalogue($1,$2)',[s.tokenHash,JSON.stringify(publishedBundle(changed.store.drafts))]);
    return {result:changed.result,...await state(c,s.workspace_id),revision,scope:s.scope};
   });return res.json(out);
  }
  if(path==='/api/admin/reset'&&req.method==='POST'){await limited(req,'reset',5,3600);if(s.scope!=='demo')throw new ApiError(403,'permission');const token=newToken();await tx(c=>c.query("SELECT vsip.open_session($1,'demo')",[hash(token)]));setCookie(res,token);return res.json({ok:true})}
  if(path==='/api/requests'&&req.method==='GET'){const rows=await pool.query('SELECT vsip.own_enquiries($1) AS request',[s.tokenHash]);return res.json(rows.rows.map(r=>r.request))}
  if(path==='/api/requests'&&req.method==='POST'){
   await limited(req,'enquiry',20,3600);const r=body;
   const rows=(await pool.query('SELECT kind,payload FROM vsip.public_catalogue')).rows;
   const fields=validateLeasingRequest(r,rows.filter(x=>x.kind==='park').map(x=>x.payload),rows.filter(x=>x.kind==='asset').map(x=>x.payload));
   if(Object.keys(fields).length)return res.status(400).json({error:'validation',fields});
   if(typeof r.idempotencyKey!=='string'||!/^[-a-zA-Z0-9]{16,80}$/.test(r.idempotencyKey))throw new ApiError(400,'validation');
   const input=Object.fromEntries(['kind','organization','contactName','email','phone','service','assetType','industrialParkName','location','areaMin','areaMax','transaction','budgetOrPrice','budget','industry','availabilityDate','dateUnknown','requirements','parkId','assetId','consent'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]]));
   input.entrySource=r.entrySource==='ai_chat'?'ai_chat':'form';
   const out=await tx(async c=>(await c.query('SELECT vsip.submit_enquiry($1,$2,$3) AS request',[s.tokenHash,r.idempotencyKey,JSON.stringify(input)])).rows[0].request);
   return res.json(out);
  }
  if((path==='/api/ai/public'||path==='/api/ai/admin')&&req.method==='POST'){await limited(req,'ai',30,3600);return res.json(await answer(path.endsWith('/admin')?'admin':'public',s,body))}
  throw new ApiError(404,'not_found');
 }catch(e){const code=e instanceof ApiError?e.code:e instanceof Error&&['stale','idempotency_conflict'].includes(e.message)?e.message:'server';const status=e instanceof ApiError?e.status:['stale','idempotency_conflict'].includes(code)?409:500;console.error('VSIP API error',code);return res.status(status).json({error:code})}
}
