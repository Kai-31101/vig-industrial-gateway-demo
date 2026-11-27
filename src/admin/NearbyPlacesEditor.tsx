import {useState} from 'react';
import {useApp} from '../AppContext';
import {useText} from './ui';
import {NEARBY_CATEGORIES,categoryLabel,haversineKm,placeName} from '../geoPlaces';
import {distanceText,formatDate} from '../NearbyPlaces';
import type {NearbyCategory,NearbyPlace} from '../types';
type Msg='permission'|'goong_failed'|'goong_key_missing'|'validation'|'not_found'|'busy'|'server'|'no_results'|'rate';
async function requestNearby(parkId:string):Promise<{places:NearbyPlace[];warnings:string[]}>{
 const r=await fetch('/api/admin/geo/nearby',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({parkId}),signal:AbortSignal.timeout(150000)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(r.status===429?'rate':String(j.error||'server'));
 return j;
}
const blank={category:'hospital' as NearbyCategory,vi:'',en:'',lat:'',lng:'',km:'',min:''};
export function NearbyPlacesEditor({parkId,coordinates,value,onChange,disabled,internal,saved}:{parkId:string;coordinates:{lat:number|null;lng:number|null}|null;value?:NearbyPlace[];onChange:(v:NearbyPlace[])=>void;disabled:boolean;internal:boolean;saved:boolean}){
 const t=useText(),{language}=useApp(),places=value||[];
 const [busy,setBusy]=useState(false),[preview,setPreview]=useState<NearbyPlace[]|null>(null),[keep,setKeep]=useState<Set<string>>(new Set()),[error,setError]=useState<Msg|''>(''),[warn,setWarn]=useState<string[]>([]),[form,setForm]=useState(blank),[formError,setFormError]=useState(false);
 const errorText:Record<Msg,string>={permission:t('Chỉ phiên nội bộ được dùng chức năng này.','Only internal sessions can use this.','仅内部会话可使用此功能。'),goong_failed:t('Không lấy được dữ liệu từ Goong. Thử lại sau vài phút; dữ liệu hiện có được giữ nguyên.','Could not get data from Goong. Try again in a few minutes; current data is unchanged.','无法从 Goong 获取数据，请稍后重试；现有数据保持不变。'),goong_key_missing:t('Máy chủ chưa cấu hình khoá Goong.','The server has no Goong key configured.','服务器未配置 Goong 密钥。'),validation:t('Hồ sơ chưa có toạ độ hợp lệ. Lưu toạ độ trước.','The park has no valid coordinates. Save coordinates first.','园区缺少有效坐标，请先保存坐标。'),not_found:t('Không thấy KCN trong bản nháp đã lưu. Lưu trước rồi thử lại.','Park not found in the saved draft. Save first, then retry.','未找到已保存的草稿，请先保存。'),busy:'',server:t('Không thể kết nối máy chủ.','Unable to reach the server.','无法连接服务器。'),no_results:t('Không tìm thấy điểm nào.','No places found.','未找到任何地点。'),rate:t('Quá nhiều yêu cầu. Thử lại sau.','Too many requests. Try again later.','请求过多，请稍后再试。')};
 const run=async()=>{setBusy(true);setError('');setWarn([]);setPreview(null);try{const r=await requestNearby(parkId);setPreview(r.places);setKeep(new Set(r.places.map(p=>p.id)));setWarn(r.warnings||[])}catch(e){const code=(e as Error).message as Msg;setError(code in errorText?code:'server')}finally{setBusy(false)}};
 const apply=()=>{if(!preview)return;onChange([...places.filter(p=>p.source==='manual'),...preview.filter(p=>keep.has(p.id))]);setPreview(null)};
 const addManual=()=>{
  const lat=Number(form.lat),lng=Number(form.lng),km=form.km===''?null:Number(form.km),min=form.min===''?null:Number(form.min);
  const origin=coordinates&&coordinates.lat!=null&&coordinates.lng!=null?{lat:coordinates.lat,lng:coordinates.lng}:null;
  if(!form.vi.trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<8||lat>24||lng<102||lng>110||km!=null&&!(km>=0)||min!=null&&!(min>=0)||!origin){setFormError(true);return}
  const p:NearbyPlace={id:`manual-${crypto.randomUUID().slice(0,8)}`,category:form.category,name:{vi:form.vi.trim(),en:form.en.trim()||form.vi.trim(),zh:form.en.trim()||form.vi.trim()},coordinates:{lat,lng},straightKm:Math.round(haversineKm(origin,{lat,lng})*10)/10,drivingKm:km,drivingMinutes:min,source:'manual',computedAt:new Date().toISOString()};
  onChange([...places,p]);setForm(blank);setFormError(false);
 };
 const can=internal&&!disabled&&saved&&!busy;
 return <fieldset className="nearby-editor" data-field-path="places">
  <legend>{t('Tiện ích xung quanh','Nearby amenities','周边设施')} ({places.length})</legend>
  <p>{t('Tự tìm cảng, sân bay, quốc lộ, ga, bệnh viện, trường, KCN và thị trấn gần nhất (danh sách trung tâm giao thông tuyển chọn và tìm kiếm Goong), khoảng cách lái xe theo Goong. Kết quả chỉ là bản xem trước cho đến khi bạn áp dụng, lưu và công bố qua luồng duyệt.','Finds the nearest seaports, airports, highways, stations, hospitals, colleges, parks and towns (curated transport hubs and Goong search), with driving distances from Goong. Results are only a preview until you apply, save and publish through the review flow.','通过精选交通枢纽名单和 Goong 搜索自动查找最近的港口、机场、公路、车站、医院、院校、园区和城镇，行车距离来自 Goong。结果仅为预览，需应用、保存并通过审核流程发布。')}</p>
  <div className="admin-actions">
   <button type="button" className="button primary" disabled={!can} onClick={run}>{busy?t('Đang tìm… (có thể mất ~30 giây)','Searching… (may take ~30 s)','查找中…（约需30秒）'):t('Tự tìm tiện ích gần nhất','Find nearest amenities automatically','自动查找最近的周边设施')}</button>
   {!internal&&<small role="note">{t('Chỉ phiên nội bộ','Internal sessions only','仅限内部会话')}</small>}
   {internal&&!saved&&<small role="note">{t('Lưu bản nháp (toạ độ) trước khi tìm.','Save the draft (coordinates) before searching.','请先保存草稿（坐标）。')}</small>}
  </div>
  {error&&error!=='busy'&&<p className="admin-message error" role="alert">{errorText[error]}</p>}
  {preview&&<div className="nearby-preview" aria-label={t('Bản xem trước','Preview','预览')}>
   <h4>{t('Xem trước','Preview','预览')} — {preview.length} {t('điểm','places','个地点')}</h4>
   {warn.includes('driving_partial')&&<p className="admin-message error" role="status">{t('Một số điểm chưa tính được khoảng cách lái xe (chỉ có đường chim bay).','Some places have no driving distance (straight line only).','部分地点缺少行车距离（仅直线距离）。')}</p>}
   <ul className="nearby-preview-list">{preview.map(p=><li key={p.id}><label><input type="checkbox" checked={keep.has(p.id)} onChange={()=>setKeep(old=>{const n=new Set(old);if(n.has(p.id))n.delete(p.id);else n.add(p.id);return n})}/> <b>{placeName(p,language)}</b> · {categoryLabel(p.category,language)} · {distanceText(p,language)}{p.route?` · ${t('có tuyến','route','含路线')}`:''}</label></li>)}</ul>
   <div className="admin-actions"><button type="button" className="button primary" disabled={disabled} onClick={apply}>{t('Áp dụng vào bản nháp','Apply to draft','应用到草稿')} ({keep.size})</button><button type="button" className="button" onClick={()=>setPreview(null)}>{t('Bỏ qua','Discard','放弃')}</button></div>
   <small>{t('Áp dụng thay toàn bộ điểm tự động hiện có (điểm nhập tay được giữ). Sau đó bấm “Lưu thay đổi”.','Applying replaces all automatic places (manual ones are kept). Then press “Save changes”.','应用将替换所有自动地点（手动地点保留）。随后点击“保存更改”。')}</small>
  </div>}
  {places.length>0?<table className="nearby-table"><thead><tr><th>{t('Điểm','Place','地点')}</th><th>{t('Loại','Type','类型')}</th><th>{t('Khoảng cách','Distance','距离')}</th><th>{t('Nguồn','Source','来源')}</th><th/></tr></thead><tbody>{places.map(p=><tr key={p.id}><td>{placeName(p,language)}</td><td>{categoryLabel(p.category,language)}</td><td>{distanceText(p,language)}</td><td>{p.source==='manual'?t('Nhập tay','Manual','手动'):`Goong ${formatDate(p.computedAt)}`}</td><td><button type="button" className="button" disabled={disabled} onClick={()=>onChange(places.filter(x=>x.id!==p.id))} aria-label={`${t('Xoá','Remove','删除')} ${placeName(p,language)}`}>{t('Xoá','Remove','删除')}</button></td></tr>)}</tbody></table>:<p className="nearby-empty">{t('Chưa có tiện ích nào.','No amenities yet.','暂无周边设施。')}</p>}
  <details className="nearby-manual"><summary>{t('Thêm tay một điểm','Add a place manually','手动添加地点')}</summary>
   <div className="form-grid">
    <label>{t('Loại','Type','类型')}<select value={form.category} onChange={e=>setForm({...form,category:e.target.value as NearbyCategory})}>{NEARBY_CATEGORIES.map(c=><option key={c} value={c}>{categoryLabel(c,language)}</option>)}</select></label>
    <label>{t('Tên (VI)','Name (VI)','名称（越南语）')}<input value={form.vi} onChange={e=>setForm({...form,vi:e.target.value})}/></label>
    <label>{t('Tên (EN)','Name (EN)','名称（英语）')}<input value={form.en} onChange={e=>setForm({...form,en:e.target.value})}/></label>
    <label>{t('Vĩ độ','Latitude','纬度')}<input inputMode="decimal" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})}/></label>
    <label>{t('Kinh độ','Longitude','经度')}<input inputMode="decimal" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})}/></label>
    <label>{t('Lái xe (km, tuỳ chọn)','Driving km (optional)','行车公里（可选）')}<input inputMode="decimal" value={form.km} onChange={e=>setForm({...form,km:e.target.value})}/></label>
    <label>{t('Lái xe (phút, tuỳ chọn)','Driving minutes (optional)','行车分钟（可选）')}<input inputMode="numeric" value={form.min} onChange={e=>setForm({...form,min:e.target.value})}/></label>
   </div>
   {formError&&<p className="admin-message error" role="alert">{t('Nhập tên, toạ độ trong lãnh thổ Việt Nam (vĩ độ 8–24, kinh độ 102–110) và số km/phút hợp lệ; KCN cần có toạ độ.','Enter a name, coordinates inside Vietnam (lat 8–24, lng 102–110), valid km/minutes; the park needs coordinates.','请输入名称、越南境内坐标（纬度8–24，经度102–110）和有效的公里/分钟；园区需有坐标。')}</p>}
   <button type="button" className="button" disabled={disabled} onClick={addManual}>{t('Thêm điểm','Add place','添加地点')}</button>
  </details>
 </fieldset>;
}
