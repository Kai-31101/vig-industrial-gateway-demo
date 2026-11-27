// @vitest-environment jsdom
// Public floating assistant: page context, scope clarification and session persistence. API is MOCKED (client only).
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {MemoryRouter,useNavigate} from 'react-router-dom';
import {useEffect} from 'react';
const api=vi.hoisted(()=>vi.fn());
vi.mock('./remote',()=>({remoteEnabled:false,ensureSession:vi.fn().mockResolvedValue({}),api}));
import {parks as seedParks,assets as seedAssets} from './data';

let AiChat:any,AppProvider:any,useApp:any,store:any;
let nav:(to:string)=>void=()=>{};
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();vi.resetModules();
 ({AiChat}=await import('./AiChat'));({AppProvider,useApp}=await import('./AppContext'));store=await import('./publicChatStore')});
afterEach(()=>{cleanup();vi.restoreAllMocks()});
const park=seedParks.find((p:any)=>p.slug)!;const parkB=seedParks.find((p:any)=>p.slug&&p.id!==park.id)!;
const asset=seedAssets.find((a:any)=>a.parkId===park.id)!;
const Nav=()=>{const n=useNavigate();useEffect(()=>{nav=n},[n]);return null};
const Setup=({lang,select}:{lang?:string;select?:[string,string?]})=>{const app=useApp();useEffect(()=>{if(lang)app.setLanguage(lang);if(select)app.openParkChat(select[0],select[1])},[]);return null};
const mount=(path='/',o:{lang?:string;scope?:'public'|'admin';select?:[string,string?]}={})=>render(<AppProvider><MemoryRouter initialEntries={[path]}><Nav/><Setup lang={o.lang} select={o.select}/><AiChat scope={o.scope||'public'} embedded/></MemoryRouter></AppProvider>);
const calls=(route:string)=>api.mock.calls.filter(c=>c[0]===route).map(c=>c[1]);
const say=async(text:string)=>{const n=api.mock.calls.length;const box=screen.getByRole('textbox');fireEvent.change(box,{target:{value:text}});fireEvent.keyDown(box,{key:'Enter'});await waitFor(()=>expect(api.mock.calls.length).toBeGreaterThan(n));await waitFor(()=>expect(screen.queryByRole('status')).toBeNull())};
const clarifyFor=(ctx:any,name:any)=>({text:'Do you mean the record you are viewing, or general catalogue information?',clarify:{...ctx,name},sources:[],scope:null,draft:{clear:[],explicitUnknown:[]}});
const ok=(text='Answer.',scope:any=null)=>({text,sources:[],scope,draft:{clear:[],explicitUnknown:[]}});
const pctx={kind:'park',id:park.id},actx={kind:'asset',id:asset.id};
const choiceBtns=()=>screen.queryAllByRole('group').flatMap(g=>Array.from(g.querySelectorAll('button')));
const stored=()=>JSON.parse(sessionStorage.getItem('vsip.publicChat.v1')||'null');

describe('page context (route + explicit Chat action)',()=>{
 it('park detail route -> park context and localized chip',async()=>{api.mockResolvedValue(ok());mount('/industrial-parks/'+park.slug,{lang:'en'});await screen.findByTestId('ai-context');expect(screen.getByTestId('ai-context').textContent).toContain(park.name.en);await say('warehouses?');expect(calls('ai/public')[0].pageContext).toEqual(pctx)});
 it('property detail route -> property context (VI chip)',async()=>{api.mockResolvedValue(ok());mount('/assets/'+asset.id,{lang:'vi'});expect((await screen.findByTestId('ai-context')).textContent).toContain('Đang xem mặt bằng: '+asset.name.vi);await say('giá?');expect(calls('ai/public')[0].pageContext).toEqual(actx)});
 it('homepage/list -> no context, no chip',async()=>{api.mockResolvedValue(ok());mount('/home');await say('warehouses');expect(calls('ai/public')[0].pageContext).toBeNull();expect(screen.queryByTestId('ai-context')).toBeNull()});
 it('a card Chat action on a list page keeps its property as explicit context; navigating clears it',async()=>{api.mockResolvedValue(ok());mount('/assets',{lang:'en',select:[park.id,asset.id]});
  await say('price?');expect(calls('ai/public')[0].pageContext).toEqual(actx);
  await act(async()=>nav('/home'));await say('price?');expect(calls('ai/public')[1].pageContext).toBeNull();
  expect(stored().explicit).toBeNull()});
 it('page context updates independently of history',async()=>{api.mockResolvedValue(ok());mount('/industrial-parks/'+park.slug,{lang:'en'});await say('a');await act(async()=>nav('/industrial-parks/'+parkB.slug));await say('b');
  expect(calls('ai/public').map(c=>c.pageContext)).toEqual([pctx,{kind:'park',id:parkB.id}]);expect(screen.getByText('a')).toBeTruthy()});
});

describe('clarification choices',()=>{
 it('choice answers the ORIGINAL question once: no duplicate question bubble, no repeat clarification, scope kept for follow-ups',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name)).mockResolvedValueOnce(ok('Scoped answer.',{choice:'current',...pctx})).mockResolvedValue(ok('Follow-up.'));
  mount('/industrial-parks/'+park.slug,{lang:'en'});await say('what is the rent?');
  const [cur,gen]=choiceBtns();expect(cur.textContent).toContain(park.name.en);expect(gen.textContent).toBe('General catalogue');
  fireEvent.click(cur);await screen.findByText('Scoped answer.');
  const b=calls('ai/public')[1];expect(b.message).toBe('what is the rent?');expect(b.scopeChoice).toBe('current');expect(b.choiceFor).toEqual(pctx);
  expect(screen.getAllByText('what is the rent?')).toHaveLength(1);expect(choiceBtns().every(x=>x.disabled)).toBe(true);
  await say('and power supply?');expect(calls('ai/public')[2].scopeState).toEqual({choice:'current',...pctx});expect(calls('ai/public')[2].scopeChoice).toBeUndefined();
 });
 it('buttons are disabled while the choice request is in flight (no double submit)',async()=>{
  let release:any;api.mockResolvedValueOnce(clarifyFor(pctx,park.name)).mockImplementationOnce(()=>new Promise(r=>{release=r}));
  mount('/industrial-parks/'+park.slug,{lang:'en'});await say('rent?');fireEvent.click(choiceBtns()[1]);
  await waitFor(()=>expect(choiceBtns().every(x=>x.disabled)).toBe(true));fireEvent.click(choiceBtns()[0]);expect(calls('ai/public')).toHaveLength(2);
  await act(async()=>release(ok('General answer.')));await screen.findByText('General answer.');
 });
 it('a typed short reply carries the pending original; a new question cancels the pending buttons',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name)).mockResolvedValue(ok('Answered.'));
  mount('/industrial-parks/'+park.slug,{lang:'vi'});await say('giá thuê?');await say('cái này');
  const c=calls('ai/public')[1];expect(c.pendingFor).toEqual(pctx);expect(c.pendingOriginal).toBe('giá thuê?');expect(choiceBtns().every(x=>x.disabled)).toBe(true);expect(stored().pending).toBeNull();
 });
 it('a failed choice can be retried with the same scope semantics',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name)).mockRejectedValueOnce(new Error('server')).mockResolvedValue(ok('Recovered.'));
  mount('/industrial-parks/'+park.slug,{lang:'en'});await say('rent?');fireEvent.click(choiceBtns()[0]);
  fireEvent.click(await screen.findByRole('button',{name:'Retry'}));await screen.findByText('Recovered.');
  const r=calls('ai/public')[2];expect(r.message).toBe('rent?');expect(r.scopeChoice).toBe('current');expect(r.choiceFor).toEqual(pctx);
 });
 it('VI/EN/ZH labels follow the current UI language (relabel on switch)',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name));const {rerender}=mount('/industrial-parks/'+park.slug,{lang:'zh'});await say('租金？');
  expect(choiceBtns()[0].textContent).toContain('当前园区');expect(choiceBtns()[1].textContent).toBe('一般信息');
 });
});

describe('navigation and late responses',()=>{
 it('navigating away while a choice is pending makes its buttons stale (history kept)',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name));mount('/industrial-parks/'+park.slug,{lang:'en'});await say('rent?');
  await act(async()=>nav('/industrial-parks/'+parkB.slug));
  expect(choiceBtns().every(x=>x.disabled)).toBe(true);expect(screen.getByText(/You moved to another page/)).toBeTruthy();expect(screen.getByText('rent?')).toBeTruthy();expect(stored().pending).toBeNull();
 });
 it('a reply captured on page A that arrives on page B never attaches A choices or A scope to B',async()=>{
  let release:any;api.mockImplementationOnce(()=>new Promise(r=>{release=r}));mount('/industrial-parks/'+park.slug,{lang:'en'});
  const box=screen.getByRole('textbox');fireEvent.change(box,{target:{value:'rent?'}});fireEvent.keyDown(box,{key:'Enter'});await waitFor(()=>expect(calls('ai/public')).toHaveLength(1));
  await act(async()=>nav('/industrial-parks/'+parkB.slug));
  await act(async()=>release(clarifyFor(pctx,park.name)));await waitFor(()=>expect(choiceBtns().length).toBe(2));
  expect(choiceBtns().every(x=>x.disabled)).toBe(true);expect(stored().pending).toBeNull();
 });
 it('a late scoped reply from page A does not set scope on page B',async()=>{
  let release:any;api.mockImplementationOnce(()=>new Promise(r=>{release=r}));mount('/industrial-parks/'+park.slug,{lang:'en'});
  const box=screen.getByRole('textbox');fireEvent.change(box,{target:{value:'this park rent?'}});fireEvent.keyDown(box,{key:'Enter'});await waitFor(()=>expect(calls('ai/public')).toHaveLength(1));
  await act(async()=>nav('/industrial-parks/'+parkB.slug));await act(async()=>release(ok('A answer.',{choice:'current',...pctx})));await screen.findByText('A answer.');
  expect(stored().scopeState).toBeNull();
 });
});

describe('session persistence (sessionStorage only)',()=>{
 it('close/reopen (remount) and reload keep messages, pending choice and scope; restore sends nothing',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name));const v=mount('/industrial-parks/'+park.slug,{lang:'en'});await say('rent?');v.unmount();
  expect(localStorage.getItem('vsip.publicChat.v1')).toBeNull();expect(stored().v).toBe(1);
  store.__reloadPublicChatForTests();const before=api.mock.calls.length;
  mount('/industrial-parks/'+park.slug,{lang:'en'});expect(screen.getByText('rent?')).toBeTruthy();await waitFor(()=>expect(choiceBtns().length).toBe(2));
  expect(choiceBtns().some(x=>!x.disabled)).toBe(true);expect(api.mock.calls.length).toBe(before);
 });
 it('reload on another page restores history but the old choice is stale',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name));const v=mount('/industrial-parks/'+park.slug,{lang:'en'});await say('rent?');v.unmount();
  store.__reloadPublicChatForTests();mount('/home',{lang:'en'});expect(screen.getByText('rent?')).toBeTruthy();await waitFor(()=>expect(choiceBtns().every(x=>x.disabled)).toBe(true));
 });
 it('a turn in flight at reload is NOT replayed; it is offered for manual Retry',async()=>{
  sessionStorage.setItem('vsip.publicChat.v1',JSON.stringify({v:1,messages:[{role:'user',content:'rent?'}],inflight:{text:'rent?',scopeChoice:'general',choiceFor:pctx}}));
  store.__reloadPublicChatForTests();api.mockResolvedValue(ok('After retry.'));mount('/industrial-parks/'+park.slug,{lang:'en'});
  await screen.findByText(/interrupted by a page reload/);expect(api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));await screen.findByText('After retry.');
  expect(calls('ai/public')).toHaveLength(1);expect(calls('ai/public')[0]).toMatchObject({message:'rent?',scopeChoice:'general',choiceFor:pctx});expect(screen.getAllByText('rent?')).toHaveLength(1);
 });
 it('review/confirmation tokens are never stored; a restored draft needs a fresh review',async()=>{
  api.mockResolvedValue({draft:{assetType:'warehouse',organization:'QA Co',email:'qa@example.test'},reviewToken:'secret-review-token',conversation:{askedField:null,attempts:{},declined:[],pendingArea:null,approxDate:null,paused:false},text:'Please review.'});
  mount('/home',{lang:'en'});await say('Create leasing enquiry');
  const raw=sessionStorage.getItem('vsip.publicChat.v1')!;expect(raw).not.toContain('secret-review-token');expect(raw).toContain('QA Co');
  store.__reloadPublicChatForTests();expect(store.publicChat.get().draft.reviewToken).toBeNull();
 });
 it('New conversation clears every field and the stored key (confirm when a draft is active)',async()=>{
  api.mockResolvedValueOnce(clarifyFor(pctx,park.name));mount('/industrial-parks/'+park.slug,{lang:'en'});await say('rent?');
  fireEvent.click(document.querySelector('.ai-request-bar')!.querySelector('button:last-child')!);
  expect(screen.queryByText('rent?')).toBeNull();expect(sessionStorage.getItem('vsip.publicChat.v1')).toBeNull();const s=store.publicChat.get();expect([s.messages.length,s.pending,s.scopeState,s.draft,s.retry]).toEqual([0,null,null,null,null]);
  api.mockResolvedValue({draft:{assetType:'warehouse'},reviewToken:null,conversation:{paused:false},text:'Area?'});await say('Create leasing enquiry');
  const conf=vi.spyOn(window,'confirm').mockReturnValue(false);fireEvent.click(document.querySelector('.ai-request-bar')!.querySelector('button:last-child')!);expect(conf).toHaveBeenCalled();expect(store.publicChat.get().draft).not.toBeNull();
 });
 it.each([['corrupt JSON','{nope'],['wrong version',JSON.stringify({v:2,messages:[]})],['foreign href',JSON.stringify({v:1,messages:[{role:'assistant',content:'x',sources:[{id:'a',name:{vi:'a',en:'a'},href:'https://evil.example/x'}]}]})],['too many messages',JSON.stringify({v:1,messages:Array.from({length:41},()=>({role:'user',content:'x'}))})],['bad clarify',JSON.stringify({v:1,messages:[{role:'assistant',content:'x',clarify:{kind:'park',id:'../x',name:{vi:'a',en:'a'},original:'q',state:'active'}}]})]])('invalid stored state (%s) -> fresh conversation, key removed',(_n,raw)=>{
  sessionStorage.setItem('vsip.publicChat.v1',raw as string);store.__reloadPublicChatForTests();expect(store.publicChat.get().messages).toEqual([]);expect(sessionStorage.getItem('vsip.publicChat.v1')).toBeNull();
 });
 it('bounded: at most 40 messages are persisted',async()=>{store.publicChat.set({messages:Array.from({length:60},(_,i)=>({role:'user',content:'m'+i}))});expect(stored().messages).toHaveLength(40);expect(stored().messages[0].content).toBe('m20')});
 it('sessionStorage unavailable -> works in memory, no crash',async()=>{vi.spyOn(window,'sessionStorage','get').mockImplementation(()=>{throw new DOMException('blocked','SecurityError')});
  store.__reloadPublicChatForTests();expect(store.publicChat.persistent()).toBe(false);api.mockResolvedValue(ok('Works.'));mount('/home',{lang:'en'});await say('hi');await screen.findByText('Works.')});
});

describe('public/admin isolation',()=>{
 it('the admin assistant writes nothing to sessionStorage and sends no page fields',async()=>{api.mockResolvedValue({text:'Admin answer.',sources:[],matches:[],stats:null});mount('/industrial-parks/'+park.slug,{lang:'en',scope:'admin'});
  await say('summary');const b=calls('ai/admin')[0];expect(b.pageContext).toBeUndefined();expect(b.scopeState).toBeUndefined();expect(b.parkId).toBeNull();expect(sessionStorage.getItem('vsip.publicChat.v1')).toBeNull();expect(screen.queryByTestId('ai-context')).toBeNull()});
});
