// Fallback map (Leaflet + Esri tiles, same as the original park map). No clustering; same props as the Goong map.
import {useEffect,useRef} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {GeoMapProps} from './GeoMap';
const ZOOM:Record<string,[string,string]>={vi:['Phóng to','Thu nhỏ'],en:['Zoom in','Zoom out'],zh:['放大','缩小']};
export default function LegacyMap(p:GeoMapProps){
 const host=useRef<HTMLDivElement>(null),mapRef=useRef<L.Map|null>(null),layer=useRef<L.LayerGroup|null>(null),hubLayer=useRef<L.LayerGroup|null>(null),circles=useRef<Record<string,L.CircleMarker>>({}),latest=useRef(p);latest.current=p;
 useEffect(()=>{
  if(!host.current)return;const z=ZOOM[p.language]||ZOOM.en;
  const map=L.map(host.current,{scrollWheelZoom:false,zoomControl:false}).setView([p.center.lat,p.center.lng],p.cluster?6:11);
  L.control.zoom({zoomInTitle:z[0],zoomOutTitle:z[1]}).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles &copy; Esri — Esri, HERE, Garmin, USGS, NGA · © OpenStreetMap contributors'}).addTo(map);
  layer.current=L.layerGroup().addTo(map);hubLayer.current=L.layerGroup().addTo(map);mapRef.current=map;
  const observer=new ResizeObserver(()=>map.invalidateSize());observer.observe(host.current);
  return()=>{observer.disconnect();map.remove();mapRef.current=null;layer.current=null;hubLayer.current=null};
 },[p.language]);
 useEffect(()=>{
  const map=mapRef.current,group=layer.current;if(!map||!group)return;group.clearLayers();circles.current={};
  const pts:[number,number][]=[];
  if(p.origin){pts.push([p.origin.lat,p.origin.lng]);L.circleMarker([p.origin.lat,p.origin.lng],{radius:9,color:'#fff',weight:3,fillColor:'#0643d7',fillOpacity:1}).bindTooltip(p.origin.label).addTo(group)}
  for(const m of p.markers){
   pts.push([m.lat,m.lng]);const sel=m.id===p.selectedId;
   const c=L.circleMarker([m.lat,m.lng],{radius:sel?11:8,color:sel?'#0643d7':'#fff',weight:sel?4:3,fillColor:m.color,fillOpacity:1}).bindTooltip(m.label).addTo(group);
   circles.current[m.id]=c;
   c.on('click',()=>{if(p.cluster&&p.onSelect){latest.current.onSelect?.(m.id)}else if(p.cluster&&m.href){const box=document.createElement('div');const b=document.createElement('b');b.textContent=m.label;box.append(b);if(m.subtitle){const s=document.createElement('div');s.textContent=m.subtitle;box.append(s)}const a=document.createElement('a');a.href=m.href;a.textContent=(p.openLabel||'')+' →';a.addEventListener('click',e=>{e.preventDefault();(latest.current.onNavigate||((x:string)=>location.assign(x)))(m.href!)});box.append(a);c.bindPopup(box).openPopup()}else latest.current.onSelect?.(m.id)});
  }
  if(p.route?.length)L.polyline(p.route,{color:'#0643d7',weight:4}).addTo(group);
  const fit=p.route?.length?p.route:pts;
  if(fit.length>1)map.fitBounds(L.latLngBounds(fit),{padding:[40,40],maxZoom:12,animate:false});else if(fit.length===1)map.setView(fit[0],p.cluster?9:12);
  if(p.cluster&&p.onBounds){const b=map.getBounds();p.onBounds({west:b.getWest(),south:b.getSouth(),east:b.getEast(),north:b.getNorth()})}
 },[p.markers,p.origin,p.cluster&&p.onSelect?null:p.selectedId,p.route,p.cluster,p.language]);
 // Directory mode selection (opt-in via onSelect): highlight, fly to the park and open its card
 useEffect(()=>{
  const map=mapRef.current;if(!map||!p.cluster||!p.onSelect)return;
  for(const [id,c] of Object.entries(circles.current)){const on=id===p.selectedId;c.setStyle({radius:on?12:8,color:on?'#022582':'#fff',weight:on?4:3});if(on)c.bringToFront()}
  const m=p.markers.find(x=>x.id===p.selectedId),c=m&&circles.current[m.id];if(!m||!c)return;
  map.flyTo([m.lat,m.lng],Math.max(map.getZoom(),11),{duration:.7});
  const box=document.createElement('div');const b=document.createElement('b');b.textContent=m.label;box.append(b);if(m.subtitle){const s=document.createElement('div');s.textContent=m.subtitle;box.append(s)}
  if(m.href){const a=document.createElement('a');a.href=m.href;a.textContent=(p.openLabel||'')+' →';a.addEventListener('click',e=>{e.preventDefault();(latest.current.onNavigate||((x:string)=>location.assign(x)))(m.href!)});box.append(a)}
  c.bindPopup(box).openPopup();
 },[p.cluster,p.selectedId,p.markers]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{
  const map=mapRef.current;if(!map||!p.cluster||!p.onBounds)return;
  const f=()=>{const b=map.getBounds();latest.current.onBounds?.({west:b.getWest(),south:b.getSouth(),east:b.getEast(),north:b.getNorth()})};
  map.on('moveend',f);return()=>{map.off('moveend',f)};
 },[p.cluster,!!p.onBounds]);
 useEffect(()=>{
  for(const [id,c] of Object.entries(circles.current)){if(id===p.selectedId)continue;c.setStyle({color:id===p.hoverId?'#3d7bff':'#fff',weight:id===p.hoverId?4:3})}
 },[p.hoverId]);
 useEffect(()=>{
  const g=hubLayer.current;if(!g)return;g.clearLayers();
  if(!p.cluster)return;
  for(const m of p.extraMarkers||[])L.circleMarker([m.lat,m.lng],{radius:6,color:'#fff',weight:2,fillColor:m.color,fillOpacity:1}).bindTooltip(m.label).addTo(g);
 },[p.cluster,p.extraMarkers]);
 return <div className="geo-map-canvas" ref={host} role="region" aria-label={p.ariaLabel}/>;
}
