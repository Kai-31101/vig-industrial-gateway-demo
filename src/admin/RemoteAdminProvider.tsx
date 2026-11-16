import {useState,useRef,useCallback,type ReactNode} from 'react';
import {AdminContext,type AdminState} from './AdminContext';
import {initialAdmin,permissions} from './model';
import {api,ensureSession} from '../remote';
import {useApp} from '../AppContext';
export function RemoteAdminProvider({children}:{children:ReactNode}){
 const app=useApp();const [store,setStore]=useState(()=>initialAdmin([],[]));const [loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[scope,setScope]=useState('demo');const revision=useRef(0),opening=useRef(false),writing=useRef(false);
 const apply=useCallback((r:any)=>{setStore(r.store);revision.current=r.revision;setScope(r.scope);setLoaded(true);setError('');app.setRole('admin');window.dispatchEvent(new CustomEvent('vsip-remote-state',{detail:r}));},[]);
 const enterDemo=useCallback(()=>{if(opening.current)return;opening.current=true;setBusy(true);ensureSession().then(()=>api('admin/state')).then(apply).catch(e=>setError(e.message)).finally(()=>{opening.current=false;setBusy(false)})},[apply]);
 const command=async(action:string,args:any[])=>{if(writing.current)return {ok:false,error:'busy'};writing.current=true;setBusy(true);try{if(action==='reset'){await api('admin/reset',{});apply(await api('admin/state'));return {ok:true}}const r=await api('admin/command',{action,args,revision:revision.current});apply(r);return r.result}catch(e){const error=e instanceof Error?e.message:'server';setError(error);return {ok:false,error}}finally{writing.current=false;setBusy(false)}};
 const unavailable=()=>({ok:false,error:'server'});
 const value={store,current:loaded?store.users.find(u=>u.id==='sa'):undefined,can:(p:string)=>loaded&&permissions(store.users.find(u=>u.id==='sa'),store.matrix).includes(p),writable:loaded&&!busy,recovery:false,deploymentDrift:false,enterDemo,logout:()=>{api('session/logout',{}).then(()=>{setLoaded(false);app.setRole('public');window.dispatchEvent(new Event('vsip-public-refresh'));location.href='/home'}).catch(e=>setError(e.message))},reset:unavailable,login:unavailable,accept:unavailable,configure:unavailable,retryDelivery:unavailable,manageRequest:unavailable,assignConnection:unavailable,invite:unavailable,revoke:unavailable,updateUser:unavailable,save:unavailable,workflow:unavailable,addBatch:unavailable,applyBatch:unavailable,savePackage:unavailable,reconcile:unavailable,restoreBackup:unavailable,remoteCommand:command,remoteError:error,remoteScope:scope,remoteBusy:busy} as AdminState;
 return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
