import type {IndustrialRequest} from '../types';

/** Shared, deterministic read-outs for the manager workspace (dashboard, request list, AI brief). */
export const DAY=86400000;
export const needsResponse=(r:IndustrialRequest)=>['submitted','under_review'].includes(r.status);
export const activeRequest=(r:IndustrialRequest)=>!['closed','rejected'].includes(r.status);
export const ageDays=(iso:string,now=Date.now())=>{const at=Date.parse(iso);return Number.isNaN(at)?0:Math.max(0,Math.floor((now-at)/DAY))};
export const withinDays=(iso:string,from:number,to:number,now=Date.now())=>{const at=Date.parse(iso);return !Number.isNaN(at)&&at>now-to*DAY&&at<=now-from*DAY};
export const areaM2=(a:{area:number;unit:string})=>(Number(a.area)||0)*(a.unit==='ha'?10000:1);
export const formatArea=(m2:number,lang:string)=>m2>=10000?`${(m2/10000).toLocaleString(lang,{maximumFractionDigits:1})} ha`:`${m2.toLocaleString(lang)} m²`;
/** Trims float noise such as 11.440000000000001 for display and editing. */
export const tidyNumber=(value:unknown,digits=6)=>typeof value==='number'&&Number.isFinite(value)?Number(value.toFixed(digits)):value;
export const askAiLink=(text:string,hint?:'statistics'|'match')=>`/admin/assistant?ask=${encodeURIComponent(text)}${hint?`&hint=${hint}`:''}`;
