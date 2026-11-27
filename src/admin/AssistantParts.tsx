import {Link} from 'react-router-dom';
import {useApp} from '../AppContext';
import {optionText} from './copy';

/** Structured parts of an admin assistant answer (matching results, statistics). Admin only. */
export type AdminLookup={asset:(id:string)=>{name:string;park:string;href:string}|null;request:(id:string)=>{name:string;href:string}|null};
const useT=()=>{const {language}=useApp();return {language,t:(vi:string,en:string,zh:string)=>({vi,en,zh})[language]}};

/** Same badge (class + colours + labels) as the catalogue table. */
export function PublicationBadge({state}:{state?:string}){
 const {language}=useT();const s=state==='draft'?'draft':'published';
 return <span className={`workflow-badge state-${s}`}>{optionText(s,language)}</span>;
}

const CHECK_LABELS:Record<string,[string,string,string]>={location:['Vị trí','Location','位置'],industry:['Ngành','Industry','行业'],type:['Loại','Type','类型'],area:['Diện tích','Area','面积']};

export function AssistantMatches({matches,lookup}:{matches:any[];lookup?:AdminLookup}){
 const {language,t}=useT();
 return <div className="ai-matches">{matches.map((run:any)=>{
  const req=lookup?.request(run.requestId),results:any[]=run.results||[],anyDraft=results.some(x=>x.publicationState==='draft');
  return <section key={run.requestId} className="ai-match-group">
   <h3>{req?<Link to={req.href}>{run.organization||req.name}</Link>:run.organization}</h3>
   {!results.length?<p className="ai-match-empty">{t('Chưa có mặt bằng nào khớp các tiêu chí đã biết.','No property matches the known criteria yet.','暂无物业符合已知条件。')}</p>:<ul>{results.map((x:any)=>{
    const a=lookup?.asset(x.assetId);
    return <li key={x.assetId}>
     <div className="ai-match-main"><span className="ai-match-name">{a?<Link to={a.href}>{a.name}</Link>:x.assetId}{a?.park&&<small>{a.park}</small>}</span><span className="ai-match-score" title={t('Điểm phù hợp theo tiêu chí đã biết','Fit on known criteria','已知条件匹配度')}>{x.score}%</span><PublicationBadge state={x.publicationState}/></div>
     {x.publicationState==='draft'&&<small className="ai-match-warn">{t('Nháp — phải công bố trước khi chào cho khách.','Draft — must be published before it is offered.','草稿——须先发布才能向客户推荐。')}</small>}
     {Array.isArray(x.checks)&&x.checks.length>0&&<ul className="ai-match-checks" aria-label={t('Tiêu chí','Criteria','条件')}>{x.checks.map((c:any)=><li key={c.key} data-state={c.state}><span aria-hidden="true">{c.state==='matched'?'✓':c.state==='unmatched'?'✕':'?'}</span> {(CHECK_LABELS[c.key]||[c.key,c.key,c.key])[language==='vi'?0:language==='en'?1:2]}<span className="sr-only"> {c.state==='matched'?t('khớp','matched','符合'):c.state==='unmatched'?t('không khớp','not matched','不符合'):t('chưa rõ','unknown','未知')}</span></li>)}</ul>}
    </li>})}</ul>}
   {results.length>0&&<p className="ai-match-confirm">{anyDraft&&t('Có mặt bằng nháp trong danh sách. ','Some listed properties are drafts. ','列表中含草稿物业。')}{t('Cần xác nhận ngân sách, điện và thời điểm bàn giao với từng mặt bằng.','Confirm budget, power and availability for each property.','需向每个物业确认预算、电力和交付时间。')}</p>}
  </section>})}</div>;
}

export function AssistantStats({stats}:{stats:any}){
 const {language,t}=useT();
 const statuses:{status:string;count:number}[]=Array.isArray(stats?.statuses)?stats.statuses:[],industries:{industry:string|null;count:number}[]=Array.isArray(stats?.industries)?stats.industries:[];
 if(!statuses.length&&!industries.length)return null;
 const table=(title:string,rows:[string,number][])=><table className="ai-stats-table"><caption>{title}</caption><thead><tr><th scope="col">{t('Nhóm','Group','分组')}</th><th scope="col" className="num">{t('Số lượng','Count','数量')}</th></tr></thead><tbody>{rows.map(([k,n])=><tr key={k}><th scope="row">{k}</th><td className="num">{n}</td></tr>)}</tbody></table>;
 return <div className="ai-stats">
  {statuses.length>0&&table(t('Theo trạng thái','By status','按状态'),statuses.map(r=>[optionText(r.status,language),r.count]))}
  {industries.length>0&&table(t('Theo ngành','By industry','按行业'),industries.map(r=>[r.industry||t('Chưa nêu','Not stated','未说明'),r.count]))}
 </div>;
}
