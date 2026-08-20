import { createContext, useContext, useMemo, useState } from 'react';
import { parks as seedParks, assets, expos } from './data';
import { canTransition } from './logic';
import { translateToChinese } from './i18n';
import type { IndustrialParkProfile, IndustrialRequest, Language, ParkChatMessage, PublicationStatus, RequestStatus } from './types';

type Role = 'public' | 'admin';
type NewRequest = Omit<IndustrialRequest, 'id' | 'status' | 'submittedAt' | 'assignedTo' | 'activities'>;
interface AppState {
  language: Language; setLanguage: (l: Language) => void; role: Role; setRole: (r: Role) => void;
  parks: IndustrialParkProfile[]; assets: typeof assets; expos: typeof expos; requests: IndustrialRequest[];
  createRequest: (input: NewRequest) => string; transitionRequest: (id: string, to: RequestStatus, reason?: string) => boolean;
  updateParkPublication: (id: string, status: PublicationStatus) => void; resetDemo: () => void;
  chatParkId: string | null; chatOpen: boolean; chatThreads: Record<string, ParkChatMessage[]>;
  openParkChat: (parkId: string) => void; closeParkChat: () => void; toggleParkChat: () => void; sendParkChatMessage: (text: string) => void;
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
  const [requests, setRequests] = useState(initialRequests);
  const [chatParkId, setChatParkId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatThreads, setChatThreads] = useState<Record<string, ParkChatMessage[]>>({});
  const createRequest = (input: NewRequest) => {
    const id = `VIG-2026-${String(requests.length + 1).padStart(3, '0')}`;
    setRequests(x => [...x, { ...input, id, status: 'submitted', submittedAt: now(), assignedTo: 'Unassigned', activities: [{ id: crypto.randomUUID(), at: now(), actor: 'System', action: { vi: 'Đã tiếp nhận yêu cầu', en: 'Request submitted' } }] }]);
    return id;
  };
  const transitionRequest = (id: string, to: RequestStatus, reason?: string) => {
    const current = requests.find(r => r.id === id); if (!current || !canTransition(current.status, to) || (to === 'rejected' && !reason?.trim())) return false;
    setRequests(list => list.map(r => r.id === id ? { ...r, status: to, rejectionReason: to === 'rejected' ? reason : r.rejectionReason, activities: [...r.activities, { id: crypto.randomUUID(), at: now(), actor: 'VIG Admin', action: { vi: `Chuyển trạng thái sang ${to}`, en: `Status changed to ${to}` } }] } : r)); return true;
  };
  const updateParkPublication = (id: string, status: PublicationStatus) => setParks(list => list.map(p => p.id === id ? { ...p, publicationStatus: status } : p));
  const openParkChat = (parkId: string) => {
    const park = parks.find(candidate => candidate.id === parkId);
    if (!park) return;
    setChatThreads(threads => threads[parkId] ? threads : {
      ...threads,
      [parkId]: [{
        id: crypto.randomUUID(),
        sender: 'supplier',
        text: {
          vi: `Xin chào, chúng tôi là bộ phận tư vấn của ${park.name.vi}. Bạn cần thông tin về quỹ đất, nhà xưởng hay hạ tầng kỹ thuật?`,
          en: `Hello, this is the advisory team at ${park.name.en}. How can we help with land, factories, or infrastructure?`,
          zh: `您好，我们是${park.name.zh || park.name.en}的咨询团队。您需要了解土地、厂房还是基础设施？`,
        },
      }],
    });
    setChatParkId(parkId);
    setChatOpen(true);
  };
  const closeParkChat = () => setChatOpen(false);
  const toggleParkChat = () => {
    if (!chatParkId) openParkChat(parks[0].id);
    else setChatOpen(value => !value);
  };
  const sendParkChatMessage = (text: string) => {
    const value = text.trim();
    if (!value || !chatParkId) return;
    setChatThreads(threads => ({
      ...threads,
      [chatParkId]: [
        ...(threads[chatParkId] || []),
        { id: crypto.randomUUID(), sender: 'user', text: { vi: value, en: value, zh: value } },
        {
          id: crypto.randomUUID(),
          sender: 'supplier',
          text: {
            vi: 'Cảm ơn bạn. Khu công nghiệp đã tiếp nhận nội dung và sẽ phản hồi chi tiết trong bước kết nối tiếp theo.',
            en: 'Thank you. The industrial park has received your message and will provide details during the next connection step.',
            zh: '谢谢。工业园区已收到您的消息，并将在下一步对接中提供详细信息。',
          },
        },
      ],
    }));
  };
  const resetDemo = () => { setParks(seedParks); setRequests(initialRequests); setChatParkId(null); setChatOpen(false); setChatThreads({}); setRole('public'); setLanguage('vi'); };
  const value = useMemo(() => ({ language, setLanguage, role, setRole, parks, assets, expos, requests, createRequest, transitionRequest, updateParkPublication, resetDemo, chatParkId, chatOpen, chatThreads, openParkChat, closeParkChat, toggleParkChat, sendParkChatMessage }), [language, role, parks, requests, chatParkId, chatOpen, chatThreads]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useApp = () => { const x = useContext(Context); if (!x) throw new Error('AppProvider required'); return x; };
export const tr = (value: { vi: string; en: string; zh?: string }, language: Language) =>
  language === 'vi' ? value.vi : language === 'zh' ? value.zh || translateToChinese(value.en) : value.en;
