import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {MapPin} from 'lucide-react';
import {useText} from './ui';
import {tidyNumber} from './insights';

type Coords={lat:number|null;lng:number|null};
const round=(n:number)=>Number(n.toFixed(6));
const VIETNAM:[number,number]=[16.05,107.5];

/** Pick a point on the map instead of typing raw decimals; numeric inputs remain for precise values. */
export function CoordinatePicker({value,onChange,disabled,label}:{value:Coords;onChange:(v:Coords)=>void;disabled?:boolean;label:string}){
 const t=useText(),[open,setOpen]=useState(false),host=useRef<HTMLDivElement>(null),marker=useRef<L.CircleMarker|null>(null),map=useRef<L.Map|null>(null);
 const has=value?.lat!=null&&value?.lng!=null;
 const latest=useRef(onChange);latest.current=onChange;
 useEffect(()=>{
  if(!open||!host.current)return;
  const m=L.map(host.current,{scrollWheelZoom:true}).setView(has?[value.lat!,value.lng!]:VIETNAM,has?13:5);map.current=m;
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri'}).addTo(m);
  const place=(lat:number,lng:number)=>{if(marker.current)marker.current.setLatLng([lat,lng]);else marker.current=L.circleMarker([lat,lng],{radius:9,color:'#fff',weight:3,fillColor:'#0f766e',fillOpacity:1}).addTo(m)};
  if(has)place(value.lat!,value.lng!);
  if(!disabled)m.on('click',(e:L.LeafletMouseEvent)=>{const lat=round(e.latlng.lat),lng=round(e.latlng.lng);place(lat,lng);latest.current({lat,lng})});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>m.invalidateSize()):null;observer?.observe(host.current);
  return()=>{observer?.disconnect();m.remove();map.current=null;marker.current=null};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open,disabled]);
 useEffect(()=>{if(map.current&&has&&marker.current)marker.current.setLatLng([value.lat!,value.lng!])},[value?.lat,value?.lng]);
 const num=(k:'lat'|'lng')=>(e:React.ChangeEvent<HTMLInputElement>)=>onChange({...value,[k]:e.target.value===''?null:round(Number(e.target.value))});
 return <fieldset className="coordinate-picker" data-field-path="coordinates" disabled={disabled}><legend>{label}</legend>
  <div className="form-grid"><label>{t('Vĩ độ','Latitude','纬度')}<input type="number" step="any" value={(tidyNumber(value?.lat) as number|null)??''} onChange={num('lat')}/></label><label>{t('Kinh độ','Longitude','经度')}<input type="number" step="any" value={(tidyNumber(value?.lng) as number|null)??''} onChange={num('lng')}/></label></div>
  <button type="button" className="button" onClick={()=>setOpen(o=>!o)} aria-expanded={open}><MapPin size={16}/>{open?t('Ẩn bản đồ','Hide map','隐藏地图'):t('Chọn trên bản đồ','Pick on map','在地图上选择')}</button>
  {open&&<><div ref={host} className="coordinate-map" role="application" aria-label={t('Bản đồ chọn tọa độ','Coordinate picker map','坐标选择地图')}/><small>{t('Bấm vào bản đồ để đặt vị trí KCN.','Click the map to place the park.','点击地图设置园区位置。')}</small></>}
 </fieldset>;
}
