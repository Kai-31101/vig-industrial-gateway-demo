// Automatic "nearest amenities" for an industrial park, using Goong only (no OpenStreetMap/Overpass):
//  - airports, seaports, railway stations and city centres come from the curated hub list (src/geoHubs.ts),
//  - hospitals, highways, colleges and neighbouring industrial parks from Goong Place AutoComplete (keyword + location bias)
//    followed by Place Detail for coordinates, with name filters,
//  - driving distance/time from Goong Distance Matrix; route polylines from Goong Direction for the nearest seaport and airport.
// Server-side only. GOONG_API_KEY is read from the environment and is never logged or returned.
import {haversineKm,NEARBY_CATEGORIES} from '../src/geoPlaces';
import {HUBS} from '../src/geoHubs';
import type {NearbyCategory,NearbyPlace} from '../src/types';

export const GOONG_BASE='https://rsapi.goong.io';
export const RADIUS_KM:Record<NearbyCategory,number>={airport:150,seaport:100,highway:30,rail:50,hospital:20,college:30,industrial_park:30,town:30};
export const CANDIDATES_PER_CATEGORY=5,KEEP_PER_CATEGORY=3,MATRIX_BATCH=10,DETAILS_PER_QUERY=8;
/** Keyword searches (Goong AutoComplete). Airports, seaports and stations are deliberately NOT searched by keyword: results are noise. */
export const KEYWORDS:{category:NearbyCategory;input:string}[]=[
 {category:'hospital',input:'bệnh viện'},{category:'hospital',input:'bệnh viện đa khoa'},{category:'highway',input:'quốc lộ'},{category:'highway',input:'cao tốc'},
 {category:'college',input:'trường đại học'},{category:'college',input:'cao đẳng'},{category:'industrial_park',input:'khu công nghiệp'}];
/** With a province the searches are suffixed by it (better recall and fewer namesakes than bare keywords); otherwise the base keywords. */
// Neighbouring parks are also searched without the city suffix: the suffix narrows results to parks named after the city and misses the closest ones.
export const keywordsFor=(province?:string)=>province?.trim()?[...KEYWORDS.map(k=>({category:k.category,input:k.input+' '+province.trim()})),...KEYWORDS.filter(k=>k.category==='industrial_park')]:KEYWORDS;
export interface Candidate {category:NearbyCategory;key:string;name:{vi:string;en:string};coordinates:{lat:number;lng:number};straightKm:number;ref?:string;source:'goong'|'curated+goong'}
export interface GeoCache {search:Map<string,any[]>;detail:Map<string,{lat:number;lng:number}|null>}
export const newGeoCache=():GeoCache=>({search:new Map(),detail:new Map()});
export interface GeoOptions {sleep?:(ms:number)=>Promise<void>;now?:()=>Date;log?:(message:string)=>void;cache?:GeoCache}
export class GeoError extends Error {constructor(public code:'goong_failed'|'no_results'|'goong_key_missing'|'bad_origin',public detail=''){super(code)}}
type Pt={lat:number;lng:number};
const sleepReal=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms));
export const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ').trim();
const round=(n:number,d=1)=>Math.round(n*10**d)/10**d;

/** Curated hubs: the 5 nearest per category within the category radius (haversine). */
export function nearestHubs(origin:Pt):Candidate[]{
 const out:Candidate[]=[];
 for(const cat of ['airport','seaport','rail','town'] as const){
  const list=HUBS.filter(h=>h.category===cat).map(h=>({h,km:haversineKm(origin,h.coordinates)})).filter(x=>x.km<=RADIUS_KM[cat]).sort((a,b)=>a.km-b.km).slice(0,CANDIDATES_PER_CATEGORY);
  for(const {h,km} of list)out.push({category:cat,key:cat+':'+norm(h.name.vi),name:{vi:h.name.vi,en:h.name.en},coordinates:h.coordinates,straightKm:km,source:'curated+goong'});
 }
 return out;
}
const mainText=(p:any):string=>String(p?.structured_formatting?.main_text||String(p?.description||'').split(',')[0]||'').trim();
const REF=/(?:^|\s)(?:quoc lo|ql|duong cao toc|cao toc|ct)\s*\.?\s*(\d{1,3}[a-z]?)(?!\d)/;
/** Name filter per keyword category. Returns a cleaned display name (and highway ref), or null to drop the prediction. */
export function acceptName(category:NearbyCategory,raw:string):{name:string;ref?:string}|null{
 const name=raw.replace(/\s+/g,' ').trim(),n=norm(name);if(n.length<(category==='highway'?4:6))return null;
 if(category==='hospital'){
  if(!/benh vien|trung tam y te/.test(n)||/^(khoa|phong|nha thuoc|quay|tram|khu)\b|khoa kham|phong kham|thu y|cong benh vien|bai do xe|^benh vien$/.test(n))return null;
  return {name};
 }
 if(category==='college'){
  const starts=/^(truong |dai hoc|cao dang|hoc vien|phan hieu)/,bad=/^(khoa|phong|ky tuc xa|ktx|cong|nha|cang tin|thu vien|giang duong|ben xe|toa nha|san|bai)( |$)|ky tuc xa|^nha [a-z0-9]+ -/,bare=/^(truong )?(dai hoc|cao dang)$/;
  if(!starts.test(n)||!/(dai hoc|cao dang|hoc vien)/.test(n)||bad.test(n)||bare.test(n))return null;
  return {name};
 }
 if(category==='industrial_park'){
  if(!/khu cong nghiep|cum cong nghiep|\bkcn\b/.test(n)||/^(duong|cong|nha|cty|cong ty|chi nhanh|ben xe|khu dan cu|nha may|doi)\b/.test(n))return null;
  const rest=n.replace(/khu cong nghiep|cum cong nghiep|\bkcn\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();if(rest.length<3)return null;
  return {name};
 }
 if(category==='highway'){
  if(/^(duong trong|duong noi bo|ben xe|tram|cong|nut giao|ham)\b/.test(n))return null;
  const m=REF.exec(n);if(!m)return null;
  const prefix=/cao toc|^ct/.test(n)?'CT':'QL';
  return {name,ref:prefix+m[1].toUpperCase()};
 }
 return null;
}
/** Place names (cities) mentioned in a result name; used to drop namesake entries of other cities (e.g. a Da Nang university pinned near a Thai Binh park). */
const cityName=(vi:string)=>vi.replace(/\s*\(.*\)/,'').replace(/^TP\.\s*/i,'').trim();
const TOWNS=HUBS.filter(h=>h.category==='town').map(h=>({name:cityName(h.name.vi),coordinates:h.coordinates}));
const CITY_NAMES=[...new Set(TOWNS.map(t=>norm(t.name)).filter(x=>x.length>=5))];
/** Local area derived from the coordinates, not the stored province (which can lag province mergers, e.g. Thai Binh -> Hung Yen, or not match demo coordinates). */
export const LOCAL_CITY_KM=60;
export function localArea(origin:Pt):{search?:string;cities:string[]}{
 const near=TOWNS.map(t=>({t,km:haversineKm(origin,t.coordinates)})).filter(x=>x.km<=LOCAL_CITY_KM).sort((a,b)=>a.km-b.km);
 return {search:near[0]?.t.name,cities:near.map(x=>x.t.name)};
}
/** True when the name mentions a city that is not local to the park (a namesake branch elsewhere). */
export function mentionsOtherCity(name:string,local?:string|string[]){const n=norm(name),own=(Array.isArray(local)?local:local?[local]:[]).map(norm).filter(Boolean);if(!own.length||own.some(o=>n.includes(o)))return false;return CITY_NAMES.some(c=>!own.includes(c)&&new RegExp('(^|[^a-z])'+c+'([^a-z]|$)').test(n))}
const pt=(p:Pt)=>`${p.lat},${p.lng}`;
async function withRetry<T>(run:()=>Promise<T>,sleep:(ms:number)=>Promise<void>,attempts=3):Promise<T>{
 let last:unknown;for(let i=0;i<attempts;i++){try{return await run()}catch(e){last=e;if(i<attempts-1)await sleep(1000+Math.floor(Math.random()*1000))}}throw last;
}
async function goong(path:string,params:Record<string,string>,key:string,sleep:(ms:number)=>Promise<void>):Promise<any>{
 const qs=new URLSearchParams({...params,api_key:key}).toString();
 return withRetry(async()=>{const r=await fetch(`${GOONG_BASE}${path}?${qs}`,{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('goong_http_'+r.status);return r.json()},sleep);
}
/** Keyword candidates for hospital/highway/college/industrial_park: AutoComplete -> filter -> Place Detail -> radius -> nearest 5. */
export async function keywordCandidates(origin:Pt,park:{name?:{vi?:string}},key:string,sleep:(ms:number)=>Promise<void>,cache:GeoCache,cacheId:string):Promise<Candidate[]>{
 const found=new Map<string,Candidate>(),area=localArea(origin);
 const own=norm(String(park.name?.vi||'')).replace(/khu cong nghiep|\bkcn\b/g,'').trim();
 for(const {category,input} of keywordsFor(area.search)){
  const ck=`${cacheId}|${input}`;let preds=cache.search.get(ck);
  if(!preds){const j=await goong('/Place/AutoComplete',{input,location:pt(origin),limit:'10',more_compound:'true'},key,sleep);const list:any[]=Array.isArray(j?.predictions)?j.predictions:[];preds=list;cache.search.set(ck,list);await sleep(300)}
  const seen=new Set<string>();let used=0;
  for(const p of (preds||[])){
   if(used>=DETAILS_PER_QUERY)break;
   const acc=acceptName(category,mainText(p));if(!acc)continue;if(category!=='highway'&&mentionsOtherCity(acc.name,area.cities))continue;
   const id=category==='highway'?acc.ref!:norm(acc.name);if(seen.has(id))continue;seen.add(id);
   if(!p.place_id)continue;used++;
   let loc=cache.detail.get(p.place_id);
   if(loc===undefined){const d=await goong('/Place/Detail',{place_id:String(p.place_id)},key,sleep);const l=d?.result?.geometry?.location;loc=l&&Number.isFinite(l.lat)&&Number.isFinite(l.lng)?{lat:l.lat,lng:l.lng}:null;cache.detail.set(p.place_id,loc);await sleep(300)}
   if(!loc)continue;
   const km=haversineKm(origin,loc);if(km>RADIUS_KM[category])continue;
   if(category==='industrial_park'){const c=norm(acc.name).replace(/khu cong nghiep|cum cong nghiep|\bkcn\b/g,'').trim();if(km<1||own&&c&&(c===own||c.includes(own)||own.includes(c)&&c.length>3))continue}
   const k=category==='highway'?'highway:'+acc.ref:category+':'+norm(acc.name);
   const prev=found.get(k);if(prev&&prev.straightKm<=km)continue;
   found.set(k,{category,key:k,name:{vi:acc.name,en:acc.name},coordinates:loc,straightKm:km,...(acc.ref?{ref:acc.ref}:{}),source:'goong'});
  }
 }
 // drop near-duplicates (same category, within 300 m)
 const sorted=[...found.values()].sort((a,b)=>a.straightKm-b.straightKm),kept:Candidate[]=[];
 for(const c of sorted)if(!kept.some(k=>k.category===c.category&&c.category!=='highway'&&haversineKm(k.coordinates,c.coordinates)<0.3))kept.push(c);
 return kept;
}
/** The N nearest candidates (by straight line) of every category. */
export function pickNearest(candidates:Candidate[],n=CANDIDATES_PER_CATEGORY):Candidate[]{
 return NEARBY_CATEGORIES.flatMap(c=>candidates.filter(x=>x.category===c).sort((a,b)=>a.straightKm-b.straightKm).slice(0,n));
}
/** Keeps the K places with the smallest driving distance per category (unknown driving distance sorts last by straight km). */
export function keepNearestByDriving(places:NearbyPlace[],k=KEEP_PER_CATEGORY):NearbyPlace[]{
 return NEARBY_CATEGORIES.flatMap(c=>places.filter(p=>p.category===c).sort((a,b)=>(a.drivingKm??Infinity)-(b.drivingKm??Infinity)||a.straightKm-b.straightKm).slice(0,k));
}
const slug=(s:string)=>norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);

export interface NearbyResult {places:NearbyPlace[];warnings:string[]}
export async function findNearbyDetailed(park:{id?:string;province?:string;coordinates?:Pt|null;name?:{vi?:string;en?:string}},opts:GeoOptions={}):Promise<NearbyResult>{
 const sleep=opts.sleep||sleepReal,now=opts.now||(()=>new Date()),cache=opts.cache||newGeoCache();
 const origin=park.coordinates;if(!origin||!Number.isFinite(origin.lat)||!Number.isFinite(origin.lng))throw new GeoError('bad_origin');
 const key=process.env.GOONG_API_KEY;if(!key)throw new GeoError('goong_key_missing');
 const warnings:string[]=[];
 let kw:Candidate[];
 try{kw=await keywordCandidates(origin,park,key,sleep,cache,park.id||pt(origin))}catch(e){throw new GeoError('goong_failed',e instanceof Error?e.message.slice(0,60):'')}
 const picked=pickNearest([...nearestHubs(origin),...kw]);
 if(!picked.length)throw new GeoError('no_results');
 const computedAt=now().toISOString(),driving=new Map<string,{km:number;min:number}>();let matrixFailed=false;
 for(let i=0;i<picked.length;i+=MATRIX_BATCH){
  const batch=picked.slice(i,i+MATRIX_BATCH);
  try{
   const j=await goong('/distancematrix',{origins:pt(origin),destinations:batch.map(c=>pt(c.coordinates)).join('|'),vehicle:'car'},key,sleep);
   const els=j?.rows?.[0]?.elements||[];
   batch.forEach((c,x)=>{const el=els[x];if(el?.status==='OK'&&Number.isFinite(el.distance?.value)&&Number.isFinite(el.duration?.value))driving.set(c.key,{km:round(el.distance.value/1000),min:Math.round(el.duration.value/60)})});
  }catch{matrixFailed=true}
  await sleep(400);
 }
 if(matrixFailed||driving.size<picked.length)warnings.push('driving_partial');
 const places:NearbyPlace[]=keepNearestByDriving(picked.map(c=>{const d=driving.get(c.key);return {id:`${c.category}-${slug(c.name.vi)}-${Math.round(c.coordinates.lat*1000)}`,category:c.category,name:{vi:c.name.vi,en:c.name.en,zh:c.name.en},coordinates:{lat:round(c.coordinates.lat,6),lng:round(c.coordinates.lng,6)},straightKm:round(c.straightKm),drivingKm:d?d.km:null,drivingMinutes:d?d.min:null,...(c.ref?{ref:c.ref}:{}),source:c.source,computedAt}}));
 // Route polyline only for the nearest seaport and airport.
 for(const cat of ['seaport','airport'] as const){
  const first=places.filter(p=>p.category===cat).sort((a,b)=>(a.drivingKm??Infinity)-(b.drivingKm??Infinity)||a.straightKm-b.straightKm)[0];if(!first)continue;
  try{const j=await goong('/direction',{origin:pt(origin),destination:pt(first.coordinates),vehicle:'car'},key,sleep);const points=j?.routes?.[0]?.overview_polyline?.points;if(typeof points==='string'&&points)first.route=points;else warnings.push('route_'+cat)}catch{warnings.push('route_'+cat)}
  await sleep(400);
 }
 return {places,warnings};
}
export async function findNearby(park:Parameters<typeof findNearbyDetailed>[0],opts?:GeoOptions):Promise<NearbyPlace[]>{return (await findNearbyDetailed(park,opts)).places}
