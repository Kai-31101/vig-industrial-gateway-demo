// Portal shell: session state, park switch, notifications, unsaved-change guard, modal/toast primitives.
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode,type MouseEvent} from 'react';
import {useLocation,useNavigate,useParams} from 'react-router-dom';
import {papi,PortalError,errText} from './api';

export interface Me{user:{id:string;name:string;email:string};memberships:{parkId:string;parkName:string;isOwner:boolean;roleName:string;openReviews:number}[];notifications:{id:string;parkId:string;kind:string;text:string;read:boolean;at:string;href:string}[];invitations:{id:string;parkId:string;parkName:string;kind:string;roleName:string;expiresAt:string}[]}
interface Ctx{me:Me|null;refreshMe:()=>Promise<void>;setDirty:(d:boolean)=>void;go:(to:string)=>void;toast:(m:string)=>void;modal:(m:ModalSpec|null)=>void}
interface ModalSpec{title:string;body:ReactNode;actions:{label:string;kind?:string;onClick:()=>void}[]}
const PortalCtx=createContext<Ctx|null>(null);
export const usePortal=()=>useContext(PortalCtx)!;
export const LAST_PARK='vig-portal-last-park';

export function PortalProvider({children}:{children:ReactNode}){
 const [me,setMe]=useState<Me|null>(null);const nav=useNavigate();const loc=useLocation();
 const dirty=useRef(false);const [modalSpec,setModal]=useState<ModalSpec|null>(null);const [toastMsg,setToast]=useState('');const tt=useRef<number>();
 const refreshMe=useCallback(async()=>{try{setMe(await papi<Me>('portal/me'))}catch(e){if(e instanceof PortalError&&e.status===401)setMe(null);else throw e}},[]);
 const toast=useCallback((m:string)=>{setToast(m);window.clearTimeout(tt.current);tt.current=window.setTimeout(()=>setToast(''),4200)},[]);
 const go=useCallback((to:string)=>{
  if(!dirty.current){nav(to);return}
  setModal({title:'Thay đổi chưa được lưu',body:<p className="muted">Bạn có chỉnh sửa chưa lưu nháp. Rời trang hoặc chuyển KCN sẽ làm mất các thay đổi này.</p>,actions:[{label:'Ở lại chỉnh sửa',onClick:()=>setModal(null)},{label:'Bỏ thay đổi và tiếp tục',kind:'danger',onClick:()=>{dirty.current=false;setModal(null);nav(to)}}]});
 },[nav]);
 const setDirty=useCallback((d:boolean)=>{dirty.current=d},[]);
 useEffect(()=>{const h=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',h);return()=>window.removeEventListener('beforeunload',h)},[]);
 // Browser back/forward with unsaved edits: return to the editor and ask.
 const here=useRef(loc.pathname);useEffect(()=>{here.current=loc.pathname},[loc.pathname]);
 useEffect(()=>{const h=()=>{if(!dirty.current)return;const target=window.location.pathname+window.location.search;window.history.pushState(null,'',here.current);go(target)};window.addEventListener('popstate',h);return()=>window.removeEventListener('popstate',h)},[go]);
 useEffect(()=>{if(!modalSpec)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape')setModal(null)};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[modalSpec]);
 return <PortalCtx.Provider value={{me,refreshMe,setDirty,go,toast,modal:setModal}}>
  {children}
  {modalSpec&&<div className="modal-back" onClick={e=>{if(e.target===e.currentTarget)setModal(null)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="pm-title"><div className="modal-body"><h2 id="pm-title">{modalSpec.title}</h2>{modalSpec.body}</div><div className="modal-foot">{modalSpec.actions.map((a,i)=><button key={i} autoFocus={i===0} className={'btn '+(a.kind||'')} onClick={a.onClick}>{a.label}</button>)}</div></div></div>}
  {toastMsg&&<div className="toast" role="status">{toastMsg}</div>}
 </PortalCtx.Provider>;
}
/** Internal link honouring the unsaved-change guard. */
export function PLink({to,className,children,...rest}:{to:string;className?:string;children:ReactNode;[k:string]:unknown}){const {go}=usePortal();return <a href={to} className={className} onClick={(e:MouseEvent)=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;e.preventDefault();go(to)}} {...rest}>{children}</a>}

export function useLoad<T>(path:string|null,deps:unknown[]=[]){
 const [data,setData]=useState<T|null>(null);const [error,setError]=useState<PortalError|null>(null);const [n,setN]=useState(0);const nav=useNavigate();const loc=useLocation();
 useEffect(()=>{if(!path)return;let live=true;setError(null);papi<T>(path).then(d=>{if(live)setData(d)}).catch(e=>{if(!live)return;if(e instanceof PortalError&&e.status===401){nav('/portal/login?next='+encodeURIComponent(loc.pathname),{replace:true});return}setError(e instanceof PortalError?e:new PortalError(500,'server'));setData(null)});return()=>{live=false}},[path,n,...deps]);
 return {data,error,reload:()=>setN(x=>x+1)};
}

function initials(n:string){return n.split(' ').filter(Boolean).slice(-2).map(s=>s[0]).join('').toUpperCase()}
export function Topbar({parkId}:{parkId?:string}){
 const {me,go,refreshMe,toast}=usePortal();const [open,setOpen]=useState<''|'park'|'notes'|'user'>('');const ref=useRef<HTMLElement>(null);
 useEffect(()=>{const h=(e:Event)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen('')};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[]);
 const cur=me?.memberships.find(m=>m.parkId===parkId);const unread=me?.notifications.filter(n=>!n.read)||[];
 const signOut=async()=>{setOpen('');try{await papi('portal/logout',{})}catch{}go('/portal/login?signedOut=1');await refreshMe()};
 const openNote=async(n:Me['notifications'][number])=>{setOpen('');try{if(!n.read)await papi('portal/notifications/read',{ids:[n.id]})}catch{}go(n.href);refreshMe().catch(()=>toast(errText(null)))};
 return <header className="topbar" ref={ref}>
  <PLink to="/portal" className="brand"><img src="/images/vsip-logo.webp" alt="VSIP"/><span className="brand-title"><b>Cổng quản lý KCN</b><small>Vietnam Singapore Industrial Park</small></span></PLink>
  <span className="topbar-sep"/>
  {me&&<div className="park-switch">
   <button aria-haspopup="menu" aria-expanded={open==='park'} onClick={()=>setOpen(open==='park'?'':'park')}>{cur?<span><span className="ps-name">{cur.parkName}</span><span className="ps-sub">Vai trò tại KCN này: <b>{cur.roleName}</b></span></span>:<span><span className="ps-name">Chọn khu công nghiệp</span><span className="ps-sub">{me.memberships.length} KCN được cấp quyền</span></span>}<span aria-hidden="true">▾</span></button>
   {open==='park'&&<div className="menu" role="menu"><div className="menu-head">Khu công nghiệp của bạn</div>
    {me.memberships.map(m=><button key={m.parkId} className="menu-item" role="menuitem" aria-current={m.parkId===parkId} onClick={()=>{setOpen('');go(`/portal/${m.parkId}/overview`)}}><span><b>{m.parkName}</b><br/><small className="light">{m.roleName}</small></span>{m.parkId===parkId&&<span className="badge draft">Đang xem</span>}</button>)}
    <button className="menu-item" role="menuitem" onClick={()=>{setOpen('');go('/portal/parks')}}><span>Xem tất cả KCN…</span></button></div>}
  </div>}
  <div className="topbar-right">
   {me&&<div className="park-switch"><button className="icon-btn" aria-label={`Thông báo (${unread.length} chưa đọc)`} aria-expanded={open==='notes'} onClick={()=>setOpen(open==='notes'?'':'notes')}><BellIcon/>{unread.length>0&&<span className="dot">{unread.length}</span>}</button>
    {open==='notes'&&<div className="menu" role="menu" style={{left:'auto',right:0,width:'min(380px,90vw)'}}><div className="menu-head">Thông báo</div>
     {me.notifications.length?me.notifications.slice(0,15).map(n=><button key={n.id} className="menu-item" role="menuitem" onClick={()=>openNote(n)}><span>{!n.read&&<b aria-label="chưa đọc">● </b>}{n.text}<br/><small className="light">{me.memberships.find(m=>m.parkId===n.parkId)?.parkName} · {new Date(n.at).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})}</small></span></button>):<div className="empty">Không có thông báo</div>}</div>}</div>}
   {me&&<div className="park-switch"><button className="user-chip" aria-haspopup="menu" aria-expanded={open==='user'} onClick={()=>setOpen(open==='user'?'':'user')}><span className="avatar">{initials(me.user.name)}</span><span className="uname">{me.user.name}</span></button>
    {open==='user'&&<div className="menu" role="menu" style={{left:'auto',right:0,minWidth:220}}><div className="menu-head">{me.user.email}</div><button className="menu-item" role="menuitem" onClick={signOut}>Đăng xuất</button></div>}</div>}
  </div>
 </header>;
}
function BellIcon(){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>}

const NAV:[string,string,(caps:string[])=>boolean][]=[
 ['overview','Tổng quan',c=>c.includes('park.view')],['profile','Hồ sơ KCN',c=>c.includes('park.view')],['properties','Mặt bằng',c=>c.includes('property.view')],
 ['reviews','Duyệt nội dung',c=>c.includes('review.view')],['members','Thành viên',c=>c.includes('members.view')||c.includes('members.manage')],['roles','Vai trò & quyền',c=>c.includes('roles.manage')],['activity','Nhật ký',c=>c.includes('activity.view')]];
export interface ParkCtx{park:{id:string;name:string};role:{isOwner:boolean;name:string;caps:string[]};decisions:{owners:number;suspended:boolean;locked:boolean;parkHidden?:boolean}}
export function ParkFrame({ctx,children}:{ctx:ParkCtx|null;children:ReactNode}){
 const {parkId='',}=useParams();const loc=useLocation();const {me}=usePortal();
 const section=loc.pathname.split('/')[3]||'overview';const caps=ctx?.role.caps||[];const open=me?.memberships.find(m=>m.parkId===parkId)?.openReviews||0;
 const link=([id,l,ok]:typeof NAV[number])=>ok(caps)?<PLink key={id} className="nav-item" to={`/portal/${parkId}/${id}`} aria-current={section===id?'page':undefined}>{l}{id==='reviews'&&open>0&&<span className="count">{open}</span>}</PLink>:<span key={id} className="nav-item locked" title="Vai trò hiện tại không có quyền này">{l}<span className="lock" aria-hidden="true">🔒</span></span>;
 useEffect(()=>{if(ctx)localStorage.setItem(LAST_PARK,ctx.park.id)},[ctx]);
 return <>
  <Topbar parkId={parkId}/>
  {ctx&&<nav className="mobile-nav" aria-label="Điều hướng KCN">{NAV.map(link)}</nav>}
  <div className={ctx?'layout':''}>
   {ctx&&<aside className="side"><div className="side-park"><b>{ctx.park.name}</b><small>{ctx.role.name}</small></div><nav aria-label="Điều hướng KCN">{NAV.map(link)}</nav></aside>}
   <main className="main" id="main">
    {ctx?.decisions.suspended&&<div className="notice warn" style={{marginBottom:16}}><b>Chủ sở hữu đang bị tạm khoá.</b> Duyệt và xuất bản bị khoá cho đến khi quản trị nền tảng mở khoá hoặc chỉ định Chủ sở hữu thay thế. Soạn nháp và gửi duyệt vẫn hoạt động.</div>}
    {ctx&&!ctx.decisions.suspended&&ctx.decisions.owners!==1&&<div className="notice warn" style={{marginBottom:16}}><b>KCN chưa có Chủ sở hữu hoạt động.</b> Duyệt và xuất bản bị khoá. Soạn nháp và gửi duyệt vẫn hoạt động.</div>}
    {children}
   </main>
  </div>
 </>;
}
export function Denied({message}:{message?:string}){return <div className="denied"><div className="icon" aria-hidden="true">🔒</div><h1 style={{fontSize:20,margin:'0 0 6px'}}>Không có quyền truy cập hoặc nội dung không tồn tại</h1><p className="muted">{message||'Đường dẫn này không thuộc khu công nghiệp bạn được cấp quyền, hoặc nội dung không còn tồn tại.'}</p><p><PLink className="btn" to="/portal/parks">Chọn khu công nghiệp được phép</PLink></p></div>}
export function CapDenied({ctx,cap}:{ctx:ParkCtx;cap:string}){return <div className="denied"><div className="icon" aria-hidden="true">🔒</div><h1 style={{fontSize:20,margin:'0 0 6px'}}>Vai trò hiện tại không có quyền này</h1><p className="muted">Bạn là <b>{ctx.role.name}</b> tại {ctx.park.name}. Quyền cần có: {cap}.</p><p><PLink className="btn" to={`/portal/${ctx.park.id}/overview`}>Về tổng quan</PLink></p></div>}
export const fmt=(iso:string|null|undefined)=>iso?new Date(iso).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'—';
export function Loading(){return <p className="muted" role="status">Đang tải…</p>}
