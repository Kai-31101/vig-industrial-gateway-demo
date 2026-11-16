import {Fragment,useState} from 'react';
import {useAdminActions as useAdmin} from './AdminContext';
import {useApp} from '../AppContext';
import {permissionNames} from './copy';
import {Access,AdminNotice,Message,RoleName,useText} from './ui';
import {type AdminRole} from './model';

/** One table, grouped rows, business roles only: Super Admin always holds every permission. */
export function PermissionMatrix(){
  const a=useAdmin(),{language}=useApp(),t=useText();
  const [draft,setDraft]=useState(()=>structuredClone(a.store.matrix)),[revision,setRevision]=useState(a.store.matrixRevision),[query,setQuery]=useState(''),[note,setNote]=useState(''),[message,setMessage]=useState(''),[closed,setClosed]=useState<string[]>([]);
  const editable=a.current?.role==='SA'&&a.can('P21'),dirty=JSON.stringify(draft)!==JSON.stringify(a.store.matrix),stale=revision!==a.store.matrixRevision;
  const roles:AdminRole[]=['ADMIN','OPERATOR'];
  const groups=[{key:'content',label:t('Nội dung & dữ liệu','Content & data','内容与数据'),ids:['P01','P02','P03','P04','P05','P06','P07','P08','P16','P22','P23']},{key:'connections',label:t('Nhu cầu & báo cáo','Enquiries & reports','需求与报告'),ids:['P09','P10','P11','P17','P18']},{key:'users',label:t('Người dùng & quyền','Users & access','用户与权限'),ids:['P12','P13','P14','P15','P19','P20','P21']}];
  const label=(p:string)=>permissionNames[p]?.[language==='vi'?0:language==='en'?1:2]||p;
  const visible=(p:string)=>(label(p)+' '+p).toLowerCase().includes(query.trim().toLowerCase());
  const reset=()=>{setDraft(structuredClone(a.store.matrix));setRevision(a.store.matrixRevision);setMessage('');setNote('')};
  const changes=roles.reduce((n,r)=>n+draft[r].filter(p=>!a.store.matrix[r].includes(p)).length+a.store.matrix[r].filter(p=>!draft[r].includes(p)).length,0);
  const toggle=(key:string)=>setClosed(c=>c.includes(key)?c.filter(x=>x!==key):[...c,key]);
  const anyVisible=groups.some(g=>g.ids.some(visible));
  return <Access permission="P20"><div className="admin-page workflow-page permission-page">
   <div className="admin-title"><div><h1>{t('Phân quyền','Permissions','权限')}</h1><p>{t('Mỗi người dùng có một vai trò. Thay đổi áp dụng cho mọi người dùng thuộc vai trò đó sau khi lưu.','Each user has one role. Saved changes apply to everyone with that role.','每位用户仅有一个角色，保存后更改适用于该角色的所有用户。')}</p></div><span className="workflow-badge">{editable?t('Bạn có thể chỉnh sửa','You can edit','您可编辑'):t('Chỉ xem','Read only','只读')}</span></div>
   <AdminNotice/><Message code={message}/>{stale&&<Message code="stale"/>}
   <div className="admin-filter"><label>{t('Tìm quyền','Search permissions','搜索权限')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Ví dụ: công bố, người dùng…','e.g. publish, users…','例如：发布、用户…')}/></label></div>
   <section className="admin-panel matrix-panel">
    <p className="matrix-note">{t('Super Admin luôn có toàn bộ quyền và không thể thay đổi tại đây.','Super Admin always has every permission and cannot be changed here.','超级管理员始终拥有全部权限，此处不可更改。')}</p>
    {anyVisible?<table className="matrix-table"><colgroup><col/>{roles.map(r=><col key={r} className="matrix-role-col"/>)}</colgroup>
     <thead><tr><th scope="col">{t('Quyền','Permission','权限')}</th>{roles.map(r=><th scope="col" key={r}><RoleName role={r}/></th>)}</tr></thead>
     {groups.map(g=>{const ids=g.ids.filter(visible);if(!ids.length)return null;const open=!closed.includes(g.key)||Boolean(query.trim());return <Fragment key={g.key}><tbody className="matrix-group-head"><tr><th colSpan={roles.length+1} scope="rowgroup"><button type="button" aria-expanded={open} onClick={()=>toggle(g.key)}><span aria-hidden="true">{open?'▾':'▸'}</span>{g.label}<small>{ids.length}</small></button></th></tr></tbody>
      {open&&<tbody>{ids.map(p=><tr key={p}><th scope="row" title={p}>{label(p)}</th>{roles.map(r=>{const name=`${r} ${p} — ${label(p)}`;return <td key={r}><label className="matrix-check"><input type="checkbox" aria-label={name} checked={draft[r].includes(p)} disabled={!editable||p==='P21'} onChange={e=>{setDraft({...draft,[r]:e.target.checked?[...draft[r],p]:draft[r].filter(x=>x!==p)});setMessage('')}}/></label></td>})}</tr>)}</tbody>}</Fragment>})}
    </table>:<div className="overview-empty"><p>{t('Không có quyền phù hợp.','No matching permissions.','没有匹配权限。')}</p><button className="button" onClick={()=>setQuery('')}>{t('Xóa tìm kiếm','Clear search','清除搜索')}</button></div>}
   </section>
   {editable&&(dirty||stale)&&<div className="editor-action-bar matrix-save"><span className="editor-dirty" role="status">{stale?t('Ma trận đã được người khác cập nhật','The matrix was changed elsewhere','矩阵已被他人更新'):`${changes} ${t('thay đổi chưa lưu','unsaved changes','项未保存更改')}`}</span><input className="matrix-note-input" value={note} onChange={e=>setNote(e.target.value)} placeholder={t('Ghi chú thay đổi (tùy chọn)','Change note (optional)','更改备注（选填）')} aria-label={t('Ghi chú thay đổi (tùy chọn)','Change note (optional)','更改备注（选填）')}/><div className="admin-actions"><button className="button" onClick={reset}>{stale?t('Tải lại','Reload','重新加载'):t('Hủy thay đổi','Cancel changes','取消更改')}</button><button className="button primary" disabled={!dirty||stale} onClick={async ()=>{const r=await a.configure(draft,revision,note);setMessage(r.ok?'success':r.error||'validation');if(r.ok){setRevision(revision+1);setNote('')}}}>{t('Lưu thay đổi','Save changes','保存更改')}</button></div></div>}
  </div></Access>
}
