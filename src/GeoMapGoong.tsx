import {useEffect,useRef,useState} from 'react';
import {Map as MLMap,Marker,NavigationControl,AttributionControl,Popup,LngLatBounds,setWorkerUrl} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {MAP_ATTRIBUTION,GOONG_STYLE_URL,type GeoMapProps} from './GeoMap';
// MapLibre locates its worker next to the module, which breaks when Vite pre-bundles the dependency: bundle it explicitly.
setWorkerUrl(workerUrl);
type Props=GeoMapProps&{onFail:()=>void};
const HELP:Record<string,[string,string,string,string,string]>={
 vi:['Dùng Ctrl + cuộn để thu phóng bản đồ','Dùng ⌘ + cuộn để thu phóng bản đồ','Dùng hai ngón tay để di chuyển bản đồ','Phóng to','Thu nhỏ'],
 en:['Use Ctrl + scroll to zoom the map','Use ⌘ + scroll to zoom the map','Use two fingers to move the map','Zoom in','Zoom out'],
 zh:['按住 Ctrl 并滚动以缩放地图','按住 ⌘ 并滚动以缩放地图','用双指移动地图','放大','缩小']};
function popupContent(m:{label:string;subtitle?:string;href?:string},openLabel:string,navigate:(href:string)=>void){
 const box=document.createElement('div');box.className='geo-pop';const b=document.createElement('b');b.textContent=m.label;box.append(b);
 if(m.subtitle){const s=document.createElement('span');s.textContent=m.subtitle;box.append(s)}
 if(m.href){const a=document.createElement('a');a.href=m.href;a.textContent=openLabel+' →';a.style.display='block';a.style.marginTop='6px';a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();navigate(m.href!)});box.append(a)}
 return box;
}
const empty={type:'FeatureCollection',features:[]} as any;
export default function GoongMap(p:Props){
 const host=useRef<HTMLDivElement>(null),mapRef=useRef<MLMap|null>(null),pins=useRef<Marker[]>([]),popup=useRef<Popup|null>(null),latest=useRef(p);latest.current=p;
 const [ready,setReady]=useState<MLMap|null>(null);
 useEffect(()=>{
  const key=import.meta.env.VITE_GOONG_MAPTILES_KEY as string|undefined;if(!host.current||!key){p.onFail();return}
  const h=HELP[p.language]||HELP.en;let loaded=false,dead=false,map:MLMap;
  try{
   map=new MLMap({container:host.current,style:`${GOONG_STYLE_URL}?api_key=${key}`,center:[p.center.lng,p.center.lat],zoom:p.cluster?5:11,minZoom:3,maxZoom:18,cooperativeGestures:true,attributionControl:false,
    locale:{'CooperativeGesturesHandler.WindowsHelpText':h[0],'CooperativeGesturesHandler.MacHelpText':h[1],'CooperativeGesturesHandler.MobileHelpText':h[2],'NavigationControl.ZoomIn':h[3],'NavigationControl.ZoomOut':h[4]}});
  }catch{p.onFail();return}
  mapRef.current=map;
  map.addControl(new NavigationControl({showCompass:false}),'top-right');
  map.addControl(new AttributionControl({customAttribution:MAP_ATTRIBUTION,compact:false}),'bottom-right');
  const fail=()=>{if(!loaded&&!dead){dead=true;latest.current.onFail()}};
  const timer=setTimeout(fail,15000);
  map.on('error',fail);
  // The Goong style references some sprite icons that are not in its sprite sheet; a blank pixel avoids console warnings.
  map.on('styleimagemissing',e=>{if(!map.hasImage(e.id))map.addImage(e.id,{width:1,height:1,data:new Uint8Array(4)})});
  map.on('load',()=>{loaded=true;clearTimeout(timer);setReady(map)});
  return()=>{dead=true;clearTimeout(timer);pins.current.forEach(m=>m.remove());pins.current=[];popup.current?.remove();map.remove();mapRef.current=null;setReady(null)};
 },[p.language]);// eslint-disable-line react-hooks/exhaustive-deps
 // Markers (detail mode) or clustered GeoJSON (directory mode)
 useEffect(()=>{
  const map=mapRef.current;if(!map||ready!==map)return;
  const {markers,origin,cluster,selectedId}=latest.current;
  const bounds=new LngLatBounds();let count=0;
  const extend=(lng:number,lat:number)=>{bounds.extend([lng,lat]);count++};
  if(origin)extend(origin.lng,origin.lat);markers.forEach(m=>extend(m.lng,m.lat));
  if(cluster){
   pins.current.forEach(m=>m.remove());pins.current=[];
   const data={type:'FeatureCollection',features:markers.map(m=>({type:'Feature',geometry:{type:'Point',coordinates:[m.lng,m.lat]},properties:{id:m.id,label:m.label,subtitle:m.subtitle||'',href:m.href||''}}))} as any;
   const src:any=map.getSource('geo-parks');
   if(src)src.setData(data);else{
    map.addSource('geo-parks',{type:'geojson',data,cluster:true,clusterRadius:48,clusterMaxZoom:10});
    map.addLayer({id:'geo-clusters',type:'circle',source:'geo-parks',filter:['has','point_count'],paint:{'circle-color':'#0643d7','circle-radius':['step',['get','point_count'],17,5,21,10,26],'circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    const font=(map.getStyle().layers as any[]).find(l=>l.type==='symbol'&&l.layout?.['text-font'])?.layout['text-font'];
    if(font)map.addLayer({id:'geo-cluster-count',type:'symbol',source:'geo-parks',filter:['has','point_count'],layout:{'text-field':['get','point_count_abbreviated'],'text-font':font,'text-size':13,'text-allow-overlap':true},paint:{'text-color':'#fff'}});
    map.addLayer({id:'geo-points',type:'circle',source:'geo-parks',filter:['!',['has','point_count']],paint:{'circle-color':'#0643d7','circle-radius':9,'circle-stroke-width':3,'circle-stroke-color':'#fff'}});
    map.on('click','geo-clusters',async e=>{const f=e.features?.[0];if(!f)return;const z=await (map.getSource('geo-parks') as any).getClusterExpansionZoom((f.properties as any).cluster_id);map.easeTo({center:(f.geometry as any).coordinates,zoom:z+0.5})});
    map.on('click','geo-points',e=>{const f=e.features?.[0];if(!f)return;const pr=f.properties as any;popup.current?.remove();popup.current=new Popup({offset:12,closeButton:true}).setLngLat((f.geometry as any).coordinates).setDOMContent(popupContent({label:pr.label,subtitle:pr.subtitle,href:pr.href},latest.current.openLabel||'',h=>(latest.current.onNavigate||((x:string)=>location.assign(x)))(h))).addTo(map)});
    for(const l of ['geo-clusters','geo-points']){map.on('mouseenter',l,()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave',l,()=>{map.getCanvas().style.cursor=''})}
   }
   if(count>1)map.fitBounds(bounds,{padding:48,maxZoom:9,duration:0});else if(count===1)map.jumpTo({center:bounds.getCenter(),zoom:9});
   return;
  }
  pins.current.forEach(m=>m.remove());pins.current=[];
  if(origin){const el=document.createElement('button');el.type='button';el.className='geo-pin origin';el.textContent='KCN';el.setAttribute('aria-label',origin.label);el.addEventListener('click',()=>popup.current?.remove());pins.current.push(new Marker({element:el}).setLngLat([origin.lng,origin.lat]).addTo(map))}
  for(const m of markers){
   const el=document.createElement('button');el.type='button';el.className='geo-pin'+(m.id===selectedId?' selected':'');el.style.background=m.color;el.textContent=m.symbol||'';el.setAttribute('aria-label',m.label);el.setAttribute('aria-pressed',String(m.id===selectedId));
   el.addEventListener('click',e=>{e.stopPropagation();latest.current.onSelect?.(m.id)});
   pins.current.push(new Marker({element:el}).setLngLat([m.lng,m.lat]).addTo(map));
  }
  if(count>1)map.fitBounds(bounds,{padding:56,maxZoom:12,duration:0});else if(count===1)map.jumpTo({center:bounds.getCenter(),zoom:12});
 },[ready,p.markers,p.origin,p.cluster]);
 // Selection: restyle pins, open a label popup and pan
 useEffect(()=>{
  const map=mapRef.current;if(!map||ready!==map||p.cluster)return;
  pins.current.forEach((m,i)=>{const el=m.getElement(),mk=p.markers[i-(p.origin?1:0)];if(mk){el.classList.toggle('selected',mk.id===p.selectedId);el.setAttribute('aria-pressed',String(mk.id===p.selectedId))}});
  popup.current?.remove();popup.current=null;
  const sel=p.markers.find(m=>m.id===p.selectedId);
  if(sel){popup.current=new Popup({offset:22,closeButton:false,closeOnClick:false}).setLngLat([sel.lng,sel.lat]).setDOMContent(popupContent(sel,'',()=>{})).addTo(map);if(!p.route?.length)map.easeTo({center:[sel.lng,sel.lat],duration:300})}
 },[ready,p.selectedId,p.markers,p.origin,p.cluster,p.route]);
 // Route polyline
 useEffect(()=>{
  const map=mapRef.current;if(!map||ready!==map)return;
  const coords=(p.route||[]).map(([lat,lng])=>[lng,lat] as [number,number]);
  const data=coords.length?{type:'Feature',geometry:{type:'LineString',coordinates:coords},properties:{}} as any:empty;
  const src:any=map.getSource('geo-route');
  if(src)src.setData(data);else{map.addSource('geo-route',{type:'geojson',data});map.addLayer({id:'geo-route-casing',type:'line',source:'geo-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#fff','line-width':8}});map.addLayer({id:'geo-route-line',type:'line',source:'geo-route',layout:{'line-join':'round','line-cap':'round'},paint:{'line-color':'#0643d7','line-width':4.5}})}
  if(coords.length>1){const b=new LngLatBounds();coords.forEach(c=>b.extend(c));map.fitBounds(b,{padding:56,maxZoom:13,duration:400})}
 },[ready,p.route]);
 return <div className="geo-map-canvas" ref={host} role="region" aria-label={p.ariaLabel}/>;
}
