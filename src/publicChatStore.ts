// Public floating assistant state (NOT admin, NOT portal). Lives outside React so a reply that arrives after the
// visitor navigates (PublicShell remounts the chat on every route) still lands in the conversation.
// Persisted to sessionStorage only (per browser tab session), versioned, bounded and validated. Never persisted:
// review/confirmation tokens, in-flight network state, errors, admin data, credentials.
export type Ctx={kind:'park'|'asset';id:string};
export type Clarify={kind:'park'|'asset';id:string;name:{vi:string;en:string;zh?:string};original:string;state:'active'|'stale'|'done'};
export interface PubMessage{role:'user'|'assistant';content:string;intake?:boolean;meta?:boolean;sources?:{id:string;name:{vi:string;en:string;zh?:string};href:string}[];offer?:boolean;review?:any;request?:any;clarify?:Clarify;matches?:any[];stats?:any}
export interface Retry{text:string;scopeChoice?:'current'|'general';choiceFor?:Ctx}
export interface PubState{messages:PubMessage[];input:string;draft:{payload:any;reviewToken:string|null;conversation:any}|null;suggested:any;
 scopeState:{choice:'current'|'general';kind:'park'|'asset';id:string}|null;pending:{original:string;ctx:Ctx}|null;
 explicit:{kind:'park'|'asset';id:string;path:string;nonce:number}|null;lastNonce:number;
 busy:boolean;error:string;retry:Retry|null;inflight:Retry|null}
export const STORAGE_KEY='vsip.publicChat.v1';
export const LIMITS={messages:40,content:4000,bytes:200_000,item:20_000};
const empty=():PubState=>({messages:[],input:'',draft:null,suggested:{},scopeState:null,pending:null,explicit:null,lastNonce:0,busy:false,error:'',retry:null,inflight:null});

// ---------- storage (fails closed to memory) ----------
function storage():Storage|null{try{const s=window.sessionStorage;const k='__vsip_probe';s.setItem(k,'1');s.removeItem(k);return s}catch{return null}}
const isObj=(v:any)=>!!v&&typeof v==='object'&&!Array.isArray(v);
const str=(v:any,max=LIMITS.content)=>typeof v==='string'&&v.length<=max;
const ctxOk=(c:any)=>isObj(c)&&(c.kind==='park'||c.kind==='asset')&&str(c.id,121)&&/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(c.id);
const nameOk=(n:any)=>isObj(n)&&str(n.vi,300)&&str(n.en,300)&&(n.zh===undefined||str(n.zh,300));
const hrefOk=(h:any)=>typeof h==='string'&&/^\/(industrial-parks|assets)\/[A-Za-z0-9_-]{1,120}$/.test(h);
const small=(v:any)=>{try{return JSON.stringify(v).length<=LIMITS.item}catch{return false}};
function cleanMessage(m:any):PubMessage|null{
 if(!isObj(m)||!['user','assistant'].includes(m.role)||!str(m.content))return null;
 const out:PubMessage={role:m.role,content:m.content};
 for(const f of ['intake','meta','offer'] as const)if(m[f]===true)out[f]=true;
 if(m.sources!==undefined){if(!Array.isArray(m.sources)||m.sources.length>8||!m.sources.every((s:any)=>isObj(s)&&str(s.id,121)&&nameOk(s.name)&&hrefOk(s.href)))return null;out.sources=m.sources.map((s:any)=>({id:s.id,name:s.name,href:s.href}))}
 if(m.clarify!==undefined){const c=m.clarify;if(!(ctxOk(c)&&nameOk(c.name)&&str(c.original,3000)&&['active','stale','done'].includes(c.state)))return null;out.clarify={kind:c.kind,id:c.id,name:c.name,original:c.original,state:c.state}}
 // The visitor's own review/receipt data is kept for the conversation; tokens never are (they are not stored here).
 if(m.review!==undefined&&isObj(m.review)&&small(m.review))out.review=m.review;
 if(m.request!==undefined){if(!(isObj(m.request)&&str(m.request.id,80)&&(m.request.status===undefined||str(m.request.status,40))))return null;out.request=small(m.request)?m.request:{id:m.request.id,status:m.request.status}}
 if(m.review!==undefined&&!(isObj(m.review)&&small(m.review)))return null;
 return out;
}
/** Strict restore: anything unexpected => null (start fresh). */
export function validateStored(raw:unknown):PubState|null{
 if(!isObj(raw))return null;const r=raw as any;if(r.v!==1||!Array.isArray(r.messages)||r.messages.length>LIMITS.messages)return null;
 const messages=r.messages.map(cleanMessage);if(messages.some((m:any)=>!m))return null;
 const s=empty();s.messages=messages as PubMessage[];
 if(str(r.input))s.input=r.input;
 if(r.draft!==null&&r.draft!==undefined){if(!isObj(r.draft)||!small(r.draft))return null;s.draft={payload:isObj(r.draft.payload)?r.draft.payload:{},conversation:isObj(r.draft.conversation)?r.draft.conversation:undefined,reviewToken:null}}
 if(r.suggested!==undefined){if(!(isObj(r.suggested)&&small(r.suggested)))return null;s.suggested=r.suggested}
 if(r.scopeState){if(!(ctxOk(r.scopeState)&&['current','general'].includes(r.scopeState.choice)))return null;s.scopeState={choice:r.scopeState.choice,kind:r.scopeState.kind,id:r.scopeState.id}}
 if(r.pending){if(!(ctxOk(r.pending.ctx)&&str(r.pending.original,3000)))return null;s.pending={original:r.pending.original,ctx:{kind:r.pending.ctx.kind,id:r.pending.ctx.id}}}
 if(r.explicit){if(!(ctxOk(r.explicit)&&str(r.explicit.path,300)&&Number.isInteger(r.explicit.nonce)))return null;s.explicit={kind:r.explicit.kind,id:r.explicit.id,path:r.explicit.path,nonce:r.explicit.nonce}}
 if(Number.isInteger(r.lastNonce))s.lastNonce=r.lastNonce;
 // A turn that was in flight when the page unloaded is NOT re-sent: it is offered for a manual Retry.
 if(r.inflight){if(!(isObj(r.inflight)&&str(r.inflight.text,3000)&&(r.inflight.scopeChoice===undefined||['current','general'].includes(r.inflight.scopeChoice))&&(r.inflight.choiceFor===undefined||ctxOk(r.inflight.choiceFor))))return null;s.retry={text:r.inflight.text,...(r.inflight.scopeChoice&&ctxOk(r.inflight.choiceFor)?{scopeChoice:r.inflight.scopeChoice,choiceFor:r.inflight.choiceFor}:{})};s.error='interrupted'}
 return s;
}
function serialise(s:PubState):string{
 const base={v:1,messages:s.messages,input:s.input.slice(0,LIMITS.content),suggested:s.suggested,scopeState:s.scopeState,pending:s.pending,explicit:s.explicit,lastNonce:s.lastNonce,inflight:s.inflight,
  draft:s.draft?{payload:s.draft.payload,conversation:s.draft.conversation}:null}; // reviewToken deliberately omitted
 let msgs=s.messages.slice(-LIMITS.messages).map(m=>{const {matches,stats,...rest}=m;return {...rest,content:rest.content.slice(0,LIMITS.content)}});
 let json=JSON.stringify({...base,messages:msgs});
 while(json.length>LIMITS.bytes&&msgs.length){msgs=msgs.slice(1);json=JSON.stringify({...base,messages:msgs})}
 return json;
}

// ---------- store ----------
type Listener=()=>void;
function create(){
 let store=storage();let state=empty();
 if(store){try{const raw=store.getItem(STORAGE_KEY);if(raw){if(raw.length>LIMITS.bytes+LIMITS.item)throw new Error('oversized');const v=validateStored(JSON.parse(raw));if(v)state=v;else store.removeItem(STORAGE_KEY)}}catch{try{store.removeItem(STORAGE_KEY)}catch{}}}
 const listeners=new Set<Listener>();
 const save=()=>{if(!store)return;try{store.setItem(STORAGE_KEY,serialise(state))}catch{store=null/* quota/blocked: continue in memory */}};
 return {
  get:()=>state,
  set(patch:Partial<PubState>|((s:PubState)=>Partial<PubState>)){state={...state,...(typeof patch==='function'?patch(state):patch)};save();listeners.forEach(l=>l())},
  subscribe(l:Listener){listeners.add(l);return()=>{listeners.delete(l)}},
  /** New conversation / reset: clears every associated field and the stored key. */
  reset(keepNonce=0){state={...empty(),lastNonce:keepNonce};if(store){try{store.removeItem(STORAGE_KEY)}catch{}}listeners.forEach(l=>l())},
  persistent:()=>!!store,
 };
}
export let publicChat=create();
/** Test hook: rebuild the store as if the page were reloaded. */
export function __reloadPublicChatForTests(){publicChat=create();return publicChat}
export function clearPublicChatStorage(){try{window.sessionStorage.removeItem(STORAGE_KEY)}catch{}publicChat.reset()}
