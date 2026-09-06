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
interface AppState {
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
const initialRequests: IndustrialRequest[] = [
  { id: 'VIG-2026-001', kind: 'find_supply', organization: 'Korea Future Electronics', contactName: 'Kim Min-jun', email: 'minjun@example.com', phone: '+82 10 5555 0123', service: 'Premium Matching', assetType: 'Ready-built factory', industrialParkName: 'VSIP Thái Bình', location: 'Northern Vietnam', areaMin: 15000, areaMax: 20000, transaction: 'lease', budgetOrPrice: 'Negotiable', industry: 'Electronics', availabilityDate: '2027-04-01', requirements: '2–4 MVA power, clean production environment, port access.', status: 'matching', submittedAt: '2026-08-18T08:30:00Z', assignedTo: 'Lan Anh', activities: [{ id: 'a1', at: '2026-08-18T08:30:00Z', actor: 'System', action: { vi: 'Đã tiếp nhận yêu cầu', en: 'Request submitted' } }, { id: 'a2', at: '2026-08-18T10:00:00Z', actor: 'Lan Anh', action: { vi: 'Đã xác minh và bắt đầu ghép nối', en: 'Verified and started matching' } }] },
  { id: 'VIG-2026-002', kind: 'find_demand', organization: 'Northern Logistics Assets', contactName: 'Nguyễn Hải', email: 'hai@example.com', phone: '0901234567', service: 'Market Outreach', assetType: 'Warehouse', industrialParkName: 'Khu công nghiệp Đình Vũ', location: 'Hải Phòng', areaMin: 20000, areaMax: 20000, transaction: 'lease', budgetOrPrice: 'USD 4.5/m²/month', industry: 'Logistics', availabilityDate: '2026-12-01', requirements: 'Seeking regional distribution tenant.', status: 'under_review', submittedAt: '2026-08-19T02:00:00Z', assignedTo: 'Minh Phương', activities: [{ id: 'b1', at: '2026-08-19T02:00:00Z', actor: 'System', action: { vi: 'Đã tiếp nhận yêu cầu', en: 'Request submitted' } }] },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi');
  const [role, setRole] = useState<Role>('public');
  const [parks, setParks] = useState(seedParks);
  const [assets, setAssets] = useState(seedAssets);
  const publishContent = (data: IndustrialParkProfile | IndustrialAsset) => {
    if ('slug' in data) setParks(list => list.some(p=>p.id===data.id)?list.map(p=>p.id===data.id?data:p):[...list,data]);
    else setAssets(list => list.some(a=>a.id===data.id)?list.map(a=>a.id===data.id?data:a):[...list,data]);
  };
  const [requests, setRequests] = useState(initialRequests);
  const requestRef=useRef(requests);requestRef.current=requests;
  const [ownRequestIds,setOwnRequestIds]=useState<string[]>([]);
  const [chatParkId, setChatParkId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatThreads, setChatThreads] = useState<Record<string, ParkChatMessage[]>>({});
  const createRequest = (input: NewRequest) => {
    const id = `VIG-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
    const next:IndustrialRequest[]=[...requestRef.current, { ...input, id, revision:1, direction:'inbound', status: 'submitted', submittedAt: now(), assignedTo: 'Unassigned', activities: [{ id: crypto.randomUUID(), at: now(), actor: 'System', action: { vi: 'Đã tiếp nhận yêu cầu', en: 'Request submitted' } }] }];
    requestRef.current=next;setRequests(next);setOwnRequestIds(ids=>[...ids,id]);
    return id;
  };
  const transitionRequest = (id: string, to: RequestStatus, reason?: string, outcome?:ConnectionOutcome, expectedRevision?:number, actor='VIG Admin', selectedParkId?:string) => {
    const current = requestRef.current.find(r => r.id === id); if (role!=='admin'||!current || expectedRevision!==(current.revision||1)||!canTransition(current.status, to) || (to === 'rejected' && !reason?.trim())||(to==='closed'&&!validOutcome(outcome))||(to==='connection_scheduled'&&(!reason?.trim()||!parks.some(p=>p.id===selectedParkId&&p.publicationStatus==='published'&&(!current.parkId||current.parkId===p.id)&&!candidateChecks(current,p,assets).some(c=>c.state==='unmatched'))))) return false;
    const next=requestRef.current.map(r => r.id === id ? { ...r, status: to, revision:(r.revision||1)+1, outcome:to==='closed'?outcome:r.outcome,selectedParkId:selectedParkId||r.selectedParkId,coordinationNote:to==='connection_scheduled'?reason:r.coordinationNote,rejectionReason: to === 'rejected' ? reason : r.rejectionReason, activities: [...r.activities, { id: crypto.randomUUID(), at: now(), actor, action: { vi: `Chuyển trạng thái sang ${to}${reason?': '+reason:''}`, en: `Status changed to ${to}${reason?': '+reason:''}` } }] } : r);
    requestRef.current=next;setRequests(next);return true;
  };
  const assignRequest=(id:string,assignee:string,revision:number,actor:string)=>{const r=requestRef.current.find(r=>r.id===id);if(role!=='admin'||!r||(r.revision||1)!==revision)return false;const next=requestRef.current.map(r=>r.id===id?{...r,assignedTo:assignee,revision:revision+1,activities:[...r.activities,{id:crypto.randomUUID(),at:now(),actor,action:{vi:`Phân công: ${r.assignedTo} → ${assignee}`,en:`Assigned: ${r.assignedTo} → ${assignee}`}}]}:r);requestRef.current=next;setRequests(next);return true};
  const updateParkPublication = (id: string, status: PublicationStatus) => setParks(list => list.map(p => p.id === id ? { ...p, publicationStatus: status } : p));
  const openParkChat = (parkId: string, assetId?:string) => {
    const park = parks.find(candidate => candidate.id === parkId);
    if (!park||park.publicationStatus!=='published'||assetId&&!assets.some(a=>a.id===assetId&&a.parkId===parkId)) return;
    setChatThreads(threads => threads[parkId] ? threads : {
      ...threads,
      [parkId]: [{
        id: crypto.randomUUID(),
        sender: 'supplier', at:now(),status:'sent',
        text: {
          vi: `Xin chào, chúng tôi là bộ phận tư vấn của ${park.name.vi}. Bạn cần thông tin về quỹ đất, nhà xưởng hay hạ tầng kỹ thuật?`,
          en: `Hello, this is the advisory team at ${park.name.en}. How can we help with land, factories, or infrastructure?`,
          zh: `您好，我们是${park.name.zh || park.name.en}的咨询团队。您需要了解土地、厂房还是基础设施？`,
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
    const value=text.trim();if(!value||!chatParkId||!parks.some(p=>p.id===chatParkId&&p.publicationStatus==='published'))return;
    const id=crypto.randomUUID(),parkId=chatParkId;
    setChatThreads(threads=>({...threads,[parkId]:[...(threads[parkId]||[]),{id,sender:'user',text:{vi:value,en:value,zh:value},at:now(),status:'sending'}]}));
    deliver(parkId,id,fail);
  };
  const retryParkChatMessage=(id:string)=>{
    if(!chatParkId||pendingChat.current.has(id)||!parks.some(p=>p.id===chatParkId&&p.publicationStatus==='published'))return;
    const message=chatThreads[chatParkId]?.find(m=>m.id===id);
    if(message?.status!=='failed')return;
    setChatThreads(threads=>({...threads,[chatParkId]:threads[chatParkId].map(m=>m.id===id?{...m,status:'sending'}:m)}));
    deliver(chatParkId,id);
  };
  const resetDemo = () => { pendingChat.current.forEach(clearTimeout);pendingChat.current.clear(); setParks(seedParks); setAssets(seedAssets);requestRef.current=initialRequests; setRequests(initialRequests);setOwnRequestIds([]); setChatParkId(null); setChatOpen(false); setChatThreads({}); setRole('public'); setLanguage('vi'); };
  const value = useMemo(() => ({ language, setLanguage, role, setRole, parks, assets, expos, requests, ownRequestIds,createRequest, transitionRequest,assignRequest, updateParkPublication, publishContent, resetDemo, chatParkId, chatOpen, chatThreads, openParkChat, closeParkChat, toggleParkChat, sendParkChatMessage,retryParkChatMessage }), [language, role, parks, assets, requests,ownRequestIds, chatParkId, chatOpen, chatThreads]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useApp = () => { const x = useContext(Context); if (!x) throw new Error('AppProvider required'); return x; };
export const tr = (value: { vi: string; en: string; zh?: string }, language: Language) =>
  language === 'vi' ? value.vi : language === 'zh' ? value.zh || translateToChinese(value.en) : value.en;
