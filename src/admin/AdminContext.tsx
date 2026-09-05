import { createContext,useContext,useRef,useState,type ReactNode } from 'react';
import { useApp } from '../AppContext';
import {parks as seedParks,assets as seedAssets} from '../data';
import { initialAdmin,permissions,validRoles,validEmail,validPhone,validPassword,inviteStatus,contentErrors,publicationIssues,isPark,type AdminStore,type AdminUser,type AdminRole,type Content,type Draft,type Audit,type ImportBatch } from './model';
type Result={ok:boolean;error?:string;id?:string};
interface AdminState { store:AdminStore;current:AdminUser|undefined; can:(p:string)=>boolean; selectUser:(id:string)=>void; reset:()=>void;
  invite:(input:{name:string;email:string;phone:string;roles:AdminRole[]},resend?:string)=>Result;
  revoke:(id:string)=>Result; accept:(token:string,password:string,confirm:string)=>Result;
  updateUser:(id:string,revision:number,roles?:AdminRole[],access?:AdminUser['access'],reason?:string)=>Result;
  save:(data:Content,revision?:number)=>Result; workflow:(id:string,revision:number,action:'submit'|'approve'|'return'|'publish',reason?:string)=>Result;
  addBatch:(batch:ImportBatch)=>Result; applyBatch:(id:string,selected:string[])=>Result;
}
const C=createContext<AdminState|null>(null);
export function AdminProvider({children}:{children:ReactNode}){
  const app=useApp();const [store,setStore]=useState(()=>initialAdmin(app.parks,app.assets));const ref=useRef(store);ref.current=store;
  const [userId,setUserId]=useState('sa');const current=store.users.find(u=>u.id===userId);
  const can=(p:string)=>app.role==='admin'&&permissions(ref.current.users.find(u=>u.id===userId)).includes(p);
  const commit=(s:AdminStore)=>{ref.current=s;setStore(s)};
  const fail=(error:string):Result=>({ok:false,error});
  const audit=(s:AdminStore,domain:Audit['domain'],target:string,action:string,before:unknown,after:unknown,reason='')=>s.audit.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),actor:current?.name||'Invite recipient',domain,target,action,before:JSON.stringify(before),after:JSON.stringify(after),reason});
  const invite:AdminState['invite']=(input,resend)=>{
    if(!can('P13'))return fail('permission');if(!validRoles(input.roles))return fail('roles');
    const email=input.email.trim().toLowerCase(),name=input.name.trim();if(!name||name.length>255||!validEmail(email)||!validPhone(input.phone))return fail('validation');
    const s=structuredClone(ref.current),existing=s.users.find(u=>u.email===email);
    if(existing?.account==='active')return {ok:false,error:'existing',id:existing.id};if(existing?.account==='disabled')return fail('disabled');
    if(s.invites.some(i=>i.userId===existing?.id&&inviteStatus(i)==='pending'))return fail('duplicate');
    if(resend&&!s.invites.some(i=>i.id===resend&&inviteStatus(i)==='expired'))return fail('stale');
    const user=existing||{id:crypto.randomUUID(),name,email,phone:input.phone,roles:[],account:'invited' as const,access:'pending' as const,revision:1};
    if(!existing)s.users.push(user);else{user.name=name;user.phone=input.phone;}
    const id=`INV-${crypto.randomUUID().slice(0,8)}`,now=Date.now();
    s.invites.push({id,token:crypto.randomUUID(),userId:user.id,roles:[...input.roles],status:'pending',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+72*3600000).toISOString(),delivery:'pending'});
    audit(s,'users',user.id,resend?'resend':'invite',null,{id,roles:input.roles,email});commit(s);return {ok:true,id};
  };
  const revoke=(id:string)=>{if(!can('P13'))return fail('permission');const s=structuredClone(ref.current),i=s.invites.find(x=>x.id===id);if(!i||inviteStatus(i)!=='pending')return fail('stale');i.status='revoked';audit(s,'users',i.userId,'revoke','pending','revoked');commit(s);return {ok:true}};
  const accept:AdminState['accept']=(token,password,confirm)=>{
    const s=structuredClone(ref.current),i=s.invites.find(x=>x.token===token),u=s.users.find(x=>x.id===i?.userId);
    if(!i||!u||inviteStatus(i)!=='pending'||u.account!=='invited'||!validRoles(i.roles))return fail('invalidInvite');
    if(app.role==='admin'&&current?.email!==u.email)return fail('accountMismatch');
    if(!validPassword(password)||password!==confirm)return fail('password');
    u.roles=[...i.roles];u.account='active';u.access='active';u.revision++;i.status='accepted';
    audit(s,'users',u.id,'accept','pending',{roles:u.roles,access:u.access});commit(s);setUserId(u.id);app.setRole('admin');return {ok:true,id:u.id};
  };
  const updateUser:AdminState['updateUser']=(id,revision,roles,access,reason='')=>{
    if(!can('P14'))return fail('permission');const s=structuredClone(ref.current),u=s.users.find(x=>x.id===id);
    if(!u||u.roles.includes('SA'))return fail('protected');if(u.revision!==revision)return fail('stale');
    if(roles&&(!validRoles(roles)||u.account!=='active'))return fail('roles');
    if(access==='active'&&(u.account!=='active'||!validRoles(roles||u.roles)||u.access==='removed'&&!roles))return fail('disabled');
    if(access==='suspended'&&u.access!=='active'||access==='removed'&&!['active','suspended'].includes(u.access))return fail('stale');
    const before=structuredClone(u);if(roles)u.roles=[...roles];if(access)u.access=access;if(access==='removed')u.roles=[];u.revision++;
    audit(s,'users',id,roles?'roles':access||'access',before,u,reason);commit(s);return {ok:true};
  };
  const save:AdminState['save']=(data,revision)=>{
    if(!can('P02')&&!can('P08'))return fail('permission');const s=structuredClone(ref.current),d=s.drafts.find(d=>d.id===data.id);
    if(d&&d.revision!==revision)return fail('stale');if(Object.keys(contentErrors(data)).length)return fail('validation');
    if(!isPark(data)&&!s.drafts.some(d=>d.kind==='park'&&d.id===data.parkId))return fail('parkId');
    if(isPark(data)&&data.slug&&s.drafts.some(d=>d.id!==data.id&&isPark(d.data)&&d.data.slug===data.slug))return fail('slug');
    const stamp={updatedAt:new Date().toISOString(),updatedBy:current!.name};
    // Verification is a separate permission, never inferred from editing access.
    if(isPark(data)&&!can('P08')){
      const before=d&&isPark(d.data)?d.data:undefined;
      if(data.documents.some(doc=>{const old=before?.documents.find(x=>x.id===doc.id);return doc.verificationStatus!==(old?.verificationStatus||'unverified')||doc.visibility!==(old?.visibility||'admin_only')}))return fail('permission');
    }
    if(!can('P02')){
      if(!d)return fail('permission');
      const strip=(v:unknown):unknown=>Array.isArray(v)?v.map(strip):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['verificationStatus','visibility','approved','imageApproved','verifiedBy','lastVerifiedAt'].includes(k)).map(([k,x])=>[k,strip(x)])):v;
      if(JSON.stringify(strip(d.data))!==JSON.stringify(strip(data)))return fail('permission');
    }
    if(d){const before=d.data;d.data=structuredClone(data);d.state='draft';d.revision++;Object.assign(d,stamp);audit(s,'content',data.id,'save',before,data)}
    else{s.drafts.push({id:data.id,kind:isPark(data)?'park':'asset',data:structuredClone(data),revision:1,state:'draft',...stamp});audit(s,'content',data.id,'create',null,data)}
    commit(s);return {ok:true,id:data.id};
  };
  const workflow:AdminState['workflow']=(id,revision,action,reason='')=>{
    if(!can({submit:'P04',approve:'P05',return:'P05',publish:'P06'}[action]))return fail('permission');
    const s=structuredClone(ref.current),d=s.drafts.find(d=>d.id===id);if(!d||d.revision!==revision)return fail('stale');
    if(action==='submit'&&d.state!=='draft'||['approve','return'].includes(action)&&d.state!=='in_review'||action==='publish'&&d.state!=='approved')return fail('transition');
    if(action==='return'&&!reason.trim())return fail('reason');if(['approve','publish'].includes(action)&&publicationIssues(d.data,s.drafts).length)return fail('publication');
    if(action==='submit'&&(!d.data.name.vi||Object.keys(contentErrors(d.data)).length))return fail('validation');
    const before=d.state;d.state=({submit:'in_review',approve:'approved',return:'draft',publish:'published'} as const)[action];d.revision++;
    if(action==='publish'){d.published=structuredClone(d.data);if(isPark(d.published))d.published.publicationStatus='published';app.publishContent(d.published);}
    audit(s,'content',id,action,before,d.state,reason);commit(s);return {ok:true};
  };
  const addBatch=(batch:ImportBatch)=>{if(!can('P03'))return fail('permission');const old=ref.current.batches.find(b=>b.fingerprint===batch.fingerprint);if(old)return {ok:true,id:old.id};const s=structuredClone(ref.current);s.batches.unshift(batch);commit(s);return {ok:true,id:batch.id}};
  const applyBatch:AdminState['applyBatch']=(id,selected)=>{
    if(!can('P03'))return fail('permission');const s=structuredClone(ref.current),b=s.batches.find(b=>b.id===id);if(!b)return fail('stale');if(b.state==='complete')return {ok:true,id};if(!selected.length)return fail('selection');
    const rows=b.rows.filter(r=>selected.includes(`${r.sheet}:${r.row}`));
    for(const r of rows.filter(r=>r.sheet==='Products'))if(!s.drafts.some(d=>d.id===r.parkId&&d.kind==='park')&&!rows.some(p=>p.sheet==='Parks'&&p.id===r.parkId&&!p.errors.length))return fail('dependency');
    for(const r of [...rows].sort((a,b)=>a.sheet==='Parks'&&b.sheet!=='Parks'?-1:1)){
      if(r.errors.length||!r.after){r.result='failed';r.resultMessage='validation';continue;}
      const d=s.drafts.find(d=>d.id===r.id);
      if(r.action==='create'&&d||r.action==='update'&&(!d||d.revision!==r.revision)){r.result='failed';r.resultMessage='stale';continue;}
      if(r.sheet==='Products'&&!s.drafts.some(d=>d.kind==='park'&&d.id===r.parkId)){r.result='failed';r.resultMessage='parkId';continue;}
      if(d){d.data=structuredClone(r.after);d.revision++;d.state='draft';d.updatedBy=current!.name;r.result='updated';}
      else{s.drafts.push({id:r.id,kind:r.sheet==='Parks'?'park':'asset',data:structuredClone(r.after),revision:1,state:'draft',updatedAt:new Date().toISOString(),updatedBy:current!.name});r.result='created';}
      audit(s,'import',r.id,r.result,r.before,r.after);
    }b.state='complete';commit(s);return {ok:true,id};
  };
  return <C.Provider value={{store,current,can,selectUser:id=>{setUserId(id);app.setRole('admin')},reset:()=>{commit(initialAdmin(seedParks,seedAssets));setUserId('sa')},invite,revoke,accept,updateUser,save,workflow,addBatch,applyBatch}}>{children}</C.Provider>;
}
export const useAdmin=()=>{const c=useContext(C);if(!c)throw new Error('AdminProvider required');return c};
