import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useLocation,useNavigationType} from 'react-router-dom';
import {useApp} from './AppContext';

export function useMobile(){
  const [mobile,setMobile]=useState(()=>window.matchMedia?.('(max-width: 680px)').matches??false);
  useEffect(()=>{const query=window.matchMedia?.('(max-width: 680px)');if(!query)return;const sync=()=>setMobile(query.matches);sync();query.addEventListener('change',sync);return()=>query.removeEventListener('change',sync)},[]);
  return mobile;
}

export function MobileMenu({open,close,children,label}:{open:boolean;close:()=>void;children:ReactNode;label:string}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open){dialog.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{dialog.close();document.body.style.overflow=previous}}},[open]);
  return <dialog ref={ref} className="mobile-nav-dialog" aria-label={label} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===e.currentTarget)close()}}><button className="mobile-nav-close" aria-label={label} onClick={close}>×</button><nav>{children}</nav></dialog>;
}

export function MobileActionBar({children}:{children:ReactNode}){
  const mobile=useMobile();const {chatOpen}=useApp();const [editing,setEditing]=useState(false);const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const sync=()=>setEditing(!!document.activeElement?.matches('input,textarea,select,[contenteditable="true"]'));document.addEventListener('focusin',sync);document.addEventListener('focusout',sync);return()=>{document.removeEventListener('focusin',sync);document.removeEventListener('focusout',sync)}},[]);
  useLayoutEffect(()=>{if(!mobile)return;document.body.classList.add('has-mobile-actions');const el=ref.current;const sync=()=>document.documentElement.style.setProperty('--action-bar-h',`${el?.getBoundingClientRect().height||0}px`);sync();const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(sync):null;if(el)observer?.observe(el);return()=>{observer?.disconnect();document.body.classList.remove('has-mobile-actions');document.documentElement.style.removeProperty('--action-bar-h')}},[mobile,chatOpen,editing]);
  const wasChat=useRef(chatOpen);
  useEffect(()=>{if(wasChat.current&&!chatOpen&&mobile)ref.current?.querySelector<HTMLButtonElement>('[data-chat]')?.focus();wasChat.current=chatOpen},[chatOpen,mobile]);
  if(!mobile)return null;
  return <div className="mobile-action-bar" ref={ref} hidden={chatOpen||editing}>{children}</div>;
}

export function MobileDisclosure({title,children}:{title:string;children:ReactNode}){
  const mobile=useMobile();return mobile?<details className="mobile-disclosure"><summary>{title}</summary>{children}</details>:<>{children}</>;
}

const scrollPositions=new Map<string,number>();
export function PublicScrollRestore(){
  const location=useLocation(),navigation=useNavigationType();const {language}=useApp();
  const key=`${location.pathname}${location.search}:${language}`;
  useLayoutEffect(()=>{
    const list=/^\/(home|assets|industrial-parks)$/.test(location.pathname);
    if(navigation==='POP'&&list){const y=scrollPositions.get(key);if(y!==undefined)window.scrollTo({top:y,behavior:'instant'});}
    else if(navigation==='PUSH')window.scrollTo({top:0,behavior:'instant'});
    let latest=window.scrollY;const save=()=>{latest=window.scrollY};window.addEventListener('scroll',save,{passive:true});
    return()=>{scrollPositions.set(key,latest);window.removeEventListener('scroll',save)};
  },[key,navigation,location.pathname]);
  return null;
}
