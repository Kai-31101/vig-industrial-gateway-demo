import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Sparkles,LoaderCircle,RotateCcw} from 'lucide-react';
import {useApp} from '../AppContext';
import {api,ensureSession} from '../remote';
import {askAiLink} from './insights';
import {useText} from './ui';
import {useAdminActions} from './AdminContext';
import type {IndustrialRequest} from '../types';

type Result={text:string;matches?:{requestId:string;results:{assetId:string;score:number;publicationState?:string}[]}[];sources?:{id:string;name:{vi:string;en:string;zh?:string};href:string}[]};

/** In-place AI analysis for one enquiry: the manager does not have to leave the record to ask. */
export function AiMatchInsight({request}:{request:IndustrialRequest}){
 const {language}=useApp(),admin=useAdminActions(),t=useText();
 const [state,setState]=useState<'idle'|'busy'|'done'|'error'>('idle'),[result,setResult]=useState<Result>();
 const question=t(`Phân tích matching cho yêu cầu ${request.id} (${request.organization}). Nêu rõ mặt bằng nào đã công bố, mặt bằng nào còn nháp.`,`Analyse matches for enquiry ${request.id} (${request.organization}). State which properties are published and which are drafts.`,`分析需求 ${request.id}（${request.organization}）的匹配，并说明哪些物业已发布、哪些是草稿。`);
 const run=async()=>{setState('busy');try{await ensureSession();const r=await api<Result>('ai/admin',{message:question,language,taskHint:'match',history:[]});setResult(r);setState('done')}catch{setState('error')}};
 const name=(id:string)=>{const a=admin.store.drafts.find(x=>x.id===id);return a?(a.data.name[language]||a.data.name.en):id};
 const own=result?.matches?.find(m=>m.requestId===request.id)?.results||[];
 return <div className="ai-insight">
  <div className="ai-insight-head"><Sparkles size={18}/><b>{t('AI phân tích yêu cầu này','AI analysis of this enquiry','AI分析此需求')}</b>
   {state==='idle'&&<button className="button primary" onClick={run}>{t('Phân tích','Analyse','分析')}</button>}
   {state==='done'&&<button className="button" onClick={run} aria-label={t('Phân tích lại','Analyse again','重新分析')}><RotateCcw size={16}/></button>}</div>
  {state==='idle'&&<p className="ai-insight-hint">{t('AI so khớp nhu cầu với danh mục, ghi rõ mặt bằng công bố và nháp.','AI compares the enquiry with the catalogue and labels published versus draft properties.','AI将需求与目录比对，并标注已发布与草稿物业。')}</p>}
  {state==='busy'&&<p role="status" className="ai-insight-hint"><LoaderCircle size={16} className="spin"/>{t('Đang phân tích…','Analysing…','分析中…')}</p>}
  {state==='error'&&<div role="alert" className="ai-insight-hint">{t('AI chưa phản hồi được. Thử lại sau giây lát.','AI did not respond. Try again shortly.','AI暂未响应，请稍后重试。')} <button className="link-button" onClick={run}>{t('Thử lại','Retry','重试')}</button></div>}
  {state==='done'&&result&&<>
   <p className="ai-insight-text">{result.text.replace(/\*\*/g,'')}</p>
   {own.length>0&&<ul className="ai-insight-matches">{own.map(x=><li key={x.assetId}><Link to={`/admin/assets/${x.assetId}/edit`}>{name(x.assetId)}</Link><span>{x.score}%</span><span className={`ai-state ai-state-${x.publicationState==='draft'?'draft':'published'}`}>{x.publicationState==='draft'?t('Nháp','Draft','草稿'):t('Công bố','Published','已发布')}</span></li>)}</ul>}
   <Link className="ai-insight-more" to={askAiLink(question,'match')}>{t('Hỏi tiếp trong Trợ lý AI →','Continue in AI assistant →','在AI助手中继续 →')}</Link>
  </>}
 </div>;
}
