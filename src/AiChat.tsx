import {RequestReceipt} from './ChatRequest';
import {ChatEnquiryReview} from './ChatEnquiryReview';
import {useState,useEffect,useRef,useMemo,useSyncExternalStore,Fragment} from 'react';
import {Link,useSearchParams,useLocation} from 'react-router-dom';
import {X,Send,ArrowUpRight,LoaderCircle,Maximize2,Minimize2,Plus,RotateCcw,Copy,Check} from 'lucide-react';
import {LotusChatIcon} from './LotusChatIcon';
import {useApp} from './AppContext';
import {api,ensureSession} from './remote';
import {useAdminActions} from './admin/AdminContext';
import {catalogueSplit} from './publicationState';
import {AssistantMarkdown} from './admin/AssistantMarkdown';
import {AssistantStats,AssistantMatches,type AdminLookup as Lookup} from './admin/AssistantParts';
import {cancelsEnquiry} from './enquiryCommands';
import {publicChat,type PubState,type Ctx,type Clarify} from './publicChatStore';
import './AiChat.css';
const CREATE_RE=/^(tạo (yêu cầu|request)|create (a )?(leasing )?(enquiry|request)|创建.*(需求|申请))/i;
const RESUME_RE=/^(resume|resume (my |the )?enquiry|continue (my |the )?enquiry|tiếp tục( yêu cầu( thuê)?)?|tiep tuc( yeu cau( thue)?)?|继续(需求|申请)?|恢复(需求)?)\s*[.!。！]?$/i;
type Message={role:'user'|'assistant';content:string;intake?:boolean;meta?:boolean;clarify?:Clarify;sources?:{id:string;name:{vi:string;en:string;zh?:string};href:string}[];matches?:any[];stats?:any;request?:any;offer?:boolean;review?:any;at?:number};
// Admin-only inputs: live catalogue counts and record lookups (the public assistant never receives them).
type AdminScope={parks:{published:number;draft:number};assets:{published:number;draft:number}};
type AdminLookup=Lookup;
type Choice={scopeChoice:'current'|'general';choiceFor:Ctx};
// Admin keeps its original in-memory behaviour; the public assistant uses the persisted store (src/publicChatStore.ts).
const chatMemory:Record<string,{messages:Message[];draft:any;input:string}>={};
const ctxKey=(c:{kind:string;id:string}|null|undefined)=>c?c.kind+':'+c.id:'';
// Context of the page the public chat is currently shown on (updated by the mounted instance; survives remounts).
let liveCtxKey='';
const subscribe=(l:()=>void)=>publicChat.subscribe(l),snapshot=()=>publicChat.get();
export function AiChat({scope,embedded=false,initialPrompt,scopeNote,scopeData,lookup}:{scope:'public'|'admin';embedded?:boolean;initialPrompt?:{text:string;hint?:'statistics'|'match'};scopeNote?:string;scopeData?:AdminScope;lookup?:AdminLookup}){
 const {language,chatOpen,closeParkChat,toggleParkChat,chatSelection,parks,assets,requests,dataLoading}=useApp();
 const isPublic=scope==='public';
 const t=(vi:string,en:string,zh:string)=>({vi,en,zh})[language];
 const pub=useSyncExternalStore(subscribe,snapshot,snapshot);
 // ---- admin (unchanged) local state ----
 const [aMessages,aSetMessages]=useState<Message[]>(()=>chatMemory[scope]?.messages||[]),[aInput,aSetInput]=useState(()=>chatMemory[scope]?.input||''),[aBusy,aSetBusy]=useState(false),[aError,aSetError]=useState(''),[aRetry,aSetRetry]=useState('');
 const [aDraft,aSetDraft]=useState<any>(()=>chatMemory[scope]?.draft||null),[aSuggested,aSetSuggested]=useState<any>({});
 const end=useRef<HTMLDivElement>(null),live=useRef(true),aInFlight=useRef(false);
 const [expanded,setExpanded]=useState(false),[showTasks,setShowTasks]=useState(true);
 // ---- admin assistant only (embedded): fixed head, undo, copy, auto-growing input ----
 const adminUi=!isPublic&&embedded;
 const [copied,setCopied]=useState(-1),[undo,setUndo]=useState<Message[]|null>(null),taRef=useRef<HTMLTextAreaElement>(null),undoTimer=useRef<number>(0);
 useEffect(()=>()=>window.clearTimeout(undoTimer.current),[]);
 useEffect(()=>{const el=taRef.current;if(!adminUi||!el)return;el.style.height='auto';el.style.height=Math.min(el.scrollHeight+2,160)+'px'},[aInput,adminUi]);
 // ---- unified accessors (public -> store, admin -> local state) ----
 const upd=<K extends keyof PubState>(k:K)=>(u:any)=>publicChat.set(s=>({[k]:typeof u==='function'?u(s[k]):u} as any));
 const messages:Message[]=isPublic?pub.messages:aMessages,setMessages:(u:any)=>void=isPublic?upd('messages'):aSetMessages;
 const input=isPublic?pub.input:aInput,setInput:(u:any)=>void=isPublic?upd('input'):aSetInput;
 const busy=isPublic?pub.busy:aBusy,setBusy:(u:any)=>void=isPublic?upd('busy'):aSetBusy;
 const error=isPublic?pub.error:aError,setError:(u:any)=>void=isPublic?upd('error'):aSetError;
 const draft=isPublic?pub.draft:aDraft,setDraft:(u:any)=>void=isPublic?upd('draft'):aSetDraft;
 const suggested=isPublic?pub.suggested:aSuggested,setSuggested:(u:any)=>void=isPublic?upd('suggested'):aSetSuggested;
 const retryText=isPublic?pub.retry?.text||'':aRetry;
 // Public results always land in the shared store (even after a route remount); admin keeps the mounted-only rule.
 const alive=()=>isPublic||live.current;
 useEffect(()=>{if(!isPublic)chatMemory[scope]={messages:aMessages,draft:aDraft,input:aInput}},[scope,aMessages,aDraft,aInput]);
 useEffect(()=>{live.current=true;return()=>{live.current=false}},[]);
 useEffect(()=>{if(!(isPublic||messages.length>0||busy||error))return;
  // Admin: a finished answer is shown from its first line, not from its last.
  const answers=!isPublic&&!busy&&!error&&messages[messages.length-1]?.role==='assistant'?end.current?.parentElement?.querySelectorAll('.ai-log>article'):null;
  if(answers&&answers.length)answers[answers.length-1].scrollIntoView?.({block:'start'});else end.current?.scrollIntoView?.({block:'nearest'})},[messages,busy,error]);
 // ---- public page context: the record on screen (route) or an explicit Chat-action selection on this route ----
 const location=useLocation();
 const routeCtx=useMemo<Ctx|null>(()=>{if(!isPublic)return null;
  const pm=/^\/industrial-parks\/([^/]+)\/?$/.exec(location.pathname);if(pm){const slug=decodeURIComponent(pm[1]);const p=parks.find((x:any)=>x.slug===slug);return p?{kind:'park',id:p.id}:null}
  const am=/^\/assets\/([^/]+)\/?$/.exec(location.pathname);if(am){const id=decodeURIComponent(am[1]);const a=assets.find((x:any)=>x.id===id);return a?{kind:'asset',id:a.id}:null}
  return null},[isPublic,location.pathname,parks,assets]);
 useEffect(()=>{if(!isPublic||!chatSelection||chatSelection.nonce===publicChat.get().lastNonce)return;
  publicChat.set({explicit:{kind:chatSelection.assetId?'asset':'park',id:chatSelection.assetId||chatSelection.parkId,path:location.pathname,nonce:chatSelection.nonce},lastNonce:chatSelection.nonce})},[isPublic,chatSelection?.nonce]);
 useEffect(()=>{if(isPublic){const ex=publicChat.get().explicit;if(ex&&ex.path!==location.pathname)publicChat.set({explicit:null})}},[isPublic,location.pathname]);
 // Until the (remote) catalogue has loaded, a park/property route has an UNRESOLVED context: no transitions, no sending.
 const entityRoute=/^\/(industrial-parks|assets)\/[^/]+\/?$/.test(location.pathname);
 const ctxResolved=!isPublic||!(dataLoading&&(entityRoute||!!pub.explicit));
 // An explicit (possibly restored) selection is honoured only if it exists in the loaded PUBLISHED catalogue.
 const explicitValid=!!pub.explicit&&(pub.explicit.kind==='park'?parks.some((p:any)=>p.id===pub.explicit!.id):assets.some((a:any)=>a.id===pub.explicit!.id));
 useEffect(()=>{if(isPublic&&ctxResolved&&pub.explicit&&!explicitValid)publicChat.set({explicit:null})},[isPublic,ctxResolved,explicitValid,pub.explicit?.id]);
 const explicitCtx=isPublic&&explicitValid&&pub.explicit!.path===location.pathname?{kind:pub.explicit!.kind,id:pub.explicit!.id} as Ctx:null;
 const ctx:Ctx|null=isPublic?(explicitCtx||routeCtx):null;const key=ctxKey(ctx);
 if(isPublic&&ctxResolved)liveCtxKey=key;
 // Route/context change: pending choices tied to another record become stale (history is kept).
 useEffect(()=>{if(!isPublic||!ctxResolved)return;liveCtxKey=key;const s=publicChat.get();if(s.pending&&ctxKey(s.pending.ctx)!==key)publicChat.set(st=>({pending:null,messages:st.messages.map(m=>m.clarify?.state==='active'&&ctxKey(m.clarify)!==key?{...m,clarify:{...m.clarify,state:'stale'}}:m)}))},[isPublic,key,ctxResolved]);
 const recordName=(c:Ctx|null)=>{if(!c)return null;const r:any=c.kind==='park'?parks.find((p:any)=>p.id===c.id):assets.find((a:any)=>a.id===c.id);return r?(r.name[language]||r.name.en):null};
 const scopePark=()=>{const st=publicChat.get().scopeState;if(!st||st.choice!=='current'||ctxKey(st)!==liveCtxKey)return '';return st.kind==='park'?st.id:(assets.find((a:any)=>a.id===st.id)?.parkId||'')};
 const paused=Boolean(draft?.conversation?.paused);
 // Merge only explicit, server-validated criteria; apply explicit clears; drop a park that no longer matches the location.
 const mergeCriteria=(old:any,d:any)=>{const next={...old};if(!d)return next;
  for(const k of Array.isArray(d.clear)?d.clear:[]){delete next[k];if(k==='location')delete next.parkId;if(k==='areaMin')delete next.areaMax;if(k==='availabilityDate')delete next.dateUnknown}
  for(const k of ['areaMin','areaMax'])if(typeof d[k]==='number'&&d[k]>0)next[k]=String(d[k]);
  for(const k of ['assetType','industry','location','requirements','availabilityDate','parkId'])if(typeof d[k]==='string'&&d[k])next[k]=d[k];
  if(d.availabilityDate)delete next.dateUnknown;if(d.dateUnknown===true){next.dateUnknown=true;delete next.availabilityDate}
  if(d.budget&&typeof d.budget==='object')next.budget=d.budget;
  if(typeof d.location==='string'&&d.location&&d.location!==old.location&&next.parkId&&next.parkId!==d.parkId){const park=parks.find(p=>p.id===next.parkId);if(park&&d.location!=='Not specified'&&park.region!==d.location&&park.province!==d.location)delete next.parkId}
  return next};
 // The viewed record seeds an enquiry only after the visitor chose "current" for this page (never by merely viewing it).
 const seedFrom=(c:any)=>({...c,areaMin:Number(c.areaMin)||undefined,areaMax:Number(c.areaMax)||undefined,parkId:c.parkId||(isPublic?scopePark():'')});
 const inFlight=()=>isPublic?publicChat.get().busy:aInFlight.current;
 const send=async(text=input,isRetry=false,taskHint?:'statistics'|'match',choice?:Choice)=>{if(!text.trim()||inFlight()||!ctxResolved)return;if(!isPublic)aInFlight.current=true;setShowTasks(false);setBusy(true);setError('');
 if(isPublic)publicChat.set({retry:{text,...(choice||{})},inflight:{text,...(choice||{})}});else aSetRetry(text);
 if(!choice)setInput('');const trimmed=text.trim();
 const sentKey=isPublic?liveCtxKey:'';const sentCtx=ctx;
 // A question that merely starts with the command ("Tạo yêu cầu thuê thì có mất phí không?") is not a creation command.
 const isCreate=!choice&&CREATE_RE.test(trimmed)&&!/[?？]\s*$|吗\s*$/.test(trimmed),isResume=!choice&&RESUME_RE.test(trimmed),isCancel=!choice&&cancelsEnquiry(trimmed);
 // Discovery history excludes enquiry-intake turns and chat-control turns (clarification questions, choice labels).
 // An exact cancel command reaches intake even while paused, so the paused draft is really discarded.
 const toIntake=isPublic&&!choice&&(draft?(!paused||isCreate||isResume||isCancel):isCreate);
 const history=messages.filter(m=>m.content&&!m.intake&&!m.meta&&!m.clarify).slice(-6).map(m=>({role:m.role,content:m.content}));
 // A new message while a choice is pending cancels that choice; a short typed reply may still resolve it server-side.
 const pending=isPublic&&!choice?publicChat.get().pending:null;
 if(pending)publicChat.set(st=>({pending:null,messages:st.messages.map(m=>m.clarify?.state==='active'?{...m,clarify:{...m.clarify,state:'done'}}:m)}));
 if(!isRetry&&!choice)setMessages((ms:Message[])=>[...ms,{role:'user',content:text,intake:toIntake,...(isPublic?{}:{at:Date.now()})}]);try{await ensureSession();
 const lastAssistant=[...messages].reverse().find(m=>m.role==='assistant'&&!m.request&&!m.clarify);
 const original=choice?text:trimmed;
 const discovery=()=>api('ai/'+scope,{message:text,language,taskHint,history,...(isPublic?{pageContext:sentCtx,scopeState:publicChat.get().scopeState,displayedIds:(lastAssistant?.sources||[]).map(s=>s.id),...(choice||{}),...(pending&&ctxKey(pending.ctx)===sentKey?{pendingFor:pending.ctx,pendingOriginal:pending.original}:{})}:{parkId:null})});
 const showDiscovery=(r:any)=>{
  if(isPublic&&r.clarify){const fresh=ctxKey(r.clarify)===liveCtxKey&&sentKey===liveCtxKey;
   setMessages((ms:Message[])=>[...ms,{role:'assistant',content:r.text,clarify:{kind:r.clarify.kind,id:r.clarify.id,name:r.clarify.name,original,state:fresh?'active':'stale'}}]);
   if(fresh)publicChat.set({pending:{original,ctx:{kind:r.clarify.kind,id:r.clarify.id}}});return}
  // A late reply captured on another page never attaches its scope to the page the visitor is on now.
  if(isPublic&&r.scope&&ctxKey(r.scope)===liveCtxKey)publicChat.set({scopeState:r.scope});
  setMessages((ms:Message[])=>[...ms,{role:'assistant',content:r.text,sources:r.sources,matches:r.matches,stats:r.stats,offer:r.offerRequest&&!ms.some(m=>m.offer),...(isPublic?{}:{at:Date.now()})}])};
 const intake=async(message:string,seed:any,conversation?:any)=>{
  const r=await api('ai/enquiry',{message,language,draft:seed,reviewToken:(isPublic?publicChat.get().draft:draft)?.reviewToken,conversation});
  if(!alive())return;
  if(r.request){setDraft(null);setSuggested({});window.dispatchEvent(new CustomEvent('vsip-request-created',{detail:r.request}));setMessages((ms:Message[])=>[...ms,{role:'assistant',intake:true,content:r.text,request:r.request}]);return}
  if(r.cancelled){setDraft(null);setSuggested({});setMessages((ms:Message[])=>[...ms,{role:'assistant',intake:true,content:r.text}]);return}
  if(r.action==='side_question'){
   // Answer the side question from published data, keep the draft untouched, then show how to continue.
   const d=await discovery();if(!alive())return;showDiscovery(d);if(r.resumeText)setMessages((ms:Message[])=>[...ms,{role:'assistant',intake:true,content:r.resumeText}]);return}
  setDraft({payload:r.draft,reviewToken:r.reviewToken||null,conversation:r.conversation});
  setMessages((ms:Message[])=>[...ms,{role:'assistant',intake:true,content:r.text,review:r.reviewToken?r.draft:undefined}]);
  if(r.action==='paused'&&r.followUp){const d=await discovery();if(alive())showDiscovery(d)}
 };
 if(isPublic&&!choice&&draft&&(!paused||isCreate||isResume||isCancel)){
  await intake(isCreate?'':text,draft.payload,isCreate||isResume?{...draft.conversation,paused:false}:draft.conversation);
  return;
 }
 if(isPublic&&!choice&&!draft&&isCreate){
  await intake(['Tạo yêu cầu thuê','Create leasing enquiry','创建租赁需求'].includes(trimmed)?'':text,seedFrom(suggested));
  return;
 }
 const r=await discovery();if(alive()){const merged=isPublic?mergeCriteria(isPublic?publicChat.get().suggested:suggested,r.draft):suggested;if(isPublic)setSuggested(merged);
  if(isPublic&&r.startRequest){const d=publicChat.get().draft;if(d){await intake('',d.payload,{...d.conversation,paused:false});return}await intake(text,seedFrom(merged));return}
  showDiscovery(r)}
 if(isPublic)publicChat.set({retry:null})}catch(e){if(alive()){const code=e instanceof Error?e.message:'server';setError(code);if(code==='review_expired'||code==='review_changed')setDraft((d:any)=>d?{...d,reviewToken:null}:d)}}finally{if(isPublic)publicChat.set({busy:false,inflight:null});else{aInFlight.current=false;if(live.current)aSetBusy(false)}}};
 const choose=(i:number,which:'current'|'general')=>{const m=messages[i];const c=m?.clarify;if(!c||c.state!=='active'||busy||ctxKey(c)!==key)return;
  const label=which==='current'?currentLabel(c):generalLabel();
  publicChat.set(st=>({pending:null,messages:[...st.messages.map((x,j)=>j===i?{...x,clarify:{...c,state:'done' as const}}:x),{role:'user' as const,content:'→ '+label,meta:true}]}));
  send(c.original,true,undefined,{scopeChoice:which,choiceFor:{kind:c.kind,id:c.id}})};
 const kindLabel=(k:'park'|'asset')=>k==='park'?t('KCN','park','园区'):t('mặt bằng','property','物业');
 const currentLabel=(c:Clarify)=>{const n=c.name[language]||c.name.en;return t(`Về ${n}`,`This ${kindLabel(c.kind)}: ${n}`,`当前${kindLabel(c.kind)}：${n}`)};
 const generalLabel=()=>t('Thông tin chung','General catalogue','一般信息');
 const newConversation=()=>{if(publicChat.get().draft&&!window.confirm(t('Bản nháp yêu cầu thuê chưa gửi sẽ bị xoá. Bắt đầu cuộc trò chuyện mới?','Your unsent enquiry draft will be discarded. Start a new conversation?','未发送的租赁需求草稿将被删除。开始新对话？')))return;
  publicChat.reset(publicChat.get().lastNonce);/* an explicit Chat selection already handled is not re-applied */setShowTasks(true)};
 const asked=useRef('');
 useEffect(()=>{if(initialPrompt?.text&&asked.current!==initialPrompt.text){asked.current=initialPrompt.text;send(initialPrompt.text,false,initialPrompt.hint)}},[initialPrompt?.text]);
 const suggestions=isPublic?[t('Tìm nhà xưởng 10.000–20.000 m²','Find factories of 10,000–20,000 m²','查找10,000–20,000平方米厂房'),t('So sánh các KCN miền Bắc','Compare northern industrial parks','比较北部工业园区')]:[t('Phân tích nhu cầu khách hàng','Analyse customer enquiries','分析客户需求'),t('Matching khách hàng với mặt bằng phù hợp','Match customers to suitable properties','为客户匹配合适物业')];
 const startRequest=()=>send(paused?t('Tiếp tục yêu cầu','Resume enquiry','继续需求'):t('Tạo yêu cầu thuê','Create leasing enquiry','创建租赁需求'));
 const loadOwn=async()=>{try{await ensureSession();const own=await api('requests');if(!own.length)setMessages((ms:Message[])=>[...ms,{role:'assistant',content:t('Bạn chưa gửi yêu cầu nào trong phiên này.','You have not submitted an enquiry in this session.','您尚未在此会话中提交需求。')}]);setMessages((ms:Message[])=>[...ms,...own.filter((r:any)=>!ms.some(m=>m.request?.id===r.id)).map((r:any)=>({role:'assistant' as const,content:'',request:r}))]);own.forEach((r:any)=>window.dispatchEvent(new CustomEvent('vsip-request-created',{detail:r})))}catch{setError('server')}};
 const managerTasks=[{label:t('Tổng hợp yêu cầu mới và tiến độ xử lý','Summarise new enquiries and processing progress','汇总新需求和处理进度'),hint:'statistics' as const},{label:t('Matching khách hàng với mặt bằng phù hợp','Match customers to suitable properties','为客户匹配合适物业'),hint:'match' as const},{label:t('Tìm khách hàng phù hợp cho một mặt bằng','Find customers for a property','为物业寻找合适客户'),hint:'match' as const},{label:t('Yêu cầu nào còn thiếu thông tin?','Which enquiries need more information?','哪些需求缺少信息？'),hint:'statistics' as const},{label:t('Phân tích nhu cầu theo ngành và diện tích','Analyse demand by industry and area','按行业和面积分析需求'),hint:'statistics' as const},{label:t('So sánh nhu cầu với danh mục mặt bằng','Compare demand with available properties','比较需求与物业目录'),hint:'match' as const}];
 const ctxName=recordName(ctx);
 const reqAll=requests.filter(r=>r.kind==='find_supply'),reqOpen=reqAll.filter(r=>r.status!=='closed'&&r.status!=='rejected').length,draftParks=scopeData?.parks.draft??0,draftAssets=scopeData?.assets.draft??0;
 const adminTasks:{label:string;hint:'statistics'|'match'}[]=reqAll.length>0?[{label:t('Tổng hợp yêu cầu mới và tiến độ xử lý','Summarise new enquiries and processing progress','汇总新需求和处理进度'),hint:'statistics'},{label:t('Matching khách hàng với mặt bằng phù hợp','Match customers to suitable properties','为客户匹配合适物业'),hint:'match'},{label:t('Nhu cầu thuê nào còn thiếu thông tin?','Which enquiries need more information?','哪些需求缺少信息？'),hint:'statistics'},{label:t('Phân tích nhu cầu theo ngành và diện tích','Analyse demand by industry and area','按行业和面积分析需求'),hint:'statistics'}]:[{label:t('Tóm tắt danh mục: KCN và mặt bằng đã công bố, còn nháp','Summarise the catalogue: published and draft parks and properties','目录摘要：已发布与草稿的园区和物业'),hint:'statistics'},...(draftParks+draftAssets>0?[{label:t('KCN và mặt bằng nào còn là bản nháp, chưa công bố?','Which parks and properties are still drafts, not yet published?','哪些园区和物业仍是草稿、尚未发布？'),hint:'statistics' as const}]:[])];
 const adminStatus=reqAll.length>0?t(`${reqOpen} nhu cầu thuê đang mở`,`${reqOpen} open leasing enquiries`,`${reqOpen}条进行中的租赁需求`):t('Chưa có nhu cầu thuê nào','No leasing enquiries yet','暂无租赁需求');
 const adminStatusTail=draftParks+draftAssets>0?t(` · ${draftParks} KCN và ${draftAssets} mặt bằng nháp chưa công bố`,` · ${draftParks} parks and ${draftAssets} properties are drafts, not published`,` · ${draftParks}个园区和${draftAssets}个物业为草稿，尚未发布`):'';
 const clearAdmin=()=>{const prev=aMessages;aSetMessages([]);aSetError('');setShowTasks(true);if(prev.length){setUndo(prev);window.clearTimeout(undoTimer.current);undoTimer.current=window.setTimeout(()=>setUndo(null),5000)}};
 const undoClear=()=>{if(undo){aSetMessages(undo);setShowTasks(false)}window.clearTimeout(undoTimer.current);setUndo(null)};
 const copyAnswer=async(i:number,text:string)=>{try{await navigator.clipboard.writeText(text);setCopied(i);window.setTimeout(()=>setCopied(c=>c===i?-1:c),2000)}catch{}};
 const adminErrorText=(code:string)=>code==='limited'?t('Đã đạt giới hạn lượt hỏi AI trong giờ này. Thử lại sau ít phút.','The AI question limit for this hour has been reached. Try again in a few minutes.','本小时的AI提问次数已达上限，请几分钟后重试。'):code==='session'||code==='permission'?t('Phiên làm việc đã hết hạn hoặc bạn chưa có quyền dùng trợ lý. Tải lại trang để đăng nhập lại.','Your session has expired or you lack access to the assistant. Reload the page to sign in again.','会话已过期或您无权使用助手。请刷新页面重新登录。'):/fetch|network|abort|timed? ?out|timeout/i.test(code)?t('Không kết nối được máy chủ. Kiểm tra mạng rồi bấm Thử lại.','Could not reach the server. Check your connection and press Retry.','无法连接服务器。请检查网络后点击“重试”。'):t('Trợ lý AI chưa sẵn sàng nên chưa trả lời được. Câu hỏi vẫn được giữ — bấm Thử lại sau giây lát.','The AI assistant is not ready and could not answer. Your question is kept — press Retry in a moment.','AI助手暂不可用，未能回答。您的问题已保留，请稍后点击“重试”。');
 const timeText=(at?:number)=>at?new Date(at).toLocaleTimeString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-GB',{hour:'2-digit',minute:'2-digit'}):'';
 const Log:any=adminUi?'div':Fragment;
 const retry=()=>{const r=isPublic?publicChat.get().retry:null;if(isPublic&&r)send(r.text,true,undefined,r.scopeChoice&&r.choiceFor?{scopeChoice:r.scopeChoice,choiceFor:r.choiceFor}:undefined);else send(retryText,true)};
 return <div className={embedded?"ai-workspace":"floating-chat-root ai-root"}>
 {(embedded||chatOpen)&&<section className={`ai-panel ${embedded?'ai-embedded':''} ${embedded&&!messages.length?'ai-idle':''} ${expanded?'ai-expanded':''}`} role={embedded?"region":"dialog"} aria-label={t('Trợ lý AI VSIP','VSIP AI assistant','VSIP AI助手')}>
 {adminUi&&<div className="ai-admin-head"><div className="ai-admin-head-text"><h1>{t('Trợ lý AI','AI assistant','AI助手')}</h1><p>{t('Chỉ đọc nhu cầu thuê và danh mục trong workspace; không gửi gì cho khách.','Reads leasing enquiries and the catalogue in this workspace only; sends nothing to customers.','仅读取工作区内的租赁需求和目录；不会向客户发送任何内容。')}</p><p className="ai-admin-scope">{t('Dữ liệu','Data','数据')}: <Link to="/admin/requests">{reqAll.length} {t('nhu cầu thuê','leasing enquiries','条租赁需求')}</Link>{scopeData?<> · <Link to="/admin/industrial-parks">{scopeData.parks.published} {t('KCN công bố','published parks','个已发布园区')}, {scopeData.parks.draft} {t('nháp','draft','草稿')}</Link> · <Link to="/admin/assets">{scopeData.assets.published} {t('mặt bằng công bố','published properties','个已发布物业')}, {scopeData.assets.draft} {t('nháp','draft','草稿')}</Link></>:<> · {scopeNote||`${parks.length} ${t('KCN','parks','园区')}`}</>}</p></div><div className="ai-admin-head-actions">{messages.length>0&&<button type="button" aria-expanded={showTasks} onClick={()=>setShowTasks(v=>!v)}>{showTasks?t('Ẩn gợi ý','Hide suggestions','隐藏建议'):t('Gợi ý','Suggestions','建议')}</button>}{messages.length>0&&<button type="button" onClick={clearAdmin}><Plus size={16}/>{t('Hội thoại mới','New conversation','新对话')}</button>}</div></div>}
 {!adminUi&&<header><div><strong>{t('Trợ lý AI VSIP','VSIP AI assistant','VSIP AI助手')}</strong><small>{isPublic?t('Dự án & mặt bằng','Projects & properties','园区与物业'):t('Matching & phân tích dữ liệu','Matching & data analysis','匹配与数据分析')}</small></div><div className="ai-header-actions">{!embedded&&<button onClick={()=>setExpanded(x=>!x)} aria-label={t('Mở rộng / Thu gọn','Expand / Collapse','展开 / 收起')}>{expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>}{!embedded&&<button onClick={closeParkChat} aria-label={t('Đóng','Close','关闭')}><X size={20}/></button>}</div></header>}
 {isPublic&&ctx&&ctxName&&<div className="ai-context" data-testid="ai-context">{ctx.kind==='park'?t('Đang xem: ','Viewing: ','正在查看：'):t('Đang xem mặt bằng: ','Viewing property: ','正在查看物业：')}{ctxName}</div>}
 {isPublic&&<div className="ai-request-bar"><button onClick={startRequest}><Plus size={16}/>{paused?t('Tiếp tục yêu cầu','Resume enquiry','继续需求'):t('Tạo yêu cầu thuê','Create leasing enquiry','创建租赁需求')}</button><button onClick={loadOwn}>{t('Yêu cầu đã gửi','Sent enquiries','已发送需求')}</button>{messages.length>0&&<button onClick={newConversation} disabled={busy}><RotateCcw size={16}/>{t('Cuộc trò chuyện mới','New conversation','新对话')}</button>}</div>}
 <div className="ai-messages" {...(adminUi?{}:{role:'log','aria-live':'polite' as const})}>
 {adminUi&&(!messages.length||showTasks)&&<div className="ai-welcome ai-admin-welcome"><p className="ai-admin-status">{adminStatus}{adminStatusTail}</p><ul className="ai-suggest">{adminTasks.map(task=><li key={task.label}><button type="button" onClick={()=>send(task.label,false,task.hint)}>{task.label}<ArrowUpRight size={14} aria-hidden="true"/></button></li>)}</ul></div>}
 {!adminUi&&(!messages.length||(embedded&&showTasks))&&<div className="ai-welcome"><p>{isPublic?t('Bạn đang tìm mặt bằng như thế nào? Mình hỗ trợ dựa trên dữ liệu VSIP đang công bố.','What property are you looking for? I can help using published VSIP data.','您在寻找什么物业？我会根据VSIP已发布数据提供帮助。'):t('Bạn muốn xử lý việc gì hôm nay?','What would you like to work on today?','今天您想处理什么工作？')}</p>{(embedded?managerTasks:suggestions.map(label=>({label,hint:undefined}))).map(task=><button key={task.label} onClick={()=>send(task.label,false,task.hint)}>{task.label}<ArrowUpRight size={14}/></button>)}</div>}
 {false&&embedded&&<div className="ai-manager-tools"><small>{t('Dữ liệu AI đang dùng','Data in scope','AI使用的数据')}: {requests.filter(r=>r.kind==='find_supply').length} {t('nhu cầu thuê','leasing enquiries','条租赁需求')} · {scopeNote||`${parks.length} ${t('KCN','parks','园区')}`}</small>{messages.length>0&&<button onClick={()=>setShowTasks(v=>!v)}>{showTasks?t('Ẩn gợi ý','Hide suggestions','隐藏建议'):t('Gợi ý','Suggestions','建议')}</button>}{messages.length>0&&<button onClick={()=>{setMessages([]);setError('');setShowTasks(true)}}><Plus size={16}/>{t('Hội thoại mới','New conversation','新对话')}</button>}</div>}
 <Log {...(adminUi?{role:'log','aria-live':'polite',className:'ai-log'}:{})}>
 {messages.map((m,i)=>m.request?<RequestReceipt key={i} request={m.request} onClose={closeParkChat}/>:<article key={i} className={'ai-message '+m.role+(m.meta?' ai-choice-note':'')}><div className={'ai-text'+(adminUi&&m.role==='assistant'?' ai-text-md':'')}>{adminUi&&m.role==='assistant'?<AssistantMarkdown text={m.content}/>:m.content.replace(/\*\*/g,'')}</div>{adminUi&&m.role==='assistant'&&m.stats&&<AssistantStats stats={m.stats}/>}
  {m.clarify&&<div className="ai-scope-choice" role="group" aria-label={t('Chọn phạm vi câu hỏi','Choose the scope of your question','选择问题范围')}>
   <button type="button" disabled={busy||m.clarify.state!=='active'} onClick={()=>choose(i,'current')}>{currentLabel(m.clarify)}</button>
   <button type="button" disabled={busy||m.clarify.state!=='active'} onClick={()=>choose(i,'general')}>{generalLabel()}</button>
   {m.clarify.state==='stale'&&<small className="ai-scope-stale">{t('Bạn đã chuyển trang — hãy hỏi lại.','You moved to another page — please ask again.','您已切换页面，请重新提问。')}</small>}
  </div>}
  {m.review&&<ChatEnquiryReview draft={m.review} active={Boolean(draft?.reviewToken)&&i===messages.length-1}/>} {m.offer&&!draft&&<div className="ai-offer"><p>{t('Bạn có thể tạo yêu cầu thuê ngay tại đây. Mình sẽ điền thông tin đã trao đổi và hướng dẫn bổ sung liên hệ.','You can create a leasing enquiry here. I will prefill our discussion and guide you through contact details.','您可以在此创建租赁需求。我会预填对话信息并引导您补充联系方式。')}</p><button onClick={startRequest}>{t('Tạo yêu cầu thuê','Create leasing enquiry','创建租赁需求')}</button></div>}{!!m.matches?.length&&adminUi&&<AssistantMatches matches={m.matches} lookup={lookup}/>}{!!m.matches?.length&&!adminUi&&<div className="ai-matches">{m.matches.map((run:any)=><div key={run.requestId}><b>{run.organization}</b>{run.results.map((x:any)=><p key={x.assetId}>{x.assetId} · {x.score}% {t('phù hợp tiêu chí đã biết','fit on known criteria','已知条件匹配')} <span className={`ai-state ai-state-${x.publicationState==='draft'?'draft':'published'}`}>{x.publicationState==='draft'?t('Nháp – chưa công bố','Draft – not published','草稿–未发布'):t('Đã công bố','Published','已发布')}</span><small>{t('Cần xác nhận ngân sách, điện và thời điểm bàn giao.','Confirm budget, power and availability.','需确认预算、电力和交付时间。')}</small></p>)}</div>)}</div>}{!!m.sources?.length&&adminUi&&<div className="ai-sources ai-sources-admin"><b>{t('Hồ sơ tham chiếu','Reference records','参考资料')}</b>{[['park',t('Khu công nghiệp','Industrial parks','工业园区')],['asset',t('Mặt bằng','Properties','物业')]].map(([k,label])=>{const rows=m.sources!.filter(x=>(x.href.includes('/assets/')?'asset':'park')===k);return rows.length>0&&<div key={k} className="ai-source-group"><small>{label}</small>{rows.map(x=><Link key={x.id} to={x.href}>{x.name[language]||x.name.en}<ArrowUpRight size={14} aria-hidden="true"/></Link>)}</div>})}</div>}{adminUi&&m.role==='assistant'&&m.content&&<div className="ai-answer-meta">{m.at&&<time dateTime={new Date(m.at).toISOString()}>{timeText(m.at)}</time>}<button type="button" onClick={()=>copyAnswer(i,m.content)}>{copied===i?<><Check size={14} aria-hidden="true"/>{t('Đã sao chép','Copied','已复制')}</>:<><Copy size={14} aria-hidden="true"/>{t('Sao chép','Copy','复制')}</>}</button></div>}{!!m.sources?.length&&!adminUi&&<div className="ai-sources"><b>{t('Hồ sơ tham chiếu','Reference records','参考资料')}</b>{m.sources.map(s=><Link onClick={closeParkChat} key={s.id} to={s.href}>{s.name[language]||s.name.en}<ArrowUpRight size={14}/></Link>)}</div>}</article>)}
 {busy&&<p role="status" className="ai-progress"><LoaderCircle size={16} className={adminUi?'spin':undefined}/>{t('Đang phân tích dữ liệu…','Analysing data…','正在分析数据…')}</p>}
 {error&&<div role="alert" className={'ai-error'+(adminUi?' ai-error-admin':'')}><p>{adminUi?adminErrorText(error):error==='interrupted'?t('Câu trả lời trước bị gián đoạn khi tải lại trang. Nhấn Thử lại để gửi lại.','The previous reply was interrupted by a page reload. Press Retry to send it again.','上一条回复因页面重新加载而中断。点击“重试”重新发送。'):error==='review_expired'||error==='review_changed'?t('Bản kiểm tra đã hết hạn hoặc thay đổi. Nhấn Thử lại để kiểm tra lại, rồi nhắn xác nhận một lần nữa.','The review expired or changed. Retry to review it again, then confirm in chat.','摘要已过期或变更。请重试以重新核对，然后再次回复确认。'):error==='limited'?t('Đã đạt giới hạn lượt hỏi. Vui lòng thử lại sau.','Question limit reached. Please try again later.','已达到提问次数限制，请稍后重试。'):t('AI chưa phản hồi được. Bạn vẫn có thể dùng tìm kiếm và bộ lọc.','AI is unavailable. Search and filters remain available.','AI暂时不可用，仍可使用搜索和筛选。')}</p><button disabled={busy} onClick={retry}>{t('Thử lại','Retry','重试')}</button></div>}</Log><div ref={end}/>
 </div>
 <form onSubmit={e=>{e.preventDefault();send()}}><textarea ref={taRef} value={input} maxLength={3000} rows={isPublic?2:1} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}} placeholder={t('Nhập câu hỏi…','Ask a question…','请输入问题…')} aria-label={t('Câu hỏi cho AI','Question for AI','向AI提问')}/><button disabled={busy||!input.trim()||!ctxResolved} aria-label={t('Gửi câu hỏi','Send question','发送问题')}><Send size={18}/></button>{adminUi&&<small className="ai-keyhint">{t('Enter để gửi · Shift+Enter xuống dòng','Enter to send · Shift+Enter for a new line','按Enter发送 · Shift+Enter换行')}</small>}</form>
 {adminUi&&undo&&<div className="ai-undo" role="status">{t('Đã xoá hội thoại','Conversation cleared','对话已清除')} · <button type="button" onClick={undoClear}>{t('Hoàn tác','Undo','撤销')}</button></div>}

 </section>}
 {!embedded&&<button className="floating-chat-launcher" onClick={toggleParkChat} aria-expanded={chatOpen} aria-label={chatOpen?t('Đóng trợ lý AI','Close AI assistant','关闭AI助手'):t('Mở trợ lý AI','Open AI assistant','打开AI助手')}><LotusChatIcon/></button>}
 </div>
}
export function InternalAccess(){const {language}=useApp();const [token,setToken]=useState(''),[error,setError]=useState(false),[busy,setBusy]=useState(false);const t=(vi:string,en:string,zh:string)=>({vi,en,zh})[language];return <main className="page section"><section className="admin-panel internal-access"><h1>{t('Truy cập nội bộ','Internal access','内部访问')}</h1><p>{t('Dành cho người được cấp mã truy cập. Trang /admin vẫn mở workspace demo riêng.','For authorized access-code holders. /admin still opens an isolated demo workspace.','仅限获授权访问码持有人。/admin仍打开独立演示工作区。')}</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError(false);try{await api('session',{internal:true,accessToken:token});location.href='/admin'}catch{setError(true)}finally{setBusy(false);setToken('')}}}><label>{t('Mã truy cập','Access code','访问码')}<input type="password" required value={token} autoComplete="off" onChange={e=>setToken(e.target.value)}/></label>{error&&<p role="alert">{t('Không thể truy cập. Kiểm tra mã và thử lại.','Unable to access. Check the code and retry.','无法访问，请检查访问码后重试。')}</p>}<button className="button primary" disabled={busy}>{t('Tiếp tục','Continue','继续')}</button></form><Link to="/admin">{t('Mở demo','Open demo','打开演示')}</Link></section></main>}

export function AdminAssistant(){
 useEffect(()=>{
  const viewport=window.visualViewport;
  const update=()=>document.documentElement.style.setProperty('--admin-chat-height',String(viewport?.height||window.innerHeight)+'px');
  update();viewport?.addEventListener('resize',update);window.addEventListener('resize',update);
  return()=>{viewport?.removeEventListener('resize',update);window.removeEventListener('resize',update);document.documentElement.style.removeProperty('--admin-chat-height')};
 },[]);
 const admin=useAdminActions(),split=catalogueSplit(admin.store.drafts).summary,app=useApp(),language=app.language;
 const draftName=(id:string,kind:string)=>{const d=admin.store.drafts.find(x=>x.id===id&&x.kind===kind);return d?(d.data.name[language]||d.data.name.en):''};
 const lookup:AdminLookup={asset:id=>{const a=admin.store.drafts.find(x=>x.id===id&&x.kind==='asset');return a?{name:a.data.name[language]||a.data.name.en,park:draftName((a.data as any).parkId,'park'),href:'/admin/assets/'+id+'/edit'}:null},request:id=>{const r=app.requests.find(x=>x.id===id);return {name:r?.organization||id,href:'/admin/requests/'+id}}};
 const scopeData={parks:{published:split.parks.published,draft:split.parks.draft},assets:{published:split.assets.published,draft:split.assets.draft}};
 const scopeNote=({vi:`${split.parks.published} KCN công bố, ${split.parks.draft} nháp · ${split.assets.published} mặt bằng công bố, ${split.assets.draft} nháp`,en:`${split.parks.published} published parks, ${split.parks.draft} drafts · ${split.assets.published} published assets, ${split.assets.draft} drafts`,zh:`${split.parks.published}个已发布园区、${split.parks.draft}个草稿 · ${split.assets.published}个已发布物业、${split.assets.draft}个草稿`} as const)[useApp().language];
 const [params,setParams]=useSearchParams();const ask=params.get('ask')||'',hint=params.get('hint');
 const [prompt]=useState(()=>ask?{text:ask.slice(0,3000),hint:(hint==='match'||hint==='statistics'?hint:undefined) as 'match'|'statistics'|undefined}:undefined);
 useEffect(()=>{if(ask)setParams({},{replace:true})},[]);
 return <div className="admin-page ai-admin-page"><AiChat scope="admin" embedded initialPrompt={prompt} scopeNote={scopeNote} scopeData={scopeData} lookup={lookup}/></div>}
