import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import {GeoMap,type GeoMarker} from './GeoMap';
import type {IndustrialParkProfile,Language} from './types';
const c3=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
/** Directory map: one clustered pin per matching park. No prices or availability figures on pins. */
export function ParksMapView({parks,language}:{parks:IndustrialParkProfile[];language:Language}){
 const navigate=useNavigate();
 const pinned=useMemo(()=>parks.filter(p=>p.coordinates&&Number.isFinite(p.coordinates.lat)&&Number.isFinite(p.coordinates.lng)),[parks]);
 const markers:GeoMarker[]=useMemo(()=>pinned.map(p=>({id:p.id,lat:p.coordinates!.lat,lng:p.coordinates!.lng,color:'#0643d7',label:(language==='zh'?p.name.zh:language==='en'?p.name.en:p.name.vi)||p.name.vi,subtitle:p.province+(p.id.startsWith('park-demo-')?` · ${c3(language,'dữ liệu demo','demo data','演示数据')}`:''),href:`/industrial-parks/${p.slug}`})),[pinned,language]);
 const center=pinned[0]?.coordinates||{lat:16.05,lng:106.5};
 return <div className="parks-map-view">
  <div className="parks-map-frame"><GeoMap cluster language={language} ariaLabel={c3(language,'Bản đồ các khu công nghiệp','Map of industrial parks','工业园区地图')} center={center} markers={markers} onNavigate={href=>navigate(href)} openLabel={c3(language,'Xem chi tiết','View details','查看详情')}/></div>
  <p className="parks-map-note">{pinned.length}/{parks.length} {c3(language,'khu công nghiệp có toạ độ trên bản đồ.','parks have map coordinates.','个园区有地图坐标。')} {parks.length>pinned.length&&c3(language,'Các khu còn lại xem ở dạng danh sách.','The others are visible in list view.','其余请在列表视图中查看。')}</p>
 </div>;
}
