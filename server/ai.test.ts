// Discovery (public assistant) behaviour with the model transport mocked: proves routing, context and guards only.
import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({requestModel:vi.fn(),query:vi.fn()}));
vi.mock('./aiTransport',()=>({requestModel:mocks.requestModel,openAIConfig:()=>({key:'test-key',model:'test-model'})}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:vi.fn().mockResolvedValue({rows:[]})})}));
vi.mock('./repository',()=>({state:vi.fn()}));
import {answer} from './ai';

const parks=[
 {id:'p-hp',slug:'qa-north',province:'Hải Phòng',region:'North',suitableIndustries:['Electronics'],restrictedIndustries:[],name:{en:'QA North Park'}},
 {id:'p-bd',slug:'qa-south',province:'Bình Dương',region:'South',suitableIndustries:['Cold storage'],restrictedIndustries:[],name:{en:'QA South Park'}},
];
const assets=[{id:'asset-hp-1',parkId:'p-hp',type:'warehouse',area:5000,unit:'m²',name:{en:'QA Warehouse'}},{id:'asset-bd-1',parkId:'p-bd',type:'ready_built_factory',area:2,unit:'ha',name:{en:'QA Factory'}}];
const session={workspace_id:'w',tokenHash:'t'};
let classifierOut:any;
const call=(n:number)=>mocks.requestModel.mock.calls[n]?.[0] as any[];
beforeEach(()=>{vi.clearAllMocks();classifierOut={allowed:true,intent:'search',actor:'tenant',parkIds:[]};
 mocks.query.mockImplementation(async(sql:string)=>sql.includes('public_catalogue')?{rows:[...parks.map(p=>({kind:'park',payload:p})),...assets.map(a=>({kind:'asset',payload:a}))]}:{rows:[{allowed:true}]});
 mocks.requestModel.mockImplementation(async(_m:any,json:boolean)=>({text:json?JSON.stringify(classifierOut):'Grounded answer.',usage:{}}));
});
const ask=(message:string,extra:any={})=>answer('public',session,{language:'en',message,...extra});

describe('discovery context (F03)',()=>{
 it('classifier gets user turns only; the answer call gets both roles as masked, untrusted history',async()=>{
  await ask('and in the South?',{history:[{role:'user',content:'Factories in the North, call me 0912345678'},{role:'assistant',content:'Here are northern parks. Which province do you prefer?'}]});
  const cls=call(0),ans=call(1);
  expect(cls.filter(m=>m.role==='assistant')).toHaveLength(0);
  expect(JSON.stringify(cls)).not.toContain('0912345678');
  expect(ans.some(m=>m.role==='assistant'&&m.content.includes('Which province'))).toBe(true);
  expect(JSON.stringify(ans)).not.toContain('0912345678');
  expect(cls[0].content).toContain('last question was about location');
 });
 it.each([['chưa xác định','vi'],['Not decided','en'],['待定','zh']])('a short unknown reply to the discovery location question is understood (%s)',async(msg,language)=>{
  classifierOut={...classifierOut,location:'North'}; // stale value from history must not win
  const r:any=await answer('public',session,{language,message:msg,history:[{role:'assistant',content:'I can search all parks. Which province or region do you prefer?'}]});
  expect(r.draft.location).toBe('Not specified');expect(r.draft.explicitUnknown).toContain('location');
  const data=call(1)[0].content;expect(data).toContain('QA South Park');expect(data).toContain('QA North Park');
 });
 it('a short region reply to the location question filters deterministically',async()=>{
  const r:any=await ask('only the South',{history:[{role:'assistant',content:'Which region do you prefer?'}]});
  expect(r.draft.location).toBe('South');const data=call(1)[0].content;expect(data).toContain('QA South Park');expect(data).not.toContain('QA North Park');
 });
});

describe('ordinal references (S36)',()=>{
 it.each([['the second one','en'],['cái thứ hai','vi'],['第二个','zh']])('%s resolves against the displayed order',async(msg,language)=>{
  const r:any=await answer('public',session,{language,message:msg,displayedIds:['asset-hp-1','asset-bd-1']});
  expect(call(0)[0].content).toContain('referring to record asset-bd-1');
  const data=call(1)[0].content;expect(data).toContain('QA Factory');expect(data).not.toContain('QA Warehouse');
  expect(r.draft.parkId).toBeUndefined(); // viewing a record never becomes a requirement
 });
 it('the answer model is told which record the reference resolved to, and gets only the reply-language enquiry label',async()=>{
  await answer('public',session,{language:'zh',message:'第二个',displayedIds:['asset-hp-1','asset-bd-1']});
  const sys=call(1)[0].content;expect(sys).toContain('resolved by the application to record asset-bd-1');expect(sys).toContain('do not re-count earlier lists');
  expect(sys).toContain('"创建租赁需求"');expect(sys).not.toContain('Create leasing enquiry');expect(sys).not.toContain('Tạo yêu cầu thuê');
 });
 it('no unique reference => asks which item, without any model call or guess',async()=>{
  const r:any=await ask('the third one',{displayedIds:['asset-hp-1','not-a-real-id']});
  expect(r.text).toContain('Which item do you mean');expect(mocks.requestModel).not.toHaveBeenCalled();
 });
});

describe('criteria are explicit only (F07, F08)',()=>{
 it('carries budget/date/clear from the classifier after validation',async()=>{
  classifierOut={...classifierOut,areaMin:20000,areaMax:20000,assetType:'ready_built_factory',industry:'Electronics',location:'North',budget:{mode:'specific',amount:5,currency:'USD',areaBasis:'m²',period:'month'},availabilityDate:'2099-01-01',clear:['parkId','bogus']};
  const r:any=await ask('I need a 2 ha factory in the North for electronics, 5 USD/m²/month, from 2099-01-01');
  expect(r.draft).toMatchObject({areaMin:20000,areaMax:20000,assetType:'ready_built_factory',industry:'Electronics',location:'North',budget:{mode:'specific',amount:5,currency:'USD',areaBasis:'m²',period:'month'},availabilityDate:'2099-01-01',clear:['parkId']});
 });
 it('drops invented/invalid values',async()=>{classifierOut={...classifierOut,location:'Atlantis',industry:'Weapons',assetType:'castle',budget:{mode:'specific',currency:'EUR'}};const r:any=await ask('show me something');expect(r.draft).toEqual({clear:[],explicitUnknown:[]})});
 it.each(['yes','ok','好','vâng'])('a bare "%s" creates no criteria',async msg=>{classifierOut={...classifierOut,assetType:'warehouse',location:'South'};const r:any=await ask(msg,{history:[{role:'assistant',content:'Would you like warehouses in the South?'}]});expect(r.draft).toEqual({clear:[],explicitUnknown:[]})});
 it('hypothetical questions do not change criteria (S53)',async()=>{classifierOut={...classifierOut,location:'Not specified'};const r:any=await ask('If I said "not specified", would you still search?');expect(r.draft).toEqual({clear:[],explicitUnknown:[]})});
 it('a park is only proposed for an explicit enquiry start',async()=>{classifierOut={...classifierOut,parkIds:['p-hp']};expect(((await ask('tell me about QA North Park')) as any).draft.parkId).toBeUndefined();classifierOut={...classifierOut,parkIds:['p-hp'],startRequest:true};expect(((await ask('create a leasing enquiry for QA North Park')) as any).draft.parkId).toBe('p-hp')});
});

describe('actor routing (S19, S21–S23)',()=>{
 it.each(['supply_side','seller','service_provider','existing_tenant_support'])('%s never starts or offers a tenant enquiry',async actor=>{
  classifierOut={...classifierOut,actor,startRequest:true,offerRequest:true,assetType:'warehouse'};
  const r:any=await ask('message');expect(r.startRequest).toBe(false);expect(r.offerRequest).toBe(false);expect(r.draft).toEqual({clear:[],explicitUnknown:[]});
  expect(call(1)[0].content).toMatch(/Do not (start|offer|open) a (tenant|leasing) enquiry/);
 });
 it('terminology is tied to the reply language (no "mặt bằng" in English answers)',async()=>{await ask('compare parks');const sys=call(1)[0].content;expect(sys).toContain('English replies say "properties"');expect(sys).toContain('Never mix languages');expect(sys).not.toContain('Vietnamese must call properties')});
 it('tenant policy is always present in the public answer prompt',async()=>{await ask('compare parks');const sys=call(1)[0].content;expect(sys).toContain('never ask for company, name, email or phone');expect(sys).toContain('ask permission to relax one named criterion');expect(sys).toContain('specialist confirmation')});
 it('admin prompts are unchanged by the public policy',async()=>{mocks.query.mockImplementation(async(sql:string)=>sql.includes('public_catalogue')?{rows:[]}:{rows:[{allowed:true}]});const {state}=await import('./repository');(state as any).mockResolvedValue({store:{drafts:[]},inventory:{parks:[],assets:[]},requests:[]});await answer('admin',session,{language:'en',message:'summarise'});expect(mocks.requestModel).toHaveBeenCalledTimes(2);const sys=call(1)[0].content;expect(sys).toContain('internal management analyst');expect(sys).not.toContain('Visitor policy')});
});

describe('numerical data survives masking (F11)',()=>{
 it('area ranges and prices reach the classifier; phones do not',async()=>{
  await ask('Find factories 10000-20000 m2 under 500000000 VND per year, phone 0912 345 678');
  const user=call(0).at(-1).content;expect(user).toContain('10000-20000 m2');expect(user).toContain('500000000 VND');expect(user).not.toContain('345 678');
 });
});

// ---- Targeted completion pass: S18, S20, S28 (discovery, mocked model) ----
describe('S28 incompatible price bases are answered without the model',()=>{
 it.each([
  ['en','Compare 5 USD/m²/month with 2 billion VND/ha/year','cannot compare them directly'],
  ['vi','So sánh 5 USD/m2/tháng với 2 tỷ đồng/ha/năm','không so sánh trực tiếp được'],
  ['zh','每平方米每月5美元和每公顷每年20亿越南盾比较哪个便宜','无法直接比较'],
 ])('%s',async(language,message,phrase)=>{
  const r:any=await answer('public',session,{language,message});
  expect(mocks.requestModel).not.toHaveBeenCalled(); // no model => no invented exchange rate or arithmetic
  expect(r.text).toContain(phrase);expect(r.startRequest).toBe(false);expect(r.draft).toEqual({clear:[],explicitUnknown:[]});
  const nums=(r.text.match(/\d[\d.,\s]*\d|\d/g)||[]).map((n:string)=>n.replace(/[^\d]/g,''));
  expect(nums.every((n:string)=>['5','2000000000','2'].includes(n))).toBe(true); // only the visitor's own figures appear
 });
 it('same-basis comparisons still go to the grounded answer',async()=>{await ask('Compare 5 USD/m²/month with 6 USD/m²/month');expect(mocks.requestModel).toHaveBeenCalledTimes(2)});
});
describe('S18 representative is tenant-side, never supply-side, never verified',()=>{
 it.each([['en','I represent a tenant looking for a 2 ha factory'],['vi','Tôi là môi giới, cần tìm nhà xưởng 2 ha cho khách hàng'],['zh','我是中介，替客户找2公顷的厂房']])('%s',async(language,message)=>{
  classifierOut={...classifierOut,actor:'supply_side',offerRequest:true,assetType:'ready_built_factory',areaMin:20000,areaMax:20000};
  const r:any=await answer('public',session,{language,message});
  expect(r.actor).toBe('representative');expect(r.offerRequest).toBe(true);expect(r.draft).toMatchObject({assetType:'ready_built_factory',areaMin:20000});
  expect(call(1)[0].content).toContain('Never claim or imply that their authority is verified');expect(call(1)[0].content).not.toContain('OFFER premises');
 });
});
describe('S20 existing tenant expansion is a normal search, support stays support',()=>{
 it.each([['en','We are already a tenant and need another warehouse'],['vi','Chúng tôi đang thuê và cần thêm một nhà xưởng'],['zh','我们是现有租户，需要再租一个仓库']])('%s expansion',async(language,message)=>{
  classifierOut={...classifierOut,actor:'existing_tenant_support',offerRequest:true,assetType:'warehouse'};
  const r:any=await answer('public',session,{language,message});
  expect(r.actor).toBe('tenant');expect(r.offerRequest).toBe(true);expect(r.draft.assetType).toBe('warehouse');
  expect(call(1)[0].content).not.toContain('needing support for current premises');
 });
 it.each([['en','The roof of our rented factory leaks'],['vi','Mái nhà xưởng đang thuê bị dột'],['zh','我们租的厂房屋顶漏水']])('%s support request',async(language,message)=>{
  classifierOut={...classifierOut,actor:'existing_tenant_support',offerRequest:true};
  const r:any=await answer('public',session,{language,message});
  expect(r.actor).toBe('existing_tenant_support');expect(r.offerRequest).toBe(false);expect(r.startRequest).toBe(false);
 });
});

// ---- Boundary remediation B/C (Codex source review) ----
describe('B: non-authorising turns never start or offer an enquiry, whatever the classifier says',()=>{
 it.each([
  ['en','yes'],['vi','vâng'],['zh','好的'],
  ['en','If I said "create a leasing enquiry", would anything be sent?'],['vi','Nếu tôi gõ “tạo yêu cầu thuê” thì có gửi luôn không?'],['zh','如果我输入“创建租赁需求”，会直接发送吗？'],
  ['en','My colleague typed "create a leasing enquiry" yesterday'],['vi','Đồng nghiệp tôi gõ “tạo yêu cầu thuê” hôm qua'],['zh','同事昨天输入了“创建租赁需求”'],
 ])('%s: %s',async(language,message)=>{
  classifierOut={...classifierOut,startRequest:true,offerRequest:true,assetType:'warehouse',location:'North'};
  const r:any=await answer('public',session,{language,message});
  expect(r.startRequest).toBe(false);expect(r.offerRequest).toBe(false);expect(r.draft).toEqual({clear:[],explicitUnknown:[]});
 });
 it.each([['en','Create a leasing enquiry for a 2 ha factory'],['vi','Tạo yêu cầu thuê nhà xưởng 2 ha giúp tôi'],['zh','帮我创建租赁需求，2公顷厂房'],['en','Please start an enquiry for me']])('%s explicit creation still starts intake: %s',async(language,message)=>{
  classifierOut={...classifierOut,startRequest:true,offerRequest:true,assetType:'ready_built_factory'};
  const r:any=await answer('public',session,{language,message});expect(r.startRequest).toBe(true);expect(r.draft.assetType).toBe('ready_built_factory');
 });
});
describe('C: chat park context scopes discovery only until superseded',()=>{
 const data=()=>call(1)[0].content;
 it('an ambiguous question on a park page is clarified; choosing current keeps the park',async()=>{const c:any=await ask('show warehouses',{parkId:'p-hp'});expect(c.clarify).toMatchObject({kind:'park',id:'p-hp'});expect(mocks.requestModel).toHaveBeenCalledTimes(1);await ask('show warehouses',{pageContext:{kind:'park',id:'p-hp'},scopeChoice:'current',choiceFor:{kind:'park',id:'p-hp'}});expect(call(2)[0].content).toContain('QA North Park');expect(call(2)[0].content).not.toContain('QA South Park')});
 it('a compatible location keeps the park scope',async()=>{classifierOut={...classifierOut,location:'North'};await ask('in the North',{parkId:'p-hp'});expect(data()).toContain('QA North Park');expect(data()).not.toContain('QA South Park')});
 it.each([
  ['South instead',{location:'South'}],['anywhere',{explicitUnknown:['location']}],['remove the park filter',{clear:['parkId']}],['any location',{clear:['location']}],
 ])('"%s" supersedes the chat park',async(message,patch)=>{classifierOut={...classifierOut,...patch};await ask(message,{parkId:'p-hp'});expect(data()).toContain('QA South Park')});
});
