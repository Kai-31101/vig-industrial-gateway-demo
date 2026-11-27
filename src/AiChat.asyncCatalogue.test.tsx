// @vitest-environment jsdom
// Remote mode with an ASYNC catalogue (parks/assets arrive after mount). API mocked; client behaviour only.
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const api=vi.hoisted(()=>vi.fn());
vi.mock('./remote',()=>({remoteEnabled:true,ensureSession:vi.fn().mockResolvedValue({}),api}));
import {parks as seedParks,assets as seedAssets} from './data';

let AiChat:any,AppProvider:any,store:any,release:(v:any)=>void;
const park=seedParks.find((p:any)=>p.slug)!;const asset=seedAssets.find((a:any)=>a.parkId===park.id)!;
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();vi.resetModules();
 api.mockImplementation((route:string)=>route==='catalogue'?new Promise(r=>{release=r}):route==='ai/public'?Promise.resolve({text:'ok',sources:[],scope:null,draft:{clear:[],explicitUnknown:[]}}):Promise.resolve([]));
 store=await import('./publicChatStore');({AiChat}=await import('./AiChat'));({AppProvider}=await import('./AppContext'))});
afterEach(cleanup);
const mount=(path:string)=>render(<AppProvider><MemoryRouter initialEntries={[path]}><AiChat scope="public" embedded/></MemoryRouter></AppProvider>);
const loadCatalogue=()=>act(async()=>release({parks:[park],assets:[asset]}));
const choiceBtns=()=>Array.from(document.querySelectorAll('.ai-scope-choice button')) as HTMLButtonElement[];
const pending=(ctx:any)=>JSON.stringify({v:1,messages:[{role:'user',content:'rent?'},{role:'assistant',content:'Which one?',clarify:{...ctx,name:{vi:'A',en:'A'},original:'rent?',state:'active'}}],pending:{original:'rent?',ctx}});

describe('async catalogue (remote mode)',()=>{
 it('reload on the same park page keeps the pending choice ACTIVE while the catalogue loads; sending waits for it',async()=>{
  sessionStorage.setItem('vsip.publicChat.v1',pending({kind:'park',id:park.id}));store.__reloadPublicChatForTests();
  mount('/industrial-parks/'+park.slug);
  expect(store.publicChat.get().pending).not.toBeNull();expect(choiceBtns().every(b=>b.disabled)).toBe(false);
  const box=screen.getByRole('textbox');fireEvent.change(box,{target:{value:'hello'}});
  expect((screen.getByRole('button',{name:'Gửi câu hỏi'}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.keyDown(box,{key:'Enter'});expect(api.mock.calls.filter(c=>c[0]==='ai/public')).toHaveLength(0);
  await loadCatalogue();
  expect(store.publicChat.get().pending).not.toBeNull();await waitFor(()=>expect(choiceBtns().some(b=>!b.disabled)).toBe(true));
  expect(screen.getByTestId('ai-context').textContent).toContain(park.name.vi);
 });
 it('after the catalogue loads on ANOTHER page, the restored pending choice becomes stale',async()=>{
  sessionStorage.setItem('vsip.publicChat.v1',pending({kind:'asset',id:asset.id}));store.__reloadPublicChatForTests();
  mount('/industrial-parks/'+park.slug);await loadCatalogue();
  await waitFor(()=>expect(store.publicChat.get().pending).toBeNull());expect(choiceBtns().every(b=>b.disabled)).toBe(true);
 });
 it('a restored explicit selection that is not in the published catalogue is dropped (never sent)',async()=>{
  sessionStorage.setItem('vsip.publicChat.v1',JSON.stringify({v:1,messages:[],explicit:{kind:'asset',id:'asset-unpublished',path:'/assets',nonce:1},lastNonce:1}));store.__reloadPublicChatForTests();
  mount('/assets');await loadCatalogue();await waitFor(()=>expect(store.publicChat.get().explicit).toBeNull());
  const box=screen.getByRole('textbox');fireEvent.change(box,{target:{value:'price?'}});fireEvent.keyDown(box,{key:'Enter'});
  await waitFor(()=>expect(api.mock.calls.filter(c=>c[0]==='ai/public')).toHaveLength(1));expect(api.mock.calls.find(c=>c[0]==='ai/public')![1].pageContext).toBeNull();
 });
});
describe('restore guards (GPT finding 3)',()=>{
 it('oversized raw value is discarded before parsing',()=>{sessionStorage.setItem('vsip.publicChat.v1','{"v":1,"messages":[],"input":"'+'x'.repeat(260_000)+'"}');store.__reloadPublicChatForTests();expect(store.publicChat.get().input).toBe('');expect(sessionStorage.getItem('vsip.publicChat.v1')).toBeNull()});
 it.each([['bogus scopeChoice',{text:'q',scopeChoice:'everything'}],['bad choiceFor',{text:'q',scopeChoice:'current',choiceFor:{kind:'park',id:'../x'}}]])('inflight with %s is rejected',(_n,inflight)=>{sessionStorage.setItem('vsip.publicChat.v1',JSON.stringify({v:1,messages:[],inflight}));store.__reloadPublicChatForTests();expect(store.publicChat.get().retry).toBeNull();expect(sessionStorage.getItem('vsip.publicChat.v1')).toBeNull()});
 it.each([['non-object suggested',{suggested:'x'}],['bad request receipt',{messages:[{role:'assistant',content:'',request:{id:5}}]}],['oversized review',{messages:[{role:'assistant',content:'r',review:{blob:'x'.repeat(25_000)}}]}]])('%s is rejected',(_n,extra:any)=>{sessionStorage.setItem('vsip.publicChat.v1',JSON.stringify({v:1,messages:[],...extra}));store.__reloadPublicChatForTests();expect(store.publicChat.get().messages).toEqual([]);expect(sessionStorage.getItem('vsip.publicChat.v1')).toBeNull()});
});
