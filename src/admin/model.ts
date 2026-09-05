import type { IndustrialParkProfile, IndustrialAsset } from '../types';

export type AdminRole = 'SA' | 'NL' | 'DC' | 'VH' | 'BC';
export const businessRoles: AdminRole[] = ['NL','DC','VH','BC'];
export const rolePermissions: Record<AdminRole,string[]> = {
  SA: Array.from({length:18},(_,i)=>`P${String(i+1).padStart(2,'0')}`),
  NL:['P01','P02','P03','P04','P07','P16'], DC:['P01','P05','P06','P07','P08','P16'],
  VH:['P09','P10','P11','P17','P18'], BC:['P11','P18'],
};
export interface AdminUser { id:string; name:string; email:string; phone:string; roles:AdminRole[]; account:'active'|'invited'|'disabled'; access:'active'|'pending'|'suspended'|'removed'; revision:number }
export interface Invite { id:string; token:string; userId:string; roles:AdminRole[]; createdAt:string; expiresAt:string; status:'pending'|'accepted'|'revoked'; delivery:'pending'|'queued'|'failed' }
export interface Audit { id:string; at:string; actor:string; target:string; action:string; before:string; after:string; reason:string; domain:'users'|'content'|'import' }
export const permissions = (user?:AdminUser) => !user || user.account!=='active' || user.access!=='active' ? [] : [...new Set(user.roles.flatMap(r=>rolePermissions[r]||[]))];
export const firstAdminPage=(u?:AdminUser)=>permissions(u).includes('P11')?'/admin/dashboard':permissions(u).includes('P01')?'/admin/industrial-parks':permissions(u).includes('P09')?'/admin/requests':'/admin/no-access';
export const inviteStatus=(i:Invite,now=Date.now())=>i.status==='pending'&&now>=Date.parse(i.expiresAt)?'expired':i.status;
export const validRoles=(roles:AdminRole[])=>roles.length>0&&new Set(roles).size===roles.length&&roles.every(r=>businessRoles.includes(r));
export const validEmail=(s:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const validPhone=(s:string)=>!s||/^\+?[\d\s()-]+$/.test(s)&&s.replace(/\D/g,'').length>=8&&s.replace(/\D/g,'').length<=15;
export const validPassword=(s:string)=>s.length>=8&&/[A-Z]/.test(s)&&/[a-z]/.test(s)&&/\d/.test(s)&&/[^\w\s]/.test(s);
export type Content = IndustrialParkProfile | IndustrialAsset;
export type ContentKind='park'|'asset';
export interface Draft { id:string; kind:ContentKind; data:Content; revision:number; state:'draft'|'in_review'|'approved'|'published'; updatedAt:string; updatedBy:string; published?:Content }
export interface ImportRow { sheet:'Parks'|'Products'; row:number; id:string; action:'create'|'update'; parkId:string; values:Record<string,string>; errors:string[]; warnings:string[]; before?:Content; after?:Content; revision?:number; result?:'created'|'updated'|'failed'; resultMessage?:string }
export interface ImportBatch { id:string; fileName:string; fingerprint:string; at:string; actor:string; rows:ImportRow[]; state:'preview'|'complete' }
export interface AdminStore { users:AdminUser[]; invites:Invite[]; audit:Audit[]; drafts:Draft[]; batches:ImportBatch[] }
export function initialAdmin(parks:IndustrialParkProfile[],assets:IndustrialAsset[]):AdminStore {
  const now=Date.now();
  return {users:[
    {id:'sa',name:'VIG Super Admin',email:'superadmin@vig.example',phone:'',roles:['SA'],account:'active',access:'active',revision:1},
    {id:'editor',name:'Nguyễn Lan Anh',email:'editor@vig.example',phone:'0901234567',roles:['NL'],account:'active',access:'active',revision:1},
    {id:'reviewer',name:'Trần Minh',email:'reviewer@vig.example',phone:'',roles:['DC'],account:'active',access:'active',revision:1},
    {id:'reports',name:'Lê Hà',email:'reports@vig.example',phone:'',roles:['BC'],account:'active',access:'active',revision:1},
    {id:'operator',name:'Phạm An',email:'operator@vig.example',phone:'',roles:['VH'],account:'active',access:'active',revision:1},
    {id:'pending',name:'Người dùng được mời',email:'invited@vig.example',phone:'',roles:[],account:'invited',access:'pending',revision:1},
    {id:'expired',name:'Lời mời mẫu hết hạn',email:'expired@vig.example',phone:'',roles:[],account:'invited',access:'pending',revision:1},
  ], invites:[
    {id:'INV-DEMO-01',token:'demo-invitation',userId:'pending',roles:['NL','DC'],createdAt:new Date(now).toISOString(),expiresAt:new Date(now+72*3600000).toISOString(),status:'pending',delivery:'pending'},
    {id:'INV-DEMO-02',token:'demo-expired',userId:'expired',roles:['BC'],createdAt:new Date(now-96*3600000).toISOString(),expiresAt:new Date(now-24*3600000).toISOString(),status:'pending',delivery:'failed'},
  ],audit:[],batches:[],drafts:[...parks.map(data=>({data,kind:'park' as const})),...assets.map(data=>({data,kind:'asset' as const}))].map(({data,kind})=>({id:data.id,kind,data:structuredClone(data),published:structuredClone(data),revision:1,state:kind==='park'?(data as IndustrialParkProfile).publicationStatus==='published'?'published':'draft':'published',updatedAt:new Date(now).toISOString(),updatedBy:'Seed demo'}))};
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
    if(!data.coordinates||!data.province||!data.address.vi)issues.push('location');
    if(!data.phases.some(p=>p.name.vi&&p.status))issues.push('phases');
    if(!data.availability.some(a=>a.type&&a.transactionModes.length))issues.push('availability');
    if(!data.connectivity.some(c=>['port','airport'].includes(c.type)&&c.name.vi)||!data.connectivity.some(c=>c.type==='road'&&c.name.vi))issues.push('connectivity');
    if(!['electricity','water','wastewater'].every(k=>data.utilities.some(u=>u.key===k&&(u.capacity.disclosureStatus!=='public'||u.capacity.value!=null&&u.capacity.unit))))issues.push('utilities');
    if(!data.suitableIndustries.length)issues.push('industries');
    if(!data.contact||!(data.contact.office.vi||data.contact.person)||!(data.contact.email||data.contact.phone))issues.push('contact');
    if(!data.media.some(m=>m.approved&&m.url&&m.type!=='video'))issues.push('media');
    if(!data.documents.some(d=>['establishment_decision','enterprise_registration','legal_approval'].includes(d.category)&&d.verificationStatus==='verified'&&d.title.vi&&d.issuer.vi&&d.sourceUrl))issues.push('legal');
    if(!data.dataOwner||!data.verifiedBy||!data.lastVerifiedAt)issues.push('source');
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
