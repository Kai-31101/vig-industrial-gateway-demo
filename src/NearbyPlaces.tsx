import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {GeoMap,type GeoMarker} from './GeoMap';
import {AmenityIcon,amenityIconSvg} from './amenityIcons';
import {CATEGORY_COLORS,CATEGORY_SYMBOLS,NEARBY_CATEGORIES,RADIUS_OPTIONS,categoryCounts,categoryLabel,decodePolyline,filterPlaces,placeName} from './geoPlaces';
import {api} from './remote';
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
export type RouteMode='car'|'truck';
export interface RouteResult{distanceM:number;durationS:number;polyline:string;steps:{text:string;distanceM:number}[]}
export type RouteState={status:'loading'}|{status:'ok';data:RouteResult}|{status:'error'};
type Pt={lat:number;lng:number};
const STEPS_SHOWN=6;
/** Places shown before "Xem tất cả" on narrow screens (the desktop list scrolls in its own box instead). */
const LIST_SHOWN=5;
const modeLabel=(m:RouteMode,l:Language)=>m==='truck'?c3(l,'Xe tải','Truck','货车'):c3(l,'Ô tô','Car','汽车');
const metres=(m:number,l:Language)=>m<1000?`${Math.max(10,Math.round(m/10)*10)} m`:`${nf(m/1000,l)} km`;
/** Google Maps directions link (new tab); the app never sends these coordinates anywhere else. */
export const googleDirectionsUrl=(from:Pt,to:Pt)=>`https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
export const googleMapsPlaceUrl=(p:Pt)=>`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
function RoutePanel({id,place,origin,mode,onMode,state,language,onClear}:{id:string;place:NearbyPlace;origin:{lat:number;lng:number;label:string};mode:RouteMode;onMode:(m:RouteMode)=>void;state:RouteState;language:Language;onClear:()=>void}){
 const [all,setAll]=useState(false);
 const early=mode==='car'&&place.drivingKm!=null?`${nf(place.drivingKm,language)} km${place.drivingMinutes!=null?` · ${c3(language,'khoảng','about','约')} ${minutesText(place.drivingMinutes,language)} ${c3(language,'bằng ô tô','by car','汽车')}`:''}`:null;
 const steps=state.status==='ok'?state.data.steps:[],shown=all?steps:steps.slice(0,STEPS_SHOWN);
 return <div id={id} className="nearby-dir" role="group" aria-label={c3(language,'Chỉ đường','Directions','路线指引')}>
  <div className="nearby-modes" role="group" aria-label={c3(language,'Phương tiện','Vehicle','交通工具')}>{(['car','truck'] as RouteMode[]).map(m=><button type="button" key={m} aria-pressed={mode===m} className={mode===m?'active':''} onClick={()=>onMode(m)}>{modeLabel(m,language)}</button>)}</div>
  {state.status==='ok'?<p className="nearby-dir-sum"><b>{metres(state.data.distanceM,language)}</b> · {c3(language,'khoảng','about','约')} {minutesText(Math.max(1,Math.round(state.data.durationS/60)),language)} {c3(language,`bằng ${modeLabel(mode,language).toLowerCase()}`,`by ${modeLabel(mode,language).toLowerCase()}`,`${modeLabel(mode,language)}行驶`)}</p>
   :state.status==='loading'?<><p className="nearby-dir-sum">{early||distanceText(place,language)}</p><p className="nearby-dir-status" role="status">{c3(language,'Đang tải chỉ đường…','Loading directions…','正在加载路线…')}</p></>
   :<><p className="nearby-dir-sum">{early||distanceText(place,language)}</p><p className="nearby-dir-status error" role="alert">{c3(language,'Chưa lấy được chỉ đường chi tiết lúc này. Bạn vẫn có thể mở chỉ đường trong Google Maps.','Detailed directions are unavailable right now. You can still open directions in Google Maps.','暂时无法获取详细路线，仍可在 Google Maps 中打开路线。')}</p></>}
  {steps.length>0&&<><ol className="nearby-steps">{shown.map((st,i)=><li key={i}><span aria-hidden="true">{i+1}</span><span>{st.text}{st.distanceM>0&&<small> ({metres(st.distanceM,language)})</small>}</span></li>)}</ol>
   {steps.length>STEPS_SHOWN&&<button type="button" className="nearby-link" aria-expanded={all} onClick={()=>setAll(v=>!v)}>{all?c3(language,'Thu gọn','Show fewer steps','收起'):c3(language,`Xem tất cả ${steps.length} bước`,`Show all ${steps.length} steps`,`查看全部 ${steps.length} 步`)}</button>}
   {language!=='vi'&&<p className="nearby-note">{c3(language,'','Directions are in Vietnamese, from Goong.','路线指引为 Goong 提供的越南语文本。')}</p>}</>}
  <p className="nearby-dir-from">{c3(language,'Xuất phát từ','From','出发地')}: {origin.label}</p>
  <div className="nearby-dir-actions"><a className="button" href={googleDirectionsUrl(origin,place.coordinates)} target="_blank" rel="noopener noreferrer">{c3(language,'Mở chỉ đường trong Google Maps','Open directions in Google Maps','在 Google Maps 中打开路线')}</a><button type="button" className="button outline" onClick={onClear}>{c3(language,'Xóa chỉ đường','Clear directions','清除路线')}</button></div>
 </div>;
}
export function NearbyList({places,language,selectedId,onSelect,detail}:{places:NearbyPlace[];language:Language;selectedId:string|null;onSelect:(id:string|null)=>void;detail?:(p:NearbyPlace,panelId:string)=>ReactNode}){
 const ol=useRef<HTMLOListElement>(null),[expanded,setExpanded]=useState(false);
 // Keep the opened row (and its directions) in view inside the scrolling list; only the list scrolls, never the page.
 useEffect(()=>{const list=ol.current,li=selectedId&&detail?list?.querySelector<HTMLElement>('li[data-open="true"]'):null;if(!list||!li||list.scrollHeight<=list.clientHeight+2)return;list.scrollTo({top:Math.max(0,li.offsetTop-6),behavior:'smooth'})},[selectedId]);// eslint-disable-line react-hooks/exhaustive-deps
 if(!places.length)return <p className="nearby-empty" role="status">{c3(language,'Không có điểm nào trong phạm vi đã chọn.','No places within the selected range.','所选范围内没有地点。')}</p>;
 const selectedIndex=places.findIndex(p=>p.id===selectedId),collapsed=!expanded&&places.length>LIST_SHOWN&&selectedIndex<LIST_SHOWN;
 return <><ol className={`nearby-list${collapsed?' is-collapsed':''}`} ref={ol}>{places.map(p=>{const open=selectedId===p.id,panelId=`nearby-dir-${p.id}`;return <li key={p.id} data-open={open}><button type="button" {...(detail?{'aria-expanded':open,'aria-controls':open?panelId:undefined}:{'aria-pressed':open})} className={open?'active':''} onClick={()=>onSelect(open?null:p.id)}>
  <i style={{background:CATEGORY_COLORS[p.category]}} aria-hidden="true"><AmenityIcon category={p.category} size={18}/></i>
  <span><b>{placeName(p,language)}{p.ref&&placeName(p,language)!==p.ref?` (${p.ref})`:''}</b><small>{categoryLabel(p.category,language)}</small><em>{distanceText(p,language)}</em>{p.route&&<small className="nearby-route">{c3(language,'Có tuyến đường trên bản đồ','Route shown on map','地图显示路线')}</small>}</span></button>{open&&detail?.(p,panelId)}</li>})}</ol>
  {places.length>LIST_SHOWN&&<button type="button" className="nearby-more" aria-expanded={!collapsed} onClick={()=>setExpanded(!collapsed?false:true)}>{collapsed?c3(language,`Xem tất cả (${places.length})`,`Show all (${places.length})`,`查看全部（${places.length}）`):c3(language,'Thu gọn danh sách','Show fewer','收起列表')}</button>}</>;
}
/** Lot context of an asset page: directions start at the lot when it has coordinates (demo values are illustrative), otherwise at the park. */
export interface NearbyLot{assetId:string;code?:string;coordinates?:Pt}
export function NearbyConnectivity({park,language,lot}:{park:IndustrialParkProfile;language:Language;lot?:NearbyLot}){
 const places=park.places||[],[cats,setCats]=useState<Set<NearbyCategory>>(()=>new Set()),[radius,setRadius]=useState(0),[selected,setSelected]=useState<string|null>(null),[mode,setMode]=useState<RouteMode>('car'),[routes,setRoutes]=useState<Record<string,RouteState>>({});
 const total=useMemo(()=>categoryCounts(places),[places]),inRadius=useMemo(()=>categoryCounts(places,radius),[places,radius]);
 const shown=useMemo(()=>filterPlaces(places,cats,radius),[places,cats,radius]);
 const sel=shown.find(p=>p.id===selected)||null,scope=lot?`kind=asset&id=${encodeURIComponent(lot.assetId)}`:`kind=park&id=${encodeURIComponent(park.id)}`,rkey=sel?`${scope}|${sel.id}|${mode}`:'',rstate:RouteState|undefined=rkey?routes[rkey]:undefined;
 const route=useMemo(()=>rstate?.status==='ok'?decodePolyline(rstate.data.polyline):sel?.route&&mode==='car'?decodePolyline(sel.route):null,[rstate,sel,mode]);
 useEffect(()=>{
  if(!sel||routes[rkey])return;let dead=false;
  setRoutes(o=>({...o,[rkey]:{status:'loading'}}));
  api<RouteResult>(`geo/route?${scope}&place=${encodeURIComponent(sel.id)}&mode=${mode}`).then(data=>{if(!dead)setRoutes(o=>({...o,[rkey]:data&&Number.isFinite(data.distanceM)&&typeof data.polyline==='string'?{status:'ok',data}:{status:'error'}}))}).catch(()=>{if(!dead)setRoutes(o=>({...o,[rkey]:{status:'error'}}))});
  return()=>{dead=true;setRoutes(o=>o[rkey]?.status==='loading'?Object.fromEntries(Object.entries(o).filter(([k])=>k!==rkey)):o)};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[rkey]);
 const lotPt=lot?.coordinates&&Number.isFinite(lot.coordinates.lat)&&Number.isFinite(lot.coordinates.lng)?lot.coordinates:null,lotLabel=lotPt?`${c3(language,'Lô','Plot','地块')} ${lot?.code||''}`.trim():'';
 const markers:GeoMarker[]=useMemo(()=>[...shown.map(p=>({id:p.id,lat:p.coordinates.lat,lng:p.coordinates.lng,color:CATEGORY_COLORS[p.category],symbol:CATEGORY_SYMBOLS[p.category],icon:amenityIconSvg(p.category,18),label:`${placeName(p,language)} · ${distanceText(p,language)}`})),...(lotPt&&park.coordinates?[{id:'__park',lat:park.coordinates.lat,lng:park.coordinates.lng,color:'#022582'/* --brand-deep */,icon:amenityIconSvg('industrial_park',17),label:`${c3(language,'Vị trí KCN','Park location','园区位置')}: ${(language==='zh'?park.name.zh:language==='en'?park.name.en:park.name.vi)||park.name.vi}`}]:[])],[shown,language,lotPt?.lat,lotPt?.lng,park.coordinates,park.name]);
 const parkName=(language==='zh'?park.name.zh:language==='en'?park.name.en:park.name.vi)||park.name.vi;
 const origin=useMemo(()=>lotPt?{lat:lotPt.lat,lng:lotPt.lng,label:lotLabel,badge:lotLabel}:park.coordinates?{lat:park.coordinates.lat,lng:park.coordinates.lng,label:parkName}:null,[lotPt?.lat,lotPt?.lng,lotLabel,park.coordinates,parkName]);
 const updated=formatDate(places.map(p=>p.computedAt).sort().at(-1)||'');
 const demo=park.id.startsWith('park-demo-');
 const toggle=(c:NearbyCategory)=>{setSelected(null);setCats(old=>{const n=new Set(old);if(n.has(c))n.delete(c);else n.add(c);return n})};
 const title=lot?c3(language,'Kết nối & tiện ích xung quanh','Connectivity & nearby amenities','交通连接与周边设施'):c3(language,'Bản đồ tiện ích xung quanh','Nearby amenities map','周边设施地图');
 return <section className="nearby" aria-labelledby="nearby-title">
  {lot&&<span className="nearby-eyebrow">{c3(language,'Kết nối','Connectivity','交通连接')}</span>}<h3 id="nearby-title">{title}</h3>
  {demo&&<p className="nearby-demo">{c3(language,'Vị trí và tiện ích mang tính minh hoạ (dữ liệu demo).','Location and amenities are illustrative (demo data).','位置和周边设施仅为示例（演示数据）。')}</p>}
  <div className="nearby-toolbar">
   <div className="nearby-chips" role="group" aria-label={c3(language,'Lọc theo loại','Filter by type','按类型筛选')}>
    <button type="button" aria-pressed={cats.size===0} className={cats.size===0?'active':''} onClick={()=>{setCats(new Set());setSelected(null)}}>{c3(language,'Tất cả','All','全部')} <small>{Object.values(inRadius).reduce((a,b)=>a+b,0)}</small></button>
    {NEARBY_CATEGORIES.filter(c=>total[c]).map(c=><button type="button" key={c} aria-pressed={cats.has(c)} className={cats.has(c)?'active':''} onClick={()=>toggle(c)}><i style={{background:CATEGORY_COLORS[c]}} aria-hidden="true"><AmenityIcon category={c} size={16}/></i>{categoryLabel(c,language)} <small>{inRadius[c]||0}</small></button>)}
   </div>
   <label className="nearby-radius">{c3(language,'Bán kính','Radius','半径')}<select value={radius} onChange={e=>{setRadius(Number(e.target.value));setSelected(null)}}>{RADIUS_OPTIONS.map(r=><option key={r} value={r}>{r===0?c3(language,'Tất cả','All','全部'):`${r} km`}</option>)}</select></label>
  </div>
  <div className="nearby-body">
   <div className="nearby-map"><GeoMap language={language} ariaLabel={c3(language,'Bản đồ kết nối và tiện ích xung quanh','Map of connectivity and nearby amenities','交通连接与周边设施地图')} center={park.coordinates!} origin={origin} markers={markers} route={route} selectedId={sel?.id||null} onSelect={id=>{if(id!=='__park')setSelected(old=>old===id?null:id)}}/></div>
   <div className="nearby-side">{lot&&<p className="nearby-origin">{lotPt?c3(language,`Chỉ đường tính từ ${lotLabel} (vị trí mang tính minh hoạ).`,`Directions start from ${lotLabel} (illustrative position).`,`路线从 ${lotLabel} 出发（位置仅为示意）。`):c3(language,'Vị trí KCN: lô này chưa có toạ độ nên chỉ đường tính từ khu công nghiệp.','Park location: this plot has no coordinates, so directions start from the park.','园区位置：该地块暂无坐标，路线从园区出发。')}</p>}
   <NearbyList places={shown} language={language} selectedId={sel?.id||null} onSelect={setSelected} detail={(p,panelId)=>origin?<RoutePanel id={panelId} place={p} origin={origin} mode={mode} onMode={setMode} state={routes[`${scope}|${p.id}|${mode}`]||{status:'loading'}} language={language} onClear={()=>setSelected(null)}/>:null}/>
    <p className="nearby-note">{c3(language,`Khoảng cách lái xe theo Goong${updated?`, cập nhật ${updated}`:''}. Địa điểm: Goong và danh sách trung tâm giao thông tuyển chọn.`,`Driving distances by Goong${updated?`, updated ${updated}`:''}. Places: Goong and a curated transport-hub list.`,`行车距离来自 Goong${updated?`，更新于 ${updated}`:''}。地点：Goong 及精选交通枢纽名单。`)}</p></div>
  </div>
 </section>;
}
