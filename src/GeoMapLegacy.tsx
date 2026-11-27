// Fallback map (Leaflet + Esri tiles, same as the original park map). No clustering; same props as the Goong map.
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {GeoMapProps} from './GeoMap';
const ZOOM:Record<string,[string,string]>={vi:['Phóng to','Thu nhỏ'],en:['Zoom in','Zoom out'],zh:['放大','缩小']};
export default function LegacyMap(p:GeoMapProps){
 const host=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null),latest=useRef(p);latest.current=p;
 useEffect(()=>{
  if(!host.current)return;const z=ZOOM[p.language]||ZOOM.en;
  const map=L.map(host.current,{scrollWheelZoom:false,zoomControl:false}).setView([p.center.lat,p.center.lng],p.cluster?6:11);
  L.control.zoom({zoomInTitle:z[0],zoomOutTitle:z[1]}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, NGA · © OpenStreetMap contributors'}).addTo(map);
  layer.current=L.layerGroup().addTo(map);mapRef.current=map;
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(host.current);
  return()=>{observer.disconnect();map.remove();mapRef.current=null;layer.current=null};
 },[p.language]);
 useEffect(()=>{
  const map=mapRef.current,group=layer.current;if(!map||!group)return;group.clearLayers();
  const pts:[number,number][]=[];
  if(p.origin){pts.push([p.origin.lat,p.origin.lng]);L.circleMarker([p.origin.lat,p.origin.lng],{radius:9,color:'#fff',weight:3,fillColor:'#0643d7',fillOpacity:1}).bindTooltip(p.origin.label).addTo(group)}
  for(const m of p.markers){
   pts.push([m.lat,m.lng]);const sel=m.id===p.selectedId;
   const c=L.circleMarker([m.lat,m.lng],{radius:sel?11:8,color:sel?'#0643d7':'#fff',weight:sel?4:3,fillColor:m.color,fillOpacity:1}).bindTooltip(m.label).addTo(group);
   c.on('click',()=>{if(p.cluster&&m.href){const box=document.createElement('div');const b=document.createElement('b');b.textContent=m.label;box.append(b);if(m.subtitle){const s=document.createElement('div');s.textContent=m.subtitle;box.append(s)}const a=document.createElement('a');a.href=m.href;a.textContent=(p.openLabel||'')+' →';a.addEventListener('click',e=>{e.preventDefault();(latest.current.onNavigate||((x:string)=>location.assign(x)))(m.href!)});box.append(a);c.bindPopup(box).openPopup()}else latest.current.onSelect?.(m.id)});
  }
  if(p.route?.length)L.polyline(p.route,{color:'#0643d7',weight:4}).addTo(group);
  const fit=p.route?.length?p.route:pts;
  if(fit.length>1)map.fitBounds(L.latLngBounds(fit),{padding:[40,40],maxZoom:12,animate:false});else if(fit.length===1)map.setView(fit[0],p.cluster?9:12);
 },[p.markers,p.origin,p.selectedId,p.route,p.cluster,p.language]);
 return <div className="geo-map-canvas" ref={host} role="region" aria-label={p.ariaLabel}/>;
}
