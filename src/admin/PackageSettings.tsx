import {useState} from 'react';
import type {Language} from '../types';
import {PackageCards} from '../PackageCards';
import {packageCopyErrors,type PackageCopy,type ServicePackage} from '../servicePackages';
import {useAdmin} from './AdminContext';
import {Access,AdminNotice,Message,useText} from './ui';

export function PackageSettings(){
  const a=useAdmin(),t=useText();
  const [id,setId]=useState(a.store.packages[0]?.id||'');
  const [lang,setLang]=useState<Language>('vi');
  const [draft,setDraft]=useState<ServicePackage|undefined>(()=>structuredClone(a.store.packages[0]));
  const [message,setMessage]=useState(''),[errors,setErrors]=useState<string[]>([]);
  const current=a.store.packages.find(p=>p.id===id),editable=a.can('P23');
  const dirty=!!draft&&JSON.stringify(draft.content)!==JSON.stringify(current?.content),stale=draft?.revision!==current?.revision;
  function load(next:string){setId(next);setDraft(structuredClone(a.store.packages.find(p=>p.id===next)));setErrors([]);setMessage('')}
  const labels:Record<keyof PackageCopy,string>={name:t('Tên gói','Package name','套餐名称'),audience:t('Phù hợp với','Who it is for','适用对象'),benefits:t('Lợi ích (mỗi dòng một mục)','Benefits (one per line)','服务优势（每行一项）'),scope:t('Phạm vi hỗ trợ','Support scope','支持范围')};
  return <Access permission="P22"><div className="admin-page workflow-page"><div className="admin-title"><div><span>VIG ADMIN</span><h1>{t('Nội dung gói hỗ trợ','Package content','服务套餐内容')}</h1></div></div><AdminNotice/>
    <p>{t('Chỉnh sửa nội dung bằng ba ngôn ngữ. Lưu sẽ cập nhật ngay phần lựa chọn gói trên biểu mẫu.','Edit all three languages. Saving immediately updates package selection on the request forms.','编辑三种语言的内容。保存后立即更新需求表单中的套餐说明。')}</p>
    <label>{t('Gói hỗ trợ','Support package','服务套餐')}<select value={id} disabled={dirty} onChange={e=>load(e.target.value)}>{a.store.packages.map(p=><option key={p.id} value={p.id}>{p.content[lang].name}</option>)}</select></label>
    {!draft?<p>{t('Chưa có gói hỗ trợ.','No packages available.','暂无服务套餐。')}</p>:<>
      <div className="package-language-tabs" role="group" aria-label={t('Ngôn ngữ nội dung','Content language','内容语言')}>{(['vi','en','zh'] as Language[]).map(l=><button type="button" className={`button ${lang===l?'primary':''}`} aria-pressed={lang===l} key={l} onClick={()=>setLang(l)}>{({vi:'Tiếng Việt',en:'English',zh:'中文'})[l]}{errors.some(e=>e.startsWith(l+'.'))?' • !':''}</button>)}</div>
      <div className="package-settings-grid"><section className="admin-panel"><h2>{t('Nội dung','Content','内容')}</h2>
        {(Object.keys(labels) as (keyof PackageCopy)[]).map(key=><label className="package-editor-field" key={key}>{labels[key]}<textarea aria-label={labels[key]} rows={key==='benefits'?5:2} disabled={!editable} value={draft.content[lang][key]} aria-invalid={errors.includes(`${lang}.${key}`)} maxLength={{name:80,audience:200,benefits:700,scope:350}[key]} onChange={e=>{setDraft({...draft,content:{...draft.content,[lang]:{...draft.content[lang],[key]:e.target.value}}});setMessage('')}}/>{errors.includes(`${lang}.${key}`)&&<small role="alert">{t('Bắt buộc nhập; lợi ích tối đa 5 dòng, mỗi dòng 140 ký tự.','Required; benefits allow up to 5 lines of 140 characters each.','必填；优势最多5行，每行140个字符。')}</small>}</label>)}
      </section><section className="admin-panel"><h2>{t('Xem trước','Preview','预览')}</h2><PackageCards packages={[draft]} language={lang} value={draft.id}/></section></div>
      <Message code={message}/>{stale&&<Message code="stale"/>}
      {editable&&<div className="admin-actions"><button className="button primary" disabled={!dirty||stale} onClick={()=>{const invalid=packageCopyErrors(draft.content);setErrors(invalid);if(invalid.length){setLang(invalid[0].split('.')[0] as Language);setMessage('validation');return}const r=a.savePackage(id,draft.content,draft.revision);setMessage(r.ok?'success':r.error||'validation');if(r.ok)setDraft({...draft,revision:draft.revision+1})}}>{t('Lưu nội dung','Save content','保存内容')}</button><button className="button" onClick={()=>load(id)}>{stale?t('Tải lại nội dung','Reload content','重新加载内容'):t('Hủy thay đổi','Cancel changes','取消更改')}</button><span role="status">{dirty?t('Có thay đổi chưa lưu. Lưu hoặc hủy trước khi chọn gói khác.','Unsaved changes. Save or cancel before selecting another package.','有未保存的更改。选择其他套餐前请保存或取消。'):t('Nội dung đã lưu','Content saved','内容已保存')}</span></div>}
    </>}
  </div></Access>;
}
