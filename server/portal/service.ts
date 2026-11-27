// Park portal domain service. Every function runs inside one DB transaction and re-derives authority
// from the server-side portal session + the active membership for the requested park (never from the client).
import type {PoolClient} from 'pg';
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {ApiError} from '../db';
import {ALL_CAPS,EDITOR_CAPS,VIEWER_CAPS,RESERVED_CAPS,isGrantable,missingDependency} from '../../src/portal/capabilities';
import {projectFields} from '../../src/portal/fields';
import {hashPassword,normalEmail,openSession,passwordProblem,tokenHashOf,validPortalEmail,type PortalAuth} from './identity';
import {allDrafts,applyPatch,bundleFrom,entityRow,nameOf,newAsset,notFound,parkImages,parkRow,publicationGate,syncMeta,useWorkspace,workspace,type EntityRow,type Kind} from './content';

const forbidden=(code='permission')=>new ApiError(403,code);
const conflict=(code:string)=>new ApiError(409,code);
const bad=(code='validation')=>new ApiError(400,code);
export const INVITE_DAYS=7;
const OWNER_LABEL='Chủ sở hữu';

export interface Ctx{auth:PortalAuth;parkId:string;parkName:string;membershipId:string;isOwner:boolean;roleName:string;caps:Set<string>}

// ---------- authority ----------
export async function parkContext(c:PoolClient,auth:PortalAuth,parkId:string):Promise<Ctx>{
 await useWorkspace(c);
 const park=await parkRow(c,parkId);
 const m=park&&(await c.query(`SELECT m.id,m.is_owner,r.name AS role_name,r.capabilities FROM vsip.portal_memberships m
  LEFT JOIN vsip.portal_roles r ON r.park_id=m.park_id AND r.id=m.role_id AND r.deleted_at IS NULL
  WHERE m.park_id=$1 AND m.user_id=$2 AND m.status='active'`,[parkId,auth.user.id])).rows[0];
 // Unknown park, no membership and inactive membership all produce the same neutral response.
 if(!park||!m||(!m.is_owner&&!m.capabilities))throw notFound();
 const caps=new Set<string>(m.is_owner?ALL_CAPS:(m.capabilities as string[]).filter(isGrantable));
 return {auth,parkId,parkName:park.name?.vi||parkId,membershipId:m.id,isOwner:m.is_owner,roleName:m.is_owner?OWNER_LABEL:m.role_name,caps};
}
const need=(ctx:Ctx,...caps:string[])=>{for(const cap of caps)if(!ctx.caps.has(cap))throw forbidden()};
export async function decisionState(c:PoolClient,parkId:string){
 const owners=Number((await c.query(`SELECT count(*) FROM vsip.portal_memberships WHERE park_id=$1 AND is_owner AND status='active'`,[parkId])).rows[0].count);
 const suspended=!!(await c.query(`SELECT decisions_suspended FROM vsip.portal_owner_state WHERE park_id=$1`,[parkId])).rows[0]?.decisions_suspended;
 // Actual public visibility of the park (Owner hide/show), separate from the published-version lifecycle.
 const parkHidden=(await c.query(`SELECT published_payload IS NULL OR coalesce(published_payload->>'publicationStatus','')<>'published' AS h FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' AND id=$2`,[workspace(),parkId])).rows[0]?.h??true;
 return {owners,suspended,locked:owners!==1||suspended,parkHidden};
}
/** Approve/reject/publish: active Owner of this park, exactly one active Owner, not suspended. */
/** Lock order (all writers): park lock -> public-catalogue lock -> row locks. */
export async function lockPark(c:PoolClient,parkId:string){await c.query(`SELECT pg_advisory_xact_lock(hashtext('portal-park-'||$1))`,[parkId])}
export async function lockCatalogue(c:PoolClient){await c.query(`SELECT pg_advisory_xact_lock(hashtext('vsip-public-catalogue'))`)}
/** Platform authority fingerprint: HMAC of the current internal access code (never stored in clear). */
export function platformAuthority(){const code=process.env.ADMIN_ACCESS_TOKEN,key=process.env.SESSION_SECRET;return code&&key?createHmac('sha256',key).update('portal-platform:'+code).digest('hex'):null}
async function decide(c:PoolClient,ctx:Ctx){
 if(!ctx.isOwner)throw forbidden();
 // Re-verify the CURRENT actor is still this park's active Owner inside the transaction (after the park lock).
 if(!(await c.query(`SELECT 1 FROM vsip.portal_memberships WHERE id=$1 AND park_id=$2 AND user_id=$3 AND is_owner AND status='active' FOR SHARE`,[ctx.membershipId,ctx.parkId,ctx.auth.user.id])).rowCount)throw notFound();
 const s=await decisionState(c,ctx.parkId);if(s.locked)throw new ApiError(423,s.suspended?'owner_suspended':'no_owner');
}

// ---------- audit + notifications ----------
async function audit(c:PoolClient,a:{parkId:string;actor:{kind:'user'|'platform';user?:string;name:string;role:string};action:string;entityKind?:string;entityId?:string;entityName?:string;revisionId?:string;version?:string;reason?:string}){
 await c.query(`INSERT INTO vsip.portal_audit(park_id,actor_kind,actor_user,actor_name,actor_role,action,entity_kind,entity_id,entity_name,revision_id,version,reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [a.parkId,a.actor.kind,a.actor.user||null,a.actor.name,a.actor.role,a.action,a.entityKind||null,a.entityId||null,a.entityName||null,a.revisionId||null,a.version||null,a.reason||'']);
}
const actorOf=(ctx:Ctx)=>({kind:'user' as const,user:ctx.auth.user.id,name:ctx.auth.user.display_name,role:ctx.roleName});
export const PLATFORM_ACTOR={kind:'platform' as const,name:'Quản trị nền tảng',role:'Quản trị nền tảng'};
async function notify(c:PoolClient,userIds:(string|null|undefined)[],parkId:string,revisionId:string|null,kind:string,body:string){
 for(const u of new Set(userIds.filter(Boolean) as string[]))await c.query(`INSERT INTO vsip.portal_notifications(user_id,park_id,revision_id,kind,body) VALUES($1,$2,$3,$4,$5)`,[u,parkId,revisionId,kind,body]);
}
async function ownerUserId(c:PoolClient,parkId:string){return (await c.query(`SELECT user_id FROM vsip.portal_memberships WHERE park_id=$1 AND is_owner AND status='active'`,[parkId])).rows[0]?.user_id as string|undefined}
const label=(n:number)=>'R-'+n;
const CHANGE_VI:Record<string,string>={create:'Tạo mới',update:'Cập nhật',archive:'Lưu trữ'};

// ---------- me ----------
export async function me(c:PoolClient,auth:PortalAuth){
 await useWorkspace(c);
 const ms=(await c.query(`SELECT m.park_id,m.is_owner,r.name AS role_name,ci.payload->'name'->>'vi' AS park_name,
   (SELECT count(*) FROM vsip.portal_revisions v WHERE v.park_id=m.park_id AND v.state IN ('in_review','approved'))::int AS open_reviews
  FROM vsip.portal_memberships m LEFT JOIN vsip.portal_roles r ON r.park_id=m.park_id AND r.id=m.role_id
  JOIN vsip.content_items ci ON ci.workspace_id=$2 AND ci.kind='park' AND ci.id=m.park_id
  WHERE m.user_id=$1 AND m.status='active' ORDER BY park_name`,[auth.user.id,workspace()])).rows;
 const parkIds=ms.map(m=>m.park_id);
 const notes=(await c.query(`SELECT n.id,n.park_id,n.kind,n.body,n.read_at,n.created_at,v.number FROM vsip.portal_notifications n LEFT JOIN vsip.portal_revisions v ON v.id=n.revision_id
  WHERE n.user_id=$1 AND n.park_id=ANY($2) ORDER BY n.created_at DESC LIMIT 30`,[auth.user.id,parkIds])).rows;
 const invites=(await c.query(`SELECT i.id,i.park_id,i.kind,i.expires_at,r.name AS role_name,ci.payload->'name'->>'vi' AS park_name FROM vsip.portal_invitations i
  LEFT JOIN vsip.portal_roles r ON r.park_id=i.park_id AND r.id=i.role_id JOIN vsip.content_items ci ON ci.workspace_id=$2 AND ci.kind='park' AND ci.id=i.park_id
  WHERE i.email=$1 AND i.state='pending' AND i.expires_at>now()`,[auth.user.email,workspace()])).rows;
 return {user:{id:auth.user.id,name:auth.user.display_name,email:auth.user.email},
  memberships:ms.map(m=>({parkId:m.park_id,parkName:m.park_name,isOwner:m.is_owner,roleName:m.is_owner?OWNER_LABEL:m.role_name,openReviews:m.open_reviews})),
  notifications:notes.map(n=>({id:n.id,parkId:n.park_id,kind:n.kind,text:n.body,read:!!n.read_at,at:n.created_at,href:n.number?`/portal/${n.park_id}/reviews/${label(n.number)}`:`/portal/${n.park_id}/overview`})),
  invitations:invites.map(i=>({id:i.id,parkId:i.park_id,parkName:i.park_name,kind:i.kind,roleName:i.kind==='owner'?OWNER_LABEL:i.role_name,expiresAt:i.expires_at}))};
}
export async function markRead(c:PoolClient,auth:PortalAuth,ids:unknown){
 if(!Array.isArray(ids)||ids.length>100||!ids.every(i=>typeof i==='string'&&/^[0-9a-f-]{36}$/.test(i)))throw bad();
 await c.query(`UPDATE vsip.portal_notifications SET read_at=now() WHERE user_id=$1 AND id=ANY($2) AND read_at IS NULL`,[auth.user.id,ids]);return {ok:true};
}

// ---------- shared view helpers ----------
async function openRevision(c:PoolClient,kind:Kind,id:string){return (await c.query(`SELECT * FROM vsip.portal_revisions WHERE entity_kind=$1 AND entity_id=$2 AND state IN ('in_review','approved')`,[kind,id])).rows[0]}
async function draftOf(c:PoolClient,kind:Kind,id:string,lock=false){return (await c.query(`SELECT d.*,u.display_name AS author_name FROM vsip.portal_drafts d JOIN vsip.portal_users u ON u.id=d.author_id WHERE entity_kind=$1 AND entity_id=$2${lock?' FOR UPDATE OF d':''}`,[kind,id])).rows[0]}
function ctxView(ctx:Ctx,lock:{owners:number;suspended:boolean;locked:boolean}){return {park:{id:ctx.parkId,name:ctx.parkName},role:{isOwner:ctx.isOwner,name:ctx.roleName,caps:[...ctx.caps]},decisions:lock}}
async function entityView(c:PoolClient,ctx:Ctx,kind:Kind,id:string){
 const row=await entityRow(c,ctx.parkId,kind,id);
 const draft=await draftOf(c,kind,id);
 if(!row&&!(draft&&draft.park_id===ctx.parkId&&draft.is_new)){
  // A brand-new property may exist only as an open create revision.
  const rev=kind==='asset'?(await c.query(`SELECT * FROM vsip.portal_revisions WHERE entity_kind='asset' AND entity_id=$1 AND park_id=$2 ORDER BY created_at DESC LIMIT 1`,[id,ctx.parkId])).rows[0]:null;
  if(!rev)throw notFound();
  return {id,kind,published:null,publishedVersion:0,archived:false,working:projectFields(kind,rev.payload),workingSource:'revision',draft:null,openRevision:['in_review','approved'].includes(rev.state)?revSummary(rev):null,lastRevision:revSummary(rev),isNew:true};
 }
 const meta=row?await syncMeta(c,ctx.parkId,row):{published_version:0,archived:false};
 const open=await openRevision(c,kind,id);
 const last=(await c.query(`SELECT * FROM vsip.portal_revisions WHERE entity_kind=$1 AND entity_id=$2 ORDER BY created_at DESC LIMIT 1`,[kind,id])).rows[0];
 const workingPayload=draft?draft.payload:open?open.payload:row?.published_payload||row?.payload;
 return {id,kind,hidden:kind==='park'&&!!row?.published_payload&&row.published_payload.publicationStatus!=='published',published:row?.published_payload?projectFields(kind,row.published_payload):null,publishedVersion:meta.published_version,archived:meta.archived,
  working:projectFields(kind,workingPayload),workingSource:draft?'draft':open?'revision':'published',
  draft:draft?{revision:draft.revision,author:draft.author_name,updatedAt:draft.updated_at,rejectionReason:draft.rejection_reason}:null,
  openRevision:open?revSummary(open):null,lastRevision:last?revSummary(last):null,isNew:!row,image:kind==='asset'?(row?.payload?.image||''):''};
}
function revSummary(r:any){return {id:label(Number(r.number)),uuid:r.id,state:r.state,changeType:r.change_type,authorId:r.author_id,reason:r.reason||null}}

// ---------- read endpoints ----------
/** Membership context only (role, capabilities, decision lock); no content. */
export async function context(c:PoolClient,ctx:Ctx){return ctxView(ctx,await decisionState(c,ctx.parkId))}
export async function overview(c:PoolClient,ctx:Ctx){
 need(ctx,'park.view');const lock=await decisionState(c,ctx.parkId);
 const counts=(await c.query(`SELECT
  count(*) FILTER (WHERE state='in_review')::int AS in_review, count(*) FILTER (WHERE state='approved')::int AS approved,
  count(*) FILTER (WHERE state='rejected' AND author_id=$2 AND NOT EXISTS (SELECT 1 FROM vsip.portal_revisions x WHERE x.entity_id=v.entity_id AND x.created_at>v.created_at))::int AS my_rejected
  FROM vsip.portal_revisions v WHERE park_id=$1`,[ctx.parkId,ctx.auth.user.id])).rows[0];
 const myDrafts=Number((await c.query(`SELECT count(*) FROM vsip.portal_drafts WHERE park_id=$1 AND author_id=$2`,[ctx.parkId,ctx.auth.user.id])).rows[0].count);
 const assets=(await c.query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE published_payload IS NOT NULL)::int AS published FROM vsip.content_items WHERE workspace_id=$1 AND kind='asset' AND park_id=$2`,[workspace(),ctx.parkId])).rows[0];
 // Publicly visible = present in the public projection (same predicate the public site reads).
 assets.publicVisible=Number((await c.query(`SELECT count(*) FROM vsip.public_catalogue WHERE kind='asset' AND park_id=$1`,[ctx.parkId])).rows[0].count);
 const profile=await entityRow(c,ctx.parkId,'park',ctx.parkId);const meta=await syncMeta(c,ctx.parkId,profile!);
 const recent=ctx.caps.has('activity.view')?await activityRows(c,ctx.parkId,6):[];
 return {...ctxView(ctx,lock),counts:{...counts,myDrafts},assets,profileVersion:meta.published_version,recent};
}
export async function profile(c:PoolClient,ctx:Ctx){need(ctx,'park.view');return {...ctxView(ctx,await decisionState(c,ctx.parkId)),entity:await entityView(c,ctx,'park',ctx.parkId)}}
export async function properties(c:PoolClient,ctx:Ctx){
 need(ctx,'property.view');
 const rows=(await c.query(`SELECT id,payload,published_payload,coalesce(md5(published_payload::text),'') AS fingerprint,kind,park_id,revision,state FROM vsip.content_items WHERE workspace_id=$1 AND kind='asset' AND park_id=$2 ORDER BY id`,[workspace(),ctx.parkId])).rows;
 const out=[];
 for(const r of rows){const meta=await syncMeta(c,ctx.parkId,r as EntityRow);const open=await openRevision(c,'asset',r.id);const draft=await draftOf(c,'asset',r.id);const p=draft?.payload||open?.payload||r.published_payload||r.payload;
  out.push({id:r.id,name:nameOf(p),type:p.type,area:p.area,unit:p.unit,transaction:p.transaction,leasingStatus:p.leasingStatus||'unknown',availableFrom:p.availableFrom||'',image:p.image||r.payload?.image||'',publishedVersion:meta.published_version,published:!!r.published_payload,archived:meta.archived,hasDraft:!!draft,openRevision:open?revSummary(open):null,isNew:false});}
 const fresh=(await c.query(`SELECT d.entity_id AS id,d.payload FROM vsip.portal_drafts d WHERE d.park_id=$1 AND d.entity_kind='asset' AND d.is_new
  UNION SELECT v.entity_id,v.payload FROM vsip.portal_revisions v WHERE v.park_id=$1 AND v.change_type='create' AND v.state IN ('in_review','approved')`,[ctx.parkId])).rows;
 for(const f of fresh){if(out.some(o=>o.id===f.id))continue;const open=await openRevision(c,'asset',f.id);
  out.push({id:f.id,name:nameOf(f.payload),type:f.payload.type,area:f.payload.area,unit:f.payload.unit,transaction:f.payload.transaction,leasingStatus:f.payload.leasingStatus||'unknown',availableFrom:f.payload.availableFrom||'',image:f.payload.image||'',publishedVersion:0,published:false,archived:false,hasDraft:!open,openRevision:open?revSummary(open):null,isNew:true});}
 return {...ctxView(ctx,await decisionState(c,ctx.parkId)),items:out};
}
export async function property(c:PoolClient,ctx:Ctx,assetId:string){need(ctx,'property.view');const entity=assetId==='new'?null:await entityView(c,ctx,'asset',assetId);return {...ctxView(ctx,await decisionState(c,ctx.parkId)),entity,imageOptions:await parkImages(c,ctx.parkId)}}

async function revByLabel(c:PoolClient,parkId:string,rid:string,lock=false){
 const m=/^R-(\d{1,12})$/.exec(String(rid));if(!m)throw notFound();
 const r=(await c.query(`SELECT v.*,u.display_name AS author_name,d.display_name AS decided_name,a.display_name AS approved_name FROM vsip.portal_revisions v JOIN vsip.portal_users u ON u.id=v.author_id
  LEFT JOIN vsip.portal_users d ON d.id=v.decided_by LEFT JOIN vsip.portal_users a ON a.id=v.approved_by WHERE v.number=$1 AND v.park_id=$2${lock?' FOR UPDATE OF v':''}`,[m[1],parkId])).rows[0];
 if(!r)throw notFound();return r;
}
export async function reviews(c:PoolClient,ctx:Ctx){
 need(ctx,'review.view');
 const rows=(await c.query(`SELECT v.number,v.entity_kind,v.entity_id,v.change_type,v.state,v.base_version,v.created_at,v.author_role,v.payload->'name'->>'vi' AS name,u.display_name AS author FROM vsip.portal_revisions v JOIN vsip.portal_users u ON u.id=v.author_id WHERE v.park_id=$1 ORDER BY v.created_at DESC LIMIT 300`,[ctx.parkId])).rows;
 return {...ctxView(ctx,await decisionState(c,ctx.parkId)),items:rows.map(r=>({id:label(Number(r.number)),entityKind:r.entity_kind,entityId:r.entity_id,name:r.entity_kind==='park'?'Hồ sơ KCN':r.name,changeType:r.change_type,changeLabel:CHANGE_VI[r.change_type],state:r.state,baseVersion:r.base_version,author:r.author,authorRole:r.author_role,at:r.created_at}))};
}
export async function review(c:PoolClient,ctx:Ctx,rid:string){
 need(ctx,'review.view');const r=await revByLabel(c,ctx.parkId,rid);const lock=await decisionState(c,ctx.parkId);
 const row=await entityRow(c,ctx.parkId,r.entity_kind,r.entity_id);const meta=row?await syncMeta(c,ctx.parkId,row):{published_version:0,archived:false,published_fingerprint:''};
 const open=['in_review','approved'].includes(r.state);
 const stale=open&&(r.change_type==='create'?!!row:(row?.fingerprint||'')!==r.base_fingerprint);
 const self=r.author_id===ctx.auth.user.id;
 const reapproval=r.state==='approved'&&r.approved_membership!==ctx.membershipId&&ctx.isOwner;
 return {...ctxView(ctx,lock),revision:{id:label(Number(r.number)),entityKind:r.entity_kind,entityId:r.entity_id,name:r.entity_kind==='park'?'Hồ sơ KCN':nameOf(r.payload),changeType:r.change_type,changeLabel:CHANGE_VI[r.change_type],state:r.state,
  baseVersion:r.base_version,currentVersion:meta.published_version,archived:meta.archived,stale,author:r.author_name,authorRole:r.author_role,authorIsMe:self,at:r.created_at,
  before:r.before_payload?projectFields(r.entity_kind,r.before_payload):null,after:projectFields(r.entity_kind,r.payload),reason:r.reason,selfApproved:r.self_approved,
  approvedBy:r.approved_name,approvedAt:r.approved_at,decidedBy:r.decided_name,decidedAt:r.decided_at,publishedVersion:r.published_version,reapprovalRequired:reapproval},
  actions:{approve:ctx.isOwner&&r.state==='in_review'&&!lock.locked&&!stale,reject:ctx.isOwner&&r.state==='in_review'&&!lock.locked,publish:ctx.isOwner&&r.state==='approved'&&!lock.locked&&!stale&&!reapproval,
   withdraw:self&&open&&withdrawCaps(r).every(x=>ctx.caps.has(x)),selfConfirm:self&&ctx.isOwner}};
}
async function activityRows(c:PoolClient,parkId:string,limit:number){
 return (await c.query(`SELECT a.created_at AS at,a.actor_name AS actor,a.actor_role AS role,a.action,a.entity_name AS entity,a.version,a.reason,v.number FROM vsip.portal_audit a LEFT JOIN vsip.portal_revisions v ON v.id=a.revision_id WHERE a.park_id=$1 ORDER BY a.created_at DESC LIMIT $2`,[parkId,limit])).rows
  .map(r=>({at:r.at,actor:r.actor,role:r.role,action:r.action,entity:r.entity||'',version:r.version||(r.number?label(Number(r.number)):''),reason:r.reason}));
}
export async function activity(c:PoolClient,ctx:Ctx){need(ctx,'activity.view');return {...ctxView(ctx,await decisionState(c,ctx.parkId)),items:await activityRows(c,ctx.parkId,300)}}

// ---------- drafts ----------
export async function saveDraft(c:PoolClient,ctx:Ctx,body:any){
 const kind:Kind=body?.kind==='park'?'park':body?.kind==='asset'?'asset':(()=>{throw bad()})();
 const creating=kind==='asset'&&!body.id;
 need(ctx,kind==='park'?'profile.edit':creating?'property.create':'property.edit');
 const expected=Number(body.revision);if(!Number.isInteger(expected)||expected<0)throw bad();
 await useWorkspace(c);
 const id:string=kind==='park'?ctx.parkId:creating?'asset-'+randomUUID().replace(/-/g,'').slice(0,12):String(body.id);
 let base:any;let isNew=creating;
 if(!creating){
  const row=await entityRow(c,ctx.parkId,kind,id,true);
  const draft=await draftOf(c,kind,id,true);
  if(!row){if(!(draft&&draft.is_new&&draft.park_id===ctx.parkId))throw notFound();isNew=true}
  if(await openRevision(c,kind,id))throw conflict('locked');
  if(row){const meta=await syncMeta(c,ctx.parkId,row);if(meta.archived)throw conflict('archived')}
  if((draft?.revision||0)!==expected)throw conflict('stale');
  base=draft?draft.payload:(row!.published_payload||row!.payload);
 }else{if(expected!==0)throw conflict('stale');base=newAsset(ctx.parkId,id)}
 const next=applyPatch(kind,base,body.patch,kind==='asset'?await parkImages(c,ctx.parkId):[]);
 const r=await c.query(`INSERT INTO vsip.portal_drafts(entity_kind,entity_id,park_id,payload,revision,is_new,author_id) VALUES($1,$2,$3,$4,1,$5,$6)
  ON CONFLICT(entity_kind,entity_id) DO UPDATE SET payload=excluded.payload,revision=vsip.portal_drafts.revision+1,author_id=excluded.author_id,rejection_reason=NULL,updated_at=now() WHERE vsip.portal_drafts.revision=$7 RETURNING revision`,
  [kind,id,ctx.parkId,JSON.stringify(next),isNew,ctx.auth.user.id,expected]);
 if(!r.rowCount)throw conflict('stale');
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Lưu nháp',entityKind:kind,entityId:id,entityName:kind==='park'?'Hồ sơ KCN':nameOf(next)});
 return {id,revision:r.rows[0].revision};
}
export async function discardDraft(c:PoolClient,ctx:Ctx,body:any){
 const kind:Kind=body?.kind==='park'?'park':'asset';const id=kind==='park'?ctx.parkId:String(body?.id||'');
 need(ctx,kind==='park'?'profile.edit':'property.edit');
 const d=await draftOf(c,kind,id,true);if(!d||d.park_id!==ctx.parkId)throw notFound();
 if(d.author_id!==ctx.auth.user.id&&!ctx.isOwner)throw forbidden('not_author');
 if(d.revision!==Number(body.revision))throw conflict('stale');
 await c.query(`DELETE FROM vsip.portal_drafts WHERE entity_kind=$1 AND entity_id=$2`,[kind,id]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:d.is_new?'Huỷ bản nháp chưa xuất bản':'Bỏ bản nháp',entityKind:kind,entityId:id,entityName:kind==='park'?'Hồ sơ KCN':nameOf(d.payload)});
 return {ok:true};
}

// ---------- revisions ----------
export async function submit(c:PoolClient,ctx:Ctx,body:any){
 const kind:Kind=body?.kind==='park'?'park':body?.kind==='asset'?'asset':(()=>{throw bad()})();
 const id=kind==='park'?ctx.parkId:String(body?.id||'');const archive=body?.change==='archive';
 await useWorkspace(c);
 const row=await entityRow(c,ctx.parkId,kind,id,true);
 if(archive){
  need(ctx,'archive.request');if(kind!=='asset'||!row)throw notFound();
  const meta=await syncMeta(c,ctx.parkId,row);if(meta.archived||!row.published_payload)throw conflict('not_published');
  if(await openRevision(c,kind,id))throw conflict('locked');
  const rev=await insertRevision(c,ctx,kind,id,'archive',meta.published_version,row.fingerprint,row.published_payload,row.published_payload);
  await afterSubmit(c,ctx,rev,nameOf(row.published_payload),'archive');return {id:label(Number(rev.number)),changeType:'archive'};
 }
 let draft=await draftOf(c,kind,id,true);if(draft&&draft.park_id!==ctx.parkId)draft=null;
 if(!row&&!draft)throw notFound();if(!draft)throw conflict('no_draft');
 const change=row?'update':'create';
 need(ctx,'revision.submit',kind==='park'?'profile.edit':change==='create'?'property.create':'property.edit');
 if(Number(body.revision)!==draft.revision)throw conflict('stale');
 if(await openRevision(c,kind,id))throw conflict('locked');
 const meta=row?await syncMeta(c,ctx.parkId,row):{published_version:0,archived:false};
 if(meta.archived)throw conflict('archived');
 const before=row?(row.published_payload||null):null;
 if(before&&JSON.stringify(projectFields(kind,before))===JSON.stringify(projectFields(kind,draft.payload)))throw conflict('unchanged');
 const issues=publicationGate(kind,draft.payload,before,await allDrafts(c));
 if(issues.length)throw Object.assign(bad('publication'),{fields:Object.fromEntries(issues.map(i=>[i,'publication']))});
 const rev=await insertRevision(c,ctx,kind,id,change,meta.published_version,row?.fingerprint||'',before,draft.payload);
 await c.query(`DELETE FROM vsip.portal_drafts WHERE entity_kind=$1 AND entity_id=$2`,[kind,id]);
 await afterSubmit(c,ctx,rev,kind==='park'?'Hồ sơ KCN':nameOf(draft.payload),change);
 return {id:label(Number(rev.number)),changeType:change};
}
async function insertRevision(c:PoolClient,ctx:Ctx,kind:Kind,id:string,change:string,baseVersion:number,fp:string,before:any,payload:any){
 try{return (await c.query(`INSERT INTO vsip.portal_revisions(park_id,entity_kind,entity_id,change_type,base_version,base_fingerprint,before_payload,payload,state,author_id,author_role) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'in_review',$9,$10) RETURNING id,number`,
  [ctx.parkId,kind,id,change,baseVersion,fp,before?JSON.stringify(before):null,JSON.stringify(payload),ctx.auth.user.id,ctx.roleName])).rows[0]}
 catch(e:any){if(e?.code==='23505')throw conflict('locked');throw e}
}
async function afterSubmit(c:PoolClient,ctx:Ctx,rev:any,name:string,change:string){
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:`Gửi duyệt (${CHANGE_VI[change]})`,entityName:name,revisionId:rev.id});
 const owner=await ownerUserId(c,ctx.parkId);if(owner!==ctx.auth.user.id)await notify(c,[owner],ctx.parkId,rev.id,'submitted',`${ctx.auth.user.display_name} gửi duyệt "${name}" (${CHANGE_VI[change]})`);
}
const nameForRev=(r:any)=>r.entity_kind==='park'?'Hồ sơ KCN':nameOf(r.payload);
/** Withdraw needs the same entity-specific capabilities as submitting that change. */
const withdrawCaps=(r:any)=>r.change_type==='archive'?['archive.request']:['revision.submit',r.entity_kind==='park'?'profile.edit':r.change_type==='create'?'property.create':'property.edit'];
export async function withdraw(c:PoolClient,ctx:Ctx,rid:string){
 const r=await revByLabel(c,ctx.parkId,rid,true);
 if(r.author_id!==ctx.auth.user.id)throw forbidden();
 need(ctx,...withdrawCaps(r));
 if(!['in_review','approved'].includes(r.state))throw conflict('state');
 const wasApproved=r.state==='approved';
 await c.query(`UPDATE vsip.portal_revisions SET state='withdrawn',decided_by=$2,decided_at=now() WHERE id=$1`,[r.id,ctx.auth.user.id]);
 // Edit after approval: the approval is invalidated; the payload returns to a working draft.
 if(r.change_type!=='archive')await c.query(`INSERT INTO vsip.portal_drafts(entity_kind,entity_id,park_id,payload,revision,is_new,author_id) VALUES($1,$2,$3,$4,1,$5,$6) ON CONFLICT DO NOTHING`,[r.entity_kind,r.entity_id,r.park_id,JSON.stringify(r.payload),r.change_type==='create',ctx.auth.user.id]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:wasApproved?'Rút lại (huỷ kết quả duyệt)':'Rút lại',entityName:nameForRev(r),revisionId:r.id});
 return {ok:true,approvalInvalidated:wasApproved};
}
async function staleCheck(c:PoolClient,ctx:Ctx,r:any){
 await useWorkspace(c);const row=await entityRow(c,ctx.parkId,r.entity_kind,r.entity_id,true);
 if(r.change_type==='create'){if(row)throw conflict('stale_base');return row}
 if(!row||row.fingerprint!==r.base_fingerprint)throw conflict('stale_base');return row;
}
export async function approve(c:PoolClient,ctx:Ctx,rid:string,body:any){
 await decide(c,ctx);const r=await revByLabel(c,ctx.parkId,rid,true);
 if(r.state!=='in_review')throw conflict('state');
 await staleCheck(c,ctx,r);
 const self=r.author_id===ctx.auth.user.id;if(self&&body?.selfConfirm!==true)throw bad('self_confirmation_required');
 await c.query(`UPDATE vsip.portal_revisions SET state='approved',approved_by=$2,approved_membership=$3,approved_at=now(),self_approved=$4 WHERE id=$1`,[r.id,ctx.auth.user.id,ctx.membershipId,self]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:self?'Tự duyệt':'Duyệt',entityName:nameForRev(r),revisionId:r.id});
 if(!self)await notify(c,[r.author_id],ctx.parkId,r.id,'approved',`Bản "${nameForRev(r)}" của bạn đã được duyệt, chờ xuất bản`);
 return {ok:true};
}
export async function reject(c:PoolClient,ctx:Ctx,rid:string,body:any){
 await decide(c,ctx);const r=await revByLabel(c,ctx.parkId,rid,true);
 const reason=typeof body?.reason==='string'?body.reason.trim():'';if(!reason||reason.length>1000)throw bad('reason_required');
 if(r.state!=='in_review')throw conflict('state');
 await c.query(`UPDATE vsip.portal_revisions SET state='rejected',reason=$2,decided_by=$3,decided_at=now() WHERE id=$1`,[r.id,reason,ctx.auth.user.id]);
 if(r.change_type!=='archive')await c.query(`INSERT INTO vsip.portal_drafts(entity_kind,entity_id,park_id,payload,revision,is_new,author_id,rejection_reason) VALUES($1,$2,$3,$4,1,$5,$6,$7) ON CONFLICT DO NOTHING`,[r.entity_kind,r.entity_id,r.park_id,JSON.stringify(r.payload),r.change_type==='create',r.author_id,reason]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Từ chối',entityName:nameForRev(r),revisionId:r.id,reason});
 await notify(c,[r.author_id===ctx.auth.user.id?null:r.author_id],ctx.parkId,r.id,'rejected',`Bản "${nameForRev(r)}" bị từ chối: ${reason.slice(0,140)}`);
 return {ok:true};
}
export async function publish(c:PoolClient,ctx:Ctx,rid:string){
 await decide(c,ctx);await lockCatalogue(c);const r=await revByLabel(c,ctx.parkId,rid,true);
 if(r.state!=='approved')throw conflict('state');
 if(r.approved_membership!==ctx.membershipId){
  // Approved by a previous Owner (transfer while waiting): reopen for the current Owner's decision.
  await c.query(`UPDATE vsip.portal_revisions SET state='in_review',approved_by=NULL,approved_membership=NULL,approved_at=NULL,self_approved=false WHERE id=$1`,[r.id]);
  await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Mở lại để Owner hiện tại duyệt',entityName:nameForRev(r),revisionId:r.id});
  return {ok:false,reapprovalRequired:true};
 }
 const row=await staleCheck(c,ctx,r);
 const who=`Portal: ${ctx.auth.user.display_name}`;let version:number;
 if(r.change_type==='create'){
  await c.query(`INSERT INTO vsip.content_items(workspace_id,kind,id,park_id,slug,revision,state,payload,published_payload,updated_by) VALUES($1,'asset',$2,$3,NULL,1,'published',$4,$4,$5)`,[workspace(),r.entity_id,ctx.parkId,JSON.stringify(r.payload),who]);
  await c.query(`INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,'asset',$2,1,'published',$3,$4)`,[workspace(),r.entity_id,JSON.stringify(r.payload),who]);
  const fp=(await c.query(`SELECT md5($1::jsonb::text) AS f`,[JSON.stringify(r.payload)])).rows[0].f;
  await c.query(`INSERT INTO vsip.portal_entity_meta(entity_kind,entity_id,park_id,published_version,published_fingerprint) VALUES('asset',$1,$2,1,$3) ON CONFLICT(entity_kind,entity_id) DO UPDATE SET published_version=1,published_fingerprint=excluded.published_fingerprint,archived=false`,[r.entity_id,ctx.parkId,fp]);
  await c.query(`DELETE FROM vsip.portal_drafts WHERE entity_kind='asset' AND entity_id=$1`,[r.entity_id]);version=1;
 }else{
  const meta=await syncMeta(c,ctx.parkId,row!);
  const archive=r.change_type==='archive';
  // A park hidden by its Owner stays hidden when its profile is updated.
  const hiddenStatus=r.entity_kind==='park'&&row!.published_payload&&row!.published_payload.publicationStatus!=='published'?row!.published_payload.publicationStatus:null;
  const toPublish=hiddenStatus?{...r.payload,publicationStatus:hiddenStatus}:r.payload;
  // Keep a divergent /admin working draft intact; otherwise keep payload in step with the published snapshot.
  const upd=(await c.query(`UPDATE vsip.content_items SET
    published_payload=$4::jsonb,
    payload=CASE WHEN payload=published_payload AND NOT $5 THEN $4::jsonb ELSE payload END,
    state=CASE WHEN $5 THEN 'draft' WHEN payload=published_payload THEN 'published' ELSE state END,
    revision=revision+1,updated_by=$6,updated_at=now()
   WHERE workspace_id=$1 AND kind=$2 AND id=$3 RETURNING revision,state,payload,coalesce(md5(published_payload::text),'') AS fp`,[workspace(),r.entity_kind,r.entity_id,archive?null:JSON.stringify(toPublish),archive,who])).rows[0];
  await c.query(`INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,$2,$3,$4,$5,$6,$7)`,[workspace(),r.entity_kind,r.entity_id,upd.revision,upd.state,JSON.stringify(upd.payload),who]);
  version=meta.published_version+1;
  await c.query(`UPDATE vsip.portal_entity_meta SET published_version=$3,published_fingerprint=$4,archived=$5 WHERE entity_kind=$1 AND entity_id=$2`,[r.entity_kind,r.entity_id,version,upd.fp,archive]);
 }
 await c.query(`UPDATE vsip.portal_revisions SET state='published',decided_by=$2,decided_at=now(),published_version=$3 WHERE id=$1`,[r.id,ctx.auth.user.id,version]);
 const expected=await rebuildPublic(c,ctx,r.entity_kind,r.entity_id);
 const archive=r.change_type==='archive';
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:archive?'Lưu trữ (gỡ công khai)':'Xuất bản',entityName:nameForRev(r),revisionId:r.id,version:archive?`đã lưu trữ`:`v${version}`});
 await notify(c,[r.author_id===ctx.auth.user.id?null:r.author_id],ctx.parkId,r.id,'published',archive?`"${nameForRev(r)}" đã được lưu trữ`:`"${nameForRev(r)}" đã xuất bản v${version}`);
 return {ok:true,version,kind:r.entity_kind,entityId:r.entity_id,archived:archive,expected};
}
/** Rebuilds public_catalogue from committed-in-transaction content (caller holds the catalogue lock) and
 * returns what the public read path must show for the entity: absent, or exactly this payload. */
async function rebuildPublic(c:PoolClient,ctx:Ctx,kind:Kind,id:string){
 const bundle=bundleFrom(await allDrafts(c));
 await c.query(`SELECT vsip.portal_publish_catalogue($1,$2,$3)`,[ctx.auth.tokenHash,ctx.parkId,JSON.stringify(bundle)]);
 const item=(kind==='park'?bundle.parks:bundle.assets).find((x:any)=>x.id===id);
 return {visible:!!item,payload:item||null};
}
/** Owner hides the park from the public site, or shows it again. Children follow the park; independently
 * archived properties (published snapshot removed) are never revived. */
export async function parkPublication(c:PoolClient,ctx:Ctx,body:any){
 await decide(c,ctx);await lockCatalogue(c);await useWorkspace(c);
 const action=body?.action;if(!['hide','show'].includes(action))throw bad();
 const reason=typeof body?.reason==='string'?body.reason.trim():'';if(action==='hide'&&(!reason||reason.length>1000))throw bad('reason_required');
 const row=await entityRow(c,ctx.parkId,'park',ctx.parkId,true);if(!row)throw notFound();
 if(!row.published_payload)throw conflict('not_published');
 const meta=await syncMeta(c,ctx.parkId,row);
 const hidden=row.published_payload.publicationStatus!=='published';
 if((action==='hide')===hidden)throw conflict('state');
 const status=action==='hide'?'archived':'published';
 const who=`Portal: ${ctx.auth.user.display_name}`;
 const upd=(await c.query(`UPDATE vsip.content_items SET
   payload=CASE WHEN payload=published_payload THEN jsonb_set(payload,'{publicationStatus}',to_jsonb($4::text)) ELSE payload END,
   published_payload=jsonb_set(published_payload,'{publicationStatus}',to_jsonb($4::text)),revision=revision+1,updated_by=$5,updated_at=now()
  WHERE workspace_id=$1 AND kind='park' AND id=$2 AND md5(published_payload::text)=$3 RETURNING revision,state,payload,md5(published_payload::text) AS fp`,[workspace(),ctx.parkId,row.fingerprint,status,who])).rows[0];
 if(!upd)throw conflict('stale_base');
 await c.query(`INSERT INTO vsip.content_versions(workspace_id,kind,content_id,revision,state,payload,actor) VALUES($1,'park',$2,$3,$4,$5,$6)`,[workspace(),ctx.parkId,upd.revision,upd.state,JSON.stringify(upd.payload),who]);
 await c.query(`UPDATE vsip.portal_entity_meta SET published_fingerprint=$3 WHERE entity_kind=$1 AND entity_id=$2`,['park',ctx.parkId,upd.fp]);
 const expected=await rebuildPublic(c,ctx,'park',ctx.parkId);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:action==='hide'?'Ẩn KCN khỏi trang công khai':'Công khai lại KCN',entityName:'Hồ sơ KCN',version:`v${meta.published_version}`,reason});
 return {ok:true,kind:'park',entityId:ctx.parkId,hidden:action==='hide',expected};
}

// ---------- members ----------
export async function members(c:PoolClient,ctx:Ctx){
 if(!ctx.caps.has('members.view')&&!ctx.caps.has('members.manage'))throw forbidden();
 const ms=(await c.query(`SELECT m.id,m.is_owner,m.status,m.role_id,m.assigned_by,u.display_name AS name,u.email,r.name AS role_name FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id LEFT JOIN vsip.portal_roles r ON r.park_id=m.park_id AND r.id=m.role_id WHERE m.park_id=$1 AND m.status<>'removed' ORDER BY m.is_owner DESC,u.display_name`,[ctx.parkId])).rows;
 const manage=ctx.caps.has('members.manage');
 const invites=manage?(await c.query(`SELECT i.id,i.email,i.role_id,i.created_at,i.expires_at,r.name AS role_name FROM vsip.portal_invitations i JOIN vsip.portal_roles r ON r.park_id=i.park_id AND r.id=i.role_id WHERE i.park_id=$1 AND i.kind='member' AND i.state='pending' AND i.expires_at>now() ORDER BY i.created_at DESC`,[ctx.parkId])).rows:[];
 const roles=(await c.query(`SELECT id,name FROM vsip.portal_roles WHERE park_id=$1 AND deleted_at IS NULL ORDER BY template NULLS LAST,name`,[ctx.parkId])).rows;
 return {...ctxView(ctx,await decisionState(c,ctx.parkId)),canManage:manage,roles,
  items:ms.map(m=>({id:m.id,name:m.name,email:m.email,isOwner:m.is_owner,status:m.status,roleId:m.role_id,roleName:m.is_owner?OWNER_LABEL:m.role_name,assignedBy:m.assigned_by})),
  invitations:invites.map(i=>({id:i.id,email:i.email,roleId:i.role_id,roleName:i.role_name,at:i.created_at,expiresAt:i.expires_at}))};
}
async function roleInPark(c:PoolClient,parkId:string,roleId:unknown){
 if(typeof roleId!=='string'||!/^[0-9a-f-]{36}$/.test(roleId))throw bad('role');
 const r=(await c.query(`SELECT id,name FROM vsip.portal_roles WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL FOR SHARE`,[parkId,roleId])).rows[0];
 if(!r)throw bad('role');return r as {id:string;name:string};
}
const newInviteToken=()=>{const t=randomBytes(32).toString('hex');return {token:t,hash:tokenHashOf(t)}};
export const inviteLink=(token:string)=>`/portal/invite#${token}`;
export async function inviteMember(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'members.manage');const email=normalEmail(body?.email);if(!validPortalEmail(email))throw bad('email');
 const role=await roleInPark(c,ctx.parkId,body?.roleId);
 const existing=(await c.query(`SELECT m.status,m.is_owner FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.park_id=$1 AND u.email=$2`,[ctx.parkId,email])).rows[0];
 if(existing&&existing.status!=='removed')throw conflict('already_member');
 await c.query(`UPDATE vsip.portal_invitations SET state='superseded',decided_at=now() WHERE park_id=$1 AND kind='member' AND email=$2 AND state='pending'`,[ctx.parkId,email]);
 const t=newInviteToken();
 const inv=(await c.query(`INSERT INTO vsip.portal_invitations(park_id,kind,email,role_id,token_hash,expires_at,issued_by_kind,issued_by_user) VALUES($1,'member',$2,$3,$4,now()+make_interval(days=>$5),'owner',$6) RETURNING id`,[ctx.parkId,email,role.id,t.hash,INVITE_DAYS,ctx.auth.user.id])).rows[0];
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Mời thành viên',entityName:email,version:role.name});
 const u=(await c.query(`SELECT id FROM vsip.portal_users WHERE email=$1 AND status='active'`,[email])).rows[0];
 if(u)await notify(c,[u.id],ctx.parkId,null,'invited',`Bạn được mời tham gia ${ctx.parkName} với vai trò ${role.name}`);
 return {id:inv.id,link:inviteLink(t.token),expiresInDays:INVITE_DAYS};
}
export async function resendInvite(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'members.manage');
 const i=(await c.query(`SELECT * FROM vsip.portal_invitations WHERE id=$1 AND park_id=$2 AND kind='member' AND state='pending' FOR UPDATE`,[String(body?.id||'00000000-0000-0000-0000-000000000000'),ctx.parkId])).rows[0];
 if(!i)throw notFound();
 return inviteMember(c,ctx,{email:i.email,roleId:i.role_id});
}
export async function revokeInvite(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'members.manage');
 const r=await c.query(`UPDATE vsip.portal_invitations SET state='revoked',decided_at=now() WHERE id=$1 AND park_id=$2 AND kind='member' AND state='pending' RETURNING email`,[uuidOr(body?.id),ctx.parkId]);
 if(!r.rowCount)throw notFound();
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Thu hồi lời mời',entityName:r.rows[0].email});return {ok:true};
}
const uuidOr=(v:unknown)=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v)?v:'00000000-0000-0000-0000-000000000000';
async function memberInPark(c:PoolClient,parkId:string,id:unknown){
 const m=(await c.query(`SELECT m.*,u.display_name AS name FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.id=$1 AND m.park_id=$2 FOR UPDATE OF m`,[uuidOr(id),parkId])).rows[0];
 if(!m)throw notFound();return m;
}
export async function setMemberRole(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'members.manage');const m=await memberInPark(c,ctx.parkId,body?.membershipId);
 if(m.is_owner)throw forbidden('owner_immutable');if(m.status==='removed')throw conflict('removed');
 const role=await roleInPark(c,ctx.parkId,body?.roleId);
 await c.query(`UPDATE vsip.portal_memberships SET role_id=$2,revision=revision+1,updated_at=now() WHERE id=$1`,[m.id,role.id]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Đổi vai trò',entityName:m.name,version:role.name});return {ok:true};
}
export async function setMemberStatus(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'members.manage');const m=await memberInPark(c,ctx.parkId,body?.membershipId);
 if(m.is_owner)throw forbidden('owner_immutable');const status=body?.status;if(!['active','suspended','removed'].includes(status))throw bad();
 if(m.status==='removed')throw conflict('removed');
 await c.query(`UPDATE vsip.portal_memberships SET status=$2,revision=revision+1,updated_at=now() WHERE id=$1`,[m.id,status]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:status==='removed'?'Gỡ thành viên':status==='suspended'?'Tạm khoá thành viên':'Mở khoá thành viên',entityName:m.name});return {ok:true};
}

// ---------- roles ----------
export async function ensureTemplates(c:PoolClient,parkId:string){
 await c.query(`INSERT INTO vsip.portal_roles(park_id,name,template,capabilities) VALUES($1,'Biên tập viên','editor',$2),($1,'Người xem','viewer',$3) ON CONFLICT DO NOTHING`,[parkId,EDITOR_CAPS,VIEWER_CAPS]);
}
export async function roles(c:PoolClient,ctx:Ctx){
 need(ctx,'roles.manage');
 const rows=(await c.query(`SELECT r.id,r.name,r.template,r.capabilities,r.revision,
  (SELECT count(*) FROM vsip.portal_memberships m WHERE m.park_id=r.park_id AND m.role_id=r.id AND m.status<>'removed')::int
  +(SELECT count(*) FROM vsip.portal_invitations i WHERE i.park_id=r.park_id AND (i.role_id=r.id OR i.previous_owner_role_id=r.id) AND i.state='pending')::int AS in_use
  FROM vsip.portal_roles r WHERE r.park_id=$1 AND r.deleted_at IS NULL ORDER BY r.template NULLS LAST,r.created_at`,[ctx.parkId])).rows;
 return {...ctxView(ctx,await decisionState(c,ctx.parkId)),items:rows.map(r=>({id:r.id,name:r.name,template:r.template,capabilities:r.capabilities,revision:r.revision,inUse:r.in_use}))};
}
function capsFrom(v:unknown){
 if(!Array.isArray(v)||v.length>20||!v.every(x=>typeof x==='string'))throw bad('capabilities');
 if(v.some(x=>(RESERVED_CAPS as readonly string[]).includes(x)))throw forbidden('reserved_capability');
 if(!v.every(isGrantable))throw bad('capabilities');
 const caps=[...new Set(v)];const miss=missingDependency(caps);if(miss)throw Object.assign(bad('dependency'),{fields:{capabilities:miss}});
 return caps;
}
const roleName=(v:unknown)=>{const n=typeof v==='string'?v.trim():'';if(!n||n.length>60||/[<>]/.test(n))throw bad('name');return n};
export async function createRole(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'roles.manage');const name=roleName(body?.name);
 const caps=body?.fromRoleId?(await c.query(`SELECT capabilities FROM vsip.portal_roles WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL`,[ctx.parkId,uuidOr(body.fromRoleId)])).rows[0]?.capabilities:capsFrom(body?.capabilities);
 if(!caps)throw bad('role');
 try{const r=(await c.query(`INSERT INTO vsip.portal_roles(park_id,name,capabilities) VALUES($1,$2,$3) RETURNING id`,[ctx.parkId,name,capsFrom(caps)])).rows[0];
  await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Tạo vai trò',entityName:name});return {id:r.id}}
 catch(e:any){if(e?.code==='23505')throw conflict('duplicate_name');throw e}
}
export async function updateRole(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'roles.manage');const caps=capsFrom(body?.capabilities);
 const r=await c.query(`UPDATE vsip.portal_roles SET capabilities=$3,revision=revision+1 WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL AND revision=$4 RETURNING name,revision`,[ctx.parkId,uuidOr(body?.roleId),caps,Number(body?.revision)]);
 if(!r.rowCount){const exists=(await c.query(`SELECT 1 FROM vsip.portal_roles WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL`,[ctx.parkId,uuidOr(body?.roleId)])).rowCount;throw exists?conflict('stale'):notFound()}
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Sửa quyền vai trò',entityName:r.rows[0].name,version:caps.join(', ')});return {revision:r.rows[0].revision};
}
export async function deleteRole(c:PoolClient,ctx:Ctx,body:any){
 need(ctx,'roles.manage');
 const r=(await c.query(`SELECT id,name,template FROM vsip.portal_roles WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL FOR UPDATE`,[ctx.parkId,uuidOr(body?.roleId)])).rows[0];
 if(!r)throw notFound();if(r.template)throw conflict('template_role');
 const used=(await c.query(`SELECT (SELECT count(*) FROM vsip.portal_memberships WHERE park_id=$1 AND role_id=$2 AND status<>'removed')+(SELECT count(*) FROM vsip.portal_invitations WHERE park_id=$1 AND (role_id=$2 OR previous_owner_role_id=$2) AND state='pending') AS n`,[ctx.parkId,r.id])).rows[0].n;
 if(Number(used)>0)throw conflict('role_in_use');
 await c.query(`UPDATE vsip.portal_roles SET deleted_at=now() WHERE id=$1`,[r.id]);
 await audit(c,{parkId:ctx.parkId,actor:actorOf(ctx),action:'Xoá vai trò',entityName:r.name});return {ok:true};
}

// ---------- invitations: inspect / accept ----------
async function invitationByToken(c:PoolClient,token:unknown,lock=false){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw notFound();
 return (await c.query(`SELECT * FROM vsip.portal_invitations WHERE token_hash=$1${lock?' FOR UPDATE':''}`,[tokenHashOf(token)])).rows[0]||null;
}
function invitationUsable(i:any){if(!i)throw notFound();if(i.state==='pending'&&new Date(i.expires_at)<=new Date())return 'expired';if(i.state!=='pending')return i.state;return null}
export async function inspectInvitation(c:PoolClient,token:unknown){
 await useWorkspace(c);const i=await invitationByToken(c,token);const problem=invitationUsable(i);if(problem)throw new ApiError(410,'invitation_'+problem);
 const park=await parkRow(c,i.park_id);if(!park)throw new ApiError(410,'invitation_invalid');
 const role=i.role_id?(await c.query(`SELECT name FROM vsip.portal_roles WHERE id=$1`,[i.role_id])).rows[0]?.name:OWNER_LABEL;
 const account=!!(await c.query(`SELECT 1 FROM vsip.portal_users WHERE email=$1`,[i.email])).rowCount;
 return {parkName:park.name?.vi||i.park_id,kind:i.kind,roleName:role,email:i.email,accountExists:account,expiresAt:i.expires_at};
}
/** Accepts by token (new or signed-in account) or by id (signed-in invitee). Returns a session token when an account was created. */
export async function acceptInvitation(c:PoolClient,auth:PortalAuth|null,body:any){
 await useWorkspace(c);
 // Lock order: park lock, then the invitation row (same order as admin supersede/revoke).
 let i:any;
 if(body?.token){i=await invitationByToken(c,body.token)}else if(auth&&body?.id){i=(await c.query(`SELECT * FROM vsip.portal_invitations WHERE id=$1 AND email=$2`,[uuidOr(body.id),auth.user.email])).rows[0]}
 if(!i)throw notFound();
 await lockPark(c,i.park_id);
 i=(await c.query(`SELECT * FROM vsip.portal_invitations WHERE id=$1 FOR UPDATE`,[i.id])).rows[0];
 const problem=invitationUsable(i);
 if(problem){if(problem==='expired')await c.query(`UPDATE vsip.portal_invitations SET state='expired',decided_at=now() WHERE id=$1 AND state='pending'`,[i.id]);throw new ApiError(410,'invitation_'+problem)}
 const park=await parkRow(c,i.park_id);if(!park)throw new ApiError(410,'invitation_invalid');
 // Platform-issued invitations stay valid only while the issuing platform authority (access code) is unchanged.
 if(i.issued_by_kind==='platform'&&(!i.issuer_authority||i.issuer_authority!==platformAuthority()))throw new ApiError(410,'invitation_issuer_invalid');
 // Resolve the accepting account.
 let userId:string,sessionToken:string|null=null,userName:string;
 if(auth){if(auth.user.email!==i.email)throw forbidden('email_mismatch');userId=auth.user.id;userName=auth.user.display_name}
 else{
  const existing=(await c.query(`SELECT id FROM vsip.portal_users WHERE email=$1`,[i.email])).rows[0];
  if(existing)throw new ApiError(401,'sign_in_required');
  const name=typeof body?.displayName==='string'?body.displayName.trim():'';if(!name||name.length>120||/[<>]/.test(name))throw bad('name');
  const pw=passwordProblem(body?.password,i.email);if(pw)throw bad(pw);
  userId=(await c.query(`INSERT INTO vsip.portal_users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING id`,[i.email,name,await hashPassword(body.password)])).rows[0].id;
  sessionToken=await openSession(c,userId);userName=name;
 }
 if(i.kind==='member'){
  const issuerStillOwner=(await c.query(`SELECT 1 FROM vsip.portal_memberships WHERE park_id=$1 AND user_id=$2 AND is_owner AND status='active'`,[i.park_id,i.issued_by_user])).rowCount;
  if(!issuerStillOwner){await c.query(`UPDATE vsip.portal_invitations SET state='revoked',decided_at=now() WHERE id=$1`,[i.id]);throw new ApiError(410,'invitation_issuer_invalid')}
  const role=(await c.query(`SELECT id,name FROM vsip.portal_roles WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL`,[i.park_id,i.role_id])).rows[0];
  if(!role)throw new ApiError(410,'invitation_role_invalid');
  const prior=(await c.query(`SELECT * FROM vsip.portal_memberships WHERE park_id=$1 AND user_id=$2 FOR UPDATE`,[i.park_id,userId])).rows[0];
  if(prior?.is_owner&&prior.status==='active')throw conflict('already_owner');
  if(prior&&prior.status!=='removed')throw conflict('already_member');
  if(prior)await c.query(`UPDATE vsip.portal_memberships SET role_id=$2,is_owner=false,status='active',assigned_by='Chủ sở hữu (lời mời)',revision=revision+1,updated_at=now() WHERE id=$1`,[prior.id,role.id]);
  else await c.query(`INSERT INTO vsip.portal_memberships(park_id,user_id,role_id,status,assigned_by) VALUES($1,$2,$3,'active','Chủ sở hữu (lời mời)')`,[i.park_id,userId,role.id]);
  await audit(c,{parkId:i.park_id,actor:{kind:'user',user:userId,name:userName,role:role.name},action:'Nhận lời mời thành viên',entityName:userName,version:role.name});
 }else{
  await transferOwnership(c,i,userId,userName);
 }
 await c.query(`UPDATE vsip.portal_invitations SET state='accepted',accepted_by=$2,decided_at=now() WHERE id=$1`,[i.id,userId]);
 return {parkId:i.park_id,sessionToken};
}
/** Atomic Owner transfer. Caller holds the park advisory lock and the invitation row lock. */
async function transferOwnership(c:PoolClient,i:any,newUser:string,newName:string){
 const ms=(await c.query(`SELECT m.*,u.display_name AS name FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.park_id=$1 FOR UPDATE OF m`,[i.park_id])).rows;
 const old=ms.find(m=>m.is_owner&&m.status==='active');
 if(i.previous_owner_role_id&&!(await c.query(`SELECT 1 FROM vsip.portal_roles WHERE park_id=$1 AND id=$2 AND deleted_at IS NULL`,[i.park_id,i.previous_owner_role_id])).rowCount)throw new ApiError(410,'invitation_role_invalid');
 if(old&&old.user_id!==newUser){
  await c.query(`UPDATE vsip.portal_memberships SET is_owner=false,role_id=$2,status=$3,revision=revision+1,updated_at=now() WHERE id=$1`,[old.id,i.previous_owner_role_id,i.previous_owner_role_id?'active':'removed']);
  await audit(c,{parkId:i.park_id,actor:PLATFORM_ACTOR,action:i.previous_owner_role_id?'Owner cũ chuyển sang vai trò thành viên':'Owner cũ được gỡ khỏi KCN',entityName:old.name});
 }
 const mine=ms.find(m=>m.user_id===newUser);
 if(mine)await c.query(`UPDATE vsip.portal_memberships SET is_owner=true,role_id=NULL,status='active',assigned_by='Quản trị nền tảng',revision=revision+1,updated_at=now() WHERE id=$1`,[mine.id]);
 else await c.query(`INSERT INTO vsip.portal_memberships(park_id,user_id,role_id,is_owner,status,assigned_by) VALUES($1,$2,NULL,true,'active','Quản trị nền tảng')`,[i.park_id,newUser]);
 await c.query(`INSERT INTO vsip.portal_owner_state(park_id,decisions_suspended) VALUES($1,false) ON CONFLICT(park_id) DO UPDATE SET decisions_suspended=false,updated_at=now()`,[i.park_id]);
 // Approvals given by a previous Owner must be re-decided by the new Owner.
 const reopened=(await c.query(`UPDATE vsip.portal_revisions SET state='in_review',approved_by=NULL,approved_membership=NULL,approved_at=NULL,self_approved=false WHERE park_id=$1 AND state='approved' RETURNING id`,[i.park_id])).rowCount;
 await audit(c,{parkId:i.park_id,actor:{kind:'user',user:newUser,name:newName,role:OWNER_LABEL},action:old&&old.user_id!==newUser?'Nhận quyền Owner (chuyển giao)':'Nhận quyền Owner',entityName:newName,version:reopened?`${reopened} bản đã duyệt được mở lại`:''});
 if(reopened)await notify(c,[newUser],i.park_id,null,'reopened',`${reopened} bản đã duyệt được mở lại để bạn quyết định`);
}

// ---------- platform admin (Owner provisioning) ----------
export async function adminParks(c:PoolClient){
 await useWorkspace(c);
 const parks=(await c.query(`SELECT id,payload->'name'->>'vi' AS name FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' ORDER BY name`,[workspace()])).rows;
 const owners=(await c.query(`SELECT m.park_id,u.display_name AS name,u.email FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.is_owner AND m.status='active'`)).rows;
 const states=(await c.query(`SELECT park_id,decisions_suspended FROM vsip.portal_owner_state`)).rows;
 const pend=(await c.query(`SELECT park_id,email,expires_at FROM vsip.portal_invitations WHERE kind='owner' AND state='pending' AND expires_at>now()`)).rows;
 return {items:parks.map(p=>({id:p.id,name:p.name,owner:owners.find(o=>o.park_id===p.id)||null,suspended:!!states.find(s=>s.park_id===p.id)?.decisions_suspended,pending:pend.find(x=>x.park_id===p.id)||null}))};
}
async function adminPark(c:PoolClient,parkId:string){await useWorkspace(c);const p=await parkRow(c,parkId);if(!p)throw notFound();return p}
export async function adminParkOwner(c:PoolClient,parkId:string){
 const p=await adminPark(c,parkId);await ensureTemplates(c,parkId);
 const owner=(await c.query(`SELECT u.display_name AS name,u.email,m.assigned_by,m.updated_at FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.park_id=$1 AND m.is_owner AND m.status='active'`,[parkId])).rows[0]||null;
 const st=await decisionState(c,parkId);
 const pending=(await c.query(`SELECT i.id,i.email,i.expires_at,i.created_at,r.name AS previous_owner_role FROM vsip.portal_invitations i LEFT JOIN vsip.portal_roles r ON r.id=i.previous_owner_role_id WHERE i.park_id=$1 AND i.kind='owner' AND i.state='pending' AND i.expires_at>now()`,[parkId])).rows[0]||null;
 const roles=(await c.query(`SELECT id,name FROM vsip.portal_roles WHERE park_id=$1 AND deleted_at IS NULL ORDER BY template NULLS LAST,name`,[parkId])).rows;
 const events=(await c.query(`SELECT created_at AS at,actor_name AS actor,action,entity_name AS entity FROM vsip.portal_audit WHERE park_id=$1 AND (actor_kind='platform' OR action LIKE '%Owner%') ORDER BY created_at DESC LIMIT 20`,[parkId])).rows;
 return {park:{id:parkId,name:p.name?.vi||parkId},owner,suspended:st.suspended,ownerCount:st.owners,pending,roles,events};
}
export async function adminInviteOwner(c:PoolClient,parkId:string,body:any){
 await adminPark(c,parkId);await ensureTemplates(c,parkId);
 const email=normalEmail(body?.email);if(!validPortalEmail(email))throw bad('email');
 const prev=body?.previousOwnerRoleId?(await roleInPark(c,parkId,body.previousOwnerRoleId)).id:null;
 await lockPark(c,parkId);const authority=platformAuthority();if(!authority)throw new ApiError(503,'platform_authority_unconfigured');
 const cur=(await c.query(`SELECT u.email FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.park_id=$1 AND m.is_owner AND m.status='active'`,[parkId])).rows[0];
 if(cur?.email===email)throw conflict('already_owner');
 await c.query(`UPDATE vsip.portal_invitations SET state='superseded',decided_at=now() WHERE park_id=$1 AND kind='owner' AND state='pending'`,[parkId]);
 const t=newInviteToken();
 await c.query(`INSERT INTO vsip.portal_invitations(park_id,kind,email,previous_owner_role_id,token_hash,expires_at,issued_by_kind,issuer_authority) VALUES($1,'owner',$2,$3,$4,now()+make_interval(days=>$5),'platform',$6)`,[parkId,email,prev,t.hash,INVITE_DAYS,authority]);
 await audit(c,{parkId,actor:PLATFORM_ACTOR,action:cur?'Mời Owner thay thế':'Mời Owner',entityName:email,version:prev?'Owner cũ giữ vai trò thành viên':'Owner cũ được gỡ khỏi KCN'});
 const u=(await c.query(`SELECT id FROM vsip.portal_users WHERE email=$1 AND status='active'`,[email])).rows[0];
 if(u)await notify(c,[u.id],parkId,null,'invited','Bạn được mời làm Chủ sở hữu KCN');
 return {link:inviteLink(t.token),expiresInDays:INVITE_DAYS};
}
export async function adminCancelOwnerInvite(c:PoolClient,parkId:string){
 await adminPark(c,parkId);await lockPark(c,parkId);
 const r=await c.query(`UPDATE vsip.portal_invitations SET state='revoked',decided_at=now() WHERE park_id=$1 AND kind='owner' AND state='pending' RETURNING email`,[parkId]);
 if(!r.rowCount)throw notFound();
 await audit(c,{parkId,actor:PLATFORM_ACTOR,action:'Huỷ lời mời Owner',entityName:r.rows[0].email});return {ok:true};
}
export async function adminSuspend(c:PoolClient,parkId:string,suspended:boolean){
 await adminPark(c,parkId);await lockPark(c,parkId);
 await c.query(`INSERT INTO vsip.portal_owner_state(park_id,decisions_suspended) VALUES($1,$2) ON CONFLICT(park_id) DO UPDATE SET decisions_suspended=excluded.decisions_suspended,updated_at=now()`,[parkId,suspended]);
 await audit(c,{parkId,actor:PLATFORM_ACTOR,action:suspended?'Tạm khoá Owner':'Mở khoá Owner'});return {ok:true};
}
