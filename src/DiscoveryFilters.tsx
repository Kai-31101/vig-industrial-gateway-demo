import {AreaInput,convertArea,formatArea,type AreaUnit} from "./AreaInput";
import {isPublicPark} from './leasing';
import {useMobile} from './MobileUX';
import {useState,useEffect,useId,useRef} from 'react';
import {useSearchParams} from 'react-router-dom';
import {useApp,tr} from './AppContext';
import {publicAssetMember} from './publicMembership';
import {pricingOf} from './contentSchema';
import {emptyCopy} from './EmptyStates';
import {industryLabel} from './industryLabels';
import {useSearchDraft,searchIncludes} from './searchDraft';
import type {IndustrialParkProfile,IndustrialAsset,Language} from './types';
export const assetTypeLabels:Record<string,[string,string,string]>={industrial_land:['Đất công nghiệp','Industrial land','工业用地'],ready_built_factory:['Nhà xưởng xây sẵn','Ready-built factory','现成厂房'],warehouse:['Kho vận','Warehouse','仓库'],build_to_suit:['Xây theo yêu cầu','Build-to-suit','定制建设']};
export const assetTypeLabel=(value:string,language:Language)=>assetTypeLabels[value]?emptyCopy(language,...assetTypeLabels[value]):value;
const publishedAssets=(assets:IndustrialAsset[],parks:IndustrialParkProfile[])=>assets.filter(a=>publicAssetMember(a.id)&&parks.some(p=>p.id===a.parkId&&isPublicPark(p)));
// "Mua" is offered only when a published sale asset exists (publication rules are unchanged: today none do).
export const hasPublishedSale=(assets:IndustrialAsset[],parks:IndustrialParkProfile[])=>publishedAssets(assets,parks).some(a=>a.transaction==='sale');
export const priceBasisKey=(a:IndustrialAsset)=>{const p=pricingOf(a);return p.mode==='specific'&&p.amount!=null&&p.amount>0?`${p.currency}/${p.areaBasis}/${p.period}`:''};
export const basisLabel=(basis:string,language:Language)=>{const [c,u,p]=basis.split('/');return `${c}/${u}/${p==='month'?emptyCopy(language,'tháng','month','月'):p==='year'?emptyCopy(language,'năm','year','年'):emptyCopy(language,'kỳ thuê','term','租期')}`};
// Price bands come from the most common pricing basis in the published data; no currency or unit conversion.
export function priceBands(list:IndustrialAsset[]){
 const counts=new Map<string,number>();list.forEach(a=>{const k=priceBasisKey(a);if(k)counts.set(k,(counts.get(k)||0)+1)});
 const basis=[...counts.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||'';
 const amounts=basis?list.filter(a=>priceBasisKey(a)===basis).map(a=>pricingOf(a).amount as number).sort((a,b)=>a-b):[];
 const distinct=[...new Set(amounts)];if(distinct.length<2)return {basis,bands:[] as {min:number;max:number}[]};
 const edges=[...new Set([distinct[0],amounts[Math.floor(amounts.length/3)],amounts[Math.floor(amounts.length*2/3)],distinct[distinct.length-1]])].sort((a,b)=>a-b);
 return {basis,bands:edges.slice(1).map((max,i)=>({min:edges[i],max}))};
}
// Homepage search band: asset type or transaction routes to /assets, everything else to /industrial-parks.
export function homeSearchTarget(f:{q:string;region:string;industry:string;status:string;kind:string;deal:string}){
 const type=f.kind.startsWith('asset:')?f.kind.slice(6):'',toAssets=Boolean(type||f.deal);
 const query:Record<string,string>=toAssets?{q:f.q.trim(),region:f.region,industry:f.industry,type,transaction:f.deal}:{q:f.q.trim(),region:f.region,industry:f.industry,status:f.status,parkType:f.kind.startsWith('park:')?f.kind.slice(5):''};
 const params=new URLSearchParams();for(const [key,value] of Object.entries(query))if(value)params.set(key,value);
 return {pathname:toAssets?'/assets':'/industrial-parks',search:params.toString().replace(/\+/g,'%20')};
}
export const parkTypeOptionsOf=(parks:IndustrialParkProfile[],language:Language)=>[...new Map(parks.filter(isPublicPark).map(p=>[p.parkType.vi,tr(p.parkType,language)] as [string,string])).entries()];
export function matchesPrice(a:IndustrialAsset,s:URLSearchParams){
 const pr=pricingOf(a),min=s.get('priceMin'),max=s.get('priceMax'),basis=s.get('priceBasis');
 if(s.get('priceMode')==='contact')return pr.mode!=='specific';
 if(!(min||max)||!basis)return true;
 return priceBasisKey(a)===basis&&pr.amount!=null&&pr.amount>=Number(min||0)&&pr.amount<=Number(max||Infinity);
}
export function matchesParkFilters(p:IndustrialParkProfile,s:URLSearchParams){
 const min=Number(s.get('minArea')||0),max=Number(s.get('maxArea')||Infinity),area=p.totalArea.disclosureStatus==='public'&&p.totalArea.value!=null?p.totalArea.value*(p.totalArea.unit==='ha'?10000:1):null;
 return (!s.get('province')||s.get('province')===p.province)&&(!s.get('parkType')||p.parkType.vi===s.get('parkType'))&&(!(min||max<Infinity)||area!=null&&area>=min&&area<=max)&&(!s.has('available')||p.availability.some(a=>a.available.disclosureStatus==='public'&&Number(a.available.value)>0))&&s.getAll('utility').every(key=>p.utilities.some(u=>u.key===key&&u.capacity.disclosureStatus==='public'&&u.capacity.value!=null))&&s.getAll('connection').every(type=>p.connectivity.some(c=>c.type===type&&c.status==='operational'));
}
export function matchesAssetFilters(a:IndustrialAsset,p:IndustrialParkProfile,s:URLSearchParams){
 const min=Number(s.get('minArea')||0),max=Number(s.get('maxArea')||Infinity),area=a.area*(a.unit==='ha'?10000:1);
 return (!s.get('province')||s.get('province')===p.province)&&(!s.get('region')||s.get('region')===p.region)&&(!s.get('type')||s.get('type')==='all'||a.type===s.get('type'))&&(!s.get('industry')||a.industries.includes(s.get('industry')!))&&(!s.get('transaction')||a.transaction===s.get('transaction'))&&(!s.get('q')?.trim()||searchIncludes(`${a.name.vi} ${a.name.en} ${a.name.zh||''} ${p.name.vi}`,s.get('q')!))&&area>=min&&area<=max&&matchesPrice(a,s);
}
export function DiscoveryFilters({asset=false,resultCount=0}:{asset?:boolean;resultCount?:number}){
 const {language,parks,assets}=useApp(),[s,setS]=useSearchParams(),t=(vi:string,en:string,zh:string)=>emptyCopy(language,vi,en,zh);
 const [min,setMin]=useState(s.get('minArea')||''),[max,setMax]=useState(s.get('maxArea')||'');
 const [areaUnit,setAreaUnit]=useState<AreaUnit>('m2');
 const unitSymbol=areaUnit==='m2'?'m²':areaUnit==='km2'?'km²':'ha';
 const changeUnit=(next:AreaUnit)=>{setMin(convertArea(min,areaUnit,next));setMax(convertArea(max,areaUnit,next));setAreaUnit(next)};
 const mobile=useMobile();const errorRef=useRef<HTMLParagraphElement>(null);
 const [mobileOpen,setMobileOpen]=useState(false);
 const filterId=useId();
 const groups=new Set([...s.entries()].filter(([key,value])=>key!=='q'&&key!=='view'&&value&&value!=='all').map(([key])=>key==='minArea'||key==='maxArea'?'area':key.startsWith('price')?'price':key));
 const activeCount=groups.size;
 const savedMin=s.get('minArea')||'',savedMax=s.get('maxArea')||'';
 useEffect(()=>{setMin(convertArea(savedMin,'m2',areaUnit));setMax(convertArea(savedMax,'m2',areaUnit))},[savedMin,savedMax]);
 const valid=(a:string,b:string)=>(!a||+a>0)&&(!b||+b>0)&&(!a||!b||+a<=+b);
 const set=(key:string,value:string)=>setS(old=>{const next=new URLSearchParams(old);if(value)next.set(key,value);else next.delete(key);return next},{replace:true});
 const qInput=useSearchDraft(s.get('q')||'',value=>set('q',value));
 const range=(a:string,b:string)=>{setMin(a);setMax(b);if(valid(a,b))setS(old=>{const next=new URLSearchParams(old);a?next.set('minArea',convertArea(a,areaUnit,'m2')):next.delete('minArea');b?next.set('maxArea',convertArea(b,areaUnit,'m2')):next.delete('maxArea');return next},{replace:true})};
 const toggle=(key:string,value:string)=>setS(old=>{const next=new URLSearchParams(old),all=next.getAll(key);next.delete(key);(all.includes(value)?all.filter(x=>x!==value):[...all,value]).forEach(x=>next.append(key,x));return next},{replace:true});
 const closePanel=()=>{if(!valid(min,max)){errorRef.current?.focus();return;}setMobileOpen(false);document.getElementById('directory-results')?.focus();};
 const clear=()=>{setAreaUnit('m2');setMin('');setMax('');setS(old=>old.get('view')==='map'?new URLSearchParams({view:'map'}):new URLSearchParams(),{replace:true});};
 const valueLabel=(value:string)=>{const names:Record<string,[string,string,string]>={North:['Miền Bắc','North','北部'],Central:['Miền Trung','Central','中部'],South:['Miền Nam','South','南部'],operational:['Đang hoạt động','Operational','运营中'],developing:['Đang phát triển','Developing','开发中'],planned:['Quy hoạch','Planned','规划中'],lease:['Thuê','Lease','租赁'],sale:['Mua','Purchase','购买'],electricity:['Điện','Electricity','电力'],water:['Nước','Water','供水'],wastewater:['Nước thải','Wastewater','污水'],port:['Cảng','Port','港口'],airport:['Sân bay','Airport','机场'],road:['Đường chính','Major road','主干道路'],yes:['Còn diện tích','Available land','可用土地'],industrial_land:['Đất công nghiệp','Industrial land','工业用地'],ready_built_factory:['Nhà xưởng','Factory','厂房'],warehouse:['Kho vận','Warehouse','仓库'],build_to_suit:['Xây theo yêu cầu','Build-to-suit','定制建设']};return names[value]?t(...names[value]):industryLabel(value,language);};
 const sale=hasPublishedSale(assets,parks),bands=priceBands(publishedAssets(assets,parks));
 const num=(n:number)=>n.toLocaleString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US');
 const field=(key:string,label:string,options:[string,string][])=><label key={key}>{label}<select aria-label={label} value={s.get(key)||''} onChange={e=>set(key,e.target.value)}><option value="">{t('Tất cả','All','全部')}</option>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
 const priceValue=s.get('priceMode')==='contact'?'contact':s.get('priceMin')&&s.get('priceMax')?`${s.get('priceMin')}~${s.get('priceMax')}`:'';
 const setPrice=(value:string)=>setS(old=>{const next=new URLSearchParams(old);['priceMin','priceMax','priceBasis','priceMode'].forEach(k=>next.delete(k));if(value==='contact')next.set('priceMode','contact');else if(value){const [a,b]=value.split('~');next.set('priceMin',a);next.set('priceMax',b);next.set('priceBasis',bands.basis)}return next},{replace:true});
 const priceLabel=t('Khoảng giá','Price range','价格区间')+(bands.basis?` (${basisLabel(bands.basis,language)})`:'');
 const priceField=<label key="price">{priceLabel}<select aria-label={priceLabel} value={priceValue} onChange={e=>setPrice(e.target.value)}><option value="">{t('Tất cả','All','全部')}</option>{bands.bands.map(b=><option key={`${b.min}~${b.max}`} value={`${b.min}~${b.max}`}>{num(b.min)} – {num(b.max)}</option>)}<option value="contact">{t('Giá thỏa thuận / liên hệ','Negotiable / contact','面议 / 联系')}</option></select></label>;
 const priceChip=s.get('priceMode')==='contact'?<button key="price" onClick={()=>setPrice('')}>{t('Giá thỏa thuận / liên hệ','Negotiable / contact','面议 / 联系')}<span aria-hidden="true"> ×</span></button>:s.get('priceMin')&&s.get('priceMax')?<button key="price" onClick={()=>setPrice('')}>{num(+s.get('priceMin')!)}–{num(+s.get('priceMax')!)} {basisLabel(s.get('priceBasis')||'',language)}<span aria-hidden="true"> ×</span></button>:null;
 const parkTypeOptions=parkTypeOptionsOf(parks,language);
 const transactionOptions:[string,string][]=[['lease',t('Cho thuê','For lease','租赁')],...(sale?[['sale',t('Mua','Purchase','购买')] as [string,string]]:[])];
 const chipLabel=(key:string,value:string)=>key==='parkType'?parkTypeOptions.find(([v])=>v===value)?.[1]||value:key==='transaction'?transactionOptions.find(([v])=>v===value)?.[1]||valueLabel(value):valueLabel(value);
 const mobileSelect=(key:string,label:string,options:string[]) => <label key={key}>{label}<select aria-label={label} value={s.get(key)||''} onChange={e=>set(key,e.target.value)}><option value="">{t('Tất cả','All','全部')}</option>{options.map(value=><option key={value} value={value}>{valueLabel(value)}</option>)}</select></label>;
 const unitControl=<label data-filter="area-unit">{t('Đơn vị diện tích','Area unit','面积单位')}<select value={areaUnit} onChange={e=>changeUnit(e.target.value as AreaUnit)}><option value="m2">m²</option><option value="ha">{t('Hecta (ha)','Hectare (ha)','公顷 (ha)')}</option><option value="km2">km²</option></select></label>;
 const minControl=<label data-filter="area-min">{t('Diện tích từ','Area from','面积下限')} ({unitSymbol})<AreaInput value={min} onChange={value=>range(value,max)} language={language}/></label>;
 const maxControl=<label data-filter="area-max">{t('Diện tích đến','Area to','面积上限')} ({unitSymbol})<AreaInput value={max} onChange={value=>range(min,value)} language={language}/></label>;
 if(mobile)return <section className="mobile-discovery">
  <div className="mobile-search-row"><input aria-label={t('Tìm kiếm','Search','搜索')} placeholder={t('Tìm KCN, địa điểm…','Search parks, locations…','搜索园区、地点…')} {...qInput}/><button type="button" aria-expanded={mobileOpen} aria-controls={filterId} onClick={()=>mobileOpen?closePanel():setMobileOpen(true)}>{t('Bộ lọc','Filters','筛选')}{activeCount?` (${activeCount})`:''}</button></div>
  {!asset&&<div className="mobile-quick-province">{mobileSelect('province',t('Tỉnh/thành phố','Province','省市'),[...new Set(parks.filter(p=>isPublicPark(p)).map(p=>p.province))])}</div>}
  {mobileOpen&&<div id={filterId} className="mobile-filter-fields">
   {asset&&mobileSelect('province',t('Tỉnh/thành phố','Province','省市'),[...new Set(parks.filter(p=>isPublicPark(p)).map(p=>p.province))])}
   {mobileSelect('region',t('Vùng miền','Region','地区'),['North','Central','South'])}
   {!asset&&mobileSelect('status',t('Trạng thái','Status','状态'),['operational','developing','planned'])}
   {!asset&&field('parkType',t('Loại hình','Park type','园区类型'),parkTypeOptions)}
   {asset&&field('type',t('Loại hình','Asset type','物业类型'),Object.keys(assetTypeLabels).map(v=>[v,assetTypeLabel(v,language)] as [string,string]))}
   {asset&&field('transaction',t('Hình thức','Transaction','交易形式'),transactionOptions)}
   {asset&&priceField}
   {mobileSelect('industry',t('Ngành nghề','Industry','行业'),[...new Set(parks.filter(isPublicPark).flatMap(p=>p.suitableIndustries))])}
   {unitControl}<div className="mobile-range">{minControl}{maxControl}</div>
   {!valid(min,max)&&<div><p role="alert" tabIndex={-1} ref={errorRef}>{t('Diện tích phải dương; giá trị từ không lớn hơn đến. Kết quả giữ khoảng hợp lệ trước.','Area must be positive and minimum cannot exceed maximum. Results use the previous valid range.','面积必须为正且下限不超过上限。结果保留有效范围。')}</p><button onClick={()=>range('','')}>{t('Đặt lại diện tích','Reset area','重置面积')}</button></div>}
   {!asset&&<div className="discovery-checks"><label><input type="checkbox" checked={s.has('available')} onChange={e=>set('available',e.target.checked?'yes':'')}/>{t('Còn diện tích','Available land','可用土地')}</label>{[['utility','electricity','Điện','Electricity','电力'],['utility','water','Nước','Water','供水'],['utility','wastewater','Nước thải','Wastewater','污水'],['connection','port','Cảng','Port','港口'],['connection','airport','Sân bay','Airport','机场'],['connection','road','Đường chính','Major road','主干道路']].map(([group,key,vi,en,zh])=><label key={key}><input type="checkbox" checked={s.getAll(group).includes(key)} onChange={()=>toggle(group,key)}/>{t(vi,en,zh)}</label>)}</div>}
   <p className="mobile-filter-count" aria-live="polite">{resultCount} {t('kết quả','results','个结果')}</p><div className="mobile-filter-footer"><button className="button" onClick={clear}>{t('Xóa bộ lọc','Clear filters','清除筛选')}</button><button className="button primary" onClick={closePanel}>{t(`Xem ${resultCount} kết quả`,`View ${resultCount} results`,`查看 ${resultCount} 个结果`)}</button></div>
  </div>}
  {[...s.keys()].some(k=>k!=='view')&&<div className="applied-filters" aria-label={t('Bộ lọc đang áp dụng','Applied filters','当前筛选')}>{[...s.entries()].filter(([key])=>key!=='view'&&key!=='minArea'&&key!=='maxArea'&&!key.startsWith('price')).map(([key,value])=><button key={key+value} onClick={()=>key==='utility'||key==='connection'?toggle(key,value):set(key,'')}>{key==='q'?`${t('Từ khóa','Search','关键词')}: `:''}{chipLabel(key,value)}<span aria-hidden="true"> ×</span></button>)}{priceChip}{(savedMin||savedMax)&&<button onClick={()=>range('','')}>{formatArea(convertArea(savedMin,'m2',areaUnit),language)||'0'}–{formatArea(convertArea(savedMax,'m2',areaUnit),language)||'∞'} {unitSymbol} ×</button>}<button onClick={clear}>{t('Xóa tất cả','Clear all','清除全部')}</button></div>}
 </section>;
 return <section className="discovery-extra"><button type="button" className="mobile-filter-toggle" aria-expanded={mobileOpen} aria-controls={filterId} onClick={()=>setMobileOpen(open=>!open)}><span>{t('Bộ lọc tìm kiếm','Search filters','搜索筛选')}{activeCount>0?` (${activeCount})`:''}</span><span aria-hidden="true">{mobileOpen?'−':'+'}</span></button><div id={filterId} className={`discovery-fields ${mobileOpen?'is-open':''}`}><div className="form-grid">{asset&&<label>{t('Từ khóa','Keyword','关键词')}<input {...qInput}/></label>}<label>{t('Tỉnh/thành phố','Province','省市')}<select value={s.get('province')||''} onChange={e=>set('province',e.target.value)}><option value="">{t('Tất cả','All','全部')}</option>{[...new Set(parks.filter(p=>isPublicPark(p)).map(p=>p.province))].map(p=><option key={p}>{p}</option>)}</select></label>{unitControl}{minControl}{maxControl}{asset&&<><label>{t('Ngành','Industry','行业')}<select value={s.get('industry')||''} onChange={e=>set('industry',e.target.value)}><option value="">{t('Tất cả','All','全部')}</option>{[...new Set(parks.filter(isPublicPark).flatMap(p=>p.suitableIndustries))].map(i=><option key={i} value={i}>{industryLabel(i,language)}</option>)}</select></label>{field('region',t('Vùng miền','Region','地区'),['North','Central','South'].map(v=>[v,valueLabel(v)] as [string,string]))}{field('transaction',t('Hình thức','Transaction','交易形式'),transactionOptions)}{priceField}</>}{!asset&&field('parkType',t('Loại hình','Park type','园区类型'),parkTypeOptions)}</div>{!valid(min,max)&&<p role="alert">{t('Diện tích phải dương và từ không lớn hơn đến. Giữ kết quả theo khoảng hợp lệ trước.','Area must be positive and minimum cannot exceed maximum. Previous valid range is retained.','面积须大于零且下限不超过上限，保留上次有效范围。')}</p>}{!asset&&<div className="discovery-checks"><label><input type="checkbox" checked={s.has('available')} onChange={e=>set('available',e.target.checked?'yes':'')}/>{t('Còn diện tích công khai','Publicly available land','有公开可用土地')}</label>{[['electricity',t('Điện','Electricity','电力')],['water',t('Nước','Water','供水')],['wastewater',t('Nước thải','Wastewater','污水')]].map(([key,label])=><label key={key}><input type="checkbox" checked={s.getAll('utility').includes(key)} onChange={()=>toggle('utility',key)}/>{label}</label>)}{[['port',t('Cảng','Port','港口')],['airport',t('Sân bay','Airport','机场')],['road',t('Đường chính','Major road','主干道路')]].map(([key,label])=><label key={key}><input type="checkbox" checked={s.getAll('connection').includes(key)} onChange={()=>toggle('connection',key)}/>{label}</label>)}</div>}<button className="button" onClick={clear}>{t('Xóa bộ lọc','Clear filters','清除筛选')}</button></div></section>;
}
