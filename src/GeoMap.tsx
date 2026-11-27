// Shared map for park pages: Goong vector style on MapLibre GL (lazy chunk) with the legacy Leaflet map as fallback
// (no key, VITE_MAP_PROVIDER=legacy, no WebGL, or the style failing to load). The page never goes blank.
import {lazy,Suspense,useState} from 'react';
import type {Language} from './types';
import './GeoMap.css';
export interface GeoMarker {id:string;lat:number;lng:number;label:string;color:string;symbol?:string;subtitle?:string;href?:string}
export interface GeoBounds {west:number;south:number;east:number;north:number}
export interface GeoMapProps {
 language:Language;ariaLabel:string;
 center:{lat:number;lng:number};
 origin?:{lat:number;lng:number;label:string}|null;
 markers:GeoMarker[];
 route?:[number,number][]|null;
 selectedId?:string|null;
 onSelect?:(id:string)=>void;
 onNavigate?:(href:string)=>void;
 /** Directory mode: cluster the markers and open a small card (name, subtitle, link) on click. */
 cluster?:boolean;
 openLabel?:string;
 /** Cluster mode: small reference pins (airports, seaports...). They are never clustered and never affect fitting. */
 extraMarkers?:GeoMarker[];
 /** Cluster mode: id highlighted while hovered in a list (does not move the map). */
 hoverId?:string|null;
 /** Cluster mode: visible bounds after every move/zoom, and once after the initial fit. */
 onBounds?:(b:GeoBounds)=>void;
}
export const MAP_ATTRIBUTION='© Goong · © OpenStreetMap contributors';
export const GOONG_STYLE_URL='https://tiles.goong.io/assets/goong_map_web.json';
export function useLegacyProvider(){return !import.meta.env.VITE_GOONG_MAPTILES_KEY||import.meta.env.VITE_MAP_PROVIDER==='legacy'}
const GoongMap=lazy(()=>import('./GeoMapGoong'));
const LegacyMap=lazy(()=>import('./GeoMapLegacy'));
export function GeoMap(props:GeoMapProps){
 const [failed,setFailed]=useState(false);const legacy=useLegacyProvider()||failed;
 return <div className="geo-map" data-provider={legacy?'legacy':'goong'}><Suspense fallback={<div className="geo-map-loading" role="status">…</div>}>{legacy?<LegacyMap {...props}/>:<GoongMap {...props} onFail={()=>setFailed(true)}/>}</Suspense></div>;
}
export default GeoMap;
