import {useState} from 'react';
import {X,Search} from 'lucide-react';
import {useApp} from '../AppContext';
import {industryLabel} from '../industryLabels';
import {useText} from './ui';

/** Selected industries stay visible as removable chips; the long catalogue is searchable and collapsed by default. */
export function IndustryPicker({label,options,value,onChange,disabled,path}:{label:string;options:string[];value:string[];onChange:(v:string[])=>void;disabled?:boolean;path:string}){
 const {language}=useApp(),t=useText(),[open,setOpen]=useState(false),[q,setQ]=useState('');
 const name=(v:string)=>industryLabel(v,language);
 const toggle=(v:string)=>onChange(value.includes(v)?value.filter(x=>x!==v):[...value,v]);
 const query=q.trim().toLocaleLowerCase();
 const rest=options.filter(v=>!value.includes(v)&&(!query||name(v).toLocaleLowerCase().includes(query)||v.toLowerCase().includes(query))).sort((x,y)=>name(x).localeCompare(name(y),language));
 return <fieldset className="industry-picker" data-field-path={path} disabled={disabled}><legend>{label} <small>({value.length})</small></legend>
  <div className="industry-selected">{value.length?value.map(v=><span key={v} className="industry-chip">{name(v)}{!disabled&&<button type="button" onClick={()=>toggle(v)} aria-label={`${t('Bỏ','Remove','移除')} ${name(v)}`}><X size={14}/></button>}</span>):<small className="industry-empty">{t('Chưa chọn ngành nào.','No industries selected.','尚未选择行业。')}</small>}</div>
  {!disabled&&<button type="button" className="link-button" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>{open?t('Đóng danh sách','Close list','关闭列表'):`+ ${t('Thêm ngành','Add industries','添加行业')}`}</button>}
  {open&&<div className="industry-browser"><label className="industry-search"><Search size={16}/><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder={t('Tìm ngành…','Search industries…','搜索行业…')} aria-label={t('Tìm ngành','Search industries','搜索行业')}/></label>
   <div className="role-options">{rest.map(v=><label key={v}><input type="checkbox" checked={false} onChange={()=>toggle(v)}/>{name(v)}</label>)}{!rest.length&&<small className="industry-empty">{t('Không có ngành phù hợp.','No matching industries.','无匹配行业。')}</small>}</div></div>}
 </fieldset>;
}
