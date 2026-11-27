import {defaultPlan} from './contentSchema';
import {useState,useEffect,useRef,useId} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Link} from 'react-router-dom';
import {tr} from './AppContext';
import {assetPriceText} from './assetPrice';
import type {IndustrialParkProfile,IndustrialAsset,Language,ParkMasterplanData} from './types';
import './ParkMaps.css';
const copy=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
// Regional map extents for fictional inventory; these are not parcel coordinates.
const centers:Record<string,[number,number]>={'Hải Phòng':[20.86,106.68],'Quảng Ninh':[21.02,107.2],'Bắc Ninh':[21.18,106.07],'Hà Nội':[21.03,105.8],'Ninh Bình':[20.25,105.97],'Thanh Hóa':[19.8,105.77],'Nghệ An':[18.68,105.67],'Đà Nẵng':[16.06,108.2],'Quảng Ngãi':[15.12,108.8],'Bình Định':[13.77,109.22],'Khánh Hòa':[12.25,109.18],'Bình Dương':[11.04,106.67],'Đồng Nai':[10.95,106.84],'Long An':[10.54,106.41],'Tây Ninh':[11.31,106.1],'Bà Rịa–Vũng Tàu':[10.5,107.16],'Cần Thơ':[10.04,105.78],'Hậu Giang':[9.78,105.47],'An Giang':[10.38,105.44]};
export function ParkLocationMap({park,language}:{park:IndustrialParkProfile;language:Language}){
 const region=park.mapMode==='regional'||!park.mapMode&&park.id.startsWith('park-demo-');
 const [lat,lng]=region?(park.mapMode==='regional'&&!park.id.startsWith('park-demo-')&&park.coordinates?[park.coordinates.lat,park.coordinates.lng] as [number,number]:centers[park.province]||[16.05,108.2]):[park.coordinates!.lat,park.coordinates!.lng];
 const host=useRef<HTMLDivElement>(null);
 const title=copy(language,'Bản đồ khu vực','Area map','区域地图');
 useEffect(()=>{
  if(!host.current)return;
  const map=L.map(host.current,{scrollWheelZoom:false,zoomControl:false}).setView([lat,lng],region?10:13);
  L.control.zoom({zoomInTitle:copy(language,'Phóng to','Zoom in','放大'),zoomOutTitle:copy(language,'Thu nhỏ','Zoom out','缩小')}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, NGA' }).addTo(map);
  if(!region){const label=document.createElement('span');label.textContent=tr(park.name,language);L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:'#0643d7',fillOpacity:1}).addTo(map).bindTooltip(label);}
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(host.current);
  return()=>{observer.disconnect();map.remove()};
 },[lat,lng,region,language,park.name]);
 return <div className="park-location-map"><div className="park-geographic-map" ref={host} role="region" aria-label={title}/><div className="park-map-caption"><span>{region?park.province:tr(park.name,language)}</span><a href={`https://www.google.com/maps/search/?api=1&query=${region?encodeURIComponent(park.province+', Vietnam'):`${lat},${lng}`}`} target="_blank" rel="noreferrer">{copy(language,'Mở bản đồ ↗','Open map ↗','打开地图 ↗')}</a></div></div>
}
export function ParkMasterplan({assets,language,plan,parkId,highlightAssetId}:{assets:IndustrialAsset[];language:Language;plan?:ParkMasterplanData;parkId?:string;highlightAssetId?:string}){
 const layout=plan||defaultPlan(assets),plots=layout.plots;
 const statusLabel=(status:string)=>copy(language,({available:'Cho thuê',reserved:'Đã giữ chỗ',occupied:'Đã lấp đầy',utility:'Hạ tầng kỹ thuật'} as Record<string,string>)[status]||status,({available:'Available',reserved:'Reserved',occupied:'Occupied',utility:'Utility'} as Record<string,string>)[status]||status,({available:'可租',reserved:'已预订',occupied:'已入驻',utility:'公用设施'} as Record<string,string>)[status]||status);
 const [selected,setSelected]=useState(-1),[zoom,setZoom]=useState(1);
 const [popupOpen,setPopupOpen]=useState(false);
 const popupId=useId();
 const stage=useRef<HTMLDivElement>(null);
 const trigger=useRef<HTMLElement|null>(null);
 const closePopup=()=>{setPopupOpen(false);setSelected(-1);trigger.current?.focus({preventScroll:true})};
 const planScroll=useRef<HTMLDivElement>(null);
 const choosePlot=(index:number)=>{
  trigger.current=document.activeElement as HTMLElement;
  setSelected(index);
  setPopupOpen(true);
  requestAnimationFrame(()=>{if(stage.current){const offset=window.matchMedia('(max-width:680px)').matches?124:140;window.scrollTo({top:stage.current.getBoundingClientRect().top+window.scrollY-offset,behavior:'instant'})}});
  const viewport=planScroll.current;
  const plot=viewport?.querySelectorAll<HTMLElement>('.park-plan-plot')[index];
  if(viewport&&plot) viewport.scrollTo({left:Math.max(0,plot.offsetLeft+plot.offsetWidth/2-viewport.clientWidth/2),behavior:'instant'});
 };
 const plot=plots[selected];
 const a=plot?.assetId?assets.find(a=>a.id===plot.assetId):undefined;
 const c=(vi:string,en:string,zh:string)=>copy(language,vi,en,zh);
 const locale=language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US';
 const codes=plots.map(p=>p.code);
 return <div className="park-plan" onKeyDown={event=>{if(event.key==='Escape'&&popupOpen){event.stopPropagation();closePopup()}}}>
  <div className="park-plan-toolbar"><label className="park-plot-select"><span>{c('Chọn lô','Select plot','选择地块')}</span><select aria-controls={popupId} value={selected} onChange={event=>choosePlot(Number(event.target.value))}><option value={-1} disabled>{c('Chọn lô để xem thông tin','Select a plot to view details','选择地块查看详情')}</option>{plots.map((p,i)=><option key={p.id} value={i}>{p.code} · {statusLabel(p.status)}</option>)}</select><small>{c('Hoặc bấm trực tiếp vào lô trên sơ đồ.','Or select a plot directly on the plan.','也可直接点击图中的地块。')}</small></label><div><button type="button" disabled={zoom===1} onClick={()=>setZoom(Math.max(1,zoom-.5))} aria-label={c('Thu nhỏ','Zoom out','缩小')}>−</button><button type="button" onClick={()=>setZoom(1)} aria-label={c('Đặt lại thu phóng','Reset zoom','重置缩放')}>{Math.round(zoom*100)}%</button><button type="button" disabled={zoom===2} onClick={()=>setZoom(Math.min(2,zoom+.5))} aria-label={c('Phóng to','Zoom in','放大')}>+</button></div></div>
  <div className="park-plan-stage" ref={stage}>
  <div className="park-plan-scroll" ref={planScroll} tabIndex={0} aria-label={c('Sơ đồ quy hoạch 2D','2D masterplan','二维总平面图')}><div className="park-plan-canvas" style={{width:`${zoom*100}%`}}>
  <MasterplanBackground layout={layout} assets={assets} language={language}/>
  {plots.map((p,i)=><button key={p.id} type="button" className={`park-plan-plot ${selected===i?'selected':''}${highlightAssetId&&p.assetId===highlightAssetId?' highlighted':''}`} style={{left:`${p.rect.x}%`,top:`${p.rect.y}%`,width:`${p.rect.width}%`,height:`${p.rect.height}%`,backgroundColor:p.status==='occupied'?'#dbe0df66':p.status==='reserved'?'#edc77d88':undefined}} onClick={()=>choosePlot(i)} aria-controls={popupId} aria-expanded={selected===i&&popupOpen} aria-pressed={selected===i} aria-label={`${p.code} · ${statusLabel(p.status)}`}><strong>{p.code}</strong><span>{p.assetId&&assets.find(a=>a.id===p.assetId)?`${assets.find(a=>a.id===p.assetId)!.area?.toLocaleString(locale)??'—'} ${assets.find(a=>a.id===p.assetId)!.unit}`:statusLabel(p.status)}</span></button>)}
  </div></div>
  {plot&&popupOpen&&<section id={popupId} className="park-plan-popup" aria-label={c('Thông tin lô','Plot information','地块信息')}>
    <button type="button" className="park-plan-popup-close" onClick={closePopup} aria-label={c('Đóng thông tin lô','Close plot information','关闭地块信息')}>×</button>
    <div aria-live="polite"><small>{c('Lô','Plot','地块')} {a?.lotCode?.trim()||codes[selected]}{a?.leasingStatus&&a.leasingStatus!=='unknown'?` · ${({available:c('Còn trống','Available','可租'),reserved:c('Đã giữ chỗ','Reserved','已预留'),leased:c('Đã cho thuê','Leased','已出租')} as Record<string,string>)[a.leasingStatus]}`:''}</small><h3>{a?tr(a.name,language):statusLabel(plot.status)}</h3><p>{a?`${a.area?.toLocaleString(locale)??'—'} ${a.unit}`:plot.areaM2?`${plot.areaM2.toLocaleString(locale)} m²`:''}</p><p>{a?assetPriceText(a,language):''}</p></div>
    {a&&plot.status!=='occupied'&&plot.status!=='utility'?<Link className="button primary" to={`/assets/${a.id}`}>{c('Xem mặt bằng','View asset','查看物业')} →</Link>:plot.status==='available'&&parkId?<Link className="button primary" to={`/find-supply?parkId=${parkId}`}>{c('Tư vấn thuê','Leasing consultation','租赁咨询')}</Link>:null}
  </section>}
  </div>
  <div className="park-plan-legend"><span><i style={{background:'#cae2c9'}}/>{c('Mặt bằng cho thuê','Leasing inventory','可租物业')}</span><span><i style={{background:'#dbe0df'}}/>{c('Nhà máy hiện hữu','Existing factories','现有工厂')}</span><span><i style={{background:'#bddad6'}}/>{c('Hạ tầng kỹ thuật','Utilities','公用设施')}</span><span><i style={{background:'#a5c8a2'}}/>{c('Cây xanh','Green space','绿地')}</span></div>

 </div>
}

export function MasterplanBackground({layout,assets,language}:{layout:ParkMasterplanData;assets:IndustrialAsset[];language:Language}){const c=(vi:string,en:string,zh:string)=>copy(language,vi,en,zh);return layout.background!=='builtin'?<img className="park-plan-background" src={layout.background} alt={c('Quy hoạch','Masterplan','总平面图')} style={{aspectRatio:layout.aspectRatio}}/>:<svg viewBox="0 0 1000 660" role="img" aria-label={c('Đường nội khu, lô công nghiệp và hạ tầng kỹ thuật','Internal roads, industrial plots and utilities','园区道路、工业地块及基础设施')}>
   <defs><pattern id="plan-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#c9d9c5" strokeWidth=".6"/></pattern><pattern id="plan-roof" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="#d7e0e5"/><path d="M0 0V10" stroke="#acbac3" strokeWidth="2"/></pattern></defs>
   <rect width="1000" height="660" fill="#e5edde"/><rect width="1000" height="660" fill="url(#plan-grid)"/>
   <path d="M900 0 Q860 160 925 300 T925 660 H1000V0Z" fill="#b5dce4"/>
   <path d="M32 35H858V590H32Z" fill="#d4e2cf" stroke="#809c81" strokeDasharray="8 5" strokeWidth="2"/>
   <path d="M0 620H1000M65 0V620M65 315H860M440 45V620M850 45V620M65 65H850M65 565H850" fill="none" stroke="#f7faf6" strokeWidth="42"/>
   <path d="M0 620H1000M65 0V620M65 315H860M440 45V620M850 45V620M65 65H850M65 565H850" fill="none" stroke="#aebbc0" strokeWidth="28"/>
   <path d="M0 620H1000M65 0V620M65 315H860M440 45V620M850 45V620M65 65H850M65 565H850" fill="none" stroke="white" strokeDasharray="12 10" strokeWidth="1.5"/>
   {[0,1,2].map(i=><g key={i}><rect x={100+i*105} y="100" width="85" height="185" fill="#cae2c9" stroke="#6a9b7a"/>{assets[i] && assets[i].type !== 'industrial_land'&&<><rect x={112+i*105} y="125" width="60" height="90" fill="url(#plan-roof)" stroke="#8a9ca6"/><rect x={112+i*105} y="240" width="60" height="20" fill="#b8cbd5"/></>}</g>)}
   {[0,1,2,3].map(i=><g key={i}><rect x={480+(i%2)*175} y={100+Math.floor(i/2)*245} width="150" height="185" fill="#dbe0df" stroke="#96a49f"/><rect x={495+(i%2)*175} y={125+Math.floor(i/2)*245} width="120" height="105" fill="url(#plan-roof)" stroke="#8a9ca6"/><text x={555+(i%2)*175} y={265+Math.floor(i/2)*245} textAnchor="middle" fill="#435c68" fontSize="17">B-0{i+1}</text></g>)}
   <rect x="100" y="350" width="135" height="180" fill="#bddad6" stroke="#739c9a"/><rect x="116" y="370" width="103" height="45" fill="#d5e5e7" stroke="#739c9a"/><rect x="116" y="435" width="103" height="60" fill="#a3c7df" stroke="#739c9a"/>
   <rect x="255" y="350" width="145" height="80" fill="#d0cbb3" stroke="#9e9472"/><rect x="270" y="365" width="115" height="35" fill="#f0eee5" stroke="#9e9472"/>
   <rect x="255" y="450" width="145" height="80" fill="#a5c8a2"/><path d="M265 490H390" stroke="#eef4dd" strokeWidth="10"/>
   {Array.from({length:24},(_,i)=><g key={i} fill="#73a274"><circle cx={100+i*31} cy="46" r="6"/><circle cx={100+i*31} cy="589" r="6"/></g>)}
   <text x="248" y="320" textAnchor="middle" fontSize="13" fill="#304959">{c('ĐƯỜNG D1 · 32 m','ROAD D1 · 32 m','D1路 · 32 m')}</text><text x="645" y="320" textAnchor="middle" fontSize="13" fill="#304959">{c('ĐƯỜNG D2 · 24 m','ROAD D2 · 24 m','D2路 · 24 m')}</text>
   <text x="167" y="520" textAnchor="middle" fontSize="15" fill="#294b59">{c('Khu kỹ thuật','Utilities','公用设施')}</text><text x="327" y="420" textAnchor="middle" fontSize="15" fill="#5c553e">{c('Điều hành','Administration','管理中心')}</text><text x="327" y="520" textAnchor="middle" fontSize="15" fill="#315b38">{c('Cây xanh','Green space','绿地')}</text>
   <text x="440" y="652" textAnchor="middle" fontSize="16" fill="#304959">{c('CỔNG CHÍNH · ĐƯỜNG KẾT NỐI','MAIN GATE · ACCESS ROAD','主入口 · 连接道路')}</text><path d="M950 100V40L940 60M950 40L960 60" stroke="#244759" strokeWidth="3" fill="none"/><text x="950" y="28" textAnchor="middle" fontSize="18" fill="#244759">N</text>
  </svg>;}
