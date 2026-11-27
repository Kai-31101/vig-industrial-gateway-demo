// /portal — park management portal (separate from /admin). Lazily loaded from App.tsx.
import {useEffect,useState,type FormEvent} from 'react';
import {Navigate,Route,Routes,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom';
import './portal.css';
import {papi,PortalError,errText} from './api';
import {PortalProvider,usePortal,Topbar,ParkFrame,Denied,PLink,LAST_PARK,Loading,type ParkCtx} from './shell';
import {Overview,Profile,Properties,PropertyEditor,Reviews,ReviewDetail,Members,Roles,Activity} from './pages';

export default function PortalApp(){
 useEffect(()=>{const prev=document.title;document.title='Cổng quản lý KCN — VSIP';return()=>{document.title=prev}},[]);
 return <div className="portal-root"><PortalProvider><Routes>
  <Route path="login" element={<Login/>}/>
  <Route path="invite" element={<Invite/>}/>
  <Route path="parks" element={<Authed><Selector/></Authed>}/>
  <Route path=":parkId/*" element={<Authed><ParkRoutes/></Authed>}/>
  <Route index element={<Authed><Entry/></Authed>}/>
 </Routes></PortalProvider></div>;
}
function Authed({children}:{children:React.ReactNode}){
 const {me,refreshMe}=usePortal();const [state,setState]=useState<'loading'|'ok'|'anon'|'error'>(me?'ok':'loading');const loc=useLocation();
 useEffect(()=>{let live=true;refreshMe().then(()=>{if(live)setState('ok')}).catch(()=>{if(live)setState('error')});return()=>{live=false}},[loc.pathname]);
 if(state==='loading'&&!me)return <><Topbar/><main className="main"><Loading/></main></>;
 if(state==='error'&&!me)return <><Topbar/><main className="main"><p role="alert">Không tải được dữ liệu. Vui lòng thử lại.</p></main></>;
 if(!me)return <Navigate to={'/portal/login?next='+encodeURIComponent(loc.pathname)} replace/>;
 return <>{children}</>;
}
function Entry(){const {me}=usePortal();if(!me)return null;const ms=me.memberships;if(!ms.length)return <Navigate to="/portal/parks" replace/>;const last=localStorage.getItem(LAST_PARK);const pick=ms.find(m=>m.parkId===last)||(ms.length===1?ms[0]:null);return <Navigate to={pick?`/portal/${pick.parkId}/overview`:'/portal/parks'} replace/>}

function PendingInvites(){
 const {me,refreshMe,toast,go}=usePortal();if(!me?.invitations.length)return null;
 const accept=async(id:string,parkId:string)=>{try{await papi('portal/invitations/accept',{id});await refreshMe();toast('Đã chấp nhận lời mời.');go(`/portal/${parkId}/overview`)}catch(e){toast(errText(e))}};
 return <section className="panel" style={{marginBottom:18}}><div className="panel-head"><h2>Lời mời đang chờ bạn</h2></div><div className="panel-body">{me.invitations.map(i=><div className="task" key={i.id}><span className="t"><b>{i.parkName}</b><small>Vai trò: {i.roleName} · hết hạn {new Date(i.expiresAt).toLocaleDateString('vi-VN')}</small></span><button className="btn sm primary" onClick={()=>accept(i.id,i.parkId)}>Chấp nhận</button></div>)}</div></section>;
}
function Selector(){
 const {me}=usePortal();if(!me)return null;
 return <><Topbar/><main className="main"><div className="selector"><div className="page-head"><div><h1>Chọn khu công nghiệp</h1><p>Vai trò của bạn có thể khác nhau ở mỗi KCN. Chọn KCN để làm việc; bạn có thể chuyển KCN bất cứ lúc nào từ thanh trên cùng.</p></div></div>
  <PendingInvites/>
  {me.memberships.length?me.memberships.map(m=><div className="panel park-card" key={m.parkId}><img src="/images/industrial-parks/logistics-port.png" alt=""/><div><b style={{fontSize:16,color:'var(--text-strong)'}}>{m.parkName}</b><div className="state-cells" style={{marginTop:6}}><span className={'badge '+(m.isOwner?'owner':'role')}>{m.roleName}</span>{m.isOwner&&m.openReviews>0&&<span className="badge review">{m.openReviews} đang mở</span>}</div></div><PLink className="btn primary" to={`/portal/${m.parkId}/overview`}>Vào KCN</PLink></div>)
   :<div className="panel"><div className="empty">Tài khoản chưa được cấp quyền vào KCN nào. Liên hệ Chủ sở hữu KCN hoặc quản trị nền tảng để nhận lời mời.</div></div>}
 </div></main></>;
}
function ParkRoutes(){
 const {parkId=''}=useParams();const loc=useLocation();const [ctx,setCtx]=useState<ParkCtx|null>(null);const [err,setErr]=useState<PortalError|null>(null);const nav=useNavigate();
 // Re-check membership on every navigation: revocation applies on the next request.
 useEffect(()=>{let live=true;papi<ParkCtx>(`portal/parks/${parkId}/context`).then(c=>{if(live){setCtx(c);setErr(null)}}).catch(e=>{if(!live)return;if(e instanceof PortalError&&e.status===401){nav('/portal/login?next='+encodeURIComponent(loc.pathname),{replace:true});return}setCtx(null);setErr(e)});return()=>{live=false}},[parkId,loc.pathname]);
 if(err)return <ParkFrame ctx={null}><Denied/></ParkFrame>;
 if(!ctx||ctx.park.id!==parkId)return <ParkFrame ctx={null}><Loading/></ParkFrame>;
 return <ParkFrame ctx={ctx}><Routes>
  <Route path="overview" element={<Overview ctx={ctx}/>}/>
  <Route path="profile" element={<Profile ctx={ctx}/>}/>
  <Route path="properties" element={<Properties ctx={ctx}/>}/>
  <Route path="properties/new" element={<PropertyEditor ctx={ctx} key="new"/>}/>
  <Route path="properties/:assetId/edit" element={<PropertyEditor ctx={ctx}/>}/>
  <Route path="reviews" element={<Reviews ctx={ctx}/>}/>
  <Route path="reviews/:rid" element={<ReviewDetail ctx={ctx}/>}/>
  <Route path="members" element={<Members ctx={ctx}/>}/>
  <Route path="roles" element={<Roles ctx={ctx}/>}/>
  <Route path="activity" element={<Activity ctx={ctx}/>}/>
  <Route path="*" element={<Navigate to={`/portal/${parkId}/overview`} replace/>}/>
 </Routes></ParkFrame>;
}

function Login(){
 const [q]=useSearchParams();const nav=useNavigate();const {refreshMe}=usePortal();
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const next=q.get('next');const safeNext=next&&/^\/portal(\/|$)/.test(next)&&!next.startsWith('//')?next:'/portal';
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await papi('portal/login',{email,password});setPassword('');await refreshMe();nav(safeNext,{replace:true})}catch(err){setError(errText(err))}finally{setBusy(false)}};
 return <div className="auth-page"><form className="panel auth-card" onSubmit={submit}><img src="/images/vsip-logo.webp" alt="VSIP" className="auth-logo"/>
  <h1>Cổng quản lý KCN</h1>{q.get('signedOut')&&<p className="notice ok" role="status">Bạn đã đăng xuất. Phiên làm việc đã kết thúc.</p>}
  <p className="muted">Đăng nhập bằng tài khoản được mời vào khu công nghiệp.</p>
  <label className="field"><span>Email</span><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
  <label className="field"><span>Mật khẩu</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label>
  {error&&<p className="notice danger" role="alert">{error}</p>}
  <button className="btn primary" disabled={busy} style={{width:'100%'}}>{busy?'Đang đăng nhập…':'Đăng nhập'}</button>
  <p className="light" style={{fontSize:12,marginTop:14}}>Chưa có tài khoản? Mở liên kết mời do Chủ sở hữu KCN hoặc quản trị nền tảng gửi cho bạn.</p></form></div>;
}
interface InviteInfo{parkName:string;kind:string;roleName:string;email:string;accountExists:boolean;expiresAt:string}
function Invite(){
 const nav=useNavigate();const {refreshMe,me}=usePortal();
 // Read the one-time token from the fragment, then remove it from the address bar and history.
 const [token]=useState(()=>{const t=window.location.hash.slice(1);return /^[a-f0-9]{64}$/.test(t)?t:''});
 useEffect(()=>{if(window.location.hash)window.history.replaceState(null,'',window.location.pathname)},[]);
 const [info,setInfo]=useState<InviteInfo|null>(null);const [error,setError]=useState('');const [name,setName]=useState('');const [pw,setPw]=useState('');const [pw2,setPw2]=useState('');const [busy,setBusy]=useState(false);
 const [lemail,setLemail]=useState('');const [lpw,setLpw]=useState('');
 useEffect(()=>{refreshMe().catch(()=>{});if(!token){setError('Liên kết mời không hợp lệ hoặc đã được dùng trong tab này.');return}papi<InviteInfo>('portal/invitations/inspect',{token}).then(i=>{setInfo(i);setLemail(i.email)}).catch(e=>setError(errText(e)))},[token]);
 const accept=async(extra:Record<string,string>={})=>{setBusy(true);setError('');try{const r=await papi<{parkId:string}>('portal/invitations/accept',{token,...extra});await refreshMe();nav(`/portal/${r.parkId}/overview`,{replace:true})}catch(e){setError(errText(e))}finally{setBusy(false)}};
 const create=(e:FormEvent)=>{e.preventDefault();if(pw!==pw2){setError('Mật khẩu nhập lại không khớp.');return}accept({displayName:name,password:pw})};
 const signInAccept=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await papi('portal/login',{email:lemail,password:lpw});setLpw('');await accept()}catch(err){setError(errText(err));setBusy(false)}};
 const signedInMatches=me&&info&&me.user.email===info.email;
 return <div className="auth-page"><div className="panel auth-card"><img src="/images/vsip-logo.webp" alt="VSIP" className="auth-logo"/><h1>Lời mời vào Cổng quản lý KCN</h1>
  {info&&<dl className="ro-list" style={{margin:'12px 0'}}><dt>Khu công nghiệp</dt><dd><b>{info.parkName}</b></dd><dt>Vai trò</dt><dd>{info.roleName}</dd><dt>Email được mời</dt><dd>{info.email}</dd><dt>Hết hạn</dt><dd>{new Date(info.expiresAt).toLocaleString('vi-VN')}</dd></dl>}
  {error&&<p className="notice danger" role="alert">{error}</p>}
  {info&&signedInMatches&&<button className="btn primary" disabled={busy} onClick={()=>accept()}>Chấp nhận lời mời</button>}
  {info&&me&&!signedInMatches&&<p className="notice warn">Bạn đang đăng nhập bằng {me.user.email}. Lời mời này dành cho {info.email}; hãy đăng xuất rồi mở lại liên kết.</p>}
  {info&&!me&&info.accountExists&&<form onSubmit={signInAccept}><p className="muted">Email này đã có tài khoản. Đăng nhập để chấp nhận.</p><label className="field"><span>Email</span><input type="email" value={lemail} readOnly/></label><label className="field"><span>Mật khẩu</span><input type="password" autoComplete="current-password" required value={lpw} onChange={e=>setLpw(e.target.value)}/></label><button className="btn primary" disabled={busy}>Đăng nhập và chấp nhận</button></form>}
  {info&&!me&&!info.accountExists&&<form onSubmit={create}><p className="muted">Tạo tài khoản cho {info.email} để chấp nhận lời mời.</p>
   <label className="field"><span>Họ và tên *</span><input required maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
   <label className="field"><span>Mật khẩu *</span><input type="password" required minLength={12} autoComplete="new-password" value={pw} onChange={e=>setPw(e.target.value)}/><small>Tối thiểu 12 ký tự, gồm chữ và số hoặc ký tự đặc biệt.</small></label>
   <label className="field"><span>Nhập lại mật khẩu *</span><input type="password" required autoComplete="new-password" value={pw2} onChange={e=>setPw2(e.target.value)}/></label>
   <button className="btn primary" disabled={busy}>Tạo tài khoản và chấp nhận</button></form>}
  <p style={{marginTop:14}}><PLink to="/portal/login">Về trang đăng nhập</PLink></p></div></div>;
}
