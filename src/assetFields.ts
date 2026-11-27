// Optional commercial/technical detail of an industrial asset (card + detail page).
// Every key is optional: a record that never had them stays valid, and nothing is ever inferred when a value is missing.
import type {IndustrialAsset} from './types';

export const ASSET_DETAIL_KEYS=['lotCode','zone','leasingStatus','waterM3Day','gallery','specs','terms','specsAsOf','specsVerification'] as const;
/** Nested keys of specs/terms/gallery items; tolerated as absent when an older snapshot is restored. */
export const ASSET_DETAIL_NESTED_KEYS=['caption','dimensions','frontage','coverageMaxPct','leaseTermUntil','clearHeightM','floorLoadTonM2','officeAreaM2','dockDoors','floors','builtYear','fireSystem','vatIncluded','minLeaseYears','depositMonths','paymentNote','feeNote'] as const;
export const LEASING_STATUSES=['unknown','available','reserved','leased'] as const;
export const GALLERY_MAX=12;
const IMAGE_URL=/^https?:\/\/[^\s]+$|^\/images\/[\w./-]+$/;
const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
const validDate=(v:string)=>ISO_DATE.test(v)&&!Number.isNaN(Date.parse(v));
const blankValue=(v:unknown)=>v==null||(typeof v==='string'&&!v.trim());
const positive=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>0;
const wholePositive=(v:unknown)=>positive(v)&&Number.isInteger(v);

/** Validation of the optional detail fields. Absent, null and empty values are always accepted. */
export function assetDetailErrors(a:Partial<IndustrialAsset>):Record<string,string>{
 const e:Record<string,string>={};
 if(!blankValue(a.lotCode)&&!/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/.test(String(a.lotCode).trim()))e.lotCode='lotCode';
 if(a.leasingStatus!=null&&!(LEASING_STATUSES as readonly string[]).includes(a.leasingStatus))e.leasingStatus='selection';
 if(a.waterM3Day!=null&&!positive(a.waterM3Day))e.waterM3Day='positive';
 if(a.specsVerification!=null&&!['unverified','reviewed','verified'].includes(a.specsVerification))e.specsVerification='selection';
 if(!blankValue(a.specsAsOf)&&!validDate(String(a.specsAsOf)))e.specsAsOf='date';
 if(a.gallery!=null){
  if(!Array.isArray(a.gallery)||a.gallery.length>GALLERY_MAX)e.gallery='gallery';
  else a.gallery.forEach((g,i)=>{if(!g||typeof g.url!=='string'||!IMAGE_URL.test(g.url.trim()))e[`gallery.${i}.url`]='url';if(g?.approved!=null&&typeof g.approved!=='boolean')e[`gallery.${i}.approved`]='boolean'});
 }
 const s=a.specs;
 if(s!=null){
  if(typeof s!=='object'||Array.isArray(s))e.specs='shape';
  else{
   for(const k of ['clearHeightM','floorLoadTonM2','officeAreaM2'] as const)if(s[k]!=null&&!positive(s[k]))e[`specs.${k}`]='positive';
   for(const k of ['dockDoors','floors'] as const)if(s[k]!=null&&!wholePositive(s[k]))e[`specs.${k}`]='integer';
   if(s.coverageMaxPct!=null&&!(typeof s.coverageMaxPct==='number'&&s.coverageMaxPct>=1&&s.coverageMaxPct<=100))e['specs.coverageMaxPct']='percent';
   if(s.builtYear!=null&&!(Number.isInteger(s.builtYear)&&s.builtYear!>=1990&&s.builtYear!<=2100))e['specs.builtYear']='year';
   if(!blankValue(s.leaseTermUntil)&&!validDate(String(s.leaseTermUntil)))e['specs.leaseTermUntil']='date';
  }
 }
 const t=a.terms;
 if(t!=null){
  if(typeof t!=='object'||Array.isArray(t))e.terms='shape';
  else{
   if(t.vatIncluded!=null&&typeof t.vatIncluded!=='boolean')e['terms.vatIncluded']='boolean';
   for(const k of ['minLeaseYears','depositMonths'] as const)if(t[k]!=null&&!positive(t[k]))e[`terms.${k}`]='positive';
  }
 }
 return e;
}

const L=()=>({vi:'',en:'',zh:''});
/** Empty editor shapes so the admin form shows every field; compactAsset() removes whatever stays empty on save. */
export function assetEditorDefaults():Pick<IndustrialAsset,'lotCode'|'zone'|'leasingStatus'|'waterM3Day'|'gallery'|'specs'|'terms'|'specsAsOf'|'specsVerification'>{
 return {lotCode:'',zone:L(),leasingStatus:'unknown',waterM3Day:null,gallery:[],
  specs:{dimensions:'',frontage:L(),coverageMaxPct:null,leaseTermUntil:'',clearHeightM:null,floorLoadTonM2:null,officeAreaM2:null,dockDoors:null,floors:null,builtYear:null,fireSystem:L()},
  terms:{vatIncluded:undefined,minLeaseYears:null,depositMonths:null,paymentNote:L(),feeNote:L()},
  specsAsOf:'',specsVerification:'unverified'};
}

const localizedLike=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v)&&('vi' in v||'en' in v);
function prune(v:any):any{
 if(v==null)return undefined;
 if(typeof v==='string')return v.trim()?v:undefined;
 if(typeof v==='number'||typeof v==='boolean')return v;
 if(Array.isArray(v)){const items=v.map(prune).filter(x=>x!==undefined);return items.length?items:undefined}
 if(localizedLike(v))return [v.vi,v.en,v.zh].some(x=>typeof x==='string'&&x.trim())?v:undefined;
 const entries=Object.entries(v).map(([k,x])=>[k,prune(x)] as const).filter(([,x])=>x!==undefined);
 return entries.length?Object.fromEntries(entries):undefined;
}
/** Drops empty detail values (and the empty groups they leave behind) so a record only stores what was actually entered. */
export function compactAsset<T extends Partial<IndustrialAsset>>(a:T):T{
 const out:any={...a};
 for(const key of ASSET_DETAIL_KEYS){
  let v=out[key];
  if(key==='gallery'&&Array.isArray(v))v=v.filter((g:any)=>g&&typeof g.url==='string'&&g.url.trim());
  const next=key==='leasingStatus'||key==='specsVerification'?(v||undefined):prune(v);
  if(next===undefined)delete out[key];else out[key]=next;
 }
 return out;
}

/** Copies only the detail keys; used by the data scripts that merge new fields into existing payloads. */
export function pickDetailKeys(a:Partial<IndustrialAsset>):Partial<IndustrialAsset>{
 const out:any={};for(const key of ASSET_DETAIL_KEYS)if((a as any)[key]!==undefined)out[key]=(a as any)[key];return out;
}
const isEmpty=(v:unknown)=>prune(v)===undefined;
/**
 * Merges `incoming` detail values into `existing` without ever overwriting a value that is already non-empty.
 * Objects (specs, terms, zone, ...) are merged field by field; arrays (gallery) only fill an empty array.
 * Returns the merged value and whether anything changed.
 */
export function mergeMissingDetails<T extends Record<string,any>>(existing:T,incoming:Record<string,any>):{value:T;changed:boolean;fields:string[]}{
 const fields:string[]=[];
 const mergeValue=(cur:any,inc:any,path:string):any=>{
  if(inc===undefined||isEmpty(inc))return cur;
  if(isEmpty(cur))return (fields.push(path),inc);
  if(cur&&inc&&typeof cur==='object'&&typeof inc==='object'&&!Array.isArray(cur)&&!Array.isArray(inc)&&!localizedLike(inc)){
   const next={...cur};for(const [k,v] of Object.entries(inc))next[k]=mergeValue(cur[k],v,`${path}.${k}`);return next;
  }
  if(localizedLike(cur)&&localizedLike(inc)){
   const next={...cur};for(const lang of ['vi','en','zh'] as const)if(blankValue(cur[lang])&&!blankValue(inc[lang])){next[lang]=inc[lang];fields.push(`${path}.${lang}`)}return next;
  }
  return cur;
 };
 const value:any={...existing};
 for(const key of ASSET_DETAIL_KEYS){
  if(!(key in incoming))continue;
  const cur=value[key],inc=(incoming as any)[key];
  if(key==='leasingStatus'||key==='specsVerification'){if(cur==null||cur===''){if(inc){value[key]=inc;fields.push(key)}}continue}
  const next=mergeValue(cur,inc,key);if(next!==cur)value[key]=next;
 }
 return {value:value as T,changed:fields.length>0,fields};
}
