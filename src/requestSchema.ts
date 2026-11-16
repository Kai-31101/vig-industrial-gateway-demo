export type RequestBudget={mode:'specific'|'negotiable'|'not_available';amount:number|null;currency:'VND'|'USD';areaBasis:'m²'|'ha';period:'month'|'year'|'term'};
export function validateLeasingRequest(r:any,parks?:any[],assets?:any[]){
 const errors:Record<string,string>={};
 const required=['organization','contactName','email','phone','assetType','location','industry'];
 for(const key of required)if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>255)errors[key]='required';
 if(typeof r.email==='string'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))errors.email='invalid';
 if(typeof r.phone==='string'&&(!/^\+?[\d\s()-]+$/.test(r.phone)||r.phone.replace(/\D/g,'').length<8||r.phone.replace(/\D/g,'').length>15))errors.phone='invalid';
 if(!['industrial_land','ready_built_factory','warehouse','build_to_suit','Industrial land','Ready-built factory','Warehouse','Build-to-suit'].includes(r.assetType))errors.assetType='invalid';
 if(!Number.isFinite(r.areaMin)||!Number.isFinite(r.areaMax)||r.areaMin<=0||r.areaMax<r.areaMin||r.areaMax>1e12)errors.areaMin='range';
 const b=r.budget as RequestBudget|undefined;
 if(!b||!['specific','negotiable','not_available'].includes(b.mode)||b.mode==='specific'&&(!Number.isFinite(b.amount)||Number(b.amount)<=0||!['VND','USD'].includes(b.currency)||!['m²','ha'].includes(b.areaBasis)||!['month','year','term'].includes(b.period)))errors.budget='required';
 if(r.availabilityDate!==''){const day=r.availabilityDate;if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day||day<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}))errors.availabilityDate='invalid'}
 if(r.dateUnknown!==true&&!r.availabilityDate)errors.availabilityDate='required';
 if(r.consent!==true)errors.consent='required';
 if(r.kind!=='find_supply'||r.transaction!=='lease'||!['Find Supply','Meeting / Connection'].includes(r.service))errors.context='invalid';
 if(typeof r.requirements!=='string'||r.requirements.length>5000)errors.requirements='invalid';
 if(parks&&r.parkId&&!parks.some(p=>p.id===r.parkId))errors.parkId='invalid';
 if(assets&&r.assetId&&!assets.some(a=>a.id===r.assetId&&(!r.parkId||a.parkId===r.parkId)))errors.assetId='invalid';
 if(parks&&!['North','Central','South','Not specified',...parks.map(p=>p.province)].includes(r.location))errors.location='invalid';
 if(parks&&!['Not specified',...parks.flatMap(p=>p.suitableIndustries)].includes(r.industry))errors.industry='invalid';
 return errors;
}
export const maskContact=(s:string)=>s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email omitted]').replace(/(?:\+?\d[\d ()-]{6,}\d)/g,m=>m.replace(/\D/g,'').length>=8?'[contact number omitted]':m);
