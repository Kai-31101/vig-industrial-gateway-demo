import {useMemo,useState} from 'react';
import {GeoMap,type GeoMarker} from './GeoMap';
import {CATEGORY_COLORS,CATEGORY_SYMBOLS,NEARBY_CATEGORIES,RADIUS_OPTIONS,categoryCounts,categoryLabel,decodePolyline,filterPlaces,placeName} from './geoPlaces';
import type {IndustrialParkProfile,Language,NearbyCategory,NearbyPlace} from './types';
import './NearbyPlaces.css';
const c3=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
const nf=(n:number,l:Language)=>n.toLocaleString(l==='vi'?'vi-VN':l==='zh'?'zh-CN':'en-US',{maximumFractionDigits:1});
export function minutesText(min:number,l:Language){const h=Math.floor(min/60),m=min%60;return h<1?c3(l,`${m} phút`,`${m} min`,`${m}分钟`):c3(l,`${h} giờ${m?` ${m} phút`:''}`,`${h} h${m?` ${m} min`:''}`,`${h}小时${m?`${m}分钟`:''}`)}
export function distanceText(p:NearbyPlace,l:Language){
 if(p.drivingKm!=null)return `${nf(p.drivingKm,l)} km${p.drivingMinutes!=null?` · ${minutesText(p.drivingMinutes,l)} ${c3(l,'lái xe','by car','车程')}`:''}`;
 return `~${nf(p.straightKm,l)} km ${c3(l,'(đường chim bay)','(straight line)','（直线距离）')}`;
}
export const formatDate=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}/${d.getUTCFullYear()}`};
export function NearbyList({places,language,selectedId,onSelect}:{places:NearbyPlace[];language:Language;selectedId:string|null;onSelect:(id:string|null)=>void}){
 if(!places.length)return <p className="nearby-empty" role="status">{c3(language,'Không có điểm nào trong phạm vi đã chọn.','No places within the selected range.','所选范围内没有地点。')}</p>;
 return <ol className="nearby-list">{places.map(p=><li key={p.id}><button type="button" aria-pressed={selectedId===p.id} className={selectedId===p.id?'active':''} onClick={()=>onSelect(selectedId===p.id?null:p.id)}>
  <i style={{background:CATEGORY_COLORS[p.category]}} aria-hidden="true">{CATEGORY_SYMBOLS[p.category]}</i>
  <span><b>{placeName(p,language)}{p.ref&&placeName(p,language)!==p.ref?` (${p.ref})`:''}</b><small>{categoryLabel(p.category,language)}</small><em>{distanceText(p,language)}</em>{p.route&&<small className="nearby-route">{c3(language,'Có tuyến đường trên bản đồ','Route shown on map','地图显示路线')}</small>}</span></button></li>)}</ol>;
}
export function NearbyConnectivity({park,language}:{park:IndustrialParkProfile;language:Language}){
 const places=park.places||[],[cats,setCats]=useState<Set<NearbyCategory>>(()=>new Set()),[radius,setRadius]=useState(0),[selected,setSelected]=useState<string|null>(null);
 const total=useMemo(()=>categoryCounts(places),[places]),inRadius=useMemo(()=>categoryCounts(places,radius),[places,radius]);
 const shown=useMemo(()=>filterPlaces(places,cats,radius),[places,cats,radius]);
 const sel=shown.find(p=>p.id===selected)||null,route=useMemo(()=>sel?.route?decodePolyline(sel.route):null,[sel]);
 const markers:GeoMarker[]=useMemo(()=>shown.map(p=>({id:p.id,lat:p.coordinates.lat,lng:p.coordinates.lng,color:CATEGORY_COLORS[p.category],symbol:CATEGORY_SYMBOLS[p.category],label:`${placeName(p,language)} · ${distanceText(p,language)}`})),[shown,language]);
 const parkName=(language==='zh'?park.name.zh:language==='en'?park.name.en:park.name.vi)||park.name.vi;
 const origin=useMemo(()=>park.coordinates?{lat:park.coordinates.lat,lng:park.coordinates.lng,label:parkName}:null,[park.coordinates,parkName]);
 const updated=formatDate(places.map(p=>p.computedAt).sort().at(-1)||'');
 const demo=park.id.startsWith('park-demo-');
 const toggle=(c:NearbyCategory)=>{setSelected(null);setCats(old=>{const n=new Set(old);if(n.has(c))n.delete(c);else n.add(c);return n})};
 const title=c3(language,'Kết nối & tiện ích xung quanh','Connectivity & nearby amenities','交通连接与周边设施');
 return <section className="nearby" aria-labelledby="nearby-title">
  <h3 id="nearby-title">{title}</h3>
  {demo&&<p className="nearby-demo">{c3(language,'Vị trí và tiện ích mang tính minh hoạ (dữ liệu demo).','Location and amenities are illustrative (demo data).','位置和周边设施仅为示例（演示数据）。')}</p>}
  <div className="nearby-toolbar">
   <div className="nearby-chips" role="group" aria-label={c3(language,'Lọc theo loại','Filter by type','按类型筛选')}>
    <button type="button" aria-pressed={cats.size===0} className={cats.size===0?'active':''} onClick={()=>{setCats(new Set());setSelected(null)}}>{c3(language,'Tất cả','All','全部')} <small>{Object.values(inRadius).reduce((a,b)=>a+b,0)}</small></button>
    {NEARBY_CATEGORIES.filter(c=>total[c]).map(c=><button type="button" key={c} aria-pressed={cats.has(c)} className={cats.has(c)?'active':''} onClick={()=>toggle(c)}><i style={{background:CATEGORY_COLORS[c]}} aria-hidden="true"/>{categoryLabel(c,language)} <small>{inRadius[c]||0}</small></button>)}
   </div>
   <label className="nearby-radius">{c3(language,'Bán kính','Radius','半径')}<select value={radius} onChange={e=>{setRadius(Number(e.target.value));setSelected(null)}}>{RADIUS_OPTIONS.map(r=><option key={r} value={r}>{r===0?c3(language,'Tất cả','All','全部'):`${r} km`}</option>)}</select></label>
  </div>
  <div className="nearby-body">
   <div className="nearby-map"><GeoMap language={language} ariaLabel={c3(language,'Bản đồ kết nối và tiện ích xung quanh','Map of connectivity and nearby amenities','交通连接与周边设施地图')} center={park.coordinates!} origin={origin} markers={markers} route={route} selectedId={sel?.id||null} onSelect={id=>setSelected(old=>old===id?null:id)}/></div>
   <div className="nearby-side"><NearbyList places={shown} language={language} selectedId={sel?.id||null} onSelect={setSelected}/>
    <p className="nearby-note">{c3(language,`Khoảng cách lái xe theo Goong${updated?`, cập nhật ${updated}`:''}. Địa điểm: Goong và danh sách trung tâm giao thông tuyển chọn.`,`Driving distances by Goong${updated?`, updated ${updated}`:''}. Places: Goong and a curated transport-hub list.`,`行车距离来自 Goong${updated?`，更新于 ${updated}`:''}。地点：Goong 及精选交通枢纽名单。`)}</p></div>
  </div>
 </section>;
}
