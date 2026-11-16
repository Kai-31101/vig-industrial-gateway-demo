import {remoteEnabled,api,ensureSession} from './remote';
import {initialRequests as baseRequests} from './requestFixtures';
import {mockLeasingRequests} from './requestMockData';
const initialRequests=[...baseRequests,...mockLeasingRequests];
import {publicInventory,CONTENT_KEY} from './contentRepository';
import {registerPublished,resetMembership} from './publicMembership';
import {validLeasingContext,isPublicPark,isPublicAsset} from './leasing';
import { createContext, useContext, useMemo, useState, useRef, useEffect } from 'react';
import {candidateChecks} from './matching';
import {validOutcome} from './connectionLogic';
import type {ConnectionOutcome} from './types';
import { parks as seedParks, assets as seedAssets, expos as seedExpos } from './data';
import {mockTradeExpos,visibleVigExpos} from './tradeExpoFixtures';
const expos=seedExpos.filter(e=>visibleVigExpos(mockTradeExpos).some(m=>m.id===e.id)).map(e=>{const m=mockTradeExpos.find(m=>m.id===e.id)!;return {...e,title:m.title,date:m.start,status:m.status,market:e.id==='expo-cn'?'China–Vietnam':'Global–Vietnam',industries:m.industries.en.split(' • '),exhibitors:m.booked,analytics:{...e.analytics,products:m.products}}});
import type { IndustrialAsset } from './types';
import { canTransition } from './logic';
import { translateToChinese } from './i18n';
import type { IndustrialParkProfile, IndustrialRequest, Language, ParkChatMessage, PublicationStatus, RequestStatus } from './types';

type Role = 'public' | 'admin';
type NewRequest = Omit<IndustrialRequest, 'id' | 'status' | 'submittedAt' | 'assignedTo' | 'activities'>;
interface AppState { dataLoading?:boolean; dataError?:string; createRequestRemote?:(input:NewRequest)=>Promise<string>;
  language: Language; setLanguage: (l: Language) => void; role: Role; setRole: (r: Role) => void;
  parks: IndustrialParkProfile[]; assets: IndustrialAsset[]; expos: typeof expos; requests: IndustrialRequest[];
  publishContent: (data: IndustrialParkProfile | IndustrialAsset) => void;
  createRequest: (input: NewRequest) => string; ownRequestIds: string[];
  transitionRequest: (id: string, to: RequestStatus, reason?: string, outcome?:ConnectionOutcome, expectedRevision?:number, actor?:string, selectedParkId?:string) => boolean;
  assignRequest: (id:string,assignee:string,revision:number,actor:string)=>boolean;
  updateParkPublication: (id: string, status: PublicationStatus) => void; resetDemo: () => void;
  chatParkId: string | null; chatOpen: boolean; chatThreads: Record<string, ParkChatMessage[]>;
  openParkChat: (parkId: string, assetId?:string) => void; closeParkChat: () => void; toggleParkChat: () => void; sendParkChatMessage: (text: string, fail?:boolean) => void; retryParkChatMessage:(id:string)=>void;
}

const Context = createContext<AppState | null>(null);
const now = () => new Date().toISOString();


export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi');
  const [role, setRole] = useState<Role>('public');
  const [parks, setParks] = useState<IndustrialParkProfile[]>(()=>remoteEnabled?[]:publicInventory().parks);
  const [assets, setAssets] = useState<IndustrialAsset[]>(()=>remoteEnabled?[]:publicInventory().assets);
  useEffect(()=>{if(remoteEnabled)return;const sync=()=>{const next=publicInventory();setParks(next.parks);setAssets(next.assets)};window.addEventListener('storage',sync);window.addEventListener('vsip-content-updated',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('vsip-content-updated',sync)}},[]);
  const publishContent = (data: IndustrialParkProfile | IndustrialAsset) => {
    registerPublished('slug'in data?'park':'asset',data.id);
    if ('slug' in data) setParks(list => list.some(p=>p.id===data.id)?list.map(p=>p.id===data.id?data:p):[...list,data]);
    else setAssets(list => list.some(a=>a.id===data.id)?list.map(a=>a.id===data.id?data:a):[...list,data]);
  };
  const [requests, setRequests] = useState<IndustrialRequest[]>(remoteEnabled?[]:initialRequests);
  const [dataError,setDataError]=useState('');const [dataLoading,setDataLoading]=useState(remoteEnabled);
  const requestRef=useRef(requests);requestRef.current=requests;
  const [ownRequestIds,setOwnRequestIds]=useState<string[]>([]);
  const [chatParkId, setChatParkId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatThreads, setChatThreads] = useState<Record<string, ParkChatMessage[]>>({});
  useEffect(()=>{if(!remoteEnabled)return;
    const update=(r:any)=>{r.parks.forEach((p:IndustrialParkProfile)=>registerPublished('park',p.id));r.assets.forEach((a:IndustrialAsset)=>registerPublished('asset',a.id));setParks(r.parks);setAssets(r.assets)};
    const refresh=()=>{setDataLoading(true);api('catalogue').then(r=>{update(r);setDataError('')}).catch(()=>setDataError('network')).finally(()=>setDataLoading(false))};
    const admin=(e:Event)=>{const r=(e as CustomEvent).detail;update(r.inventory);setRequests(r.requests);requestRef.current=r.requests};
    const receipt=(e:Event)=>{const r=(e as CustomEvent).detail;setRequests(rows=>[...rows.filter(x=>x.id!==r.id),r]);setOwnRequestIds(ids=>{const next=[...new Set([...ids,r.id])];sessionStorage.setItem('vsip-own-requests',JSON.stringify(next));return next})};window.addEventListener('vsip-request-created',receipt);
    refresh();window.addEventListener('vsip-public-refresh',refresh);window.addEventListener('vsip-remote-state',admin);
    const own=JSON.parse(sessionStorage.getItem('vsip-own-requests')||'[]');if(own.length){setOwnRequestIds(own);ensureSession().then(()=>api('requests')).then(r=>setRequests(r.filter((x:any)=>own.includes(x.id)))).catch(()=>{})}
    return()=>{window.removeEventListener('vsip-request-created',receipt);window.removeEventListener('vsip-public-refresh',refresh);window.removeEventListener('vsip-remote-state',admin)};
  },[]);
  const createRequestRemote=async(input:NewRequest)=>{await ensureSession();const r=await api<IndustrialRequest>('requests',{...input,idempotencyKey:input.idempotencyKey||crypto.randomUUID()});setRequests(rows=>[...rows,r]);setOwnRequestIds(ids=>{const next=[...ids,r.id];sessionStorage.setItem('vsip-own-requests',JSON.stringify(next));return next});return r.id};
  const createRequest = (input: NewRequest) => {
    if(!validLeasingContext(input,parks,assets)) throw new Error("Unsupported leasing enquiry context");
    const id = `VSIP-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const next:IndustrialRequest[]=[...requestRef.current, { ...input, id, revision:1, direction:'inbound', status: 'submitted', submittedAt: now(), assignedTo: 'Unassigned', activities: [{ id: crypto.randomUUID(), at: now(), actor: 'System', action: { vi: 'Đã tiếp nhận yêu cầu', en: 'Request submitted' } }] }];
    requestRef.current=next;setRequests(next);setOwnRequestIds(ids=>[...ids,id]);
    return id;
  };
  const transitionRequest = (id: string, to: RequestStatus, reason?: string, outcome?:ConnectionOutcome, expectedRevision?:number, actor='VSIP Admin', selectedParkId?:string) => {
    const current = requestRef.current.find(r => r.id === id); if (role!=='admin'||!current || expectedRevision!==(current.revision||1)||!canTransition(current.status, to) || (to === 'rejected' && !reason?.trim())||(to==='closed'&&!validOutcome(outcome))||(to==='connection_scheduled'&&(!reason?.trim()||!parks.some(p=>p.id===selectedParkId&&isPublicPark(p)&&(!current.parkId||current.parkId===p.id)&&!candidateChecks(current,p,assets).some(c=>c.state==='unmatched'))))) return false;
    const next=requestRef.current.map(r => r.id === id ? { ...r, status: to, revision:(r.revision||1)+1, outcome:to==='closed'?outcome:r.outcome,selectedParkId:selectedParkId||r.selectedParkId,coordinationNote:to==='connection_scheduled'?reason:r.coordinationNote,rejectionReason: to === 'rejected' ? reason : r.rejectionReason, activities: [...r.activities, { id: crypto.randomUUID(), at: now(), actor, action: { vi: `Chuyển trạng thái sang ${to}${reason?': '+reason:''}`, en: `Status changed to ${to}${reason?': '+reason:''}` } }] } : r);
    requestRef.current=next;setRequests(next);return true;
  };
  const assignRequest=(id:string,assignee:string,revision:number,actor:string)=>{const r=requestRef.current.find(r=>r.id===id);if(role!=='admin'||!r||(r.revision||1)!==revision)return false;const next=requestRef.current.map(r=>r.id===id?{...r,assignedTo:assignee,revision:revision+1,activities:[...r.activities,{id:crypto.randomUUID(),at:now(),actor,action:{vi:`Phân công: ${r.assignedTo} → ${assignee}`,en:`Assigned: ${r.assignedTo} → ${assignee}`}}]}:r);requestRef.current=next;setRequests(next);return true};
  const updateParkPublication = (id: string, status: PublicationStatus) => setParks(list => list.map(p => p.id === id ? { ...p, publicationStatus: status } : p));
  const openParkChat = (parkId: string, assetId?:string) => {
    const park = parks.find(candidate => candidate.id === parkId);
    if (!park||!isPublicPark(park)||assetId&&!assets.some(a=>a.id===assetId&&a.parkId===parkId&&isPublicAsset(a,parks))) return;
    setChatThreads(threads => threads[parkId] ? threads : {
      ...threads,
      [parkId]: [{
        id: crypto.randomUUID(),
        sender: 'supplier', at:now(),status:'sent',
        text: {
          vi: `Xin chào, đây là Bộ phận Tiếp thị & Cho thuê VSIP (mô phỏng), hỗ trợ thông tin về ${park.name.vi}. Bạn cần thông tin về quỹ đất, nhà xưởng hay hạ tầng kỹ thuật?`,
          en: `Hello, this is the VSIP Marketing & Leasing Department (simulated), discussing ${park.name.en}. How can we help with land, factories, or infrastructure?`,
          zh: `您好，这里是VSIP市场推广与租赁部（模拟），为您介绍${park.name.zh || park.name.en}。您需要了解土地、厂房还是基础设施？`,
        },
      }],
    });
    if(assetId){const asset=assets.find(a=>a.id===assetId)!;setChatThreads(threads=>{const rows=threads[parkId]||[];if(rows.some(m=>m.contextOnly&&m.assetId===assetId))return threads;return {...threads,[parkId]:[...rows,{id:crypto.randomUUID(),sender:'user',assetId,contextOnly:true,status:'sent',at:now(),text:{vi:'Đang trao đổi về: '+asset.name.vi,en:'Discussing: '+asset.name.en,zh:'咨询产品：'+(asset.name.zh||asset.name.en)}}]}})}
    setChatParkId(parkId);
    setChatOpen(true);
  };
  const closeParkChat = () => setChatOpen(false);
  const toggleParkChat = () => {
    setChatOpen(value => !value);
  };
  const pendingChat=useRef(new Map<string,ReturnType<typeof setTimeout>>());
  useEffect(()=>()=>{pendingChat.current.forEach(clearTimeout)},[]);
  const deliver=(parkId:string,id:string,fail=false)=>{
    if(pendingChat.current.has(id))return;
    pendingChat.current.set(id,setTimeout(()=>{
      pendingChat.current.delete(id);
      setChatThreads(threads=>({...threads,[parkId]:(threads[parkId]||[]).map(m=>m.id===id?{...m,status:fail?'failed':'sent'}:m)}));
    },700));
  };
  const sendParkChatMessage = (text:string,fail=false)=>{
    const value=text.trim();if(!value||!chatParkId||!parks.some(p=>p.id===chatParkId&&isPublicPark(p)))return;
    const id=crypto.randomUUID(),parkId=chatParkId;
    setChatThreads(threads=>({...threads,[parkId]:[...(threads[parkId]||[]),{id,sender:'user',text:{vi:value,en:value,zh:value},at:now(),status:'sending'}]}));
    deliver(parkId,id,fail);
  };
  const retryParkChatMessage=(id:string)=>{
    if(!chatParkId||pendingChat.current.has(id)||!parks.some(p=>p.id===chatParkId&&isPublicPark(p)))return;
    const message=chatThreads[chatParkId]?.find(m=>m.id===id);
    if(message?.status!=='failed')return;
    setChatThreads(threads=>({...threads,[chatParkId]:threads[chatParkId].map(m=>m.id===id?{...m,status:'sending'}:m)}));
    deliver(chatParkId,id);
  };
  const resetDemo = () => { localStorage.removeItem(CONTENT_KEY);resetMembership();window.dispatchEvent(new Event('vsip-content-updated')); pendingChat.current.forEach(clearTimeout);pendingChat.current.clear(); const restored=publicInventory();setParks(restored.parks); setAssets(restored.assets);requestRef.current=initialRequests; setRequests(initialRequests);setOwnRequestIds([]); setChatParkId(null); setChatOpen(false); setChatThreads({}); setRole('public'); setLanguage('vi'); };
  const value = useMemo(() => ({ dataLoading,dataError,createRequestRemote:remoteEnabled?createRequestRemote:undefined,language, setLanguage, role, setRole, parks, assets, expos, requests, ownRequestIds,createRequest, transitionRequest,assignRequest, updateParkPublication, publishContent, resetDemo, chatParkId, chatOpen, chatThreads, openParkChat, closeParkChat, toggleParkChat, sendParkChatMessage,retryParkChatMessage }), [dataLoading,dataError,language, role, parks, assets, requests,ownRequestIds, chatParkId, chatOpen, chatThreads]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useApp = () => { const x = useContext(Context); if (!x) throw new Error('AppProvider required'); return x; };
export const tr = (value: { vi: string; en: string; zh?: string }, language: Language) =>
  language === 'vi' ? value.vi?.trim() || value.en?.trim() || value.zh || '' : language === 'zh' ? value.zh?.trim() || (value.en?.trim()?translateToChinese(value.en):value.vi) || '' : value.en?.trim() || value.vi?.trim() || value.zh || '';

export function useRequestActions(){const app=useApp();return {...app,createRequest:async(input:NewRequest)=>app.createRequestRemote?app.createRequestRemote(input):app.createRequest(input)}}
