import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {X} from 'lucide-react';
import {useApp,tr} from '../AppContext';
import {useAdminActions as useAdmin} from './AdminContext';
import {AssetCommercialFields} from './AssetCommercialFields';
import {Message,useText} from './ui';
import {optionText} from './copy';
import {publicationIssues,type Draft} from './model';
import type {IndustrialAsset,IndustrialParkProfile} from '../types';

const STATUS=['operational','developing','planned','unknown'];

/** Side panel for the edits managers make most: price, area, availability, park status and the review step. */
export function QuickEdit({record,onClose}:{record:Draft;onClose:()=>void}){
 const a=useAdmin(),{language}=useApp(),t=useText(),ref=useRef<HTMLDialogElement>(null);
 const [data,setData]=useState(()=>structuredClone(record.data)),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const live=a.store.drafts.find(d=>d.id===record.id&&d.kind===record.kind)||record;
 const dirty=JSON.stringify(data)!==JSON.stringify(live.data),stale=live.revision!==record.revision&&dirty;
 const editable=a.can('P02')&&a.writable,issues=publicationIssues(data,a.store.drafts);
 useEffect(()=>{const d=ref.current;d?.showModal?.();return()=>d?.close?.()},[]);
 const save=async()=>{setBusy(true);try{const r=await a.save(data,live.revision);setMessage(r.ok?'saved':r.error||'validation')}finally{setBusy(false)}};
 const step=async(action:'submit'|'approve'|'publish')=>{setBusy(true);try{const r=await a.workflow(live.id,live.revision,action);setMessage(r.ok?'success':r.error||'validation')}finally{setBusy(false)}};
 const path=`/admin/${record.kind==='park'?'industrial-parks':'assets'}/${record.id}/edit`;
 return <dialog ref={ref} className="quick-edit native-confirm" aria-label={t('Sửa nhanh','Quick edit','快速编辑')} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===ref.current)onClose()}}>
  <div className="quick-edit-panel">
   <header><div><small>{record.kind==='park'?t('Khu công nghiệp','Industrial park','工业园区'):t('Mặt bằng','Asset','物业')} · <span className={`workflow-badge state-${live.state}`}>{optionText(live.state,language)}</span></small><h2>{tr(data.name,language)||record.id}</h2></div><button className="button icon" onClick={onClose} aria-label={t('Đóng','Close','关闭')}><X size={18}/></button></header>
   <Message code={message}/>{stale&&<p className="admin-message error">{t('Hồ sơ vừa được cập nhật ở nơi khác. Đóng và mở lại để tránh ghi đè.','This record changed elsewhere. Close and reopen to avoid overwriting.','该档案已在别处更新，请关闭后重新打开以免覆盖。')}</p>}
   <div className="quick-edit-body">
    {record.kind==='asset'?<>
     <AssetCommercialFields value={data as IndustrialAsset} onChange={next=>{setData(next);setMessage('')}} disabled={!editable}/>
     <label>{t('Sẵn sàng bàn giao từ','Available from','可交付日期')}<input type="date" disabled={!editable} value={(data as IndustrialAsset).availableFrom||''} onChange={e=>{setData({...(data as IndustrialAsset),availableFrom:e.target.value});setMessage('')}}/></label>
    </>:<label>{t('Trạng thái phát triển','Development status','开发状态')}<select disabled={!editable} value={(data as IndustrialParkProfile).status||'unknown'} onChange={e=>{setData({...(data as IndustrialParkProfile),status:e.target.value as IndustrialParkProfile['status']});setMessage('')}}>{STATUS.map(s=><option key={s} value={s}>{optionText(s,language)}</option>)}</select></label>}
    {issues.length>0&&<p className="quick-edit-issues">{t('Còn thiếu để công bố','Missing before publishing','发布前仍缺少')}: {issues.length}</p>}
   </div>
   <footer>
    <Link className="link-button" to={path}>{t('Mở form đầy đủ','Open full form','打开完整表单')}</Link>
    <div className="admin-actions">
     {!dirty&&a.can('P04')&&live.state==='draft'&&<button className="button" disabled={busy} onClick={()=>step('submit')}>{t('Gửi duyệt','Submit for review','提交审核')}</button>}
     {!dirty&&a.can('P05')&&live.state==='in_review'&&<button className="button" disabled={busy||!!issues.length} onClick={()=>step('approve')}>{t('Duyệt','Approve','审核通过')}</button>}
     {!dirty&&a.can('P06')&&live.state==='approved'&&<button className="button" disabled={busy||!!issues.length} onClick={()=>step('publish')}>{t('Công bố','Publish','发布')}</button>}
     {editable&&<button className="button primary" disabled={!dirty||busy||stale} onClick={save}>{t('Lưu thay đổi','Save changes','保存更改')}</button>}
    </div>
   </footer>
  </div>
 </dialog>;
}
