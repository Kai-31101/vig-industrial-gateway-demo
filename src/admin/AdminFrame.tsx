import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {Sparkles,LayoutDashboard,Factory,BarChart3,ClipboardCheck,Warehouse,Download,PackageSearch,Users,ShieldCheck,Menu,X,Globe2,RotateCcw} from 'lucide-react';
import {BrandLogo} from '../BrandLogo';
import {useAdminActions as useAdmin} from './AdminContext';
import {routePermission,firstAdminPage} from './model';
import {AdminLanguage,Confirm,useText} from './ui';

export function AdminFrame({children}:{children:ReactNode}){
 const a=useAdmin(),t=useText(),location=useLocation(),navigate=useNavigate();
 const [open,setOpen]=useState(false),[reset,setReset]=useState(false),[busy,setBusy]=useState(false);
 const drawer=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{setOpen(false);window.scrollTo({top:0,behavior:"instant"})},[location.pathname]);
 useEffect(()=>{if(open)drawer.current?.showModal?.();else drawer.current?.close?.()},[open]);
 const groups=[
  {title:t('Không gian làm việc','Workspace','工作空间'),items:[['/admin/assistant',Sparkles,t('Trợ lý AI','AI assistant','AI助手')],['/admin/dashboard',LayoutDashboard,t('Tổng quan','Overview','概览')],['/admin/requests',ClipboardCheck,t('Nhu cầu thuê','Leasing enquiries','租赁需求')],['/admin/expos',BarChart3,t('Báo cáo Expo','Expo reports','展会报告')]]},
  {title:t('Danh mục & nội dung','Catalogue & content','目录与内容'),items:[['/admin/industrial-parks',Factory,t('Khu công nghiệp','Industrial parks','工业园区')],['/admin/assets',Warehouse,t('Mặt bằng','Assets','物业')],['/admin/imports',Download,t('Nhập hàng loạt','Batch import','批量导入')],['/admin/packages',PackageSearch,t('Gói hỗ trợ','Support packages','服务套餐')]]},
  {title:t('Quản trị','Administration','系统管理'),items:[['/admin/users',Users,t('Người dùng','Users','用户')],['/admin/permissions',ShieldCheck,t('Phân quyền','Permissions','权限')]]},
 ];
 const current=groups.flatMap(g=>g.items).find(([path])=>location.pathname.startsWith(String(path)));
 const publicPortal=()=>{navigate('/home');a.logout()};
 const navigation=<nav aria-label={t('Điều hướng quản trị','Administration navigation','管理导航')}>{groups.map(g=>{const items=g.items.filter(([path])=>a.can(routePermission(String(path))));return items.length>0&&<section className="admin-nav-group" key={g.title}><h2>{g.title}</h2>{items.map(([path,Icon,label])=>{const I=Icon as typeof Factory;const active=location.pathname.startsWith(String(path));return <Link key={String(path)} to={String(path)} title={String(label)} aria-label={String(label)} aria-current={active?'page':undefined} className={active?'active':''}><I size={19}/><span>{String(label)}</span></Link>})}</section>})}</nav>;
 const brand=<Link to={firstAdminPage(a.current,a.store.matrix)} className="workspace-brand"><BrandLogo compact/><span>{t('Quản trị cho thuê','Leasing workspace','租赁管理')}</span></Link>;
 const actions=<div className="workspace-nav-actions"><button type="button" onClick={publicPortal}><Globe2 size={18}/><span>{t('Trang công khai','Public website','公开网站')}</span></button><button type="button" disabled={!a.writable||!a.can('P06')} onClick={()=>{setOpen(false);setReset(true)}}><RotateCcw size={18}/><span>{t('Khôi phục demo','Reset demo','重置演示')}</span></button></div>;
 return <div className="vsip-admin"><aside className="workspace-sidebar">{brand}{navigation}{actions}</aside><div className="workspace-main"><header className="workspace-header"><button ref={trigger} className="workspace-menu" onClick={()=>setOpen(true)} aria-expanded={open} aria-label={t('Mở điều hướng','Open navigation','打开导航')}><Menu size={21}/></button><div className="workspace-context"><small>VSIP · {t('Bộ phận Tiếp thị & Cho thuê','Marketing & Leasing','市场推广与租赁部门')}</small><strong>{String(current?.[2]||t('Quản trị','Administration','管理'))}</strong></div><AdminLanguage/><div className="workspace-user" title={a.current?.name}><span aria-hidden="true">{(a.current?.name||'VSIP').split(' ').filter(Boolean).slice(-2).map(s=>s[0]).join('')}</span><b>{a.current?.name}</b></div></header><main className="admin-surface">{children}</main></div>
 <dialog ref={drawer} className="workspace-drawer" onClose={()=>{setOpen(false);trigger.current?.focus()}} aria-label={t('Điều hướng quản trị','Administration navigation','管理导航')}><div className="drawer-heading">{brand}<button autoFocus onClick={()=>setOpen(false)} aria-label={t('Đóng điều hướng','Close navigation','关闭导航')}><X/></button></div>{navigation}{actions}</dialog>
 {reset&&<Confirm title={t('Khôi phục dữ liệu demo?','Reset demo data?','重置演示数据？')} actionLabel={t('Khôi phục demo','Reset demo','重置演示')} danger busy={busy} onCancel={()=>setReset(false)} onConfirm={async()=>{if(busy)return;setBusy(true);try{await a.reset();setReset(false)}finally{setBusy(false)}}}><p>{t('Nội dung bạn nhập trong workspace demo sẽ bị xóa và thay bằng bộ dữ liệu ban đầu.','Your authored content in this demo workspace will be replaced with the initial dataset.','当前演示工作区的编辑内容将被初始数据替换。')}</p></Confirm>}
 </div>;
}
