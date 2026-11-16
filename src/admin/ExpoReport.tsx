import {useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import ExcelJS from 'exceljs';
import {useApp,tr} from '../AppContext';
import {industryLabel} from '../industryLabels';
import {useAdminActions as useAdmin} from './AdminContext';
import {Access,AdminNotice,Message,useText} from './ui';
import {DataTable} from './components';
import {downloadWorkbook} from './workbooks';
import {mockExhibitors,trendDate} from './expoMock';
import {StatePanel} from '../EmptyStates';
export function createExpoWorkbook(input:{id:string;name:string;from:string;to:string;rows:[string,string|number][];exhibitors:{id:string;name:string;logo:string;status:string}[]}){const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('Expo Performance');ws.addRows([['Expo ID',input.id],['Expo',input.name],['From',input.from],['To',input.to],['Timezone','Asia/Ho_Chi_Minh'],['Source','VSIP demo — not connected to TradeXpo'],...input.rows]);ws.columns=[{width:40},{width:70}];const ex=wb.addWorksheet('Approved Exhibitors');ex.addRow(['ID','Name','Logo','Public approval status']);input.exhibitors.forEach(e=>ex.addRow([e.id,e.name,e.logo,e.status]));ex.columns.forEach(c=>c.width=28);return wb;}

const locale=(l:string)=>l==='vi'?'vi-VN':l==='zh'?'zh-CN':'en-GB';

export function ExpoReport(){
 const app=useApp(),a=useAdmin(),t=useText(),{id}=useParams(),expo=app.expos.find(e=>e.id===id),lang=app.language;
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
 // Empty range = whole event; managers narrow it only when they need to.
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[simulation,setSimulation]=useState('normal');
 const ref=useRef({can:a.can,simulation});ref.current={can:a.can,simulation};const exporting=useRef(false);
 if(!expo)return <StatePanel title={t('Không có báo cáo','Report unavailable','报告不可用')} text={t('Expo không tồn tại trong nguồn demo.','Expo does not exist in demo source.','演示数据源中不存在此展会。')}/>;
 const an=expo.analytics,year=an.updatedAt.slice(0,4);
 const valid=!from||!to||from<=to;
 const trend=an.trend.map(p=>({...p,iso:trendDate(p.date,year)})).filter(p=>valid&&(!from||p.iso>=from)&&(!to||p.iso<=to));
 const ranged=Boolean(from||to);
 const sum=(k:'requests'|'connections')=>trend.reduce((n,p)=>n+p[k],0);
 const enquiries=an.inboundRequests+an.outboundRequests,rate=an.activeConnections+an.completedConnections?Math.round(an.completedConnections/(an.activeConnections+an.completedConnections)*100):0;
 const n=(v:number)=>v.toLocaleString(lang);
 const usd=(v:number)=>v>=1_000_000?`$${(v/1_000_000).toLocaleString(lang,{maximumFractionDigits:1})}M`:`$${n(v)}`;
 const updated=new Date(an.updatedAt).toLocaleString(locale(lang),{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'});
 const exhibitors=mockExhibitors(expo.id);
 const kpis=[
  {label:t('Khách tham quan','Visitors','访客'),value:n(an.visitors)},
  {label:t('Nhu cầu phát sinh','Enquiries','需求'),value:n(enquiries),note:`${n(an.inboundRequests)} ${t('đến','inbound','入站')} · ${n(an.outboundRequests)} ${t('đi','outbound','出站')}`},
  {label:t('Kết nối đang xử lý','Active connections','进行中对接'),value:n(an.activeConnections)},
  {label:t('Kết nối thành công','Completed connections','成功对接'),value:n(an.completedConnections),note:`${rate}% ${t('tỷ lệ thành công','success rate','成功率')}`},
  {label:t('Giá trị giao dịch ước tính','Estimated deal value','预计交易额'),value:usd(an.estimatedDealValueUsd)},
  {label:t('Đơn vị · sản phẩm','Exhibitors · products','参展商 · 产品'),value:`${n(expo.exhibitors)} · ${n(an.products)}`},
 ];
 const rows:[string,string|number][]=[[t('Khách tham quan','Visitors','访客'),an.visitors],['Inbound',an.inboundRequests],['Outbound',an.outboundRequests],[t('Đang xử lý','In progress','处理中'),an.activeConnections],[t('Kết nối thành công','Successful connections','成功对接'),an.completedConnections],[t('Tỷ lệ thành công','Success rate','成功率'),`${rate}%`],[t('Giá trị ước tính (USD)','Estimated value (USD)','预计金额（美元）'),an.estimatedDealValueUsd],[t('Nhu cầu trong kỳ lọc','Enquiries in range','区间内需求'),sum('requests')],[t('Kết nối trong kỳ lọc','Connections in range','区间内对接'),sum('connections')],[t('Đơn vị tham gia','Exhibitors','参展商'),expo.exhibitors],[t('Sản phẩm','Products','产品'),an.products],[t('Cập nhật nguồn','Source updated','来源更新'),updated]];
 const exportFile=async()=>{if(exporting.current)return;if(!a.can('P18')||simulation==='revoked'){setMessage('permission');return;}exporting.current=true;setBusy(true);setMessage('');try{await new Promise(resolve=>setTimeout(resolve,350));if(!ref.current.can('P18')||ref.current.simulation==='revoked'){setMessage('permission');return}if(ref.current.simulation==='failure')throw new Error('demo');await downloadWorkbook(createExpoWorkbook({id:expo.id,name:tr(expo.title,lang),from:from||trend[0]?.iso||'',to:to||trend.at(-1)?.iso||'',rows,exhibitors:exhibitors.map(e=>({id:e.id,name:e.name,logo:'',status:e.status}))}),`VSIP-${expo.id}-${from||'all'}-${to||'all'}.xlsx`);setMessage('success')}catch{setMessage('validation')}finally{exporting.current=false;setBusy(false)}};
 const peak=Math.max(1,...trend.flatMap(p=>[p.requests,p.connections]));
 const topI=Math.max(1,...an.topIndustries.map(x=>x.requests)),topM=Math.max(1,...an.topMarkets.map(x=>x.connections));
 const statusLabel=({upcoming:t('Sắp diễn ra','Upcoming','即将举行'),live:t('Đang diễn ra','Live','进行中'),ended:t('Đã kết thúc','Ended','已结束')} as Record<string,string>)[expo.status]||expo.status;
 return <Access permission="P11"><div className="admin-page workflow-page expo-report">
  <Link className="editor-parent-link" to="/admin/expos">← {t('Danh sách Expo','Expo list','展会列表')}</Link>
  <div className="admin-title"><div><h1>{tr(expo.title,lang)}</h1><p className="expo-meta"><span className={`workflow-badge expo-${expo.status}`}>{statusLabel}</span>{new Date(expo.date).toLocaleDateString(locale(lang))} · {expo.market} · {t('Cập nhật','Updated','更新')} {updated}</p></div>{a.can('P18')&&<button className="button primary" disabled={busy||simulation==='revoked'} onClick={exportFile}>{busy?t('Đang tạo file…','Preparing file…','正在生成…'):t('Xuất báo cáo Excel','Export Excel report','导出Excel报告')}</button>}</div>
  <AdminNotice/><p className="admin-demo-notice">{t('Dữ liệu mô phỏng cho demo — chưa kết nối nguồn TradeXpo thật.','Simulated demo data — not yet connected to live TradeXpo data.','演示模拟数据——尚未连接TradeXpo真实数据。')}</p>
  <Message code={message}/>
  {simulation==='revoked'?<StatePanel kind="forbidden" title={t('Phạm vi báo cáo đã bị thu hồi','Report scope revoked','报告范围已撤销')} text={t('Không hiển thị hoặc xuất dữ liệu ngoài quyền.','Out-of-scope data cannot be displayed or exported.','不能显示或导出权限范围外的数据。')}/>:<>
  <section className="expo-kpis" aria-label={t('Chỉ số chính','Key metrics','关键指标')}>{kpis.map(k=><article key={k.label} className="overview-kpi"><span>{k.label}</span><strong>{k.value}</strong>{k.note&&<small>{k.note}</small>}</article>)}</section>
  <div className="overview-columns">
   <section className="admin-panel"><div className="overview-panel-heading"><h2>{t('Xu hướng theo ngày','Daily trend','每日趋势')}</h2><div className="expo-range"><label>{t('Từ ngày','From','开始日期')}<input type="date" value={from} max={today} onChange={e=>setFrom(e.target.value)}/></label><label>{t('Đến ngày','To','结束日期')}<input type="date" value={to} max={today} onChange={e=>setTo(e.target.value)}/></label>{ranged&&<button type="button" className="link-button" onClick={()=>{setFrom('');setTo('')}}>{t('Xem toàn bộ','Show all','显示全部')}</button>}</div></div>
    {!valid&&<p role="alert" className="admin-message error">{t('Ngày bắt đầu phải trước ngày kết thúc.','Start date must be before end date.','开始日期须早于结束日期。')}</p>}
    {trend.length?<><div className="expo-trend" role="img" aria-label={t('Biểu đồ nhu cầu và kết nối theo ngày','Daily enquiries and connections chart','每日需求与对接图')}>{trend.map(p=><div key={p.iso} className="expo-trend-day"><div className="expo-trend-bars"><i className="req" style={{height:`${p.requests/peak*100}%`}} title={`${p.requests}`}/><i className="con" style={{height:`${p.connections/peak*100}%`}} title={`${p.connections}`}/></div><small>{p.date}</small></div>)}</div>
    <p className="expo-legend"><span><i className="req"/>{t('Nhu cầu','Enquiries','需求')}: {n(sum('requests'))}</span><span><i className="con"/>{t('Kết nối','Connections','对接')}: {n(sum('connections'))}</span><span>{ranged?t('Trong khoảng đã chọn','In selected range','所选区间'):t('Toàn bộ dữ liệu','All data','全部数据')}</span></p></>:<p className="overview-empty">{t('Không có dữ liệu trong khoảng này.','No data in this range.','此区间无数据。')}</p>}
   </section>
   <section className="admin-panel"><h2>{t('Ngành nổi bật','Top industries','热门行业')}</h2><ul className="overview-bars">{an.topIndustries.map(x=><li key={x.industry}><span>{industryLabel(x.industry,lang)}</span><i style={{width:`${x.requests/topI*100}%`}}/><b>{x.requests}</b></li>)}</ul>
    <h2 className="expo-subhead">{t('Thị trường kết nối','Connection markets','对接市场')}</h2><ul className="overview-bars">{an.topMarkets.map(x=><li key={x.market}><span>{x.market}</span><i className="alt" style={{width:`${x.connections/topM*100}%`}}/><b>{x.connections}</b></li>)}</ul></section>
  </div>
  <section className="admin-panel table-scroll expo-exhibitors"><div className="overview-panel-heading"><h2>{t('Đơn vị đã duyệt','Approved exhibitors','已审核参展商')}</h2></div>{exhibitors.length?<DataTable className="workflow-table"><thead><tr><th>{t('Đơn vị','Exhibitor','参展商')}</th><th>{t('Quốc gia','Country','国家')}</th><th>{t('Ngành','Industry','行业')}</th><th>{t('Sản phẩm','Products','产品')}</th><th>{t('Nhu cầu nhận được','Enquiries received','收到需求')}</th></tr></thead><tbody>{exhibitors.map(e=><tr key={e.id}><td><b>{e.name}</b></td><td>{e.country}</td><td>{industryLabel(e.industry,lang)}</td><td>{e.products}</td><td>{e.enquiries}</td></tr>)}</tbody></DataTable>:<StatePanel title={t('Chưa có đơn vị','No exhibitors yet','暂无参展商')} text={t('Danh sách sẽ xuất hiện khi có đơn vị được duyệt.','Approved exhibitors will appear here.','审核通过的参展商将显示在此处。')}/>}</section>
  </>}
  <details className="import-more"><summary>{t('Kiểm tra trạng thái xuất (demo)','Export state preview (demo)','导出状态预览（演示）')}</summary><label>{t('Mô phỏng','Simulate','模拟')}<select value={simulation} onChange={e=>setSimulation(e.target.value)}><option value="normal">{t('Bình thường','Normal','正常')}</option><option value="failure">{t('Lỗi tạo file','Generation failure','生成失败')}</option><option value="revoked">{t('Thu hồi phạm vi nguồn','Source scope revoked','数据范围已撤销')}</option></select></label></details>
 </div></Access>;
}
