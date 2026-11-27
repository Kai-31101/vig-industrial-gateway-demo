// HTTP routing for the park portal. Portal routes authenticate only with the `vsip_portal` session;
// platform-admin routes require the existing internal `vsip_session` (scope 'internal'), never a portal session.
import type {VercelRequest,VercelResponse} from '@vercel/node';
import type {PoolClient} from 'pg';
import {pool,tx,ApiError} from '../db';
import {limited} from '../security';
import {clearPortalCookie,normalEmail,openSession,portalAuth,setPortalCookie,verifyPassword,tokenHashOf,readCookie,PORTAL_COOKIE} from './identity';
import * as S from './service';

type Json=Record<string,unknown>;
function fail(res:VercelResponse,e:unknown){
 if(e instanceof ApiError){const fields=(e as any).fields;return res.status(e.status).json(fields?{error:e.code,fields}:{error:e.code})}
 const code=(e as any)?.code;const msg=(e as any)?.message;
 if(code==='23505')return res.status(409).json({error:'conflict'});
 if(msg==='revision_immutable'||msg==='revision_final')return res.status(409).json({error:'state'});
 if(msg==='permission')return res.status(403).json({error:'permission'});
 console.error('VSIP portal error',code||'server');return res.status(500).json({error:'server'});
}
const GET='GET',POST='POST';
async function withAuth<T>(req:VercelRequest,work:(c:PoolClient,auth:Awaited<ReturnType<typeof portalAuth>>)=>Promise<T>){return tx(async c=>work(c,await portalAuth(c,req)))}

export async function portalApi(req:VercelRequest,res:VercelResponse,path:string,body:Json){
 const seg=path.replace(/^\/api\/portal\/?/,'').split('/').filter(Boolean);const m=req.method;
 try{
  if(seg[0]==='login'&&m===POST){
   const email=normalEmail(body.email);const password=typeof body.password==='string'?body.password:'';
   await limited(req,'portal-login',10,900);await limited(req,'portal-login-'+tokenHashOf(email).slice(0,32),8,900);
   const out=await tx(async c=>{
    const u=(await c.query(`SELECT id,password_hash,status FROM vsip.portal_users WHERE email=$1`,[email])).rows[0];
    const ok=await verifyPassword(password,u?.password_hash||null);
    if(!u||!ok||u.status!=='active')throw new ApiError(401,'credentials');
    await c.query(`DELETE FROM vsip.portal_sessions WHERE expires_at<now()`);
    return openSession(c,u.id);
   });
   setPortalCookie(res,out);return res.json({ok:true});
  }
  if(seg[0]==='logout'&&m===POST){
   const token=readCookie(req,PORTAL_COOKIE);
   if(/^[a-f0-9]{64}$/.test(token))await pool.query(`DELETE FROM vsip.portal_sessions WHERE token_hash=$1`,[tokenHashOf(token)]);
   clearPortalCookie(res);return res.json({ok:true});
  }
  if(seg[0]==='invitations'&&seg[1]==='inspect'&&m===POST){await limited(req,'portal-invite',30,900);return res.json(await tx(c=>S.inspectInvitation(c,body.token)))}
  if(seg[0]==='invitations'&&seg[1]==='accept'&&m===POST){
   await limited(req,'portal-invite',30,900);
   const out=await tx(async c=>{let auth=null;try{auth=await portalAuth(c,req)}catch{}return S.acceptInvitation(c,auth,body)});
   if(out.sessionToken)setPortalCookie(res,out.sessionToken);return res.json({parkId:out.parkId});
  }
  if(seg[0]==='me'&&m===GET)return res.json(await withAuth(req,(c,a)=>S.me(c,a)));
  if(seg[0]==='notifications'&&seg[1]==='read'&&m===POST)return res.json(await withAuth(req,(c,a)=>S.markRead(c,a,body.ids)));
  if(seg[0]==='parks'&&seg[1]){
   const parkId=seg[1],rest=seg.slice(2);
   if(m===POST)await limited(req,'portal-write',300,3600);
   // Writes serialise per park and re-derive authority AFTER the park lock (lock order: park -> catalogue -> rows).
   const run=<T>(fn:(c:PoolClient,ctx:S.Ctx)=>Promise<T>)=>withAuth(req,async(c,a)=>{if(m===POST&&/^[a-z0-9][a-z0-9-]{0,80}$/.test(parkId))await S.lockPark(c,parkId);return fn(c,await S.parkContext(c,a,parkId))});
   const r=rest.join('/');
   if(m===GET){
    if(r==='context')return res.json(await run(S.context));
    if(r==='overview')return res.json(await run(S.overview));
    if(r==='profile')return res.json(await run(S.profile));
    if(r==='properties')return res.json(await run(S.properties));
    if(rest[0]==='properties'&&rest.length===2)return res.json(await run((c,x)=>S.property(c,x,rest[1])));
    if(r==='reviews')return res.json(await run(S.reviews));
    if(rest[0]==='reviews'&&rest.length===2)return res.json(await run((c,x)=>S.review(c,x,rest[1])));
    if(r==='members')return res.json(await run(S.members));
    if(r==='roles')return res.json(await run(S.roles));
    if(r==='activity')return res.json(await run(S.activity));
   }
   if(m===POST){
    const routes:Record<string,(c:PoolClient,x:S.Ctx)=>Promise<unknown>>={
     'drafts':(c,x)=>S.saveDraft(c,x,body),'drafts/discard':(c,x)=>S.discardDraft(c,x,body),'revisions':(c,x)=>S.submit(c,x,body),
     'members/invite':(c,x)=>S.inviteMember(c,x,body),'members/invite-resend':(c,x)=>S.resendInvite(c,x,body),'members/invite-revoke':(c,x)=>S.revokeInvite(c,x,body),
     'members/role':(c,x)=>S.setMemberRole(c,x,body),'members/status':(c,x)=>S.setMemberStatus(c,x,body),
     'publication':(c,x)=>S.parkPublication(c,x,body),
     'roles/create':(c,x)=>S.createRole(c,x,body),'roles/update':(c,x)=>S.updateRole(c,x,body),'roles/delete':(c,x)=>S.deleteRole(c,x,body),
    };
    if(r==='publication')return res.json(await verifyPublic(await run(routes[r])));
    if(routes[r])return res.json(await run(routes[r]));
    if(rest[0]==='revisions'&&rest.length===3){
     const id=rest[1],act=rest[2];
     const acts:Record<string,(c:PoolClient,x:S.Ctx)=>Promise<unknown>>={withdraw:(c,x)=>S.withdraw(c,x,id),approve:(c,x)=>S.approve(c,x,id,body),reject:(c,x)=>S.reject(c,x,id,body),publish:(c,x)=>S.publish(c,x,id)};
     if(acts[act]){const out=await run(acts[act]);
      return res.json(act==='publish'&&(out as any).ok?await verifyPublic(out):out)}
    }
   }
  }
  throw new ApiError(404,'not_found');
 }catch(e){return fail(res,e)}
}

/** After commit, re-read the public projection with a fresh query and compare it with what the publish computed
 * (visibility AND exact payload). Reports success only on a match; otherwise a truthful pending state. */
async function verifyPublic(out:any){
 const {expected,...rest}=out;if(!expected)return rest;
 const row=(await pool.query(`SELECT md5(payload::text) AS f FROM vsip.public_catalogue WHERE kind=$1 AND id=$2`,[out.kind,out.entityId])).rows[0];
 let ok:boolean;
 if(expected.visible){const want=(await pool.query(`SELECT md5($1::jsonb::text) AS f`,[JSON.stringify(expected.payload)])).rows[0].f;ok=!!row&&row.f===want}else ok=!row;
 return {...rest,publicVisible:!!row,expectedVisible:expected.visible,publicVerified:ok,publicState:ok?'verified':'pending'};
}
export async function adminPortalApi(req:VercelRequest,res:VercelResponse,path:string,body:Json,scope:string){
 try{
  // Owner provisioning is a platform-admin power: only the internal (access-code) session, never demo.
  if(scope!=='internal')throw new ApiError(403,'permission');
  const seg=path.replace(/^\/api\/admin\/portal\/?/,'').split('/').filter(Boolean);const m=req.method;
  if(seg[0]==='parks'&&!seg[1]&&m===GET)return res.json(await tx(c=>S.adminParks(c)));
  if(seg[0]==='parks'&&seg[1]&&seg[2]==='owner'){
   const parkId=seg[1],act=seg[3];
   if(!act&&m===GET)return res.json(await tx(c=>S.adminParkOwner(c,parkId)));
   if(m===POST){await limited(req,'portal-admin',120,3600);
    if(act==='invite')return res.json(await tx(c=>S.adminInviteOwner(c,parkId,body)));
    if(act==='cancel')return res.json(await tx(c=>S.adminCancelOwnerInvite(c,parkId)));
    if(act==='suspend')return res.json(await tx(c=>S.adminSuspend(c,parkId,true)));
    if(act==='unsuspend')return res.json(await tx(c=>S.adminSuspend(c,parkId,false)));
   }
  }
  throw new ApiError(404,'not_found');
 }catch(e){return fail(res,e)}
}
