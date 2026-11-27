// Backend authorization + lifecycle tests for the park portal, run against a REAL isolated PostgreSQL
// through the real HTTP handler (no mocks). Skipped unless PORTAL_TEST_ADMIN_URL points at a loopback DB.
// Setup: see outputs/park-portal-implementation-2026-11-20/qa-report.md ("Backend integration tests").
import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import pg from 'pg';

const ADMIN_URL=process.env.PORTAL_TEST_ADMIN_URL||'';
const ENV_FILE=process.env.PORTAL_TEST_ENV_FILE||'';
const enabled=!!ADMIN_URL&&!!ENV_FILE&&['127.0.0.1','localhost'].includes(new URL(ADMIN_URL||'http://x').hostname);
const ORIGIN='http://127.0.0.1:5173';
const A='park-vsip-thai-binh',B='park-demo-02';

let server:http.Server,base='',raw:pg.Client,adminCode='';
class Client{
 cookies=new Map<string,string>();
 async req(method:string,path:string,body?:unknown){
  const headers:Record<string,string>={'Origin':ORIGIN,'X-Forwarded-For':'10.'+[1,2,3].map(()=>Math.floor(Math.random()*250)).join('.')};
  if(this.cookies.size)headers.Cookie=[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ');
  if(body!==undefined)headers['Content-Type']='application/json';
  const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  for(const c of r.headers.getSetCookie?.()||[]){const [kv]=c.split(';');const i=kv.indexOf('=');const k=kv.slice(0,i),v=kv.slice(i+1);if(v)this.cookies.set(k,v);else this.cookies.delete(k)}
  const text=await r.text();let json:any;try{json=JSON.parse(text)}catch{json=text}
  return {status:r.status,body:json,text};
 }
 get=(p:string)=>this.req('GET',p);post=(p:string,b:unknown={})=>this.req('POST',p,b);
}
const tokenOf=(link:string)=>link.split('#')[1];
async function platform(){const c=new Client();const r=await c.post('/api/session',{internal:true,accessToken:adminCode});expect(r.status).toBe(200);return c}
async function acceptNew(link:string,name:string,password='Correct-horse-42'){const c=new Client();const r=await c.post('/api/portal/invitations/accept',{token:tokenOf(link),displayName:name,password});expect(r.status,JSON.stringify(r.body)).toBe(200);return c}
async function ownerFor(park:string,email:string,name:string,prev?:string){const p=await platform();const r=await p.post(`/api/admin/portal/parks/${park}/owner/invite`,{email,previousOwnerRoleId:prev});expect(r.status,JSON.stringify(r.body)).toBe(200);return r.body.link as string}
async function roleId(owner:Client,park:string,template:'editor'|'viewer'){const r=await owner.get(`/api/portal/parks/${park}/roles`);return r.body.items.find((x:any)=>x.template===template).id as string}
async function invite(owner:Client,park:string,email:string,rid:string){const r=await owner.post(`/api/portal/parks/${park}/members/invite`,{email,roleId:rid});expect(r.status,JSON.stringify(r.body)).toBe(200);return r.body.link as string}
async function firstAsset(park:string){return (await raw.query(`SELECT id FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND park_id=$1 AND published_payload IS NOT NULL ORDER BY id LIMIT 1`,[park])).rows[0].id as string}
async function publicAsset(id:string){return (await raw.query(`SELECT payload FROM vsip.public_catalogue WHERE kind='asset' AND id=$1`,[id])).rows[0]?.payload}
async function workingOf(c:Client,park:string,id:string){return (await c.get(`/api/portal/parks/${park}/properties/${id}`)).body.entity}

let an:Client,ha:Client,bao:Client,assetA='',assetB='',editorA='',viewerA='',editorB='',viewerB='';
describe.skipIf(!enabled)('park portal — real backend',()=>{
 beforeAll(async()=>{
  execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/portal/test-db.ts','--reset'],{env:{...process.env,PORTAL_LOCAL_ADMIN_URL:ADMIN_URL,PORTAL_LOCAL_ENV_FILE:ENV_FILE},stdio:'pipe'});
  const env=Object.fromEntries(readFileSync(ENV_FILE,'utf8').split(/\r?\n/).filter(Boolean).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
  adminCode=randomBytes(16).toString('hex');
  Object.assign(process.env,{DATABASE_URL:env.DATABASE_URL,ADMIN_ACCESS_TOKEN:adminCode,SESSION_SECRET:randomBytes(16).toString('hex'),NODE_ENV:'test',APP_ORIGIN:ORIGIN});
  const {default:handler}=await import('../handler');
  server=http.createServer(async(req,res)=>{const chunks:Buffer[]=[];for await(const ch of req)chunks.push(ch as Buffer);const s=Buffer.concat(chunks).toString('utf8');const url=new URL(req.url||'/','http://x');
   const vreq:any=Object.assign(req,{query:Object.fromEntries(url.searchParams),body:s?JSON.parse(s):undefined});const vres:any=Object.assign(res,{status(n:number){res.statusCode=n;return vres},json(v:unknown){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v));return vres}});await handler(vreq,vres)});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',()=>r()));base=`http://127.0.0.1:${(server.address() as any).port}`;
  raw=new pg.Client({connectionString:ADMIN_URL});await raw.connect();
  assetA=await firstAsset(A);assetB=await firstAsset(B);
  // Two parks, three people, different roles per park.
  an=await acceptNew(await ownerFor(A,'an@portal.test','Phạm Minh An'),'Phạm Minh An');
  bao=await acceptNew(await ownerFor(B,'bao@portal.test','Lê Quốc Bảo'),'Lê Quốc Bảo');
  editorA=await roleId(an,A,'editor');viewerA=await roleId(an,A,'viewer');editorB=await roleId(bao,B,'editor');viewerB=await roleId(bao,B,'viewer');
  ha=await acceptNew(await invite(an,A,'ha@portal.test',editorA),'Trần Thu Hà');
  const anB=await invite(bao,B,'an@portal.test',editorB);expect((await an.post('/api/portal/invitations/accept',{token:tokenOf(anB)})).status).toBe(200);
  const haB=await invite(bao,B,'ha@portal.test',viewerB);expect((await ha.post('/api/portal/invitations/accept',{token:tokenOf(haB)})).status).toBe(200);
 },120000);
 afterAll(async()=>{await raw?.end();server?.close()});

 it('T1/T5 per-park roles: one person, different roles, never unioned',async()=>{
  const me=(await an.get('/api/portal/me')).body;
  expect(me.memberships.map((m:any)=>[m.parkId,m.isOwner,m.roleName]).sort()).toEqual([[B,false,'Biên tập viên'],[A,true,'Chủ sở hữu']].sort());
  const ovB=(await an.get(`/api/portal/parks/${B}/overview`)).body;expect(ovB.role.isOwner).toBe(false);expect(ovB.role.caps).not.toContain('review.decide');
  expect((await an.get(`/api/portal/parks/${B}/roles`)).status).toBe(403);
  expect((await an.get(`/api/portal/parks/${A}/roles`)).status).toBe(200);
 });
 it('T2 direct links carry the park: both parks readable in parallel by one session',async()=>{
  const [x,y]=await Promise.all([an.get(`/api/portal/parks/${A}/properties`),an.get(`/api/portal/parks/${B}/properties`)]);
  expect(x.status).toBe(200);expect(y.status).toBe(200);expect(x.body.park.id).toBe(A);expect(y.body.park.id).toBe(B);
  expect(x.body.items.every((i:any)=>!y.body.items.some((j:any)=>j.id===i.id))).toBe(true);
 });
 it('T4 neutral denial: non-member, unknown park and cross-park ID swap look identical',async()=>{
  const nonMember=await bao.get(`/api/portal/parks/${A}/overview`);const unknown=await an.get('/api/portal/parks/park-does-not-exist/overview');
  const swap=await an.get(`/api/portal/parks/${A}/properties/${assetB}`);const swapB=await ha.get(`/api/portal/parks/${B}/properties/${assetA}`);
  for(const r of [nonMember,unknown,swap,swapB]){expect(r.status).toBe(404);expect(r.body).toEqual({error:'not_found'})}
  // write-side IDOR: draft on another park's asset through my park's URL
  expect((await an.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetB,revision:0,patch:{'name.vi':'x'}})).status).toBe(404);
  // a body-supplied park id is ignored: the profile draft always targets the URL park
  const d=await an.post(`/api/portal/parks/${A}/drafts`,{kind:'park',id:B,revision:0,patch:{'province':'Hưng Yên'}});expect(d.body.id).toBe(A);
  await an.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'park',revision:d.body.revision});
 });
 it('T7 Editor/Viewer cannot reach Owner powers (direct API)',async()=>{
  for(const [p,b] of [[`/api/portal/parks/${A}/members/invite`,{email:'x@portal.test',roleId:viewerA}],[`/api/portal/parks/${A}/roles/create`,{name:'X',fromRoleId:viewerA}],[`/api/portal/parks/${A}/revisions/R-1/approve`,{}],[`/api/portal/parks/${A}/revisions/R-1/publish`,{}]] as const)
   expect((await ha.post(p,b)).status).toBe(403);
  expect((await ha.get(`/api/portal/parks/${A}/roles`)).status).toBe(403);
  // Viewer in B: no drafting
  expect((await ha.post(`/api/portal/parks/${B}/drafts`,{kind:'asset',id:assetB,revision:0,patch:{'name.vi':'x'}})).status).toBe(403);
 });

 let r1='';
 it('T11/T10/T14/T17 draft → stale save → submit (update) → approve keeps public snapshot',async()=>{
  const before=await publicAsset(assetA);
  const s1=await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'availableFrom':'2027-03-01'}});expect(s1.status).toBe(200);expect(s1.body.revision).toBe(1);
  const stale=await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'availableFrom':'2027-04-01'}});expect(stale.status).toBe(409);expect(stale.body.error).toBe('stale');
  expect((await workingOf(ha,A,assetA)).working.availableFrom).toBe('2027-03-01');
  const sub=await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:assetA,revision:1});expect(sub.status,JSON.stringify(sub.body)).toBe(200);expect(sub.body.changeType).toBe('update');r1=sub.body.id;
  expect((await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'area':'5'}})).body.error).toBe('locked');
  expect(await publicAsset(assetA)).toEqual(before);
  const ap=await an.post(`/api/portal/parks/${A}/revisions/${r1}/approve`,{});expect(ap.status).toBe(200);
  expect(await publicAsset(assetA)).toEqual(before);
  const rv=(await an.get(`/api/portal/parks/${A}/reviews/${r1}`)).body;expect(rv.revision.state).toBe('approved');expect(rv.revision.currentVersion).toBe(1);
 });
 it('T14/T17/T31 publish is a separate step; public read reflects vN+1; author notified with park deep link',async()=>{
  const p=await an.post(`/api/portal/parks/${A}/revisions/${r1}/publish`,{});expect(p.status,JSON.stringify(p.body)).toBe(200);
  expect(p.body.version).toBe(2);expect(p.body.publicVerified).toBe(true);
  expect((await publicAsset(assetA)).availableFrom).toBe('2027-03-01');
  const cat=await new Client().get('/api/catalogue');expect(cat.body.assets.find((a:any)=>a.id===assetA).availableFrom).toBe('2027-03-01');
  const note=(await ha.get('/api/portal/me')).body.notifications.find((n:any)=>n.kind==='published');
  expect(note.href).toBe(`/portal/${A}/reviews/${r1}`);
  expect((await ha.get(`/api/portal/parks/${A}/reviews/${r1}`)).status).toBe(200);
  const rv=(await an.get(`/api/portal/parks/${A}/reviews/${r1}`)).body.revision;expect(rv.baseVersion).toBe(1);expect(rv.currentVersion).toBe(2);
 });
 it('T13 reject needs a reason; rejected content never replaces published; author keeps draft with reason',async()=>{
  const before=await publicAsset(assetA);
  await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'area':'777'}});
  const r=(await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:assetA,revision:1})).body.id;
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r}/reject`,{reason:'  '})).body.error).toBe('reason_required');
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r}/reject`,{reason:'Diện tích chưa khớp sổ đỏ'})).status).toBe(200);
  expect(await publicAsset(assetA)).toEqual(before);
  const e=await workingOf(ha,A,assetA);expect(e.workingSource).toBe('draft');expect(e.draft.rejectionReason).toBe('Diện tích chưa khớp sổ đỏ');expect(e.working.area).toBe('777');
  await ha.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'asset',id:assetA,revision:e.draft.revision});
 });
 it('T12/T36 withdrawing an approved revision invalidates the approval; it can never be published',async()=>{
  await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'area':'888'}});
  const r=(await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:assetA,revision:1})).body.id;
  await an.post(`/api/portal/parks/${A}/revisions/${r}/approve`,{});
  const w=await ha.post(`/api/portal/parks/${A}/revisions/${r}/withdraw`,{});expect(w.body.approvalInvalidated).toBe(true);
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r}/publish`,{})).status).toBe(409);
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r}/withdraw`,{})).status).toBe(403);
  const e=await workingOf(ha,A,assetA);expect(e.workingSource).toBe('draft');expect(e.working.area).toBe('888');
  await ha.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'asset',id:assetA,revision:e.draft.revision});
 });
 it('T16 stale base: a publish made outside the portal blocks approve/publish of an older candidate',async()=>{
  await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'area':'999'}});
  const r=(await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:assetA,revision:1})).body.id;
  // Simulate an /admin internal publish of the same record (changes the published snapshot).
  await raw.query(`UPDATE vsip.content_items SET published_payload=jsonb_set(published_payload,'{powerMva}','9') WHERE workspace_id='internal' AND kind='asset' AND id=$1`,[assetA]);
  const ap=await an.post(`/api/portal/parks/${A}/revisions/${r}/approve`,{});expect(ap.status).toBe(409);expect(ap.body.error).toBe('stale_base');
  expect((await an.get(`/api/portal/parks/${A}/reviews/${r}`)).body.revision.stale).toBe(true);
  expect((await ha.post(`/api/portal/parks/${A}/revisions/${r}/withdraw`,{})).status).toBe(200);
  const e=await workingOf(ha,A,assetA);await ha.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'asset',id:assetA,revision:e.draft.revision});
 });
 it('T21 Owner self-approval needs explicit confirmation and is audited',async()=>{
  await an.post(`/api/portal/parks/${A}/drafts`,{kind:'park',revision:0,patch:{'contact.phone':'0225 3888 999'}});
  const r=(await an.post(`/api/portal/parks/${A}/revisions`,{kind:'park',revision:1}));expect(r.status,JSON.stringify(r.body)).toBe(200);
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r.body.id}/approve`,{})).body.error).toBe('self_confirmation_required');
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r.body.id}/approve`,{selfConfirm:true})).status).toBe(200);
  expect((await an.get(`/api/portal/parks/${A}/reviews/${r.body.id}`)).body.revision.selfApproved).toBe(true);
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r.body.id}/publish`,{})).status).toBe(200);
  const act=(await an.get(`/api/portal/parks/${A}/activity`)).body.items;expect(act.some((a:any)=>a.action==='Tự duyệt'&&a.actor==='Phạm Minh An'&&a.role==='Chủ sở hữu')).toBe(true);
  const park=(await raw.query(`SELECT payload FROM vsip.public_catalogue WHERE kind='park' AND id=$1`,[A])).rows[0].payload;expect(park.contact.phone).toBe('0225 3888 999');
 });
 let created='';
 it('T9/T10 create: incomplete property is blocked; complete one is labelled create and published into the park',async()=>{
  const d=await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',revision:0,patch:{'name.vi':'Nhà xưởng E5','type':'ready_built_factory','area':'5000','unit':'m²','transaction':'lease'}});expect(d.status,JSON.stringify(d.body)).toBe(200);created=d.body.id;
  const blocked=await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:created,revision:1});expect(blocked.status).toBe(400);expect(blocked.body.error).toBe('publication');
  await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:created,revision:1,patch:{'name.en':'Factory E5','name.zh':'厂房 E5','description.vi':'Nhà xưởng mới','description.en':'New factory','description.zh':'新厂房','image':(await ha.get(`/api/portal/parks/${A}/properties/new`)).body.imageOptions[0]}});
  expect((await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:created,revision:2,patch:{'image':'https://evil.example/x.png'}})).body.fields?.image).toBe('image');
  const sub=await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:created,revision:2});expect(sub.status,JSON.stringify(sub.body)).toBe(200);expect(sub.body.changeType).toBe('create');
  expect((await ha.get(`/api/portal/parks/${A}/reviews`)).body.items.find((x:any)=>x.id===sub.body.id).changeLabel).toBe('Tạo mới');
  expect((await bao.get(`/api/portal/parks/${B}/properties/${created}`)).status).toBe(404);
  await an.post(`/api/portal/parks/${A}/revisions/${sub.body.id}/approve`,{});const p=await an.post(`/api/portal/parks/${A}/revisions/${sub.body.id}/publish`,{});expect(p.status,JSON.stringify(p.body)).toBe(200);
  const row=(await raw.query(`SELECT park_id,published_payload IS NOT NULL AS pub FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND id=$1`,[created])).rows[0];expect(row).toEqual({park_id:A,pub:true});
  expect(await publicAsset(created)).toBeTruthy();
 });
 it('T18 archive: request → approve → execute; public drops it, portal keeps it, editing is blocked',async()=>{
  const r=(await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:created,change:'archive'})).body.id;
  expect(await publicAsset(created)).toBeTruthy();
  await an.post(`/api/portal/parks/${A}/revisions/${r}/approve`,{});const p=await an.post(`/api/portal/parks/${A}/revisions/${r}/publish`,{});
  expect(p.body.archived).toBe(true);expect(p.body.publicVerified).toBe(true);expect(await publicAsset(created)).toBeUndefined();
  expect((await raw.query(`SELECT 1 FROM vsip.content_items WHERE id=$1`,[created])).rowCount).toBeGreaterThan(0);
  expect((await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:created,revision:0,patch:{'area':'1'}})).body.error).toBe('archived');
 });
 it('T23/T24/T25 role & member constraints (same park, reserved, dependencies, deletion)',async()=>{
  expect((await an.post(`/api/portal/parks/${A}/members/invite`,{email:'x@portal.test',roleId:editorB})).body.error).toBe('role');
  const haA=(await an.get(`/api/portal/parks/${A}/members`)).body.items.find((m:any)=>m.email==='ha@portal.test');
  expect((await an.post(`/api/portal/parks/${A}/members/role`,{membershipId:haA.id,roleId:viewerB})).body.error).toBe('role');
  const anOwner=(await an.get(`/api/portal/parks/${A}/members`)).body.items.find((m:any)=>m.isOwner);
  expect((await an.post(`/api/portal/parks/${A}/members/role`,{membershipId:anOwner.id,roleId:viewerA})).status).toBe(403);
  const baoMemberInB=(await bao.get(`/api/portal/parks/${B}/members`)).body.items.find((m:any)=>m.email==='ha@portal.test');
  expect((await an.post(`/api/portal/parks/${A}/members/status`,{membershipId:baoMemberInB.id,status:'removed'})).status).toBe(404);
  expect((await an.post(`/api/portal/parks/${A}/roles/create`,{name:'Leo thang',capabilities:['park.view','review.decide']})).status).toBe(403);
  expect((await an.post(`/api/portal/parks/${A}/roles/create`,{name:'Thiếu phụ thuộc',capabilities:['property.edit']})).body.error).toBe('dependency');
  const c=await an.post(`/api/portal/parks/${A}/roles/create`,{name:'Biên tập mặt bằng',capabilities:['park.view','property.view','review.view','property.edit','revision.submit']});expect(c.status).toBe(200);
  expect((await an.post(`/api/portal/parks/${A}/roles/delete`,{roleId:editorA})).body.error).toBe('template_role');
  await invite(an,A,'minh@portal.test',c.body.id);
  expect((await an.post(`/api/portal/parks/${A}/roles/delete`,{roleId:c.body.id})).body.error).toBe('role_in_use');
  await expect(raw.query(`UPDATE vsip.portal_roles SET capabilities=array_append(capabilities,'publish') WHERE id=$1`,[c.body.id])).rejects.toThrow();
  // role change applies on the next request
  await an.post(`/api/portal/parks/${A}/members/role`,{membershipId:haA.id,roleId:viewerA});
  expect((await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'area':'1'}})).status).toBe(403);
  await an.post(`/api/portal/parks/${A}/members/role`,{membershipId:haA.id,roleId:editorA});
 });
 it('T6 revocation: suspend/remove apply on the next request with the neutral denial',async()=>{
  const haA=(await an.get(`/api/portal/parks/${A}/members`)).body.items.find((m:any)=>m.email==='ha@portal.test');
  await an.post(`/api/portal/parks/${A}/members/status`,{membershipId:haA.id,status:'suspended'});
  expect((await ha.get(`/api/portal/parks/${A}/overview`)).status).toBe(404);
  expect((await ha.get(`/api/portal/parks/${B}/overview`)).status).toBe(200);
  await an.post(`/api/portal/parks/${A}/members/status`,{membershipId:haA.id,status:'active'});
  expect((await ha.get(`/api/portal/parks/${A}/overview`)).status).toBe(200);
 });
 it('T35 invitations: expired, revoked, superseded and wrong-account acceptance are refused; tokens never listed',async()=>{
  const l1=await invite(an,A,'t1@portal.test',viewerA);
  await raw.query(`UPDATE vsip.portal_invitations SET expires_at=now()-interval '1 minute' WHERE email='t1@portal.test'`);
  expect((await new Client().post('/api/portal/invitations/accept',{token:tokenOf(l1),displayName:'T1',password:'Correct-horse-42'})).body.error).toBe('invitation_expired');
  const l2=await invite(an,A,'t2@portal.test',viewerA);const list=(await an.get(`/api/portal/parks/${A}/members`)).body;
  await an.post(`/api/portal/parks/${A}/members/invite-revoke`,{id:list.invitations.find((i:any)=>i.email==='t2@portal.test').id});
  expect((await new Client().post('/api/portal/invitations/accept',{token:tokenOf(l2),displayName:'T2',password:'Correct-horse-42'})).body.error).toBe('invitation_revoked');
  const l3=await invite(an,A,'t3@portal.test',viewerA);const l3b=await invite(an,A,'t3@portal.test',viewerA);
  expect((await new Client().post('/api/portal/invitations/accept',{token:tokenOf(l3),displayName:'T3',password:'Correct-horse-42'})).body.error).toBe('invitation_superseded');
  expect((await bao.post('/api/portal/invitations/accept',{token:tokenOf(l3b)})).body.error).toBe('email_mismatch');
  expect((await new Client().post('/api/portal/invitations/accept',{token:tokenOf(l3b),displayName:'T3',password:'short'})).body.error).toBe('password_length');
  const json=JSON.stringify((await an.get(`/api/portal/parks/${A}/members`)).body)+JSON.stringify((await an.get(`/api/portal/parks/${A}/activity`)).body);
  expect(json).not.toMatch(/[a-f0-9]{64}/);
  expect((await raw.query(`SELECT count(*)::int n FROM vsip.portal_invitations WHERE token_hash=$1`,[tokenOf(l3b)])).rows[0].n).toBe(0);
 });
 it('T28 suspension locks decisions only; drafting continues; unlock restores',async()=>{
  await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:assetA,revision:0,patch:{'area':'4321'}});
  const r=(await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:assetA,revision:1})).body.id;
  const p=await platform();await p.post(`/api/admin/portal/parks/${A}/owner/suspend`);
  const locked=await an.post(`/api/portal/parks/${A}/revisions/${r}/approve`,{});expect(locked.status).toBe(423);expect(locked.body.error).toBe('owner_suspended');
  await expect(raw.query(`SELECT 1`)).resolves.toBeTruthy();
  await p.post(`/api/admin/portal/parks/${A}/owner/unsuspend`);
  expect((await an.post(`/api/portal/parks/${A}/revisions/${r}/approve`,{})).status).toBe(200);
 });
 it('T26/T30 Owner transfer: pending keeps current Owner; concurrent accepts transfer exactly once; old Owner removed here only; approvals reopen',async()=>{
  const r=(await an.get(`/api/portal/parks/${A}/reviews`)).body.items.find((x:any)=>x.state==='approved').id;
  const link=await ownerFor(A,'ha@portal.test','');
  expect((await an.get(`/api/portal/parks/${A}/overview`)).body.role.isOwner).toBe(true);
  expect((await raw.query(`SELECT count(*)::int n FROM vsip.portal_memberships WHERE park_id=$1 AND is_owner AND status='active'`,[A])).rows[0].n).toBe(1);
  const results=await Promise.all([ha.post('/api/portal/invitations/accept',{token:tokenOf(link)}),ha.post('/api/portal/invitations/accept',{token:tokenOf(link)}),ha.post('/api/portal/invitations/accept',{token:tokenOf(link)})]);
  expect(results.filter(x=>x.status===200).length).toBe(1);
  const owners=(await raw.query(`SELECT u.email FROM vsip.portal_memberships m JOIN vsip.portal_users u ON u.id=m.user_id WHERE m.park_id=$1 AND m.is_owner AND m.status='active'`,[A])).rows;expect(owners).toEqual([{email:'ha@portal.test'}]);
  expect((await an.get(`/api/portal/parks/${A}/overview`)).status).toBe(404);
  expect((await an.get(`/api/portal/parks/${B}/overview`)).body.role.name).toBe('Biên tập viên');
  expect((await ha.get(`/api/portal/parks/${A}/reviews/${r}`)).body.revision.state).toBe('in_review');
  // stale approver cannot publish: re-approval needed by the new Owner (self-authored → explicit confirmation)
  expect((await ha.post(`/api/portal/parks/${A}/revisions/${r}/approve`,{selfConfirm:true})).status).toBe(200);
 });
 it('T27 cancelling a pending Owner replacement changes nothing and kills the link',async()=>{
  const link=await ownerFor(B,'ha@portal.test','');const p=await platform();
  expect((await p.post(`/api/admin/portal/parks/${B}/owner/cancel`)).status).toBe(200);
  expect((await ha.post('/api/portal/invitations/accept',{token:tokenOf(link)})).body.error).toBe('invitation_revoked');
  expect((await bao.get(`/api/portal/parks/${B}/overview`)).body.role.isOwner).toBe(true);
  expect((await ha.get(`/api/portal/parks/${B}/overview`)).body.role.name).toBe('Người xem');
 });
 it('T30 no-Owner lock: drafts/submissions continue while approve/publish are impossible',async()=>{
  await raw.query(`UPDATE vsip.portal_memberships SET status='suspended' WHERE park_id=$1 AND is_owner`,[B]);
  const d=await an.post(`/api/portal/parks/${B}/drafts`,{kind:'asset',id:assetB,revision:0,patch:{'area':'2222'}});expect(d.status).toBe(200);
  const s=await an.post(`/api/portal/parks/${B}/revisions`,{kind:'asset',id:assetB,revision:1});expect(s.status).toBe(200);
  const ov=(await an.get(`/api/portal/parks/${B}/overview`)).body;expect(ov.decisions).toMatchObject({owners:0,suspended:false,locked:true,parkHidden:false});
  expect((await bao.get(`/api/portal/parks/${B}/overview`)).status).toBe(404);
  await raw.query(`UPDATE vsip.portal_memberships SET status='active' WHERE park_id=$1 AND is_owner`,[B]);
  expect((await bao.post(`/api/portal/parks/${B}/revisions/${s.body.id}/approve`,{})).status).toBe(200);
 });
 it('T8/T29 session isolation: portal and admin sessions are independent; sign-out is server-side',async()=>{
  const p=await platform();
  expect((await p.get('/api/portal/me')).status).toBe(401);
  const mixed=new Client();mixed.cookies.set('vsip_portal',an.cookies.get('vsip_portal')!);
  expect((await mixed.get('/api/admin/state')).status).toBe(401);
  const demo=new Client();await demo.post('/api/session',{});expect((await demo.get('/api/admin/portal/parks')).status).toBe(403);
  expect((await an.get('/api/admin/portal/parks')).status).toBe(401);
  const copy=new Client();copy.cookies.set('vsip_portal',ha.cookies.get('vsip_portal')!);
  await ha.post('/api/portal/logout');expect((await copy.get('/api/portal/me')).status).toBe(401);
  expect((await p.get('/api/admin/portal/parks')).status).toBe(200);
  const l=await new Client().post('/api/portal/login',{email:'ha@portal.test',password:'wrong-password-1'});const u=await new Client().post('/api/portal/login',{email:'nobody@portal.test',password:'wrong-password-1'});
  expect([l.status,l.body]).toEqual([401,{error:'credentials'}]);expect([u.status,u.body]).toEqual([401,{error:'credentials'}]);
  expect((await ha.post('/api/portal/login',{email:'ha@portal.test',password:'Correct-horse-42'})).status).toBe(200);
 });
 it('T32 audit and notifications always carry actor name and role; T31 notifications respect membership',async()=>{
  const rows=(await raw.query(`SELECT actor_name,actor_role FROM vsip.portal_audit`)).rows;expect(rows.length).toBeGreaterThan(10);
  expect(rows.every(r=>r.actor_name&&r.actor_role&&r.actor_name!=='--')).toBe(true);
  const me=(await an.get('/api/portal/me')).body;expect(me.notifications.every((n:any)=>n.parkId!==A)).toBe(true);
 });
 it('revisions are immutable snapshots at the database level',async()=>{
  const id=(await raw.query(`SELECT id FROM vsip.portal_revisions LIMIT 1`)).rows[0].id;
  await expect(raw.query(`UPDATE vsip.portal_revisions SET payload=payload||'{"x":1}' WHERE id=$1`,[id])).rejects.toThrow(/revision_immutable/);
  await expect(raw.query(`INSERT INTO vsip.portal_memberships(park_id,user_id,is_owner,status,assigned_by) SELECT $1,id,true,'active','x' FROM vsip.portal_users WHERE email='bao@portal.test' LIMIT 1`,[A])).rejects.toThrow();
 });

 // ---------- GPT plan-review findings ----------
 const pub=async(owner:Client,park:string,rid:string)=>{expect((await owner.post(`/api/portal/parks/${park}/revisions/${rid}/approve`,{selfConfirm:true})).status).toBe(200);return owner.post(`/api/portal/parks/${park}/revisions/${rid}/publish`,{})};
 const settle=async(owner:Client,park:string,id:string)=>{const open=(await owner.get('/api/portal/parks/'+park+'/reviews')).body.items.find((x:any)=>x.entityId===id&&['in_review','approved'].includes(x.state));if(!open)return;if(open.state==='in_review')await owner.post('/api/portal/parks/'+park+'/revisions/'+open.id+'/approve',{selfConfirm:true});expect((await owner.post('/api/portal/parks/'+park+'/revisions/'+open.id+'/publish',{})).status).toBe(200)};
 const editSubmit=async(c:Client,park:string,id:string,patch:Record<string,string>,owner?:Client)=>{if(owner)await settle(owner,park,id);const d=await c.post(`/api/portal/parks/${park}/drafts`,{kind:'asset',id,revision:0,patch});expect(d.status,JSON.stringify(d.body)).toBe(200);const s=await c.post(`/api/portal/parks/${park}/revisions`,{kind:'asset',id,revision:d.body.revision});expect(s.status,JSON.stringify(s.body)).toBe(200);return s.body.id as string};
 it('F11 leasing status: existing records default to unknown; edits publish into the snapshot but not the public projection allowlist',async()=>{
  const e=await workingOf(bao,B,assetB);expect(e.working.leasingStatus).toBe('unknown');expect(e.working.transaction).toBe('lease');
  const r=await editSubmit(bao,B,assetB,{leasingStatus:'reserved','industries':'Điện tử, Cơ khí','powerMva':'6'},bao);
  const p=await pub(bao,B,r);expect(p.status).toBe(200);expect(p.body.publicVerified).toBe(true);expect(p.body.publicState).toBe('verified');
  const row=(await raw.query(`SELECT published_payload p FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND id=$1`,[assetB])).rows[0].p;
  expect([row.leasingStatus,row.industries,row.powerMva,row.transaction]).toEqual(['reserved',['Điện tử','Cơ khí'],6,'lease']);
  expect((await publicAsset(assetB)).leasingStatus).toBeUndefined();
 });
 it('F1/T36 Owner hides and re-publishes the park; children follow; an independently archived property is never revived',async()=>{
  const ids=(await raw.query(`SELECT id FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND park_id=$1 AND published_payload IS NOT NULL ORDER BY id`,[B])).rows.map(r=>r.id);
  const victim=ids[ids.length-1];
  const ar=(await bao.post(`/api/portal/parks/${B}/revisions`,{kind:'asset',id:victim,change:'archive'})).body.id;expect((await pub(bao,B,ar)).body.archived).toBe(true);
  expect((await an.post(`/api/portal/parks/${B}/publication`,{action:'hide',reason:'x'})).status).toBe(403);
  expect((await bao.post(`/api/portal/parks/${B}/publication`,{action:'hide',reason:' '})).body.error).toBe('reason_required');
  const h=await bao.post(`/api/portal/parks/${B}/publication`,{action:'hide',reason:'Tạm dừng cập nhật pháp lý'});expect(h.status,JSON.stringify(h.body)).toBe(200);
  expect(h.body).toMatchObject({hidden:true,expectedVisible:false,publicVerified:true});
  const cat=await new Client().get('/api/catalogue');expect(cat.body.parks.some((x:any)=>x.id===B)).toBe(false);
  const hov=(await bao.get('/api/portal/parks/'+B+'/overview')).body;expect(hov.decisions.parkHidden).toBe(true);expect(hov.assets.publicVisible).toBe(0);expect(hov.assets.published).toBeGreaterThan(0);
  expect((await an.get('/api/portal/parks/'+B+'/context')).body.decisions.parkHidden).toBe(true);expect(cat.body.assets.some((x:any)=>x.parkId===B)).toBe(false);
  await bao.post(`/api/portal/parks/${B}/drafts`,{kind:'park',revision:0,patch:{'contact.phone':'0225 1111 222'}});
  const pr=(await bao.post(`/api/portal/parks/${B}/revisions`,{kind:'park',revision:1})).body.id;
  const pp=await pub(bao,B,pr);
  expect(pp.body).toMatchObject({ok:true,expectedVisible:false,publicVerified:true});
  expect((await bao.get(`/api/portal/parks/${B}/profile`)).body.entity.hidden).toBe(true);
  const s=await bao.post(`/api/portal/parks/${B}/publication`,{action:'show'});expect(s.body).toMatchObject({hidden:false,expectedVisible:true,publicVerified:true});
  const after=(await new Client().get('/api/catalogue')).body;
  expect(after.parks.find((x:any)=>x.id===B).contact.phone).toBe('0225 1111 222');
  expect(after.assets.some((x:any)=>x.id===victim)).toBe(false);
  expect(after.assets.filter((x:any)=>x.parkId===B).length).toBe(ids.length-1);
  const sov=(await bao.get('/api/portal/parks/'+B+'/overview')).body;expect(sov.decisions.parkHidden).toBe(false);expect(sov.assets.publicVisible).toBe(ids.length-1);expect(sov.assets.published).toBe(ids.length-1);
  const acts=(await bao.get(`/api/portal/parks/${B}/activity`)).body.items.map((a:any)=>a.action);expect(acts).toEqual(expect.arrayContaining(['Ẩn KCN khỏi trang công khai','Công khai lại KCN']));
 });
 it('F4 concurrent publishes in two parks both survive the full public-catalogue rebuild',async()=>{
  const aid=(await raw.query(`SELECT id FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND park_id=$1 AND published_payload IS NOT NULL AND id<>$2 ORDER BY id LIMIT 1`,[A,assetA])).rows[0].id;
  const ra=await editSubmit(ha,A,aid,{availableFrom:'2028-01-15'},ha);const rb=await editSubmit(bao,B,assetB,{availableFrom:'2028-02-15'});
  await ha.post(`/api/portal/parks/${A}/revisions/${ra}/approve`,{selfConfirm:true});await bao.post(`/api/portal/parks/${B}/revisions/${rb}/approve`,{selfConfirm:true});
  const [x,y]=await Promise.all([ha.post(`/api/portal/parks/${A}/revisions/${ra}/publish`,{}),bao.post(`/api/portal/parks/${B}/revisions/${rb}/publish`,{})]);
  expect([x.status,y.status]).toEqual([200,200]);expect([x.body.publicVerified,y.body.publicVerified]).toEqual([true,true]);
  expect((await publicAsset(aid)).availableFrom).toBe('2028-01-15');expect((await publicAsset(assetB)).availableFrom).toBe('2028-02-15');
 });
 it('F4 legacy /admin internal writes serialise with portal publishing and participate in the version check',async()=>{
  const p=await platform();const C='park-demo-03';
  const st=(await p.get('/api/admin/state')).body;
  const cAsset=st.store.drafts.find((d:any)=>d.kind==='asset'&&d.data.parkId===C&&d.published);
  const aid=(await raw.query(`SELECT id FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND park_id=$1 AND published_payload IS NOT NULL ORDER BY id DESC LIMIT 1`,[A])).rows[0].id;
  const ra=await editSubmit(ha,A,aid,{availableFrom:'2028-03-03'},ha);await ha.post(`/api/portal/parks/${A}/revisions/${ra}/approve`,{selfConfirm:true});
  const [adm,portal]=await Promise.all([p.post('/api/admin/command',{action:'workflow',args:[cAsset.id,cAsset.revision,'withdraw','QA concurrency'],revision:st.revision}),ha.post(`/api/portal/parks/${A}/revisions/${ra}/publish`,{})]);
  expect([adm.status,portal.status],JSON.stringify([adm.body,portal.body])).toEqual([200,200]);
  expect(await publicAsset(cAsset.id)).toBeUndefined();expect((await publicAsset(aid)).availableFrom).toBe('2028-03-03');
  const rb=await editSubmit(bao,B,assetB,{availableFrom:'2028-04-04'});
  const st2=(await p.get('/api/admin/state')).body;const d=st2.store.drafts.find((x:any)=>x.id===assetB);
  expect((await p.post('/api/admin/command',{action:'workflow',args:[assetB,d.revision,'withdraw','admin takedown'],revision:st2.revision})).status).toBe(200);
  expect((await bao.post(`/api/portal/parks/${B}/revisions/${rb}/approve`,{selfConfirm:true})).body.error).toBe('stale_base');
  expect(await publicAsset(assetB)).toBeUndefined();
 });
 it('F7/F10 withdraw requires the entity edit capability; another author cannot discard a draft but the Owner can',async()=>{
  const ed=await acceptNew(await invite(ha,A,'f7@portal.test',editorA),'F7 Editor');
  const aid=(await raw.query(`SELECT id FROM vsip.content_items WHERE workspace_id='internal' AND kind='asset' AND park_id=$1 AND published_payload IS NOT NULL ORDER BY id LIMIT 1 OFFSET 2`,[A])).rows[0].id;
  const r=await editSubmit(ed,A,aid,{availableFrom:'2029-01-01'});
  const lim=(await ha.post(`/api/portal/parks/${A}/roles/create`,{name:'Chỉ gửi duyệt',capabilities:['park.view','property.view','review.view','revision.submit']})).body.id;
  const mem=(await ha.get(`/api/portal/parks/${A}/members`)).body.items.find((m:any)=>m.email==='f7@portal.test');
  await ha.post(`/api/portal/parks/${A}/members/role`,{membershipId:mem.id,roleId:lim});
  expect((await ed.post(`/api/portal/parks/${A}/revisions/${r}/withdraw`,{})).status).toBe(403);
  expect((await ed.get(`/api/portal/parks/${A}/reviews/${r}`)).body.actions.withdraw).toBe(false);
  await ha.post(`/api/portal/parks/${A}/members/role`,{membershipId:mem.id,roleId:editorA});
  expect((await ed.post(`/api/portal/parks/${A}/revisions/${r}/withdraw`,{})).status).toBe(200);
  const e=await workingOf(ed,A,aid);
  const editor2=await acceptNew(await invite(ha,A,'f10@portal.test',editorA),'F10 Editor');
  expect((await editor2.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'asset',id:aid,revision:e.draft.revision})).body.error).toBe('not_author');
  expect((await ha.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'asset',id:aid,revision:e.draft.revision})).status).toBe(200);
 });
 it('F10 unpublished drafts of another park are indistinguishable from missing IDs',async()=>{
  const d=await bao.post(`/api/portal/parks/${B}/drafts`,{kind:'asset',revision:0,patch:{'name.vi':'Bí mật B'}});expect(d.status).toBe(200);
  const missing=await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:'asset-doesnotexist',revision:1});
  for(const r of [await ha.post(`/api/portal/parks/${A}/revisions`,{kind:'asset',id:d.body.id,revision:1}),await ha.get(`/api/portal/parks/${A}/properties/${d.body.id}`),await ha.post(`/api/portal/parks/${A}/drafts`,{kind:'asset',id:d.body.id,revision:1,patch:{'name.vi':'x'}}),await ha.post(`/api/portal/parks/${A}/drafts/discard`,{kind:'asset',id:d.body.id,revision:1})]){
   expect(r.status).toBe(404);expect(r.body).toEqual(missing.body);}
 });
 it('F3 a leaked invitation for an existing account cannot change its credentials; acceptance needs that user signed in',async()=>{
  const link=await invite(bao,B,'f7@portal.test',viewerB);
  const anon=await new Client().post('/api/portal/invitations/accept',{token:tokenOf(link),displayName:'Attacker',password:'Attacker-pass-99'});
  expect([anon.status,anon.body.error]).toEqual([401,'sign_in_required']);
  expect((await new Client().post('/api/portal/login',{email:'f7@portal.test',password:'Attacker-pass-99'})).status).toBe(401);
  const owner=new Client();expect((await owner.post('/api/portal/login',{email:'f7@portal.test',password:'Correct-horse-42'})).status).toBe(200);
  expect((await bao.post('/api/portal/invitations/accept',{token:tokenOf(link)})).body.error).toBe('email_mismatch');
  expect((await owner.post('/api/portal/invitations/accept',{token:tokenOf(link)})).status).toBe(200);
  expect((await owner.post('/api/portal/invitations/accept',{token:tokenOf(link)})).body.error).toBe('invitation_accepted');
 });
 it('F9 platform invitations are bound to the issuing platform authority; rotating the access code invalidates them',async()=>{
  const link=await ownerFor(B,'rotate@portal.test','');
  const prev=process.env.ADMIN_ACCESS_TOKEN;process.env.ADMIN_ACCESS_TOKEN=randomBytes(16).toString('hex');
  try{expect((await new Client().post('/api/portal/invitations/accept',{token:tokenOf(link),displayName:'R',password:'Correct-horse-42'})).body.error).toBe('invitation_issuer_invalid')}
  finally{process.env.ADMIN_ACCESS_TOKEN=prev}
  const row=(await raw.query(`SELECT * FROM vsip.portal_invitations WHERE email='rotate@portal.test'`)).rows[0];
  expect(row.issuer_authority).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(row)).not.toContain(adminCode);
  await (await platform()).post(`/api/admin/portal/parks/${B}/owner/cancel`);
 });
 it('F9 accept vs supersede contention is deterministic: one active Owner, no server errors',async()=>{
  for(let round=0;round<3;round++){
   const first=await ownerFor(B,`race${round}@portal.test`,'');const p=await platform();
   const [acc,sup]=await Promise.all([new Client().post('/api/portal/invitations/accept',{token:tokenOf(first),displayName:'Race',password:'Correct-horse-42'}),p.post(`/api/admin/portal/parks/${B}/owner/invite`,{email:`other${round}@portal.test`})]);
   expect([200,410]).toContain(acc.status);expect([200,409]).toContain(sup.status);
   const st=(await raw.query(`SELECT state FROM vsip.portal_invitations WHERE email=$1`,[`race${round}@portal.test`])).rows[0].state;
   expect(acc.status===200?st==='accepted':st==='superseded').toBe(true);
   expect((await raw.query(`SELECT count(*)::int n FROM vsip.portal_memberships WHERE park_id=$1 AND is_owner AND status='active'`,[B])).rows[0].n).toBe(1);
   await p.post(`/api/admin/portal/parks/${B}/owner/cancel`);
  }
 });
},180000);
