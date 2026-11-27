// Local QA fixtures for the park portal. Provisions accounts ONLY through the real product flows
// (platform-admin Owner invitation -> acceptance -> Owner member invitations) against a LOOPBACK API.
// Random passwords are written to PORTAL_QA_ACCOUNTS_FILE (outside the repository, mode 0600); nothing is printed.
// Usage: PORTAL_DEV_ENV_FILE=... PORTAL_QA_ACCOUNTS_FILE=... tsx scripts/portal/qa-fixtures.ts
import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const api=process.env.PORTAL_QA_API||'http://127.0.0.1:8787';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(api))throw new Error('Fixtures only run against a loopback API');
const env=Object.fromEntries(readFileSync(process.env.PORTAL_DEV_ENV_FILE!,'utf8').split(/\r?\n/).filter(Boolean).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const out=process.env.PORTAL_QA_ACCOUNTS_FILE;if(!out)throw new Error('PORTAL_QA_ACCOUNTS_FILE is required');
const ORIGIN='http://127.0.0.1:5173';
class C{jar=new Map<string,string>();
 async call(path:string,body?:unknown){const h:Record<string,string>={Origin:ORIGIN};if(this.jar.size)h.Cookie=[...this.jar].map(([k,v])=>`${k}=${v}`).join('; ');if(body!==undefined)h['Content-Type']='application/json';
  const r=await fetch(api+'/api/'+path,{method:body===undefined?'GET':'POST',headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  for(const c of r.headers.getSetCookie()){const [kv]=c.split(';');const i=kv.indexOf('=');const v=kv.slice(i+1);if(v)this.jar.set(kv.slice(0,i),v);else this.jar.delete(kv.slice(0,i))}
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${path}: ${r.status} ${j.error}`);return j as any}}
const pw=()=>'Qa-'+randomBytes(9).toString('base64url');
const A='park-vsip-thai-binh',B='park-demo-02';
const people={an:{email:'an.pham@vsip-qa.test',name:'Phạm Minh An',password:pw()},ha:{email:'ha.tran@vsip-qa.test',name:'Trần Thu Hà',password:pw()},bao:{email:'bao.le@vsip-qa.test',name:'Lê Quốc Bảo',password:pw()},minh:{email:'minh.vu@vsip-qa.test',name:'Vũ Đức Minh',password:pw()}};
const tok=(l:string)=>l.split('#')[1];
const admin=new C();await admin.call('session',{internal:true,accessToken:env.ADMIN_ACCESS_TOKEN});
async function owner(park:string,p:typeof people.an){const {link}=await admin.call(`admin/portal/parks/${park}/owner/invite`,{email:p.email});const c=new C();await c.call('portal/invitations/accept',{token:tok(link),displayName:p.name,password:p.password});return c}
const an=await owner(A,people.an),bao=await owner(B,people.bao);
const roles=async(c:C,park:string)=>(await c.call(`portal/parks/${park}/roles`)).items as any[];
const rA=await roles(an,A),rB=await roles(bao,B);const ed=(r:any[])=>r.find(x=>x.template==='editor').id,vw=(r:any[])=>r.find(x=>x.template==='viewer').id;
const ha=new C();{const {link}=await an.call(`portal/parks/${A}/members/invite`,{email:people.ha.email,roleId:ed(rA)});await ha.call('portal/invitations/accept',{token:tok(link),displayName:people.ha.name,password:people.ha.password})}
{const {link}=await bao.call(`portal/parks/${B}/members/invite`,{email:people.an.email,roleId:ed(rB)});await an.call('portal/invitations/accept',{token:tok(link)})}
{const {link}=await bao.call(`portal/parks/${B}/members/invite`,{email:people.ha.email,roleId:vw(rB)});await ha.call('portal/invitations/accept',{token:tok(link)})}
const custom=(await an.call(`portal/parks/${A}/roles/create`,{name:'Biên tập mặt bằng',capabilities:['park.view','property.view','review.view','property.edit','property.create','revision.submit']})).id;
const minh=new C();{const {link}=await an.call(`portal/parks/${A}/members/invite`,{email:people.minh.email,roleId:custom});await minh.call('portal/invitations/accept',{token:tok(link),displayName:people.minh.name,password:people.minh.password})}
await an.call(`portal/parks/${A}/members/invite`,{email:'khanh.ngo@vsip-qa.test',roleId:vw(rA)});
// Content states: Hà's pending update in A; An's approved update in B awaiting Bảo; a draft in A.
const assetsA=(await an.call(`portal/parks/${A}/properties`)).items;const assetsB=(await bao.call(`portal/parks/${B}/properties`)).items;
await ha.call(`portal/parks/${A}/drafts`,{kind:'asset',id:assetsA[1].id,revision:0,patch:{availableFrom:'2027-02-01','pricing.mode':'negotiable'}});
await ha.call(`portal/parks/${A}/revisions`,{kind:'asset',id:assetsA[1].id,revision:1});
await an.call(`portal/parks/${B}/drafts`,{kind:'asset',id:assetsB[0].id,revision:0,patch:{availableFrom:'2026-12-15'}});
const rb=await an.call(`portal/parks/${B}/revisions`,{kind:'asset',id:assetsB[0].id,revision:1});await bao.call(`portal/parks/${B}/revisions/${rb.id}/approve`,{});
await ha.call(`portal/parks/${A}/drafts`,{kind:'asset',id:assetsA[2].id,revision:0,patch:{'description.vi':'Kho mát, đường nội bộ 2 làn.'}});
writeFileSync(out,JSON.stringify({note:'Local QA fixture accounts (isolated loopback DB only).',parks:{A,B},people},null,1),{mode:0o600});
console.log('QA fixtures provisioned through product flows; credentials stored outside the repository.');
