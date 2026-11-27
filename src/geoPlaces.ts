// Shared, dependency-free helpers for park "nearby places" (used by server/geo.ts, the admin editor and the public map).
import type {NearbyCategory,NearbyPlace,Language} from './types';
export const NEARBY_CATEGORIES:NearbyCategory[]=['seaport','airport','highway','rail','hospital','college','industrial_park','town'];
/** Category colours come from theme.css tokens (literal values because map pins are drawn outside the CSS cascade).
 * Transport uses the blue family, services teal/green/olive, places neutral greys; every colour is >=5:1 with the white icon.
 * No red (danger) and no orange. Categories are told apart by their icon first, colour second. */
export const CATEGORY_COLORS:Record<NearbyCategory,string>={
 airport:'#0643d7',/* --brand */
 seaport:'#0e7490',/* --accent */
 highway:'#022582',/* --brand-deep */
 rail:'#3730a3',/* --violet */
 hospital:'#15803d',/* --success: medical green cross, never the error red */
 college:'#5b4b00',/* --warning (dark olive text colour) */
 industrial_park:'#1f2937',/* --text-medium */
 town:'#4b5563',/* --neutral-600 */
};
export const CATEGORY_SYMBOLS:Record<NearbyCategory,string>={seaport:'⚓',airport:'✈',highway:'=',rail:'⇄',hospital:'+',college:'▲',industrial_park:'▣',town:'●'};
const LABELS:Record<NearbyCategory,[string,string,string]>={seaport:['Cảng biển','Seaports','海港'],airport:['Sân bay','Airports','机场'],highway:['Quốc lộ / cao tốc','Highways','国道/高速'],rail:['Ga đường sắt','Rail stations','火车站'],hospital:['Bệnh viện','Hospitals','医院'],college:['Cao đẳng / đại học','Colleges','院校'],industrial_park:['KCN lân cận','Nearby parks','邻近园区'],town:['Thị trấn / thành phố','Towns','城镇']};
export const categoryLabel=(c:NearbyCategory,l:Language)=>LABELS[c][l==='vi'?0:l==='zh'?2:1];
export const RADIUS_OPTIONS=[0,5,10,20,50] as const;
export const MAX_PLACES=40;
const inVietnam=(p:{lat:unknown;lng:unknown}|undefined|null)=>!!p&&typeof p.lat==='number'&&typeof p.lng==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&p.lat>=8&&p.lat<=24&&p.lng>=102&&p.lng<=110;
/** Returns an error code for the first invalid place, or undefined when the list is valid. */
export function placesError(places:unknown):string|undefined{
 if(places===undefined||places===null)return;
 if(!Array.isArray(places))return 'places';
 if(places.length>MAX_PLACES)return 'places_count';
 for(const p of places as NearbyPlace[]){
  if(!p||typeof p!=='object'||!p.id||!NEARBY_CATEGORIES.includes(p.category))return 'places_item';
  if(!p.name||typeof p.name.vi!=='string'||!p.name.vi.trim())return 'places_name';
  if(!inVietnam(p.coordinates))return 'places_coordinates';
  if(typeof p.straightKm!=='number'||!Number.isFinite(p.straightKm)||p.straightKm<0)return 'places_distance';
  for(const v of [p.drivingKm,p.drivingMinutes])if(v!==null&&v!==undefined&&(typeof v!=='number'||!Number.isFinite(v)||v<0))return 'places_distance';
  if(p.source!=='goong'&&p.source!=='curated+goong'&&p.source!=='manual')return 'places_source';
 }
}
export function haversineKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){const R=6371.0088,r=(x:number)=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng),h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)))}
/** Decodes a Google-style encoded polyline (precision 5) into [lat,lng] pairs. */
export function decodePolyline(encoded:string,precision=5):[number,number][]{
 const out:[number,number][]=[],f=10**precision;let i=0,lat=0,lng=0;
 while(i<encoded.length){
  for(const axis of [0,1]){let shift=0,result=0,byte:number;do{byte=encoded.charCodeAt(i++)-63;result|=(byte&31)<<shift;shift+=5}while(byte>=32&&i<encoded.length);const d=result&1?~(result>>1):result>>1;if(axis===0)lat+=d;else lng+=d}
  out.push([lat/f,lng/f]);
 }
 return out;
}
/** Effective distance used for filtering and sorting: driving distance when known, otherwise straight-line. */
export const effectiveKm=(p:NearbyPlace)=>p.drivingKm??p.straightKm;
export function filterPlaces(places:NearbyPlace[],categories:ReadonlySet<NearbyCategory>|null,radiusKm:number){
 return places.filter(p=>(!categories||categories.size===0||categories.has(p.category))&&(radiusKm<=0||effectiveKm(p)<=radiusKm)).sort((a,b)=>effectiveKm(a)-effectiveKm(b)||a.name.vi.localeCompare(b.name.vi));
}
export function categoryCounts(places:NearbyPlace[],radiusKm=0){const out:Partial<Record<NearbyCategory,number>>={};for(const p of places)if(radiusKm<=0||effectiveKm(p)<=radiusKm)out[p.category]=(out[p.category]||0)+1;return out}
export const placeName=(p:NearbyPlace,l:Language)=>(l==='zh'?p.name.zh:l==='en'?p.name.en:p.name.vi)||p.name.en||p.name.vi;
