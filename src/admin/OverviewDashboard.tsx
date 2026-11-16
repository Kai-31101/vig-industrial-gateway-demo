import {useState,type FormEvent} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {Factory,Warehouse,Layers3,ClipboardList,Sparkles,ArrowRight,ArrowUpRight,X,Clock3,FileClock,FilePen} from 'lucide-react';
import {useApp,tr} from '../AppContext';
import {industryLabel} from '../industryLabels';
import {successfulConnection} from '../connectionLogic';
import {useAdminActions} from './AdminContext';
import {Access,useText} from './ui';
import {PageHeader,DataTable} from './components';
import {optionText} from './copy';
import {activeRequest,ageDays,areaM2,askAiLink,formatArea,needsResponse,withinDays} from './insights';
export {askAiLink};
import type {IndustrialParkProfile,IndustrialAsset} from '../types';
import {catalogueSplit} from '../publicationState';

type View='parks'|'assets'|'industries'|'requests';

export function OverviewDashboard(){
 const app=useApp(),a=useAdminActions(),t=useText(),lang=app.language,navigate=useNavigate();
 const [view,setView]=useState<View|null>(null),[industry,setIndustry]=useState(''),[state,setState]=useState(''),[query,setQuery]=useState('');
 const [range,setRange]=useState('all'),[from,setFrom]=useState(''),[to,setTo]=useState(''),[ask,setAsk]=useState('');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
 const start=range==='custom'?from:range==='all'?'':new Date(Date.now()-(Number(range)-1)*86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
 const finish=range==='custom'?to:today;
 const valid=range!=='custom'||Boolean(from&&to&&from<=to&&to<=today);
 const canCatalogue=a.can('P01'),canRequests=a.can('P09');
 const parks=canCatalogue?a.store.drafts.filter(d=>d.kind==='park'):[];
 const assets=canCatalogue?a.store.drafts.filter(d=>d.kind==='asset'):[];
 const industries=[...new Set(parks.flatMap(d=>(d.data as IndustrialParkProfile).suitableIndustries).concat(assets.flatMap(d=>(d.data as IndustrialAsset).industries)))].sort((x,y)=>industryLabel(x,lang).localeCompare(industryLabel(y,lang)));
 const leasing=app.requests.filter(r=>r.kind==='find_supply');
 const requests=valid?leasing.filter(r=>{const day=new Date(r.submittedAt).toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});return (!start||day>=start)&&day<=finish}):[];
 const belongs=(d:typeof parks[number],key:string)=>!key||(d.kind==='park'?(d.data as IndustrialParkProfile).suitableIndustries:(d.data as IndustrialAsset).industries).includes(key);
 const searchable=(text:string)=>text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 const catalogue=(view==='assets'?assets:parks).filter(d=>(!state||d.state===state)&&belongs(d,industry)&&searchable(tr(d.data.name,lang)+' '+d.id));
 const requestRows=requests.filter(r=>(!industry||r.industry===industry)&&(!state||(state==='active'?activeRequest(r):state==='success'?successfulConnection(r):r.status===state))&&searchable(r.organization+' '+r.id+' '+r.contactName));
 const titles={parks:t('Khu công nghiệp','Industrial parks','工业园区'),assets:t('Mặt bằng','Assets','物业'),industries:t('Lĩnh vực','Industries','行业'),requests:t('Nhu cầu thuê','Leasing enquiries','租赁需求')};
 const choose=(next:View)=>{setView(next);setState('');setIndustry('');setQuery('');requestAnimationFrame(()=>document.getElementById('overview-details')?.scrollIntoView?.({block:'start',behavior:'smooth'}))};
 const unnamed=t('Chưa đặt tên','Untitled','未命名');

 // Decision KPIs
 const newThisWeek=leasing.filter(r=>withinDays(r.submittedAt,0,7)).length,newLastWeek=leasing.filter(r=>withinDays(r.submittedAt,7,14)).length,delta=newThisWeek-newLastWeek;
 const active=leasing.filter(activeRequest),waiting=leasing.filter(needsResponse),closed=leasing.filter(r=>r.status==='closed'),success=leasing.filter(successfulConnection);
 const split=catalogueSplit([...parks,...assets]);
 const livePublished=assets.filter(d=>split.live.assets.has(d.id));
 const readyArea=livePublished.reduce((sum,d)=>sum+areaM2(d.data as IndustrialAsset),0);
 const kpis=[
  {label:t('Nhu cầu mới (7 ngày)','New enquiries (7 days)','新需求（7天）'),value:newThisWeek.toLocaleString(lang),note:delta===0?t('Bằng tuần trước','Same as last week','与上周持平'):`${delta>0?'+':''}${delta} ${t('so với tuần trước','vs last week','较上周')}`,tone:delta>0?'up':delta<0?'down':'',to:'/admin/requests',show:canRequests},
  {label:t('Đang xử lý','In progress','处理中'),value:active.length.toLocaleString(lang),note:waiting.length?`${waiting.length} ${t('cần phản hồi','need a response','待回复')}`:t('Không có yêu cầu chờ','Nothing waiting','无待处理'),tone:waiting.length?'warn':'',to:'/admin/requests',show:canRequests},
  {label:t('Kết nối thành công','Successful connections','成功对接'),value:closed.length?`${Math.round(success.length/closed.length*100)}%`:'—',note:closed.length?`${success.length}/${closed.length} ${t('yêu cầu đã đóng','closed enquiries','已关闭需求')}`:t('Chưa có yêu cầu đóng','No closed enquiries yet','暂无已关闭需求'),tone:'',to:'/admin/requests',show:canRequests},
  {label:t('Diện tích sẵn sàng','Available area','可租面积'),value:formatArea(readyArea,lang),note:`${livePublished.length} ${t('mặt bằng công bố','published assets','已发布物业')} · ${split.summary.assets.draft} ${t('nháp','draft','草稿')}`,tone:'',to:'/admin/assets',show:canCatalogue},
 ].filter(k=>k.show);

 // Work queue: oldest and most urgent first, five at a time.
 type Todo={id:string;to:string;title:string;meta:string;kind:'request'|'review'|'draft';urgent?:boolean};
 const todos:Todo[]=[
  ...(canRequests?waiting.sort((x,y)=>Date.parse(x.submittedAt)-Date.parse(y.submittedAt)).map(r=>{const days=ageDays(r.submittedAt);return {id:r.id,to:`/admin/requests/${r.id}`,title:r.organization||unnamed,meta:[optionText(r.status,lang),r.assignedTo?'':t('Chưa phân công','Unassigned','未分配'),days?`${days} ${t('ngày','days','天')}`:t('Hôm nay','Today','今天')].filter(Boolean).join(' · '),kind:'request' as const,urgent:!r.assignedTo||days>=1}}):[]),
  ...[...parks,...assets].filter(d=>d.state==='in_review').map(d=>({id:d.id,to:`/admin/${d.kind==='park'?'industrial-parks':'assets'}/${d.id}/edit`,title:tr(d.data.name,lang)||unnamed,meta:`${t('Chờ duyệt','Awaiting review','待审核')} · ${d.kind==='park'?titles.parks:titles.assets}`,kind:'review' as const})),
  ...[...parks,...assets].filter(d=>d.state==='draft').map(d=>({id:d.id,to:`/admin/${d.kind==='park'?'industrial-parks':'assets'}/${d.id}/edit`,title:tr(d.data.name,lang)||unnamed,meta:`${t('Bản nháp chưa công bố','Unpublished draft','未发布草稿')} · ${d.kind==='park'?titles.parks:titles.assets}`,kind:'draft' as const})),
 ];
 const todoIcon={request:Clock3,review:FileClock,draft:FilePen};

 // AI brief: three plain-language lines built from the same numbers the manager sees.
 const unassigned=waiting.filter(r=>!r.assignedTo).length;
 const brief=[
  canRequests&&(waiting.length?`${waiting.length} ${t('nhu cầu đang chờ phản hồi','enquiries are waiting for a response','条需求待回复')}${unassigned?`, ${unassigned} ${t('chưa có người phụ trách','have no owner','条尚未分配负责人')}`:''}.`:t('Không có nhu cầu nào đang chờ phản hồi.','No enquiries are waiting for a response.','暂无待回复需求。')),
  canCatalogue&&`${t('Công bố','Published','已发布')}: ${split.summary.parks.published} ${t('KCN','parks','个园区')}, ${split.summary.assets.published} ${t('mặt bằng','assets','个物业')} (${formatArea(readyArea,lang)}). ${t('Nháp','Draft','草稿')}: ${split.summary.parks.draft} ${t('KCN','parks','个园区')}, ${split.summary.assets.draft} ${t('mặt bằng','assets','个物业')}${split.summary.assets.hiddenByDraftPark?` (${split.summary.assets.hiddenByDraftPark} ${t('ẩn vì KCN chưa công bố','hidden because their park is unpublished','因园区未发布而隐藏')})`:''}.`,
  canRequests&&active.length>0&&t('Hỏi AI để xem mặt bằng phù hợp nhất cho từng nhu cầu đang mở.','Ask AI which properties best fit each open enquiry.','询问AI每条在办需求的最佳物业。'),
 ].filter(Boolean) as string[];
 const prompts=[
  {label:t('Tổng hợp nhu cầu mới và tiến độ','Summarise new enquiries and progress','汇总新需求和进度'),hint:'statistics' as const},
  {label:t('Matching khách hàng với mặt bằng phù hợp','Match customers to suitable properties','为客户匹配合适物业'),hint:'match' as const},
  {label:t('Yêu cầu nào còn thiếu thông tin?','Which enquiries need more information?','哪些需求缺少信息？'),hint:'statistics' as const},
 ];
 const submitAsk=(e:FormEvent)=>{e.preventDefault();if(ask.trim())navigate(askAiLink(ask.trim()))};

 // Demand by industry (selected date range)
 const byIndustry=Object.entries(requests.reduce<Record<string,number>>((acc,r)=>{const key=r.industry||'';acc[key]=(acc[key]||0)+1;return acc},{})).sort((x,y)=>y[1]-x[1]).slice(0,5);
 const peak=Math.max(1,...byIndustry.map(([,n])=>n));
 const counts:[View,number,typeof Factory][]=([['parks',parks.length,Factory],['assets',assets.length,Warehouse],['industries',industries.length,Layers3],['requests',requests.length,ClipboardList]] as [View,number,typeof Factory][]).filter(([key])=>key==='requests'||canCatalogue);

 return <Access permission="P11"><div className="admin-page workflow-page overview-dashboard">
  <PageHeader title={t('Tổng quan','Overview','概览')} actions={canRequests&&<Link className="button primary" to="/admin/requests">{t('Xử lý nhu cầu thuê','Process enquiries','处理租赁需求')}</Link>}/>

  <section className="overview-ai" aria-label={t('AI tóm tắt hôm nay','Today’s AI brief','今日AI摘要')}>
   <div className="overview-ai-brief"><h2><Sparkles size={18}/>{t('AI tóm tắt hôm nay','Today’s AI brief','今日AI摘要')}</h2><ul>{brief.map(line=><li key={line}>{line}</li>)}</ul></div>
   <div className="overview-ai-ask"><form onSubmit={submitAsk}><input value={ask} onChange={e=>setAsk(e.target.value)} placeholder={t('Hỏi AI về nhu cầu, mặt bằng, khách hàng…','Ask AI about enquiries, properties, customers…','向AI询问需求、物业、客户…')} aria-label={t('Câu hỏi cho AI','Question for AI','向AI提问')}/><button className="button primary" disabled={!ask.trim()}><Sparkles size={16}/>{t('Hỏi AI','Ask AI','询问AI')}</button></form><div className="overview-ai-prompts">{prompts.map(p=><Link key={p.label} to={askAiLink(p.label,p.hint)}>{p.label}<ArrowUpRight size={14}/></Link>)}</div></div>
  </section>

  <section className="overview-kpis" aria-label={t('Chỉ số chính','Key metrics','关键指标')}>{kpis.map(k=><Link key={k.label} to={k.to} className="overview-kpi"><span>{k.label}</span><strong>{k.value}</strong><small className={k.tone}>{k.note}</small></Link>)}</section>

  <div className="overview-columns">
   <section className="admin-panel overview-todo"><div className="overview-panel-heading"><h2>{t('Việc cần làm','To do','待办事项')}</h2>{todos.length>0&&<span className="overview-count">{todos.length}</span>}</div>
    {todos.length?<ul>{todos.slice(0,5).map(item=>{const Icon=todoIcon[item.kind];return <li key={item.kind+item.id} className={item.urgent?'urgent':''}><Link to={item.to}><Icon size={18}/><span><b>{item.title}</b><small>{item.meta}</small></span><ArrowRight size={16}/></Link></li>})}</ul>:<p className="overview-empty">{t('Không có việc tồn đọng.','Nothing outstanding.','暂无待办。')}</p>}
    {todos.length>5&&<p className="overview-more">+{todos.length-5} {t('việc khác','more items','项其他')}</p>}
   </section>
   <section className="admin-panel overview-demand"><div className="overview-panel-heading"><h2>{t('Nhu cầu theo ngành','Demand by industry','按行业需求')}</h2><label className="overview-range">{t('Khoảng thời gian','Date range','时间范围')}<select value={range} onChange={e=>setRange(e.target.value)}><option value="all">{t('Tất cả thời gian','All time','全部时间')}</option><option value="365">{t('12 tháng gần đây','Last 12 months','近12个月')}</option><option value="90">{t('90 ngày gần đây','Last 90 days','近90天')}</option><option value="custom">{t('Tùy chọn','Custom','自定义')}</option></select></label></div>
    {range==='custom'&&<div className="overview-date-controls"><label>{t('Từ ngày','From','开始日期')}<input type="date" value={from} max={today} onChange={e=>setFrom(e.target.value)}/></label><label>{t('Đến ngày','To','结束日期')}<input type="date" value={to} max={today} onChange={e=>setTo(e.target.value)}/></label></div>}
    {!valid&&<p role="alert" className="admin-message error">{t('Chọn khoảng ngày hợp lệ, không vượt quá hôm nay.','Choose a valid date range ending no later than today.','请选择有效日期范围，结束日期不得晚于今天。')}</p>}
    {byIndustry.length?<ul className="overview-bars">{byIndustry.map(([key,n])=><li key={key}><span>{key?industryLabel(key,lang):t('Chưa xác định','Not specified','未指定')}</span><i style={{width:`${n/peak*100}%`}}/><b>{n}</b></li>)}</ul>:<p className="overview-empty">{t('Chưa có nhu cầu trong khoảng thời gian này.','No enquiries in this period.','此期间暂无需求。')}</p>}
    <div className="overview-request-stats">{[['',t('Tất cả','All','全部')],['active',t('Đang xử lý','In progress','处理中')],['success',t('Thành công','Successful','成功')]].map(([key,label])=><button key={key} aria-pressed={view==='requests'&&state===key} onClick={()=>{choose('requests');setState(key)}}><strong>{requests.filter(r=>!key||(key==='active'?activeRequest(r):successfulConnection(r))).length}</strong><span>{label}</span></button>)}</div>
   </section>
  </div>

  <section className="admin-panel overview-catalogue"><div className="overview-panel-heading"><h2>{t('Danh mục','Catalogue','目录')}</h2><small>{t('Chọn để xem chi tiết','Select to explore','选择查看详情')}</small></div>
   <div className="overview-cards" role="region" aria-label={t('Chọn danh sách','Select catalogue','选择列表')}>{counts.map(([key,count,Icon])=><button key={key} className={'overview-card '+(view===key?'active':'')} aria-pressed={view===key} onClick={()=>view===key?setView(null):choose(key)}><Icon size={18}/><span>{titles[key]}</span><strong>{count.toLocaleString(lang)}</strong></button>)}</div>
   {canCatalogue&&<div className="overview-status">{(['parks','assets'] as const).map(key=>{const rows=key==='parks'?parks:assets;const states=['published','in_review','draft','approved'].map(s=>[s,rows.filter(d=>d.state===s).length] as const).filter(([,n])=>n>0);return <div className="overview-status-row" key={key}><b>{titles[key]}</b>{states.map(([s,n])=><button key={s} aria-pressed={view===key&&state===s} onClick={()=>{choose(key);setState(s)}}><span>{optionText(s,lang)}</span><strong>{n}</strong></button>)}</div>})}</div>}
  </section>

  {view&&<section id="overview-details" className="admin-panel overview-details"><div className="overview-detail-heading"><h2>{titles[view]}{state?` — ${state==='active'?t('Đang xử lý','In progress','处理中'):state==='success'?t('Thành công','Successful','成功'):optionText(state,lang)}`:''}</h2><div className="admin-actions"><button className="button" onClick={()=>{setQuery('');setIndustry('');setState('')}}>{t('Xóa bộ lọc','Clear filters','清除筛选')}</button><button className="button icon" onClick={()=>setView(null)} aria-label={t('Thu gọn','Collapse','收起')}><X size={18}/></button></div></div>
  <div className="admin-filter"><label>{t('Tìm kiếm','Search','搜索')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Tên hoặc mã hồ sơ','Name or record ID','名称或档案编号')}/></label>{view!=='industries'&&<label>{titles.industries}<select value={industry} onChange={e=>setIndustry(e.target.value)}><option value="">{t('Tất cả lĩnh vực','All industries','所有行业')}</option>{[...new Set([...industries,...requests.map(r=>r.industry).filter(Boolean)])].map(i=><option key={i} value={i}>{industryLabel(i,lang)}</option>)}</select></label>}</div>
  {view==='industries'?<div className="overview-industry-list">{industries.filter(i=>searchable(industryLabel(i,lang))).map(i=>{const pc=parks.filter(d=>belongs(d,i)).length,ac=assets.filter(d=>belongs(d,i)).length;return <article key={i}><h3>{industryLabel(i,lang)}</h3><div className="admin-actions"><button className="button" onClick={()=>{choose('parks');setIndustry(i)}}>{pc} {titles.parks}</button><button className="button" onClick={()=>{choose('assets');setIndustry(i)}}>{ac} {titles.assets}</button></div></article>})}</div>:<div className="table-scroll"><DataTable><thead><tr>{(view==='requests'?[t('Khách hàng','Customer','客户'),titles.industries,t('Diện tích','Area','面积'),t('Trạng thái','Status','状态'),t('Ngày gửi','Submitted','提交日期')]:[t('Tên hồ sơ','Record name','档案名称'),view==='parks'?t('Tỉnh / thành','Province','省市'):titles.parks,t('Diện tích','Area','面积'),t('Trạng thái','Status','状态'),view==='parks'?titles.assets:t('Loại mặt bằng','Asset type','物业类型')]).map((label,i)=><th key={i}>{label}</th>)}</tr></thead><tbody>{view==='requests'?requestRows.map(r=><tr key={r.id}><td>{canRequests?<Link to={`/admin/requests/${r.id}`}>{r.organization||unnamed}</Link>:r.organization||unnamed}<small>{r.id}</small></td><td>{industryLabel(r.industry,lang)}</td><td>{r.areaMin.toLocaleString(lang)}–{r.areaMax.toLocaleString(lang)} m²</td><td><span className="workflow-badge">{optionText(r.status,lang)}</span></td><td>{new Date(r.submittedAt).toLocaleDateString(lang)}</td></tr>):catalogue.map(d=>{const park=d.data as IndustrialParkProfile,asset=d.data as IndustrialAsset;return <tr key={d.id}><td><Link to={`/admin/${d.kind==='park'?'industrial-parks':'assets'}/${d.id}/edit`}>{tr(d.data.name,lang)||unnamed}</Link></td><td>{d.kind==='park'?park.province:tr(parks.find(p=>p.id===asset.parkId)?.data.name||{vi:'',en:'',zh:''},lang)||'—'}</td><td>{d.kind==='park'?(park.totalArea.value==null?'—':`${park.totalArea.value.toLocaleString(lang)} ${park.totalArea.unit||''}`):(asset.area==null?'—':`${asset.area.toLocaleString(lang)} ${asset.unit||'m²'}`)}</td><td><span className={`workflow-badge state-${d.state}`}>{optionText(d.state,lang)}</span></td><td>{d.kind==='park'?assets.filter(a=>(a.data as IndustrialAsset).parkId===d.id).length:optionText(asset.type,lang)}</td></tr>})}</tbody></DataTable>{!(view==='requests'?requestRows.length:catalogue.length)&&<p className="overview-empty">{t('Không có hồ sơ phù hợp bộ lọc.','No records match these filters.','没有符合筛选条件的记录。')}</p>}</div>}
  </section>}
 </div></Access>;
}
