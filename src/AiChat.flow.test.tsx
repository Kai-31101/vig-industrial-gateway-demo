// @vitest-environment jsdom
// Public chat routing with the API mocked: proves client state handling only (no model, no network).
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const api=vi.hoisted(()=>vi.fn());
vi.mock('./remote',()=>({remoteEnabled:false,ensureSession:vi.fn().mockResolvedValue({}),api}));

let AiChat:any,AppProvider:any;
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();vi.resetModules();({AiChat}=await import('./AiChat'));({AppProvider}=await import('./AppContext'))});
afterEach(cleanup);
const mount=()=>render(<AppProvider><MemoryRouter><AiChat scope="public" embedded/></MemoryRouter></AppProvider>);
const say=async(text:string)=>{const n=api.mock.calls.length;const box=screen.getByRole('textbox');fireEvent.change(box,{target:{value:text}});fireEvent.keyDown(box,{key:'Enter'});await waitFor(()=>expect(api.mock.calls.length).toBeGreaterThan(n));await waitFor(()=>expect(screen.queryByRole('status')).toBeNull())};
const calls=(route:string)=>api.mock.calls.filter(c=>c[0]===route).map(c=>c[1]);
const draftQ={draft:{assetType:'warehouse',location:'North'},reviewToken:null,conversation:{askedField:'areaMin',attempts:{},declined:[],pendingArea:null,approxDate:null,paused:false},text:'What minimum and maximum area do you need?'};

describe('public chat conversation routing',()=>{
 it('S39/N1: cancel discards the draft and a new enquiry does not silently restore cancelled criteria',async()=>{
  api.mockImplementation(async(route:string,body:any)=>{
   if(route==='ai/public')return {text:'Found warehouses in the North.',sources:[],draft:{location:'North',assetType:'warehouse',clear:[],explicitUnknown:[]}};
   if(route==='ai/enquiry')return body.message==='cancel'?{cancelled:true,text:'Draft cancelled. Nothing was submitted.'}:draftQ;
  });
  mount();await say('warehouses in the North');await say('Create leasing enquiry');
  expect(calls('ai/enquiry')[0].draft).toMatchObject({location:'North',assetType:'warehouse'});
  await say('cancel');await screen.findByText('Draft cancelled. Nothing was submitted.');
  await say('Create leasing enquiry');
  const seed=calls('ai/enquiry').at(-1).draft;expect(seed.location).toBeUndefined();expect(seed.assetType).toBeUndefined();
 });
 it('S37/S38: pause routes later messages to discovery; Resume restores the same draft',async()=>{
  api.mockImplementation(async(route:string,body:any)=>{
   if(route==='ai/public')return {text:'Here are warehouses.',sources:[{id:'asset-1',name:{en:'QA Warehouse',vi:'QA Warehouse'},href:'/assets/asset-1'}],draft:{clear:[],explicitUnknown:[]}};
   if(body.message.startsWith('Pause'))return {...draftQ,conversation:{...draftQ.conversation,paused:true},action:'paused',followUp:true,text:'I have paused your enquiry. Nothing has been sent.'};
   return {...draftQ,text:'Back to your enquiry. What minimum and maximum area do you need?'};
  });
  mount();await say('Create leasing enquiry');
  await say('Pause this; show warehouses instead');
  await screen.findByText('I have paused your enquiry. Nothing has been sent.');await screen.findByText('Here are warehouses.');
  expect(calls('ai/public').at(-1).message).toBe('Pause this; show warehouses instead');
  await say('do you have cold storage?');
  expect(calls('ai/enquiry')).toHaveLength(2);expect(calls('ai/public')).toHaveLength(2);
  const hist=JSON.stringify(calls('ai/public').at(-1).history);expect(hist).not.toContain('What minimum and maximum area');expect(hist).not.toContain('Create leasing enquiry');expect(hist).toContain('Here are warehouses.');
  fireEvent.click(screen.getByRole('button',{name:/Resume enquiry|Tiếp tục yêu cầu|继续需求/}));
  await waitFor(()=>expect(calls('ai/enquiry')).toHaveLength(3));
  const resume=calls('ai/enquiry').at(-1);expect(resume.message).toMatch(/^(Tiếp tục yêu cầu|Resume enquiry|继续需求)$/);expect(resume.conversation.paused).toBe(false);expect(resume.draft).toEqual(draftQ.draft);
 });
 it('side question during intake is answered from discovery, then the pending question is shown; draft untouched',async()=>{
  api.mockImplementation(async(route:string,body:any)=>{
   if(route==='ai/public')return {text:'Published data does not specify temperature capability.',sources:[],draft:{clear:[],explicitUnknown:[]}};
   if(body.message==='Does it support cold storage?')return {draft:body.draft,reviewToken:null,conversation:body.conversation,action:'side_question',route:'discovery',text:'',resumeText:'To continue your enquiry: What minimum and maximum area do you need?'};
   return draftQ;
  });
  mount();await say('Create leasing enquiry');await say('Does it support cold storage?');
  await screen.findByText('Published data does not specify temperature capability.');await screen.findByText('To continue your enquiry: What minimum and maximum area do you need?');
  expect(calls('ai/enquiry').at(-1).draft).toEqual(draftQ.draft);
 });
 it('S36: discovery sends the ordered IDs of the records just displayed',async()=>{
  api.mockResolvedValueOnce({text:'Two options.',sources:[{id:'asset-2',name:{en:'B'},href:'/assets/asset-2'},{id:'park-1',name:{en:'A'},href:'/industrial-parks/a'}],draft:{clear:[],explicitUnknown:[]}}).mockResolvedValue({text:'Details.',sources:[],draft:{clear:[],explicitUnknown:[]}});
  mount();await say('warehouses');await say('the second one');
  expect(calls('ai/public')[1].displayedIds).toEqual(['asset-2','park-1']);
  expect(calls('ai/public')[1].history.map((m:any)=>m.role)).toEqual(['user','assistant']);
 });
 it('F08: an explicit clear removes the criterion (and its park) from the next enquiry seed',async()=>{
  api.mockResolvedValueOnce({text:'North results.',sources:[],draft:{location:'North',parkId:'park-vsip-thai-binh',clear:[],explicitUnknown:[]}})
   .mockResolvedValueOnce({text:'Anywhere results.',sources:[],draft:{clear:['location'],explicitUnknown:[]}})
   .mockResolvedValue(draftQ);
  mount();await say('North please');await say('actually anywhere');await say('Create leasing enquiry');
  const seed=calls('ai/enquiry').at(-1).draft;expect(seed.location).toBeUndefined();expect(seed.parkId).toBe('');
 });
 it('S43: an expired review is never submitted; retry asks the server for a fresh review',async()=>{
  const review={...draftQ,reviewToken:'signed-review',conversation:{...draftQ.conversation,askedField:'review'},text:'Review the summary below.'};
  api.mockImplementation(async(route:string,body:any)=>{if(body.message==='confirm'&&body.reviewToken)throw new Error('review_expired');if(body.message==='confirm')return {...review,reviewToken:'fresh-review'};return review});
  mount();await say('Create leasing enquiry');await say('confirm');
  await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:/Retry|Thử lại|重试/}));
  await waitFor(()=>expect(calls('ai/enquiry')).toHaveLength(3));
  expect(calls('ai/enquiry')[2]).toMatchObject({message:'confirm',reviewToken:null});
  expect(screen.queryByText(/submitted/i)).toBeNull();
 });
});

// ---- Boundary remediation A/B/C (Codex source review): real client interaction ----
import {useEffect} from 'react';
import {parks as seedParks} from './data';
let useApp:any;
beforeEach(async()=>{({useApp}=await import('./AppContext'))});
const Setup=({lang,parkId}:{lang?:string;parkId?:string})=>{const app=useApp();useEffect(()=>{if(lang)app.setLanguage(lang);if(parkId)app.openParkChat(parkId)},[]);return null};
const mountWith=(o:{lang?:string;parkId?:string})=>render(<AppProvider><MemoryRouter><Setup {...o}/><AiChat scope="public" embedded/></MemoryRouter></AppProvider>);
const CANCEL_WORDS=['hủy','huy','cancel','取消'];
const createBtn=()=>screen.getAllByRole('button').find(b=>/^(Tạo yêu cầu thuê|Create leasing enquiry|创建租赁需求)$/.test(b.textContent||''));
const resumeBtn=()=>screen.getAllByRole('button').find(b=>/^(Tiếp tục yêu cầu|Resume enquiry|继续需求)$/.test(b.textContent||''));
const routedMock=()=>api.mockImplementation(async(route:string,body:any)=>{
 if(route==='ai/public')return {text:'North warehouses.',sources:[],draft:{location:'North',assetType:'warehouse',clear:[],explicitUnknown:[]}};
 if(body.message==='pause')return {...draftQ,conversation:{...draftQ.conversation,paused:true},action:'paused',followUp:false,text:'Paused. Nothing has been sent.'};
 if(CANCEL_WORDS.includes(body.message))return {cancelled:true,text:'Draft cancelled. Nothing was submitted.'};
 return draftQ;
});
describe('A: exact cancel while paused discards the draft (vi/en/zh)',()=>{
 it.each([['vi','hủy'],['en','cancel'],['zh','取消']])('%s: pause -> %s -> clean new enquiry',async(lang,word)=>{
  routedMock();mountWith({lang});
  await say('warehouses in the North');await say('Create leasing enquiry');await say('pause');
  expect(resumeBtn()).toBeTruthy();
  await say(word);
  const c=calls('ai/enquiry').at(-1);expect(c.message).toBe(word);expect(c.language).toBe(lang);expect(c.draft).toEqual(draftQ.draft);
  await screen.findByText('Draft cancelled. Nothing was submitted.');
  expect(resumeBtn()).toBeUndefined();expect(createBtn()).toBeTruthy();
  await say('Create leasing enquiry');
  const seed=calls('ai/enquiry').at(-1).draft;expect(seed.location).toBeUndefined();expect(seed.assetType).toBeUndefined();expect(seed.payload).toBeUndefined();
 });
 it.each(['"cancel"','cancel?','how do I cancel my enquiry','hủy là sao?','取消吗？','“取消”'])('cancel-like text %s while paused does NOT cancel',async text=>{
  routedMock();mountWith({lang:'en'});
  await say('Create leasing enquiry');await say('pause');const before=calls('ai/enquiry').length;
  await say(text);
  expect(calls('ai/enquiry')).toHaveLength(before);expect(calls('ai/public').at(-1).message).toBe(text);expect(resumeBtn()).toBeTruthy();
 });
});
describe('B: a question that starts with the create command does not start intake',()=>{
 it.each([['vi','Tạo yêu cầu thuê thì có mất phí không?'],['en','Create leasing enquiry?'],['zh','创建租赁需求吗']])('%s: %s',async(lang,text)=>{
  api.mockResolvedValue({text:'Creating an enquiry is free.',sources:[],startRequest:false,draft:{clear:[],explicitUnknown:[]}});mountWith({lang});
  await say(text);expect(calls('ai/enquiry')).toHaveLength(0);expect(calls('ai/public')).toHaveLength(1);
 });
 it('the plain command still starts intake',async()=>{api.mockResolvedValue(draftQ);mountWith({lang:'en'});await say('Create leasing enquiry');expect(calls('ai/enquiry')).toHaveLength(1)});
});
describe('C: explicit Chat-action context is sent as page context; a park seeds an enquiry only after a current scope',()=>{
 const north=seedParks.find((p:any)=>p.region==='North')!;const ctx={kind:'park',id:north.id};
 const mockDiscovery=(d:any,scope:any)=>api.mockImplementation(async(route:string)=>route==='ai/public'?{text:'ok',sources:[],scope,draft:{clear:[],explicitUnknown:[],...d}}:draftQ);
 it('the explicit park selection is sent on every turn of that page',async()=>{mockDiscovery({},null);mountWith({lang:'en',parkId:north.id});await say('warehouses');await say('more details');expect(calls('ai/public').map(c=>c.pageContext)).toEqual([ctx,ctx]);expect(calls('ai/public')[0].parkId).toBeUndefined()});
 it('after a current scope for this page, a new enquiry is seeded with the park',async()=>{mockDiscovery({},{choice:'current',...ctx});mountWith({lang:'en',parkId:north.id});await say('price here?');await say('Create leasing enquiry');expect(calls('ai/enquiry').at(-1).draft.parkId).toBe(north.id)});
 it('merely viewing (no current scope) never seeds the park',async()=>{mockDiscovery({},null);mountWith({lang:'en',parkId:north.id});await say('warehouses');await say('Create leasing enquiry');expect(calls('ai/enquiry').at(-1).draft.parkId).toBe('')});
 it.each([
  ['South instead',{location:'South'}],['anywhere',{location:'Not specified',explicitUnknown:['location']}],['remove the park',{clear:['parkId']}],['any location',{clear:['location']}],
 ])('"%s" (general scope) -> follow-ups keep general and a new enquiry carries no stale park',async(text,d)=>{
  mockDiscovery(d,{choice:'general',...ctx});mountWith({lang:'en',parkId:north.id});
  await say(text);expect(calls('ai/public')[0].pageContext).toEqual(ctx);
  await say('show warehouses');expect(calls('ai/public')[1].scopeState).toEqual({choice:'general',...ctx});
  await say('Create leasing enquiry');expect(calls('ai/enquiry').at(-1).draft.parkId).toBe('');
 });
});
