import {useState,useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {Link} from 'react-router-dom';
import {tr} from './AppContext';
import {assetPriceText} from './assetPrice';
import type {IndustrialParkProfile,IndustrialAsset,Language} from './types';
import './ParkMaps.css';
const copy=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
// Regional map extents for fictional inventory; these are not parcel coordinates.
const centers:Record<string,[number,number]>={'Hải Phòng':[20.86,106.68],'Quảng Ninh':[21.02,107.2],'Bắc Ninh':[21.18,106.07],'Hà Nội':[21.03,105.8],'Ninh Bình':[20.25,105.97],'Thanh Hóa':[19.8,105.77],'Nghệ An':[18.68,105.67],'Đà Nẵng':[16.06,108.2],'Quảng Ngãi':[15.12,108.8],'Bình Định':[13.77,109.22],'Khánh Hòa':[12.25,109.18],'Bình Dương':[11.04,106.67],'Đồng Nai':[10.95,106.84],'Long An':[10.54,106.41],'Tây Ninh':[11.31,106.1],'Bà Rịa–Vũng Tàu':[10.5,107.16],'Cần Thơ':[10.04,105.78],'Hậu Giang':[9.78,105.47],'An Giang':[10.38,105.44]};
export function ParkLocationMap({park,language}:{park:IndustrialParkProfile;language:Language}){
 const region=park.id.startsWith('park-demo-');
 const [lat,lng]=region?(centers[park.province]||[16.05,108.2]):[park.coordinates!.lat,park.coordinates!.lng];
 const host=useRef<HTMLDivElement>(null);
 const title=copy(language,'Bản đồ khu vực','Area map','区域地图');
 useEffect(()=>{
  if(!host.current)return;
  const map=L.map(host.current,{scrollWheelZoom:false,zoomControl:false}).setView([lat,lng],region?10:13);
  L.control.zoom({zoomInTitle:copy(language,'Phóng to','Zoom in','放大'),zoomOutTitle:copy(language,'Thu nhỏ','Zoom out','缩小')}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, NGA' }).addTo(map);
  if(!region){const label=document.createElement('span');label.textContent=tr(park.name,language);L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:'#007b9c',fillOpacity:1}).addTo(map).bindTooltip(label);}
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(host.current);
  return()=>{observer.disconnect();map.remove()};
 },[lat,lng,region,language,park.name]);
 return <div className="park-location-map"><div className="park-geographic-map" ref={host} role="region" aria-label={title}/><div className="park-map-caption"><span>{region?park.province:tr(park.name,language)}</span><a href={`https://www.google.com/maps/search/?api=1&query=${region?encodeURIComponent(park.province+', Vietnam'):`${lat},${lng}`}`} target="_blank" rel="noreferrer">{copy(language,'Mở bản đồ ↗','Open map ↗','打开地图 ↗')}</a></div></div>
}
export function ParkMasterplan({assets,language}:{assets:IndustrialAsset[];language:Language}){
 const [selected,setSelected]=useState(0),[zoom,setZoom]=useState(1);
 const planScroll=useRef<HTMLDivElement>(null);
 const choosePlot=(index:number)=>{
  setSelected(index);
  const viewport=planScroll.current;
  const plot=viewport?.querySelectorAll<HTMLElement>('.park-plan-plot')[index];
  if(viewport&&plot) viewport.scrollTo({left:Math.max(0,plot.offsetLeft+plot.offsetWidth/2-viewport.clientWidth/2),behavior:'smooth'});
 };
 const a=assets[selected]||assets[0];
 const c=(vi:string,en:string,zh:string)=>copy(language,vi,en,zh);
 const locale=language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US';
 const codes=['A-01','A-02','A-03'];
 return <div className="park-plan">
  <div className="park-plan-toolbar"><label className="park-plot-select"><span>{c('Chọn lô','Select plot','选择地块')}</span><select value={selected} onChange={event=>choosePlot(Number(event.target.value))}>{assets.slice(0,3).map((asset,i)=><option key={asset.id} value={i}>{codes[i]} · {tr(asset.name,language)} · {asset.area.toLocaleString(locale)} {asset.unit}</option>)}</select><small>{c('Hoặc bấm trực tiếp vào lô A-01, A-02, A-03 trên sơ đồ.','Or click A-01, A-02 or A-03 directly on the plan.','也可直接点击图中的 A-01、A-02 或 A-03 地块。')}</small></label><div><button type="button" disabled={zoom===1} onClick={()=>setZoom(Math.max(1,zoom-.5))} aria-label={c('Thu nhỏ','Zoom out','缩小')}>−</button><button type="button" onClick={()=>setZoom(1)} aria-label={c('Đặt lại thu phóng','Reset zoom','重置缩放')}>{Math.round(zoom*100)}%</button><button type="button" disabled={zoom===2} onClick={()=>setZoom(Math.min(2,zoom+.5))} aria-label={c('Phóng to','Zoom in','放大')}>+</button></div></div>
  <div className="park-plan-scroll" ref={planScroll} tabIndex={0} aria-label={c('Sơ đồ quy hoạch 2D','2D masterplan','二维总平面图')}><div className="park-plan-canvas" style={{width:`${zoom*100}%`}}>
  <svg viewBox="0 0 1000 660" role="img" aria-label={c('Đường nội khu, lô công nghiệp và hạ tầng kỹ thuật','Internal roads, industrial plots and utilities','园区道路、工业地块及基础设施')}>
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
  </svg>
  {assets.slice(0,3).map((asset,i)=><button key={asset.id} type="button" className={`park-plan-plot ${selected===i?'selected':''}`} style={{left:`${10+i*10.5}%`,top:'15.15%',width:'8.5%',height:'28.03%'}} onClick={()=>choosePlot(i)} aria-pressed={selected===i} aria-label={`${codes[i]} · ${tr(asset.name,language)}`}><strong>{codes[i]}</strong><span>{asset.area.toLocaleString(locale)} {asset.unit}</span></button>)}
  </div></div>
  <div className="park-plan-legend"><span><i style={{background:'#cae2c9'}}/>{c('Mặt bằng cho thuê','Leasing inventory','可租物业')}</span><span><i style={{background:'#dbe0df'}}/>{c('Nhà máy hiện hữu','Existing factories','现有工厂')}</span><span><i style={{background:'#bddad6'}}/>{c('Hạ tầng kỹ thuật','Utilities','公用设施')}</span><span><i style={{background:'#a5c8a2'}}/>{c('Cây xanh','Green space','绿地')}</span></div>
  {a&&<div className="park-plan-detail" aria-live="polite"><div><small>{c('Lô','Plot','地块')} {codes[selected]}</small><h3>{tr(a.name,language)}</h3><p>{a.area.toLocaleString(locale)} {a.unit} · {assetPriceText(a,language)}</p><p>{tr(a.description,language)}</p></div><Link className="button primary" to={`/assets/${a.id}`}>{c('Xem mặt bằng','View asset','查看物业')} →</Link></div>}
 </div>
}
