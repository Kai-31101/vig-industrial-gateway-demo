import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {GeoMap,type GeoMarker,type GeoBounds} from './GeoMap';
import {SafeImage} from './EmptyStates';
import {HUBS} from './geoHubs';
import {CATEGORY_COLORS,CATEGORY_SYMBOLS,categoryLabel} from './geoPlaces';
import {isPublicAsset} from './leasing';
import type {IndustrialAsset,IndustrialParkProfile,Language} from './types';
import './HomeParkMap.css';
const c3=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
const pick=(t:{vi:string;en?:string;zh?:string}|undefined,l:Language)=>(t&&((l==='zh'?t.zh:l==='en'?t.en:t.vi)||t.vi))||'';
export const hasCoords=(p:IndustrialParkProfile)=>!!p.coordinates&&Number.isFinite(p.coordinates.lat)&&Number.isFinite(p.coordinates.lng);
/** Parks whose pin is inside the visible map bounds (all parks while the bounds are still unknown). */
export function filterInBounds(parks:IndustrialParkProfile[],b:GeoBounds|null){return b?parks.filter(p=>hasCoords(p)&&p.coordinates!.lat>=b.south&&p.coordinates!.lat<=b.north&&p.coordinates!.lng>=b.west&&p.coordinates!.lng<=b.east):parks}
/** Number of public lease assets per park id. */
export function assetCountsByPark(parks:IndustrialParkProfile[],assets:IndustrialAsset[]){const n:Record<string,number>={};for(const a of assets)if(isPublicAsset(a,parks))n[a.parkId]=(n[a.parkId]||0)+1;return n}
export type MapPill='available'|'all';
export function pillCounts(parks:IndustrialParkProfile[],counts:Record<string,number>,province:string){const inProv=province?parks.filter(p=>p.province===province):parks;return {available:inProv.filter(p=>(counts[p.id]||0)>0).length,all:inProv.length}}
export function applyFilters(parks:IndustrialParkProfile[],counts:Record<string,number>,pill:MapPill,province:string){return parks.filter(p=>(!province||p.province===province)&&(pill==='all'||(counts[p.id]||0)>0))}
/** Reports true once the element is within `margin` of the viewport (or immediately without IntersectionObserver). */
export function useNearViewport(margin='400px'){
 const ref=useRef<HTMLDivElement>(null);const [near,setNear]=useState(()=>typeof IntersectionObserver==='undefined');
 useEffect(()=>{
  if(near)return;const el=ref.current;if(!el)return;
  const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){setNear(true);io.disconnect()}},{rootMargin:margin});io.observe(el);return()=>io.disconnect();
 },[near,margin]);
 return {ref,near};
}
/** Homepage overview map: every public park on one clustered Goong map next to a list that follows the visible map area. */
export function HomeParkMap({parks,assets,language}:{parks:IndustrialParkProfile[];assets:IndustrialAsset[];language:Language}){
 const navigate=useNavigate();
 const pinned=useMemo(()=>parks.filter(hasCoords),[parks]);
 const counts=useMemo(()=>assetCountsByPark(parks,assets),[parks,assets]);
 const provinces=useMemo(()=>[...new Set(pinned.map(p=>p.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi')),[pinned]);
 const [pill,setPill]=useState<MapPill>('available');
 const [province,setProvince]=useState('');
 const [selected,setSelected]=useState<string|null>(null);
 const [hover,setHover]=useState<string|null>(null);
 const [bounds,setBounds]=useState<GeoBounds|null>(null);
 const [layers,setLayers]=useState<{airport:boolean;seaport:boolean}>({airport:false,seaport:false});
 const pc=useMemo(()=>pillCounts(pinned,counts,province),[pinned,counts,province]);
 const mode:MapPill=pill==='available'&&pc.available===0?'all':pill;
 const matching=useMemo(()=>applyFilters(pinned,counts,mode,province),[pinned,counts,mode,province]);
 const timer=useRef<ReturnType<typeof setTimeout>>(undefined);
 // Moves caused by selecting a park (fly-to) must not shrink the list; only the user's own pan/zoom filters it.
 const hold=useRef(0);
 const onBounds=useCallback((b:GeoBounds)=>{if(Date.now()<hold.current)return;clearTimeout(timer.current);timer.current=setTimeout(()=>setBounds(b),250)},[]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const visible=useMemo(()=>filterInBounds(matching,bounds),[matching,bounds]);
 const markers:GeoMarker[]=useMemo(()=>matching.map(p=>({id:p.id,lat:p.coordinates!.lat,lng:p.coordinates!.lng,color:'#0643d7',label:pick(p.name,language),subtitle:p.province,href:`/industrial-parks/${p.slug}`})),[matching,language]);
 const hubs:GeoMarker[]=useMemo(()=>HUBS.filter(h=>(h.category==='airport'||h.category==='seaport')&&layers[h.category]).map((h,i)=>({id:`hub-${i}`,lat:h.coordinates.lat,lng:h.coordinates.lng,color:CATEGORY_COLORS[h.category],symbol:CATEGORY_SYMBOLS[h.category],label:pick(h.name,language)})),[layers,language]);
 const selId=selected&&matching.some(p=>p.id===selected)?selected:null;
 const list=useRef<HTMLUListElement>(null);
 const choose=useCallback((id:string)=>{hold.current=Date.now()+1500;setSelected(old=>old===id?null:id)},[]);
 useEffect(()=>{
  // Bring the selected card into view inside the list only (never scroll the page).
  const c=list.current,el=selId?Array.from(c?.children||[]).find(x=>(x as HTMLElement).dataset.park===selId) as HTMLElement|undefined:undefined;if(!c||!el)return;
  const cr=c.getBoundingClientRect(),er=el.getBoundingClientRect();
  c.scrollTop+=er.top-cr.top-(cr.height-er.height)/2;c.scrollLeft+=er.left-cr.left-(cr.width-er.width)/2;
 },[selId]);
 const {ref,near}=useNearViewport();
 const center=matching[0]?.coordinates||{lat:16.05,lng:106.5};
 if(!pinned.length)return null;
 const nf=(n:number)=>n.toLocaleString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US',{maximumFractionDigits:1});
 return <section className="home-map" aria-labelledby="home-map-title"><div className="page home-map-inner">
  <div className="home-map-head">
   <div><span className="home-map-eyebrow">{c3(language,'KHU CÔNG NGHIỆP','INDUSTRIAL PARKS','工业园区')}</span><h2 id="home-map-title">{c3(language,'Bản đồ khu công nghiệp','Industrial park map','工业园区地图')}</h2></div>
   <div className="home-map-filters">
    <div className="home-map-pills" role="group" aria-label={c3(language,'Lọc khu công nghiệp','Filter parks','筛选园区')}>
     <button type="button" data-pill="available" aria-pressed={mode==='available'} className={mode==='available'?'active':''} onClick={()=>{setPill('available');setSelected(null)}}>{c3(language,'Đang có mặt bằng','With available assets','有可租物业')} ({pc.available})</button>
     <button type="button" data-pill="all" aria-pressed={mode==='all'} className={mode==='all'?'active':''} onClick={()=>{setPill('all');setSelected(null)}}>{c3(language,'Tất cả','All','全部')} ({pc.all})</button>
    </div>
    <select value={province} aria-label={c3(language,'Tỉnh / thành phố','Province','省/市')} onChange={e=>{setProvince(e.target.value);setSelected(null)}}>
     <option value="">{c3(language,'Mọi tỉnh','All provinces','所有省份')}</option>
     {provinces.map(v=><option key={v} value={v}>{v}</option>)}
    </select>
   </div>
  </div>
  <div className="home-map-body">
   <div className="home-map-stage">
    <div className="home-map-frame" ref={ref} data-mounted={near?'true':'false'}>
     {near?<GeoMap cluster language={language} ariaLabel={c3(language,'Bản đồ tổng quan các khu công nghiệp','Overview map of industrial parks','工业园区总览地图')} center={center} markers={markers} extraMarkers={hubs} selectedId={selId} hoverId={hover} onBounds={onBounds} onSelect={choose} onNavigate={href=>navigate(href)} openLabel={c3(language,'Xem chi tiết','View details','查看详情')}/>
      :<div className="home-map-placeholder" role="status" aria-label={c3(language,'Đang chuẩn bị bản đồ','Preparing the map','正在准备地图')}/>}
    </div>
    <div className="home-map-layers" role="group" aria-label={c3(language,'Lớp bản đồ','Map layers','地图图层')}>
     {(['airport','seaport'] as const).map(k=><button type="button" key={k} data-layer={k} aria-pressed={layers[k]} className={layers[k]?'active':''} onClick={()=>setLayers(o=>({...o,[k]:!o[k]}))}><i style={{background:CATEGORY_COLORS[k]}} aria-hidden="true">{CATEGORY_SYMBOLS[k]}</i>{categoryLabel(k,language)}</button>)}
    </div>
   </div>
   <div className="home-map-side">
    <p className="home-map-count" role="status">{visible.length} {c3(language,'khu công nghiệp · kéo bản đồ để lọc theo khu vực','industrial parks · move the map to filter by area','个工业园区 · 拖动地图按区域筛选')}</p>
    <ul className="home-map-list" ref={list} aria-label={c3(language,'Danh sách khu công nghiệp','Industrial park list','工业园区列表')}>
     {visible.map(p=>{const n=counts[p.id]||0,area=p.totalArea?.value,on=selId===p.id,meta=[p.province,n>0?c3(language,`${n} mặt bằng`,`${n} ${n===1?'asset':'assets'}`,`${n} 个物业`):'',typeof area==='number'?`${nf(area)} ${p.totalArea.unit||'ha'}`:''].filter(Boolean).join(' · ');
      return <li key={p.id} data-park={p.id} className={on?'active':''} onMouseEnter={()=>setHover(p.id)} onMouseLeave={()=>setHover(h=>h===p.id?null:h)}>
       <button type="button" className="home-map-pick" aria-pressed={on} aria-current={on?'true':undefined} onClick={()=>choose(p.id)} onFocus={()=>setHover(p.id)} onBlur={()=>setHover(h=>h===p.id?null:h)}>
        <span className="home-map-img"><SafeImage fallbackIllustration src={p.media?.find(m=>m.approved)?.url} alt=""/></span>
        <span className="home-map-text"><b>{pick(p.name,language)}</b><span>{meta}</span></span>
       </button>
       <div className="home-map-actions">
        <Link className="hm-primary" to={`/industrial-parks/${p.slug}#park-assets`}>{n>0?c3(language,`Xem ${n} mặt bằng`,`View ${n} ${n===1?'asset':'assets'}`,`查看 ${n} 个物业`):c3(language,'Xem chi tiết','View details','查看详情')}</Link>
        <Link className="hm-outline" to={`/find-supply?parkId=${encodeURIComponent(p.id)}`}>{c3(language,'Nhận tư vấn','Get advice','获取咨询')}</Link>
       </div>
      </li>})}
    </ul>
   </div>
  </div>
 </div></section>;
}
export default HomeParkMap;
