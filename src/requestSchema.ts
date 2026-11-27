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
// Phone detection shared by client/server masking. Numbers adjacent to an area, currency
// or quantity unit (e.g. "10000-20000 m2", "500000000 VND") are business data, not phones,
// unless explicitly labelled as a phone or shaped like one (+country code / leading 0).
const PHONE_RE=/\+?\d[\d ().-]{6,}\d/g;
const UNIT_AFTER=/^\s*(m²|m2|㎡|sqm|ha\b|hecta|héc|hec|km|vnd|vnđ|usd|đ|dong\b|đồng|trieu|triệu|ty\b|tỷ|tỉ|nghin|nghìn|ngàn|k\b|%|平方|公顷|元|美元|万|亿|years?\b|năm|nam\b|tháng|thang\b|months?\b|mva|kva|kv\b|mw\b|kw\b|tấn|tan\b|tons?\b)/i;
const CUR_BEFORE=/(usd|vnd|\$|giá|gia|price|budget|ngân sách|ngan sach|预算|价格)\s*[:：]?\s*$/i;
const PHONE_LABEL=/(phone|mobile|tel|telephone|call me|whatsapp|zalo|sđt|sdt|số điện thoại|so dien thoai|điện thoại|dien thoai|liên hệ|lien he|电话|手机|联系方式)\s*(number)?\s*[:：]?\s*(is|là|la|是)?\s*$/i;
export function findPhones(text:string){
 const out:{value:string;start:number;end:number;strong:boolean}[]=[];let m;PHONE_RE.lastIndex=0;
 while((m=PHONE_RE.exec(text))){
  const raw=m[0],digits=raw.replace(/\D/g,'');if(digits.length<8||digits.length>15)continue;
  const before=text.slice(Math.max(0,m.index-30),m.index),after=text.slice(m.index+raw.length);
  const labelled=PHONE_LABEL.test(before),shaped=/^\+/.test(raw)||/^0\d/.test(raw)&&digits.length>=9&&digits.length<=11&&!/[.,]/.test(raw);
  const range=/^[1-9]\d{2,6}\s*[-–~]\s*\d{3,7}$/.test(raw.trim());
  const unitish=UNIT_AFTER.test(after)||CUR_BEFORE.test(before);
  if(labelled||shaped)out.push({value:raw.trim(),start:m.index,end:m.index+raw.length,strong:true});
  else if(unitish||range)continue;
  else out.push({value:raw.trim(),start:m.index,end:m.index+raw.length,strong:false});
 }
 return out;
}
export const maskContact=(s:string)=>{let out=s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email omitted]');for(const p of findPhones(out).sort((a,b)=>b.start-a.start))out=out.slice(0,p.start)+'[contact number omitted]'+out.slice(p.end);return out};
