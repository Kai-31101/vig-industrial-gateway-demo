// Park-scoped portal pages. Every action is authorised again by the server; the UI only reflects capabilities.
import {useEffect,useState,type ReactNode} from 'react';
import {useParams} from 'react-router-dom';
import {papi,PortalError,errText,ISSUE} from './api';
import {usePortal,useLoad,PLink,CapDenied,Denied,Loading,fmt,type ParkCtx} from './shell';
import {fieldsFor,optionLabel,ASSET_TYPES,TRANSACTIONS,LEASING_STATUS,type FieldDef} from './fields';
import {CAP_GROUPS,CAP_LABEL,withDependencies,withoutDependents,type GrantableCap} from './capabilities';

type P={ctx:ParkCtx};
const can=(ctx:ParkCtx,c:string)=>ctx.role.caps.includes(c);
const STATE_VI:Record<string,string>={in_review:'Chờ duyệt',approved:'Đã duyệt · chờ xuất bản',rejected:'Bị từ chối',withdrawn:'Đã rút lại',published:'Đã xuất bản',superseded:'Đã thay thế'};
const stateClass=(s:string)=>({in_review:'review',approved:'approved',published:'pub',rejected:'rejected'} as Record<string,string>)[s]||'';
function Head({crumb,title,sub,right}:{crumb:ReactNode;title:ReactNode;sub?:ReactNode;right?:ReactNode}){return <div className="page-head"><div><div className="crumb">{crumb}</div><h1>{title}</h1>{sub&&<p>{sub}</p>}</div>{right}</div>}
function Fail({ctx,error,cap}:{ctx:ParkCtx;error:PortalError;cap?:string}){if(error.status===403)return <CapDenied ctx={ctx} cap={cap?CAP_LABEL[cap]||cap:'—'}/>;if(error.status===404)return <Denied/>;return <p className="notice danger" role="alert">{errText(error)}</p>}

// ---------- overview ----------
export function Overview({ctx}:P){
 const {data,error}=useLoad<any>(`portal/parks/${ctx.park.id}/overview`,[ctx.park.id]);
 if(error)return <Fail ctx={ctx} error={error} cap="park.view"/>;if(!data)return <Loading/>;
 const base=`/portal/${ctx.park.id}`;const tasks:[number,string,string,string][]=[];
 if(ctx.role.isOwner){tasks.push([data.counts.in_review,'Bản đề xuất chờ bạn duyệt','Duyệt hoặc từ chối (cần lý do).',`${base}/reviews`]);tasks.push([data.counts.approved,'Đã duyệt, chờ xuất bản',ctx.decisions.parkHidden?'Xuất bản là bước riêng. KCN đang ẩn: nội dung xuất bản chưa hiển thị công khai cho đến khi công khai lại.':'Xuất bản là bước riêng; công khai ngay khi bạn bấm.',`${base}/reviews`])}
 if(can(ctx,'revision.submit')){tasks.push([data.counts.myDrafts,'Bản nháp của bạn chưa gửi duyệt','Bản nháp không ảnh hưởng trang công khai.',`${base}/properties`]);tasks.push([data.counts.my_rejected,'Bản bị từ chối cần chỉnh sửa','Xem lý do và gửi lại.',`${base}/reviews`])}
 return <><Head crumb="Tổng quan" title={ctx.park.name} sub={<>Vai trò của bạn: <b>{ctx.role.name}</b>{ctx.role.isOwner&&' · do quản trị nền tảng chỉ định'}</>}/>
  <div className="grid-main"><div className="stack">
   <section className="panel"><div className="panel-head"><h2>Việc cần làm</h2></div><div className="panel-body">{tasks.length?tasks.map(([n,t,s,h])=><div className="task" key={t}><span className="n">{n}</span><span className="t"><b>{t}</b><small>{s}</small></span><PLink className="btn sm" to={h}>Mở</PLink></div>):<p className="muted">Vai trò hiện tại chỉ xem nội dung. Không có việc cần xử lý.</p>}</div></section>
   {can(ctx,'activity.view')&&<section className="panel"><div className="panel-head"><h2>Hoạt động gần đây</h2><PLink className="btn sm ghost" to={`${base}/activity`}>Xem tất cả</PLink></div><div className="panel-body">{data.recent.length?data.recent.map((a:any,i:number)=><div className="task" key={i}><span className="t"><b>{a.action}{a.entity&&` · ${a.entity}`}</b><small>{a.actor} ({a.role}) · {fmt(a.at)}{a.version&&` · ${a.version}`}</small></span></div>):<p className="muted">Chưa có hoạt động.</p>}</div></section>}
  </div>
  <aside className="stack"><section className="panel"><div className="panel-head"><h2>Trạng thái công khai</h2></div><div className="panel-body"><dl className="ro-list"><dt>Hồ sơ KCN</dt><dd>{ctx.decisions.parkHidden?<><span className="badge approved">Đã xuất bản v{data.profileVersion}</span> <span className="badge suspended">Đang ẩn khỏi trang công khai</span></>:<span className="badge pub">Đang công khai v{data.profileVersion}</span>}</dd><dt>Mặt bằng</dt><dd>{data.assets.publicVisible} đang hiển thị công khai · {data.assets.published} đã xuất bản · {data.assets.total} trong cổng</dd><dt>Đề xuất đang mở</dt><dd>{data.counts.in_review+data.counts.approved}</dd></dl><p className="light" style={{margin:'12px 0 0',fontSize:12}}>Trang công khai chỉ hiển thị bản đã xuất bản. Bản nháp, chờ duyệt hay đã duyệt không làm thay đổi trang công khai.</p></div></section></aside></div></>;
}

// ---------- shared entity editor ----------
/** Published-version lifecycle and actual public visibility are shown separately (hidden park => children hidden). */
function statusBadges(e:any,parkHidden=false,isPark=false){const pub=e.publishedVersion>0&&!e.isNew;return <>{e.archived?<span className="badge">Đã lưu trữ</span>:pub?(parkHidden?<><span className="badge approved">Đã xuất bản v{e.publishedVersion}</span><span className="badge suspended">{isPark?'Đang ẩn khỏi trang công khai':'Đang ẩn theo KCN'}</span></>:<span className="badge pub">Công khai v{e.publishedVersion}</span>):<span className="badge">Chưa xuất bản</span>}
 {e.openRevision?<span className={'badge '+stateClass(e.openRevision.state)}>{STATE_VI[e.openRevision.state]} · {e.openRevision.id}</span>:e.draft||e.hasDraft?<span className="badge draft">Bản nháp</span>:null}</>}
function FieldInput({f,value,disabled,changed,error,onChange,images}:{f:FieldDef;value:string;disabled:boolean;changed:boolean;error?:string;onChange:(v:string)=>void;images?:string[]}){
 const id='f-'+f.key.replace(/\W/g,'-');
 let input:ReactNode;
 if(f.kind==='textarea')input=<textarea id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} aria-invalid={!!error}/>;
 else if(f.kind==='select')input=<select id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>{!f.options!.some(o=>o[0]===value)&&<option value={value}>{value||'—'}</option>}{f.options!.map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>;
 else if(f.kind==='image')input=<select id={id} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">— Chọn ảnh đã duyệt —</option>{value&&!images?.includes(value)&&<option value={value}>{value}</option>}{(images||[]).map(u=><option key={u} value={u}>{u.split('/').pop()}</option>)}</select>;
 else input=<input id={id} type={f.kind==='number'?'text':f.kind==='date'?'date':f.kind==='email'?'email':'text'} inputMode={f.kind==='number'?'decimal':undefined} value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} aria-invalid={!!error}/>;
 return <div className={'field'+(changed?' changed':'')}><label htmlFor={id}><span>{f.label}{f.required?' *':''}</span></label>{input}{f.kind==='image'&&value&&<img className="photo" src={value} alt="" style={{marginTop:6,maxHeight:120,objectFit:'cover'}}/>}{error&&<small className="field-error" role="alert">{ISSUE[error]||({required:'Bắt buộc',positive:'Cần số dương',selection:'Lựa chọn không hợp lệ',date:'Ngày không hợp lệ',email:'Email không hợp lệ',phone:'Số điện thoại không hợp lệ',length:'Quá dài',image:'Chỉ chọn ảnh đã duyệt của KCN',unknown:'Trường không được phép'} as Record<string,string>)[error]||error}</small>}</div>;
}
function EntityEditor({ctx,kind,entity,images,onChange}:{ctx:ParkCtx;kind:'park'|'asset';entity:any|null;images?:string[];onChange:(next?:{id:string})=>void}){
 const {setDirty,toast,go,modal}=usePortal();const fields=fieldsFor(kind);const creating=!entity;
 const working:Record<string,string>=entity?.working||(kind==='asset'?{type:'ready_built_factory',unit:'m²',transaction:'lease','pricing.mode':'not_available','pricing.currency':'USD','pricing.areaBasis':'m²','pricing.period':'month'}:{});
 const [vals,setVals]=useState<Record<string,string>>(working);const [errors,setErrors]=useState<Record<string,string>>({});const [busy,setBusy]=useState(false);
 useEffect(()=>{setVals(working);setErrors({})},[JSON.stringify(working),entity?.draft?.revision]);
 const changedKeys=fields.map(f=>f.key).filter(k=>(vals[k]??'')!==(working[k]??''));const dirty=changedKeys.length>0;
 useEffect(()=>{setDirty(dirty);return()=>setDirty(false)},[dirty]);
 const locked=!!entity?.openRevision;const archived=!!entity?.archived;
 const editCap=kind==='park'?'profile.edit':creating?'property.create':'property.edit';const editable=can(ctx,editCap)&&!locked&&!archived;
 const base=`portal/parks/${ctx.park.id}`;
 const save=async(quiet=false)=>{if(!dirty)return {id:entity?.id,revision:entity?.draft?.revision||0};const patch=Object.fromEntries(changedKeys.map(k=>[k,vals[k]??'']));
  const r=await papi<{id:string;revision:number}>(`${base}/drafts`,{kind,id:kind==='park'?undefined:entity?.id,revision:entity?.draft?.revision||0,patch});setDirty(false);if(!quiet)toast('Đã lưu nháp. Trang công khai không đổi.');return r};
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setErrors({});try{await fn()}catch(e){if(e instanceof PortalError&&e.fields)setErrors(e.fields);toast(e instanceof PortalError&&e.code==='publication'?'Chưa đủ điều kiện công khai: '+Object.keys(e.fields||{}).map(k=>ISSUE[k]||k).join('; '):errText(e))}finally{setBusy(false)}};
 const onSave=()=>run(async()=>{const r=await save();if(creating)go(`/portal/${ctx.park.id}/properties/${r.id}/edit`);else onChange()});
 const onSubmit=()=>run(async()=>{const r=await save(true);const s=await papi<{id:string;changeType:string}>(`${base}/revisions`,{kind,id:kind==='park'?undefined:r.id,revision:r.revision});toast(`Đã gửi duyệt ${s.id}.`);if(creating)go(`/portal/${ctx.park.id}/properties/${r.id}/edit`);else onChange()});
 const onDiscard=()=>modal({title:entity?.isNew?'Huỷ bản nháp chưa xuất bản?':'Bỏ bản nháp?',body:<p className="muted">{entity?.isNew?'Mặt bằng chưa từng công khai sẽ bị xoá khỏi cổng.':'Bản nháp sẽ bị xoá; bản công khai giữ nguyên.'}</p>,actions:[{label:'Giữ lại',onClick:()=>modal(null)},{label:'Xác nhận',kind:'danger',onClick:()=>{modal(null);run(async()=>{await papi(`${base}/drafts/discard`,{kind,id:entity.id,revision:entity.draft.revision});setDirty(false);toast('Đã bỏ bản nháp.');if(entity.isNew)go(`/portal/${ctx.park.id}/properties`);else onChange()})}}]});
 const onWithdraw=()=>run(async()=>{const r=await papi<any>(`${base}/revisions/${entity.openRevision.id}/withdraw`,{});toast(r.approvalInvalidated?'Đã rút lại: kết quả duyệt bị huỷ, cần gửi duyệt lại.':'Đã rút lại. Bản đề xuất trở thành bản nháp.');onChange()});
 const groups=[...new Set(fields.map(f=>f.group))];
 return <section className="panel"><div className="panel-body">
  {!can(ctx,editCap)&&<div className="notice" style={{marginBottom:12}}>Vai trò hiện tại chỉ xem (cần quyền "{CAP_LABEL[editCap]}").</div>}
  {locked&&<div className="notice warn" style={{marginBottom:12}}>Đang khoá trong <PLink to={`/portal/${ctx.park.id}/reviews/${entity.openRevision.id}`}>{entity.openRevision.id} · {STATE_VI[entity.openRevision.state]}</PLink>.</div>}
  {archived&&<div className="notice" style={{marginBottom:12}}>Mặt bằng đã lưu trữ: không hiển thị công khai, vẫn giữ trong cổng.</div>}
  {entity?.draft?.rejectionReason&&<div className="notice danger" style={{marginBottom:12}}><b>Lý do từ chối:</b> {entity.draft.rejectionReason}</div>}
  <p id="dirty-flag" className="muted" style={{marginTop:0,color:dirty?'var(--action-strong)':undefined}}>{dirty?'● Có thay đổi chưa lưu':editable?'Chỉnh sửa được lưu thành bản nháp; trang công khai không đổi.':'Chế độ xem.'}</p>
  <form onSubmit={e=>{e.preventDefault();onSave()}}>
   {groups.map(g=><fieldset key={g} className="fieldset"><legend>{g}</legend>{fields.filter(f=>f.group===g).map(f=><FieldInput key={f.key} f={f} value={vals[f.key]??''} images={images} disabled={!editable||busy} changed={!!entity?.published&&(vals[f.key]??'')!==(entity.published[f.key]??'')} error={errors[f.key]} onChange={v=>setVals(x=>({...x,[f.key]:v}))}/>)}</fieldset>)}
   {editable&&<div className="state-cells form-actions"><button type="submit" className="btn" disabled={busy||!dirty}>Lưu nháp</button>{can(ctx,'revision.submit')?<button type="button" className="btn primary" disabled={busy||(!dirty&&!entity?.draft)} onClick={onSubmit}>Gửi duyệt</button>:<button type="button" className="btn" disabled title={'Cần quyền: '+CAP_LABEL['revision.submit']}>Gửi duyệt</button>}{entity?.draft&&<button type="button" className={'btn '+(entity.isNew?'danger':'ghost')} disabled={busy} onClick={onDiscard}>{entity.isNew?'Huỷ bản nháp (chưa xuất bản)':'Bỏ bản nháp'}</button>}</div>}
  </form>
  {locked&&entity.openRevision.authorId&&<WithdrawButton entity={entity} onWithdraw={onWithdraw} busy={busy} ctx={ctx}/>}
 </div></section>;
}
function WithdrawButton({entity,onWithdraw,busy}:{entity:any;onWithdraw:()=>void;busy:boolean;ctx:ParkCtx}){const {me}=usePortal();if(entity.openRevision.authorId!==me?.user.id)return null;return <button className="btn" disabled={busy} onClick={onWithdraw}>{entity.openRevision.state==='approved'?'Rút lại để sửa (huỷ duyệt)':'Rút lại để chỉnh sửa'}</button>}

export function Profile({ctx}:P){
 const {data,error,reload}=useLoad<any>(`portal/parks/${ctx.park.id}/profile`,[ctx.park.id]);
 if(error)return <Fail ctx={ctx} error={error} cap="park.view"/>;if(!data)return <Loading/>;const e=data.entity;
 return <>{e.hidden&&<div className="notice warn" style={{marginBottom:14}}><b>KCN đang ẩn khỏi trang công khai.</b> Hồ sơ và mọi mặt bằng không hiển thị công khai cho đến khi Chủ sở hữu công khai lại. Mặt bằng đã lưu trữ riêng vẫn giữ trạng thái lưu trữ.</div>}
  <Head crumb="Hồ sơ KCN" title="Hồ sơ khu công nghiệp" sub="Bản công khai và bản nháp được tách riêng. Thay đổi chỉ hiển thị công khai sau khi Chủ sở hữu duyệt và xuất bản." right={<div className="state-cells">{statusBadges(e,!!e.hidden,true)}</div>}/>
  <div className="grid-2"><section className="panel"><div className="panel-head"><h2>{e.hidden?'Bản đã xuất bản':'Đang công khai'} · v{e.publishedVersion}</h2>{e.hidden?<span className="badge suspended">Đang ẩn</span>:<span className="badge pub">Công khai</span>}</div><div className="panel-body"><dl className="ro-list">{fieldsFor('park').map(f=><FragmentRO key={f.key} f={f} v={e.published?.[f.key]}/>)}</dl></div></section>
  <div><h2 className="section-title">{e.openRevision?'Bản đề xuất (đang khoá)':'Bản nháp làm việc'}</h2><EntityEditor ctx={ctx} kind="park" entity={e} onChange={reload}/></div></div>
  {ctx.role.isOwner&&e.published&&<ParkVisibility ctx={ctx} hidden={!!e.hidden} onDone={reload}/>}</>;
}
function ParkVisibility({ctx,hidden,onDone}:{ctx:ParkCtx;hidden:boolean;onDone:()=>void}){
 const {toast,modal}=usePortal();const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const locked=ctx.decisions.locked;
 const run=async(action:'hide'|'show')=>{setBusy(true);try{const r=await papi<any>(`portal/parks/${ctx.park.id}/publication`,{action,reason});toast(action==='hide'?(r.publicVerified?'Đã ẩn KCN khỏi trang công khai.':'Đã ẩn; trang công khai đang chờ cập nhật.'):(r.publicVerified?'Đã công khai lại KCN.':'Đã công khai lại; trang công khai đang chờ cập nhật.'));setReason('');onDone()}catch(e){toast(errText(e))}finally{setBusy(false)}};
 const confirmHide=()=>modal({title:'Ẩn KCN khỏi trang công khai?',body:<p className="muted">Hồ sơ KCN và toàn bộ mặt bằng sẽ không hiển thị công khai. Dữ liệu trong cổng được giữ nguyên.</p>,actions:[{label:'Huỷ',onClick:()=>modal(null)},{label:'Ẩn KCN',kind:'danger',onClick:()=>{modal(null);run('hide')}}]});
 return <section className="panel" style={{marginTop:18}}><div className="panel-head"><h2>Hiển thị công khai (chỉ Chủ sở hữu)</h2>{hidden?<span className="badge suspended">Đang ẩn</span>:<span className="badge pub">Đang hiển thị</span>}</div><div className="panel-body">
  {locked&&<p className="lock-hint">Quyền xuất bản đang bị khoá.</p>}
  {hidden?<button className="btn primary" disabled={busy||locked} onClick={()=>run('show')}>Công khai lại KCN</button>:<><div className="field"><label htmlFor="hide-reason"><span>Lý do ẩn *</span></label><textarea id="hide-reason" value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/></div><button className="btn danger" disabled={busy||locked||!reason.trim()} onClick={confirmHide}>Ẩn KCN khỏi trang công khai</button></>}
 </div></section>;
}
function FragmentRO({f,v}:{f:FieldDef;v?:string}){return <><dt>{f.label}</dt><dd>{v?optionLabel(f,v):<span className="light">—</span>}</dd></>}

export function Properties({ctx}:P){
 const {data,error}=useLoad<any>(`portal/parks/${ctx.park.id}/properties`,[ctx.park.id]);
 if(error)return <Fail ctx={ctx} error={error} cap="property.view"/>;if(!data)return <Loading/>;
 const base=`/portal/${ctx.park.id}/properties`;const typeL=(t:string)=>ASSET_TYPES.find(x=>x[0]===t)?.[1]||t;const txL=(t:string)=>TRANSACTIONS.find(x=>x[0]===t)?.[1]||t;
 const area=(i:any)=>i.area?`${Number(i.area).toLocaleString('vi-VN')} ${i.unit}`:'—';
 const op=(i:any)=><span className={'badge '+(i.leasingStatus==='unknown'?'':'op')}>{LEASING_STATUS.find(x=>x[0]===i.leasingStatus)?.[1]||'Chưa xác định'}</span>;
 const tx=(i:any)=><span className="light">{txL(i.transaction)}{i.availableFrom?` · từ ${new Date(i.availableFrom).toLocaleDateString('vi-VN')}`:''}</span>;
 return <><Head crumb="Mặt bằng" title="Mặt bằng của KCN" sub="Ba trạng thái độc lập: tình trạng cho thuê, công khai và duyệt." right={can(ctx,'property.create')?<PLink className="btn primary" to={`${base}/new`}>+ Thêm mặt bằng</PLink>:<button className="btn" disabled title={'Cần quyền: '+CAP_LABEL['property.create']}>+ Thêm mặt bằng</button>}/>
  <div className="legend" style={{marginBottom:10}}><span><span className="badge op">Còn trống</span> tình trạng cho thuê</span><span><span className="badge pub">Công khai vN</span> bản đang hiển thị công khai</span>{ctx.decisions.parkHidden&&<span><span className="badge suspended">Đang ẩn theo KCN</span> đã xuất bản nhưng KCN đang ẩn</span>}<span><span className="badge review">Chờ duyệt</span>/<span className="badge approved">Đã duyệt</span>/<span className="badge draft">Nháp</span> trạng thái nội bộ</span></div>
  <section className="panel">{data.items.length?<><table className="data responsive"><thead><tr><th></th><th>Mặt bằng</th><th>Diện tích</th><th>Tình trạng cho thuê</th><th>Công khai · Duyệt</th><th></th></tr></thead><tbody>
   {data.items.map((i:any)=><tr key={i.id}><td>{i.image?<img className="thumb" src={i.image} alt=""/>:<span className="thumb"/>}</td><td className="cell-title"><b>{i.name}</b><small>{typeL(i.type)} · {i.id}</small></td><td>{area(i)}<br/>{tx(i)}</td><td>{op(i)}</td><td><div className="state-cells">{statusBadges(i,!!ctx.decisions.parkHidden)}</div></td><td><PLink className="btn sm" to={`${base}/${i.id}/edit`}>{can(ctx,'property.edit')&&!i.openRevision&&!i.archived?'Sửa':'Xem'}</PLink></td></tr>)}
  </tbody></table>
  <div className="cards" style={{padding:10}}>{data.items.map((i:any)=><PLink key={i.id} className="panel card" to={`${base}/${i.id}/edit`}><div className="card-top">{i.image?<img className="thumb" src={i.image} alt=""/>:<span className="thumb"/>}<div className="cell-title"><b>{i.name}</b><small>{typeL(i.type)} · {area(i)}</small><div>{tx(i)}</div></div></div><div className="state-cells">{op(i)}{statusBadges(i,!!ctx.decisions.parkHidden)}</div></PLink>)}</div></>
  :<div className="empty">Chưa có mặt bằng.</div>}</section></>;
}
export function PropertyEditor({ctx}:P){
 const {assetId}=useParams();const creating=!assetId;const {toast}=usePortal();
 const {data,error,reload}=useLoad<any>(`portal/parks/${ctx.park.id}/properties/${assetId||'new'}`,[ctx.park.id,assetId]);
 if(creating&&!can(ctx,'property.create'))return <CapDenied ctx={ctx} cap={CAP_LABEL['property.create']}/>;
 if(error)return <Fail ctx={ctx} error={error} cap="property.view"/>;if(!data)return <Loading/>;const e=data.entity;
 const archiveReq=async()=>{try{const r=await papi<any>(`portal/parks/${ctx.park.id}/revisions`,{kind:'asset',id:e.id,change:'archive'});reload();toast(`Đã gửi đề nghị lưu trữ ${r.id}.`)}catch(err){toast(errText(err))}};
 return <><Head crumb={<><PLink to={`/portal/${ctx.park.id}/properties`}>Mặt bằng</PLink> / {creating?'Thêm mới':e.id}</>} title={creating?'Mặt bằng mới (bản nháp)':e.working['name.vi']||e.id} right={e&&<div className="state-cells">{statusBadges(e,!!ctx.decisions.parkHidden)}</div>}/>
  <div className="grid-main"><EntityEditor ctx={ctx} kind="asset" entity={e} images={data.imageOptions} onChange={reload}/>
  <aside className="stack"><section className="panel">{(e?.working?.image)?<img className="photo" src={e.working.image} alt="Ảnh mặt bằng"/>:null}<div className="panel-body"><b style={{color:'var(--text-strong)'}}>{ctx.decisions.parkHidden?'Bản đã xuất bản':'Đang công khai'}</b><p className="muted" style={{margin:'4px 0 0'}}>{e?.published&&!e.archived?`v${e.publishedVersion}: ${e.published['name.vi']}`:e?.archived?'Đã lưu trữ.':'Chưa từng xuất bản.'}</p>{ctx.decisions.parkHidden&&e?.published&&!e.archived&&<p className="lock-hint" style={{margin:'6px 0 0'}}>Đang ẩn theo KCN: không hiển thị công khai cho đến khi Chủ sở hữu công khai lại KCN.</p>}</div></section>
   {e&&e.published&&!e.archived&&!e.openRevision&&can(ctx,'archive.request')&&<section className="panel"><div className="panel-body"><b style={{color:'var(--text-strong)'}}>Gỡ khỏi trang công khai</b><p className="muted" style={{margin:'4px 0 10px'}}>Mặt bằng đã xuất bản không bị xoá. Gửi đề nghị lưu trữ để Chủ sở hữu duyệt.</p><button className="btn danger" onClick={archiveReq}>Đề nghị lưu trữ</button></div></section>}</aside></div></>;
}

// ---------- reviews ----------
export function Reviews({ctx}:P){
 const {data,error}=useLoad<any>(`portal/parks/${ctx.park.id}/reviews`,[ctx.park.id]);const [tab,setTab]=useState<'in_review'|'approved'|'done'>('in_review');
 if(error)return <Fail ctx={ctx} error={error} cap="review.view"/>;if(!data)return <Loading/>;
 const inTab=(r:any,t:string)=>t==='done'?!['in_review','approved'].includes(r.state):r.state===t;const list=data.items.filter((r:any)=>inTab(r,tab));
 return <><Head crumb="Duyệt nội dung" title="Duyệt nội dung" sub="Một cấp duyệt: Chủ sở hữu. Không có tuỳ chọn bỏ qua duyệt. Xuất bản là bước riêng sau khi duyệt."/>
  <div className="tabs" role="tablist">{([['in_review','Chờ duyệt'],['approved','Đã duyệt · chờ xuất bản'],['done','Lịch sử']] as const).map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} onClick={()=>setTab(k)}>{l} ({data.items.filter((r:any)=>inTab(r,k)).length})</button>)}</div>
  <section className="panel">{list.length?<div className="table-scroll"><table className="data"><thead><tr><th>Mã</th><th>Nội dung</th><th>Loại thay đổi</th><th>Người gửi</th><th>Trạng thái</th></tr></thead><tbody>{list.map((r:any)=><tr key={r.id}><td className="mono"><PLink to={`/portal/${ctx.park.id}/reviews/${r.id}`}>{r.id}</PLink></td><td className="cell-title"><b>{r.name}</b><small>nền v{r.baseVersion}</small></td><td>{r.changeLabel}</td><td>{r.author}<br/><small className="light">{r.authorRole} · {fmt(r.at)}</small></td><td><span className={'badge '+stateClass(r.state)}>{STATE_VI[r.state]}</span></td></tr>)}</tbody></table></div>:<div className="empty">Không có mục nào.</div>}</section></>;
}
export function ReviewDetail({ctx}:P){
 const {rid=''}=useParams();const {data,error,reload}=useLoad<any>(`portal/parks/${ctx.park.id}/reviews/${rid}`,[ctx.park.id,rid]);
 const {toast,refreshMe}=usePortal();const [rejecting,setRejecting]=useState(false);const [reason,setReason]=useState('');const [selfOk,setSelfOk]=useState(false);const [busy,setBusy]=useState(false);
 if(error)return <Fail ctx={ctx} error={error} cap="review.view"/>;if(!data)return <Loading/>;
 const r=data.revision,a=data.actions;const fields=fieldsFor(r.entityKind);const open=['in_review','approved'].includes(r.state);
 const base=`portal/parks/${ctx.park.id}/revisions/${r.id}`;
 const act=async(path:string,body:object,msg:(x:any)=>string)=>{setBusy(true);try{const x=await papi<any>(`${base}/${path}`,body);toast(msg(x));setRejecting(false);reload();refreshMe().catch(()=>{})}catch(e){toast(errText(e));reload()}finally{setBusy(false)}};
 const baseLabel=r.changeType==='create'?'Trước thay đổi':open&&!r.stale?(data.decisions.parkHidden?`Bản đã xuất bản (v${r.baseVersion})`:`Đang công khai (v${r.baseVersion})`):`Bản nền khi gửi (v${r.baseVersion})`;
 const val=(f:FieldDef,v:string)=>!v?<span className="light">—</span>:f.kind==='image'?<span className="img-val"><img className="thumb" src={v} alt=""/>{optionLabel(f,v)}</span>:optionLabel(f,v);
 const rows=fields.map(f=>{const b=r.before?.[f.key]??'',c=r.after[f.key]??'';const ch=r.changeType==='create'||(r.changeType==='update'&&b!==c);return <tr key={f.key}><td>{f.label}</td><td>{r.changeType==='create'?<span className="light">—</span>:val(f,b)}</td><td className={ch?'changed'+(r.changeType==='create'?' new':''):''}>{r.changeType==='archive'?<span className="light">(gỡ khỏi công khai)</span>:val(f,c)}{ch&&r.changeType==='update'&&<span className="badge draft" style={{marginLeft:4}}>thay đổi</span>}</td></tr>});
 const lockMsg=data.decisions.suspended?'Quyền duyệt/xuất bản của Chủ sở hữu đang bị quản trị nền tảng tạm khoá.':data.decisions.owners!==1?'KCN chưa có Chủ sở hữu hoạt động; duyệt và xuất bản đang bị khoá.':'';
 return <><Head crumb={<><PLink to={`/portal/${ctx.park.id}/reviews`}>Duyệt nội dung</PLink> / {r.id}</>} title={r.name} sub={<>{r.changeLabel} · gửi bởi <b>{r.author}</b> ({r.authorRole}) · {fmt(r.at)} · bản nền v{r.baseVersion}{!open&&<> · <b>{data.decisions.parkHidden?`đã xuất bản: ${r.archived?'đã lưu trữ':r.currentVersion?`v${r.currentVersion}`:'chưa'} · đang ẩn theo KCN`:`hiện công khai: ${r.archived?'đã lưu trữ':r.currentVersion?`v${r.currentVersion}`:'chưa xuất bản'}`}</b></>}</>} right={<span className={'badge '+stateClass(r.state)}>{STATE_VI[r.state]}</span>}/>
  {r.stale&&<div className="notice danger" style={{marginBottom:14}}><b>Nội dung công khai đã thay đổi kể từ khi gửi bản này.</b> Không thể duyệt/xuất bản; tác giả cần rút lại và cập nhật.</div>}
  {r.state==='approved'&&<div className="notice" style={{marginBottom:14}}>Đã duyệt nhưng <b>chưa xuất bản</b>. {data.decisions.parkHidden?<>KCN đang ẩn: sau khi xuất bản, nội dung vẫn chưa hiển thị công khai cho đến khi công khai lại KCN.</>:<>Trang công khai vẫn hiển thị v{r.baseVersion} cho đến khi Chủ sở hữu bấm Xuất bản.</>}</div>}
  {r.reapprovalRequired&&<div className="notice warn" style={{marginBottom:14}}>Bản này được duyệt bởi Chủ sở hữu trước. Bấm Xuất bản sẽ mở lại để bạn duyệt lại.</div>}
  {r.state==='rejected'&&<div className="notice danger" style={{marginBottom:14}}><b>Lý do từ chối:</b> {r.reason}</div>}
  {r.selfApproved&&<div className="notice warn" style={{marginBottom:14}}>Chủ sở hữu tự duyệt nội dung do chính mình soạn (đã ghi nhật ký).</div>}
  <div className="grid-main"><section className="panel"><div className="panel-head"><h2>So sánh từng trường</h2></div><div className="table-scroll"><table className="data diff"><thead><tr><th>Trường</th><th>{baseLabel}</th><th>Đề xuất ({r.id})</th></tr></thead><tbody>{rows}</tbody></table></div></section>
  <aside className="stack"><section className="panel"><div className="panel-head"><h2>Quyết định</h2></div><div className="panel-body">
   {!ctx.role.isOwner&&<p className="muted" style={{marginTop:0}}>Chỉ Chủ sở hữu KCN được duyệt, từ chối và xuất bản. Bạn có thể xem so sánh{a.withdraw?' và rút lại bản của mình':''}.</p>}
   {ctx.role.isOwner&&lockMsg&&<p className="lock-hint">{lockMsg}</p>}
   {a.selfConfirm&&r.state==='in_review'&&<label className="check-row" style={{marginBottom:12}}><input type="checkbox" checked={selfOk} onChange={e=>setSelfOk(e.target.checked)}/>Tôi xác nhận tự duyệt nội dung do chính mình soạn. Hành động được ghi nhật ký là "tự duyệt".</label>}
   {rejecting?<><div className="field"><label htmlFor="reject-reason"><span>Lý do từ chối *</span></label><textarea id="reject-reason" autoFocus value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} placeholder="Nêu rõ cần chỉnh sửa gì"/></div><div className="state-cells"><button className="btn danger" disabled={busy||!reason.trim()} onClick={()=>act('reject',{reason},()=>'Đã từ chối. Bản công khai giữ nguyên; tác giả nhận lý do.')}>Xác nhận từ chối</button><button className="btn ghost" onClick={()=>setRejecting(false)}>Huỷ</button></div></>
   :<div className="state-cells">
    {ctx.role.isOwner&&r.state==='in_review'&&<><button className="btn success" disabled={busy||!a.approve||(a.selfConfirm&&!selfOk)} onClick={()=>act('approve',{selfConfirm:a.selfConfirm?selfOk:undefined},()=>'Đã duyệt. Nội dung CHƯA công khai cho đến khi bấm Xuất bản.')}>Duyệt</button><button className="btn danger" disabled={busy||!a.reject} onClick={()=>setRejecting(true)}>Từ chối…</button></>}
    {ctx.role.isOwner&&r.state==='approved'&&<button className="btn primary" disabled={busy||(!a.publish&&!r.reapprovalRequired)} onClick={()=>act('publish',{},x=>x.reapprovalRequired?'Đã mở lại để bạn duyệt.':x.archived?'Đã lưu trữ: không còn hiển thị công khai.':`Đã xuất bản v${x.version}.${x.publicVerified?(x.expectedVisible?' Trang công khai đã cập nhật.':' KCN đang ẩn nên nội dung chưa hiển thị công khai.'):' Trang công khai chưa phản ánh thay đổi — đang chờ/thử lại.'}`)}>{r.changeType==='archive'?'Lưu trữ (gỡ công khai)':'Xuất bản'}</button>}
    {a.withdraw&&<button className="btn" disabled={busy} onClick={()=>act('withdraw',{},x=>x.approvalInvalidated?'Đã rút lại: kết quả duyệt bị huỷ.':'Đã rút lại.')}>{r.state==='approved'?'Rút lại để sửa (huỷ duyệt)':'Rút lại'}</button>}
    {!open&&<span className="light">Không có thao tác cho trạng thái này.</span>}
   </div>}
   {(r.approvedBy||r.decidedBy)&&<p className="light" style={{fontSize:12,margin:'12px 0 0'}}>{r.approvedBy&&<>Duyệt: {r.approvedBy} · {fmt(r.approvedAt)}<br/></>}{r.decidedBy&&<>Quyết định gần nhất: {r.decidedBy} · {fmt(r.decidedAt)}</>}</p>}
  </div></section></aside></div></>;
}

// ---------- members ----------
function LinkOnce({link,onClose}:{link:string;onClose:()=>void}){
 const full=window.location.origin+link;const [copied,setCopied]=useState(false);
 return <div className="notice ok" style={{marginTop:12}} role="status"><b>Liên kết mời (chỉ hiển thị một lần).</b> Gửi trực tiếp cho người được mời qua kênh an toàn. Liên kết hết hạn sau 7 ngày và không thể xem lại.
  <div className="state-cells" style={{marginTop:8}}><input readOnly value={full} aria-label="Liên kết mời" style={{flex:1,minWidth:0}} onFocus={e=>e.target.select()}/><button className="btn sm" onClick={async()=>{try{await navigator.clipboard.writeText(full);setCopied(true)}catch{setCopied(false)}}}>{copied?'Đã sao chép':'Sao chép'}</button><button className="btn sm ghost" onClick={onClose}>Đóng</button></div></div>;
}
export function Members({ctx}:P){
 const {data,error,reload}=useLoad<any>(`portal/parks/${ctx.park.id}/members`,[ctx.park.id]);const {toast,modal}=usePortal();
 const [email,setEmail]=useState('');const [roleId,setRoleId]=useState('');const [link,setLink]=useState('');const [busy,setBusy]=useState(false);
 if(error)return <Fail ctx={ctx} error={error} cap="members.view"/>;if(!data)return <Loading/>;
 const base=`portal/parks/${ctx.park.id}/members`;const manage=data.canManage;
 const call=async(path:string,body:object,msg:string,show=false)=>{setBusy(true);try{const r=await papi<any>(`${base}/${path}`,body);if(show&&r.link)setLink(r.link);toast(msg);reload()}catch(e){toast(errText(e))}finally{setBusy(false)}};
 const confirmRemove=(m:any)=>modal({title:`Gỡ ${m.name} khỏi KCN?`,body:<p className="muted">Người này mất quyền truy cập KCN ngay ở thao tác kế tiếp. Có thể mời lại sau.</p>,actions:[{label:'Huỷ',onClick:()=>modal(null)},{label:'Gỡ thành viên',kind:'danger',onClick:()=>{modal(null);call('status',{membershipId:m.id,status:'removed'},'Đã gỡ thành viên.')}}]});
 const statusBadge=(s:string)=><span className={'badge '+(s==='suspended'?'suspended':'pub')}>{s==='suspended'?'Tạm khoá':'Đang hoạt động'}</span>;
 return <><Head crumb="Thành viên" title="Thành viên" sub="Chủ sở hữu do quản trị nền tảng chỉ định. Chủ sở hữu mời và quản lý các thành viên khác; không thể cấp quyền Chủ sở hữu."/>
  {!manage&&<div className="notice" style={{marginBottom:14}}>Bạn đang xem danh sách. Chỉ Chủ sở hữu được mời, đổi vai trò, tạm khoá hoặc gỡ thành viên.</div>}
  <section className="panel"><table className="data responsive"><thead><tr><th>Thành viên</th><th>Vai trò</th><th>Trạng thái</th><th>{manage?'Thao tác':''}</th></tr></thead><tbody>
   {data.items.map((m:any)=><tr key={m.id}><td className="cell-title"><b>{m.name}</b><small>{m.email}</small></td>
    <td>{m.isOwner?<><span className="badge owner">Chủ sở hữu</span><br/><small className="light">Chỉ định bởi {m.assignedBy}</small></>:manage?<select aria-label={`Vai trò của ${m.name}`} value={m.roleId} disabled={busy} onChange={e=>call('role',{membershipId:m.id,roleId:e.target.value},'Đã đổi vai trò. Thành viên thấy quyền mới ngay khi tiếp tục làm việc.')}>{data.roles.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select>:m.roleName}</td>
    <td>{statusBadge(m.status)}</td>
    <td>{m.isOwner?<span className="lock-hint">Thay đổi tại trang quản trị nền tảng</span>:manage&&<div className="state-cells">{m.status==='suspended'?<button className="btn sm" disabled={busy} onClick={()=>call('status',{membershipId:m.id,status:'active'},'Đã mở khoá thành viên.')}>Mở khoá</button>:<button className="btn sm" disabled={busy} onClick={()=>call('status',{membershipId:m.id,status:'suspended'},'Đã tạm khoá thành viên.')}>Tạm khoá</button>}<button className="btn sm danger" disabled={busy} onClick={()=>confirmRemove(m)}>Gỡ</button></div>}</td></tr>)}
   {data.invitations.map((i:any)=><tr key={i.id}><td className="cell-title"><b>{i.email}</b><small>Gửi {fmt(i.at)} · hết hạn {fmt(i.expiresAt)}</small></td><td>{i.roleName}</td><td><span className="badge review">Đã mời</span></td><td><div className="state-cells"><button className="btn sm" disabled={busy} onClick={()=>call('invite-resend',{id:i.id},'Đã tạo lời mời mới; lời mời cũ không còn dùng được.',true)}>Gửi lại</button><button className="btn sm" disabled={busy} onClick={()=>call('invite-revoke',{id:i.id},'Đã thu hồi lời mời.')}>Thu hồi</button></div></td></tr>)}
  </tbody></table>
  <div className="cards" style={{padding:10}}>{data.items.map((m:any)=><div className="panel card" key={m.id}><b>{m.name}</b><small className="light">{m.email}</small><div className="state-cells"><span className={'badge '+(m.isOwner?'owner':'role')}>{m.roleName}</span>{statusBadge(m.status)}</div>
   {manage&&!m.isOwner&&<div className="state-cells"><select aria-label={`Vai trò của ${m.name}`} value={m.roleId} disabled={busy} onChange={e=>call('role',{membershipId:m.id,roleId:e.target.value},'Đã đổi vai trò.')}>{data.roles.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select>{m.status==='suspended'?<button className="btn sm" onClick={()=>call('status',{membershipId:m.id,status:'active'},'Đã mở khoá.')}>Mở khoá</button>:<button className="btn sm" onClick={()=>call('status',{membershipId:m.id,status:'suspended'},'Đã tạm khoá.')}>Tạm khoá</button>}<button className="btn sm danger" onClick={()=>confirmRemove(m)}>Gỡ</button></div>}</div>)}
   {data.invitations.map((i:any)=><div className="panel card" key={i.id}><b>{i.email}</b><div className="state-cells"><span className="badge review">Đã mời · {i.roleName}</span></div><div className="state-cells"><button className="btn sm" onClick={()=>call('invite-resend',{id:i.id},'Đã tạo lời mời mới.',true)}>Gửi lại</button><button className="btn sm" onClick={()=>call('invite-revoke',{id:i.id},'Đã thu hồi lời mời.')}>Thu hồi</button></div></div>)}</div></section>
  {manage&&<section className="panel" style={{marginTop:18}}><div className="panel-head"><h2>Mời thành viên</h2></div><div className="panel-body">
   <form className="grid-2" style={{alignItems:'end'}} onSubmit={e=>{e.preventDefault();call('invite',{email,roleId:roleId||data.roles[0]?.id},'Đã tạo lời mời.',true).then(()=>setEmail(''))}}>
    <div className="field"><label htmlFor="inv-email"><span>Email *</span></label><input id="inv-email" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="ten@congty.vn"/></div>
    <div className="field"><label htmlFor="inv-role"><span>Vai trò</span></label><select id="inv-role" value={roleId||data.roles[0]?.id} onChange={e=>setRoleId(e.target.value)}>{data.roles.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select><small>Không có lựa chọn "Chủ sở hữu" — quyền này do quản trị nền tảng chỉ định.</small></div>
    <div><button className="btn primary" disabled={busy}>Tạo lời mời</button></div></form>
   {link&&<LinkOnce link={link} onClose={()=>setLink('')}/>}</div></section>}</>;
}

// ---------- roles ----------
export function Roles({ctx}:P){
 const {data,error,reload}=useLoad<any>(`portal/parks/${ctx.park.id}/roles`,[ctx.park.id]);const {toast,modal}=usePortal();
 const [name,setName]=useState('');const [from,setFrom]=useState('');const [busy,setBusy]=useState(false);
 const roles=data?.items||[];
 if(error)return <Fail ctx={ctx} error={error} cap="roles.manage"/>;if(!data)return <Loading/>;
 const base=`portal/parks/${ctx.park.id}/roles`;
 const toggle=async(r:any,cap:GrantableCap,on:boolean)=>{const next=on?withDependencies(r.capabilities,cap):withoutDependents(r.capabilities,cap);const auto=(on?next.filter(c=>!r.capabilities.includes(c)&&c!==cap):r.capabilities.filter((c:string)=>!next.includes(c as GrantableCap)&&c!==cap));
  setBusy(true);try{await papi(`${base}/update`,{roleId:r.id,capabilities:next,revision:r.revision});toast(`Đã cập nhật vai trò "${r.name}".`+(auto.length?` ${on?'Tự bật':'Tự tắt'} quyền phụ thuộc: ${auto.map((c:string)=>CAP_LABEL[c]).join(', ')}.`:''));reload()}catch(e){toast(errText(e));reload()}finally{setBusy(false)}};
 const del=(r:any)=>modal({title:`Xoá vai trò "${r.name}"?`,body:<p className="muted">Không thể hoàn tác.</p>,actions:[{label:'Huỷ',onClick:()=>modal(null)},{label:'Xoá',kind:'danger',onClick:async()=>{modal(null);try{await papi(`${base}/delete`,{roleId:r.id});toast('Đã xoá vai trò.');reload()}catch(e){toast(errText(e))}}}]});
 return <><Head crumb="Vai trò & quyền" title="Vai trò & quyền của KCN" sub={<>Chỉ áp dụng trong {ctx.park.name}. Quyền dành riêng Chủ sở hữu không cấp được cho vai trò nào. Thành viên thấy quyền mới ngay khi tiếp tục làm việc.</>}/>
  <section className="panel"><div className="matrix-wrap"><table className="data matrix"><thead><tr><th>Quyền</th><th>Chủ sở hữu</th>{roles.map((r:any)=><th key={r.id}>{r.name}<br/><small className="light">{r.template?'mẫu':'tuỳ chỉnh'}</small></th>)}</tr></thead><tbody>
   {CAP_GROUPS.map(g=><RoleGroup key={g.group} g={g} roles={roles} busy={busy} toggle={toggle}/>)}
   <tr><td>Xoá vai trò</td><td></td>{roles.map((r:any)=><td key={r.id}>{r.template?<span className="lock-hint">Vai trò mẫu</span>:r.inUse?<button className="btn sm" disabled title="Đang có thành viên hoặc lời mời dùng vai trò này">Xoá</button>:<button className="btn sm danger" onClick={()=>del(r)}>Xoá</button>}</td>)}</tr>
  </tbody></table></div></section>
  <section className="panel" style={{marginTop:18}}><div className="panel-head"><h2>Tạo vai trò tuỳ chỉnh</h2></div><div className="panel-body"><form className="grid-2" style={{alignItems:'end'}} onSubmit={async e=>{e.preventDefault();setBusy(true);try{await papi(`${base}/create`,{name,fromRoleId:from||roles[0]?.id});toast(`Đã tạo vai trò "${name}".`);setName('');reload()}catch(err){toast(errText(err))}finally{setBusy(false)}}}>
   <div className="field"><label htmlFor="role-name"><span>Tên vai trò *</span></label><input id="role-name" required maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="VD: Biên tập hồ sơ"/></div>
   <div className="field"><label htmlFor="role-from"><span>Sao chép quyền từ</span></label><select id="role-from" value={from||roles[0]?.id} onChange={e=>setFrom(e.target.value)}>{roles.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
   <div><button className="btn primary" disabled={busy}>Tạo vai trò</button></div></form></div></section></>;
}
function RoleGroup({g,roles,busy,toggle}:{g:typeof CAP_GROUPS[number];roles:any[];busy:boolean;toggle:(r:any,c:GrantableCap,on:boolean)=>void}){
 return <><tr className="grp"><td colSpan={roles.length+2}>{g.group}</td></tr>{g.items.map(([c,l])=><tr key={c} className={g.reserved?'reserved':''}><td>{l}</td><td aria-label="Có">✓</td>{roles.map(r=>g.reserved?<td key={r.id} title="Chỉ Chủ sở hữu"><span aria-label="Không cấp được">🔒</span></td>:<td key={r.id}><input type="checkbox" aria-label={`${r.name}: ${l}`} disabled={busy} checked={r.capabilities.includes(c)} onChange={e=>toggle(r,c as GrantableCap,e.target.checked)}/></td>)}</tr>)}</>;
}

// ---------- activity ----------
export function Activity({ctx}:P){
 const {data,error}=useLoad<any>(`portal/parks/${ctx.park.id}/activity`,[ctx.park.id]);
 if(error)return <Fail ctx={ctx} error={error} cap="activity.view"/>;if(!data)return <Loading/>;
 return <><Head crumb="Nhật ký" title="Nhật ký hoạt động" sub={`Chỉ của ${ctx.park.name}. Mỗi mục ghi người thực hiện, vai trò tại thời điểm đó, nội dung và phiên bản.`}/>
  <section className="panel">{data.items.length?<div className="table-scroll"><table className="data"><thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Nội dung</th><th>Phiên bản</th><th>Lý do</th></tr></thead><tbody>{data.items.map((a:any,i:number)=><tr key={i}><td>{fmt(a.at)}</td><td>{a.actor}<br/><small className="light">{a.role}</small></td><td>{a.action}</td><td>{a.entity||<span className="light">—</span>}</td><td className="mono">{a.version||'—'}</td><td>{a.reason||<span className="light">—</span>}</td></tr>)}</tbody></table></div>:<div className="empty">Chưa có hoạt động.</div>}</section></>;
}
