import type { IndustrialParkProfile, IndustrialAsset } from '../types';
import {identifyRows} from './repeatedRows';
import {packageSeeds,type ServicePackage} from '../servicePackages';

export type AdminRole = 'SA' | 'ADMIN' | 'OPERATOR';
export const businessRoles: AdminRole[] = ['ADMIN','OPERATOR'];
export const rolePermissions: Record<AdminRole,string[]> = {
  SA: Array.from({length:23},(_,i)=>`P${String(i+1).padStart(2,'0')}`),
  ADMIN:['P01','P02','P03','P04','P05','P06','P07','P08','P11','P16','P18','P20','P22','P23'],
  OPERATOR:['P09','P10','P11','P17','P18','P20'],
};
export interface AdminUser { id:string; name:string; email:string; phone:string; role:AdminRole|null; account:'active'|'invited'|'disabled'; access:'active'|'pending'|'suspended'|'removed'; revision:number }
export interface Invite { id:string; token:string; userId:string; role:AdminRole; createdAt:string; expiresAt:string; status:'pending'|'accepted'|'revoked'; delivery:'pending'|'queued'|'failed' }
export interface Audit { id:string; at:string; actor:string; target:string; action:string; before:string; after:string; reason:string; domain:'users'|'content'|'import' }
export const permissions = (user?:AdminUser,matrix=rolePermissions) => !user || user.account!=='active' || user.access!=='active' || !user.role ? [] : user.role==='SA' ? rolePermissions.SA : matrix[user.role]||[];
export const firstAdminPage=(u?:AdminUser,matrix=rolePermissions)=>{const p=permissions(u,matrix);return p.includes('P11')?'/admin/dashboard':p.includes('P01')?'/admin/industrial-parks':p.includes('P09')?'/admin/requests':p.includes('P12')?'/admin/users':p.includes('P20')?'/admin/permissions':p.includes('P22')?'/admin/packages':'/admin/no-access'};
export const routePermission=(path:string)=>path.includes('/packages')?'P22':path.includes('/permissions')?'P20':path.includes('/users')?'P12':path.includes('/imports')?'P03':path.includes('/requests')?'P09':path.includes('/industrial-parks')||path.includes('/assets')?'P01':'P11';
export const inviteStatus=(i:Invite,now=Date.now())=>i.status==='pending'&&now>=Date.parse(i.expiresAt)?'expired':i.status;
export const validRole=(role:unknown):role is AdminRole=>businessRoles.includes(role as AdminRole);
export const permissionDependencies:Record<string,string[]>={P02:['P01'],P03:['P01'],P04:['P01'],P05:['P01'],P06:['P01'],P07:['P01'],P08:['P01','P07'],P10:['P09'],P13:['P12'],P14:['P12'],P15:['P12'],P16:['P01'],P17:['P09'],P18:['P11'],P19:['P12'],P23:['P22']};
export const validMatrix=(matrix:Record<AdminRole,string[]>)=>!!matrix&&JSON.stringify(matrix.SA)===JSON.stringify(rolePermissions.SA)&&businessRoles.every(r=>Array.isArray(matrix[r])&&new Set(matrix[r]).size===matrix[r].length&&matrix[r].every(p=>rolePermissions.SA.includes(p)&&p!=='P21'&&(permissionDependencies[p]||[]).every(d=>matrix[r].includes(d))));
export const validEmail=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const validPhone=(s:string)=>!s||/^\+?[\d\s()-]+$/.test(s)&&s.replace(/\D/g,'').length>=8&&s.replace(/\D/g,'').length<=15;
export const validPassword=(s:string)=>s.length>=8&&/[A-Z]/.test(s)&&/[a-z]/.test(s)&&/\d/.test(s)&&/[^\w\s]/.test(s);
export type Content = IndustrialParkProfile | IndustrialAsset;
export type ContentKind='park'|'asset';
export interface Draft { id:string; kind:ContentKind; data:Content; revision:number; state:'draft'|'in_review'|'approved'|'published'; updatedAt:string; updatedBy:string; published?:Content }
export interface ImportRow { sheet:'Parks'|'Products'; row:number; id:string; action:'create'|'update'; parkId:string; values:Record<string,string>; errors:string[]; warnings:string[]; before?:Content; after?:Content; revision?:number; result?:'created'|'updated'|'failed'; resultMessage?:string }
export interface ImportBatch { id:string; fileName:string; fingerprint:string; at:string; actor:string; rows:ImportRow[]; state:'preview'|'complete' }
export interface AdminStore { packages:ServicePackage[]; users:AdminUser[]; invites:Invite[]; audit:Audit[]; drafts:Draft[]; batches:ImportBatch[]; matrix:Record<AdminRole,string[]>; matrixRevision:number }
export function initialAdmin(parks:IndustrialParkProfile[],assets:IndustrialAsset[]):AdminStore {
  const now=Date.now();
  return {packages:structuredClone(packageSeeds),matrix:structuredClone(rolePermissions),matrixRevision:1,users:[
    {id:'sa',name:'VIG Super Admin',email:'superadmin@vig.example',phone:'',role:'SA',account:'active',access:'active',revision:1},
    {id:'admin',name:'Nguyễn Lan Anh',email:'admin@vig.example',phone:'0901234567',role:'ADMIN',account:'active',access:'active',revision:1},
    {id:'operator',name:'Phạm An',email:'operator@vig.example',phone:'',role:'OPERATOR',account:'active',access:'active',revision:1},
    {id:'existing',name:'Existing account',email:'existing@vig.example',phone:'',role:null,account:'active',access:'removed',revision:1},
    {id:'pending',name:'Invited user',email:'invited@vig.example',phone:'',role:null,account:'invited',access:'pending',revision:1},
    {id:'expired',name:'Expired invitation',email:'expired@vig.example',phone:'',role:null,account:'invited',access:'pending',revision:1},
  ], invites:[
    {id:'INV-DEMO-01',token:'demo-invitation',userId:'pending',role:'ADMIN',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+72*3600000).toISOString(),status:'pending',delivery:'queued'},
    {id:'INV-DEMO-02',token:'demo-expired',userId:'expired',role:'OPERATOR',createdAt:new Date(now-96*3600000).toISOString(),expiresAt:new Date(now-24*3600000).toISOString(),status:'pending',delivery:'failed'},
    {id:'INV-DEMO-03',token:'demo-retry',userId:'pending',role:'OPERATOR',createdAt:new Date(now).toISOString(),expiresAt:new Date(now+72*3600000).toISOString(),status:'pending',delivery:'failed'},
  ],audit:[],batches:[],drafts:[...parks.map(data=>({data,kind:'park' as const})),...assets.map(data=>({data,kind:'asset' as const}))].map(({data,kind})=>({id:data.id,kind,data:identifyRows(structuredClone(data)),published:structuredClone(data),revision:1,state:kind==='park'?(data as IndustrialParkProfile).publicationStatus==='published'?'published':'draft':'published',updatedAt:new Date(now).toISOString(),updatedBy:'Seed demo'}))};
}
export const isPark=(value:Content):value is IndustrialParkProfile=>'slug' in value;
export function contentErrors(data:Content):Record<string,string> {
  const errors:Record<string,string>={};
  const visit=(value:unknown,path:string)=>{
    if(typeof value==='number'&&!Number.isFinite(value))errors[path]='number';
    if(typeof value==='string'){
      if(/<\/?script\b|javascript:/i.test(value))errors[path]='unsafe';
      if(/(?:url|website|sourceUrl|image)$/i.test(path)&&value&&!/^https?:\/\/[^\s]+$/i.test(value)&&!/^\/images\/[\w./-]+$/.test(value))errors[path]='url';
      if(/email$/i.test(path)&&value&&!validEmail(value))errors[path]='email';
      if(/phone$/i.test(path)&&!validPhone(value))errors[path]='phone';
      if(/(?:name\.(vi|en|zh)|slug|\.name)$/.test(path)&&value.length>255)errors[path]='length';
      if(/(?:asOf|availableFrom|issueDate|effectiveDate|lastVerifiedAt)$/.test(path)&&value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value))))errors[path]='date';
    }
    if(Array.isArray(value))value.forEach((v,i)=>visit(v,`${path}.${i}`));
    else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>visit(v,path?`${path}.${k}`:k));
  };visit(data,'');
  const allowed:Record<string,string[]>={status:['operational','developing','planned'],region:['North','Central','South'],transaction:['lease','sale'],type:['industrial_land','ready_built_factory','warehouse','build_to_suit']};
  Object.entries(allowed).forEach(([key,options])=>{const v=(data as unknown as Record<string,unknown>)[key];if(v&& !options.includes(String(v)))errors[key]='selection'});
  if(isPark(data)){
    if(data.slug&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug))errors.slug='slug';
    if(data.coordinates&&(data.coordinates.lat<-90||data.coordinates.lat>90||data.coordinates.lng<-180||data.coordinates.lng>180))errors.coordinates='coordinates';
    if(data.totalArea.value!=null&&data.totalArea.value<=0)errors['totalArea.value']='positive';
    if(data.industrialLandArea.value!=null&&data.industrialLandArea.value<0)errors['industrialLandArea.value']='positive';
    const area=(s:{value:number|null;unit?:string})=>s.value==null?null:s.value*(s.unit==='m²'?0.0001:1);
    const total=area(data.totalArea),industrial=area(data.industrialLandArea);
    if(total!=null&&industrial!=null&&industrial>total)errors['industrialLandArea.value']='area';
    if(data.suitableIndustries.some(i=>data.restrictedIndustries.includes(i)))errors.suitableIndustries='industry';
    const orders=data.process.map(p=>p.order);if(orders.some(n=>n<=0)||new Set(orders).size!==orders.length)errors.process='order';
    data.availability.forEach((a,i)=>{for(const [key,v] of Object.entries(a)){if(v&&typeof v==='object'&&'value' in v&&typeof v.value==='number'&&v.value<0)errors[`availability.${i}.${key}`]='positive'}});
  } else {if(data.area!=null&&data.area<=0)errors.area='positive';if(data.price.value!=null&&data.price.value<=0)errors['price.value']='positive';}
  return errors;
}
export function publicationIssues(data:Content,all:Draft[]):string[] {
  const issues=Object.keys(contentErrors(data));const localized=(x:{vi:string;en:string;zh?:string})=>x.vi.trim()&&x.en.trim()&&x.zh?.trim();
  if(!localized(data.name))issues.push('name');if(!localized(isPark(data)?data.summary:data.description))issues.push('summary');
  if(isPark(data)){
    if(!data.slug||!data.parkType.vi||!data.status||!data.totalArea.value)issues.push('identity');
    if(!data.operator.name||!localized(data.operator.overview))issues.push('operator');
    if(!data.coordinates||data.coordinates.lat==null||data.coordinates.lng==null||!data.province||!data.address.vi)issues.push('location');
    if(!data.phases.some(p=>p.name.vi&&p.status))issues.push('phases');
    if(!data.availability.some(a=>a.type&&a.transactionModes.length&&[a.total,a.available,a.reserved,a.occupied].every(v=>v&&['public','not_disclosed','not_available'].includes(v.disclosureStatus)&&(v.disclosureStatus!=='public'||v.value!=null&&v.value>=0&&!!v.unit))))issues.push('availability');
    if(!data.connectivity.some(c=>['port','airport'].includes(c.type)&&c.name.vi&&c.status)||!data.connectivity.some(c=>c.type==='road'&&c.name.vi&&c.status))issues.push('connectivity');
    if(!['electricity','water','wastewater'].every(k=>data.utilities.some(u=>u.key===k&&(['not_disclosed','not_available'].includes(u.capacity.disclosureStatus)||u.capacity.disclosureStatus==='public'&&u.capacity.value!=null&&u.capacity.unit&&u.capacity.asOf&&u.capacity.sourceDocumentId))))issues.push('utilities');
    if(!data.suitableIndustries.length)issues.push('industries');
    if(!data.contact||!(data.contact.office.vi||data.contact.person)||!(data.contact.email||data.contact.phone))issues.push('contact');
    if(!data.media.some(m=>m.approved&&m.url&&m.type!=='video'))issues.push('media');
    if(!data.documents.some(d=>['establishment_decision','enterprise_registration','legal_approval'].includes(d.category)&&d.verificationStatus==='verified'&&d.title.vi&&d.issuer.vi&&d.sourceUrl&&d.documentNumber?.trim()&&d.issueDate))issues.push('legal');
    if(!data.dataOwner?.trim()||!data.verifiedBy?.trim()||!data.lastVerifiedAt||data.lastVerifiedAt>new Date().toISOString().slice(0,10)||!['vi','en','zh'].includes(data.sourceLanguage)||!data.sourceDocumentId||!data.documents.some(d=>d.id===data.sourceDocumentId&&d.sourceUrl))issues.push('source');
    if(data.incentives.some(i=>!i.sourceDocumentId||!i.effectiveDate||!i.eligibility.vi))issues.push('incentives');
  }else{
    const parent=all.find(d=>d.kind==='park'&&d.id===data.parkId)?.published as IndustrialParkProfile|undefined;
    if(!parent||parent.publicationStatus!=='published')issues.push('parkId');
    if(!data.area||!data.unit||!data.type||!data.transaction)issues.push('asset');
    if(!data.image||!data.imageApproved)issues.push('media');
    if(data.price.disclosureStatus==='public'&&(!data.price.value||!data.price.unit))issues.push('price');
    if(parent&&data.industries.some(i=>parent.restrictedIndustries.includes(i)))issues.push('industries');
  }return [...new Set(issues)];
}
