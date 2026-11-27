// Pure display helpers for the asset card and asset detail page. Missing values are skipped, never invented.
import type {IndustrialAsset,IndustrialParkProfile,Language} from './types';
import {industryLabel} from './industryLabels';
const c3=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
const locale=(l:Language)=>l==='vi'?'vi-VN':l==='zh'?'zh-CN':'en-US';
export const num=(n:number,l:Language)=>n.toLocaleString(locale(l),{maximumFractionDigits:2});
const has=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const MONTHS_EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const parseIso=(iso?:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');if(!m)return null;const y=+m[1],mo=+m[2],d=+m[3];if(mo<1||mo>12||d<1||d>31)return null;return {y,mo,d}};

/** Full calendar date in the viewer's language; '' when the value is not an ISO date. */
export function formatDate(iso:string|undefined,l:Language):string{
 const p=parseIso(iso);if(!p)return '';
 const dd=String(p.d).padStart(2,'0'),mm=String(p.mo).padStart(2,'0');
 return l==='vi'?`${dd}/${mm}/${p.y}`:l==='zh'?`${p.y}年${p.mo}月${p.d}日`:`${dd} ${MONTHS_EN[p.mo-1]} ${p.y}`;
}
/** Handover date: the first of a month is shown as that month (the data holds month-level dates), any other day as a full date. */
export function formatHandover(iso:string|undefined,l:Language):string{
 const p=parseIso(iso);if(!p)return '';
 if(p.d!==1)return formatDate(iso,l);
 return l==='vi'?`${String(p.mo).padStart(2,'0')}/${p.y}`:l==='zh'?`${p.y}年${p.mo}月`:`${MONTHS_EN[p.mo-1]} ${p.y}`;
}
export function isUpcoming(iso:string|undefined,now=new Date()):boolean{
 const p=parseIso(iso);if(!p)return false;
 const today=now.toISOString().slice(0,10);
 return `${p.y}-${String(p.mo).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`>today;
}

export interface StatusBadge{key:'available'|'reserved'|'leased'|'upcoming';tone:''|'green'|'amber';label:string}
/**
 * Leasing status chip. Only a stated status is shown; 'unknown' or absent never claims vacancy.
 * An unknown status with a future handover date is shown as "coming soon" (a published date, not a vacancy claim).
 */
export function leasingBadge(asset:Pick<IndustrialAsset,'leasingStatus'|'availableFrom'>,l:Language,now=new Date()):StatusBadge|null{
 switch(asset.leasingStatus){
  case 'leased':return {key:'leased',tone:'',label:c3(l,'Đã cho thuê','Leased','已出租')};
  case 'reserved':return {key:'reserved',tone:'amber',label:c3(l,'Đã giữ chỗ','Reserved','已预留')};
  case 'available':return {key:'available',tone:'green',label:c3(l,'Còn trống','Available','可租')};
 }
 if(isUpcoming(asset.availableFrom,now))return {key:'upcoming',tone:'amber',label:`${c3(l,'Sắp có','Coming soon','即将可租')} · ${formatHandover(asset.availableFrom,l)}`};
 return null;
}
export const isLeased=(a:Pick<IndustrialAsset,'leasingStatus'>)=>a.leasingStatus==='leased';
/** Leased assets stay visible but sort after the others; the order of everything else is preserved. */
export function leasedLast<T extends Pick<IndustrialAsset,'leasingStatus'>>(list:T[]):T[]{
 return [...list.filter(a=>!isLeased(a)),...list.filter(isLeased)];
}

/** Lot code: the explicit code of the asset, else the code of the masterplan plot linked to it. */
export function lotCodeOf(asset:Pick<IndustrialAsset,'id'|'lotCode'>,park?:Pick<IndustrialParkProfile,'masterplan'>):string{
 const own=asset.lotCode?.trim();if(own)return own;
 return park?.masterplan?.plots.find(p=>p.assetId===asset.id)?.code?.trim()||'';
}

/** Up to three short fact chips for a card, chosen by asset type; empty values are skipped. */
export function cardSpecChips(asset:IndustrialAsset,l:Language):string[]{
 const s=asset.specs||{},chips:string[]=[];
 const power=has(asset.powerMva)&&asset.powerMva>0?`${c3(l,'Điện','Power','电力')} ${num(asset.powerMva,l)} MVA`:'';
 const water=has(asset.waterM3Day)&&asset.waterM3Day>0?`${c3(l,'Nước','Water','供水')} ${num(asset.waterM3Day,l)} ${c3(l,'m³/ngày','m³/day','m³/天')}`:'';
 const handover=asset.availableFrom&&formatHandover(asset.availableFrom,l)?`${c3(l,'Bàn giao','Handover','交付')} ${formatHandover(asset.availableFrom,l)}`:'';
 const height=has(s.clearHeightM)?`${c3(l,'Cao','Height','净高')} ${num(s.clearHeightM,l)} m`:'';
 const load=has(s.floorLoadTonM2)?`${c3(l,'Tải sàn','Floor load','地面承重')} ${num(s.floorLoadTonM2,l)} ${c3(l,'tấn/m²','t/m²','吨/m²')}`:'';
 const office=has(s.officeAreaM2)?`${c3(l,'Văn phòng','Office','办公')} ${num(s.officeAreaM2,l)} m²`:'';
 const docks=has(s.dockDoors)?`${s.dockDoors} ${c3(l,'cửa container','dock doors','集装箱门')}`:'';
 const order=asset.type==='ready_built_factory'||asset.type==='warehouse'?[height,load,power,office,docks,handover]:[power,water,handover];
 for(const chip of order){if(chip&&chips.length<3)chips.push(chip)}
 return chips;
}

export function industriesLine(asset:Pick<IndustrialAsset,'industries'>,l:Language,max=2):string{
 const list=(asset.industries||[]).filter(Boolean);if(!list.length)return '';
 const shown=list.slice(0,max).map(i=>industryLabel(i,l)).join(', ');
 return list.length>max?`${shown} +${list.length-max}`:shown;
}

/** VAT note only when the owner stated it; absent means "not stated", never "excluded". */
export function vatNote(asset:Pick<IndustrialAsset,'terms'>,l:Language):string{
 const v=asset.terms?.vatIncluded;
 return v===false?c3(l,'chưa gồm VAT','excl. VAT','不含增值税'):v===true?c3(l,'đã gồm VAT','incl. VAT','含增值税'):'';
}
export {c3};

// ---- Discovery helpers (P2): leasing-status filter, power thresholds, zone keys. Derived from the data only. ----
export const LEASING_FILTERS=['available','reserved','upcoming','leased'] as const;
export type LeasingFilter=typeof LEASING_FILTERS[number];
export const leasingFilterLabel=(k:string,l:Language)=>k==='available'?c3(l,'Còn trống','Available','可租'):k==='reserved'?c3(l,'Đã giữ chỗ','Reserved','已预留'):k==='upcoming'?c3(l,'Sắp có','Coming soon','即将可租'):k==='leased'?c3(l,'Đã cho thuê','Leased','已出租'):k;
/** Same derivation as the card chip (incl. the "coming soon" rule); '' when the card shows no status. */
export const leasingKeyOf=(a:Pick<IndustrialAsset,'leasingStatus'|'availableFrom'>,now=new Date()):string=>leasingBadge(a,'en',now)?.key||'';
/** Minimum-power options: up to four distinct values taken from the data (never hard-coded), ascending, in MVA. */
export function powerThresholds(list:Pick<IndustrialAsset,'powerMva'>[]):number[]{
 const d=[...new Set(list.map(a=>a.powerMva).filter((v):v is number=>has(v)&&v>0))].sort((a,b)=>a-b);
 if(d.length<=4)return d;
 return [...new Set([0,1,2,3].map(i=>d[Math.round(i*(d.length-1)/4)]))];
}
/** Values below 1 MVA are shown in kVA; the stored unit stays MVA. */
export const powerLabel=(mva:number,l:Language)=>mva<1?`${num(Math.round(mva*1000),l)} kVA`:`${num(mva,l)} MVA`;
const zoneText=(z?:{vi?:string;en?:string;zh?:string})=>(z?.vi||z?.en||z?.zh||'').trim();
/** Zones repeat across parks ("Khu A"), so the filter value is always "<parkId>~<zone>". */
export const zoneValue=(a:Pick<IndustrialAsset,'parkId'|'zone'>):string=>{const t=zoneText(a.zone);return t?`${a.parkId}~${t}`:''};
export const zoneOptions=(list:Pick<IndustrialAsset,'parkId'|'zone'>[]):{value:string;parkId:string;zone:{vi?:string;en?:string;zh?:string}}[]=>{
 const seen=new Map<string,{value:string;parkId:string;zone:any}>();
 for(const a of list){const v=zoneValue(a);if(v&&!seen.has(v))seen.set(v,{value:v,parkId:a.parkId,zone:a.zone});}
 return [...seen.values()];
};
