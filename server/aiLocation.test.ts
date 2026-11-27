// @vitest-environment node
// Location matching for public discovery (staged smoke 2026-11-19: "Tôi muốn tìm nhà xưởng cho thuê tại Thái Bình…"
// returned nationwide sources because "Thái Bình" is not a catalogue province; VSIP Thái Bình park is in Hưng Yên).
import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({requestModel:vi.fn(),query:vi.fn()}));
vi.mock('./aiTransport',()=>({requestModel:mocks.requestModel,openAIConfig:()=>({key:'test-key',model:'test-model'})}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:vi.fn().mockResolvedValue({rows:[]})})}));
vi.mock('./repository',()=>({state:vi.fn()}));
import {answer,resolveLocation} from './ai';

// Slice of the published catalogue (read-only GET /api/catalogue, 2026-11-19).
const parks=[
 {id:'park-vsip-thai-binh',slug:'vsip-thai-binh',province:'Hưng Yên',region:'North',suitableIndustries:['Electronics'],restrictedIndustries:[],name:{vi:'Khu công nghiệp VSIP Thái Bình',en:'VSIP Thai Binh Industrial Park'}},
 {id:'park-demo-02',slug:'park-demo-02',province:'Hải Phòng',region:'North',suitableIndustries:['Logistics'],restrictedIndustries:[],name:{vi:'KCN công nghệ Đông Hải',en:'Dong Hai Technology Industrial Park',zh:'Đông Hải科技工业园区'}},
 {id:'park-demo-04',slug:'park-demo-04',province:'Bắc Ninh',region:'North',suitableIndustries:['Electronics'],restrictedIndustries:[],name:{vi:'KCN điện tử Kinh Bắc',en:'Kinh Bac Electronics Industrial Park'}},
 {id:'park-demo-13',slug:'park-demo-13',province:'Bình Dương',region:'South',suitableIndustries:['Industrial automation'],restrictedIndustries:[],name:{vi:'KCN tự động hóa Sông Bé',en:'Song Be Automation Industrial Park'}},
];
const assets=[
 {id:'asset-1',parkId:'park-vsip-thai-binh',type:'ready_built_factory',area:12000,unit:'m²',name:{vi:'Nhà xưởng xây sẵn 1',en:'Ready-built Factory 1'}},
 {id:'asset-2',parkId:'park-vsip-thai-binh',type:'industrial_land',area:3.5,unit:'ha',name:{vi:'Lô đất công nghiệp 2',en:'Industrial land 2'}},
 {id:'asset-park-demo-02-ready_built_factory',parkId:'park-demo-02',type:'ready_built_factory',area:8000,unit:'m²',name:{vi:'Nhà xưởng xây sẵn 02-1',en:'Ready-built Factory 02-1'}},
 {id:'asset-4',parkId:'park-demo-04',type:'ready_built_factory',area:13500,unit:'m²',name:{vi:'Nhà xưởng xây sẵn 4',en:'Ready-built Factory 4'}},
 {id:'asset-park-demo-13-ready_built_factory',parkId:'park-demo-13',type:'ready_built_factory',area:9000,unit:'m²',name:{vi:'Nhà xưởng xây sẵn 13-1',en:'Ready-built Factory 13-1'}},
];
const session={workspace_id:'w',tokenHash:'t'};
let classifierOut:any;
const SMOKE='Tôi muốn tìm nhà xưởng cho thuê tại Thái Bình. Có những lựa chọn nào?';
const answerContext=()=>{const sys=(mocks.requestModel.mock.calls[1]?.[0] as any[])[0].content as string;return sys;};
beforeEach(()=>{vi.clearAllMocks();classifierOut={allowed:true,intent:'search',actor:'tenant',parkIds:[],assetType:'ready_built_factory',offerRequest:true,startRequest:false};
 mocks.query.mockImplementation(async(sql:string)=>sql.includes('public_catalogue')?{rows:[...parks.map(p=>({kind:'park',payload:p})),...assets.map(a=>({kind:'asset',payload:a}))]}:{rows:[{allowed:true}]});
 mocks.requestModel.mockImplementation(async(_m:any,json:boolean)=>({text:json?JSON.stringify(classifierOut):'Grounded answer.',usage:{}}));
});
const ask=(message:string,extra:any={})=>answer('public',session,{language:'vi',message,...extra}) as Promise<any>;
const ids=(r:any)=>r.sources.map((s:any)=>s.id).sort();

describe('resolveLocation',()=>{
 it('resolves regions, provinces (accent/case-insensitive), park-name places, and leaves others unresolved',()=>{
  expect(resolveLocation('North',parks)).toEqual({kind:'region',value:'North'});
  expect(resolveLocation('miền Nam',parks)).toEqual({kind:'region',value:'South'});
  expect(resolveLocation('Hưng Yên',parks)).toEqual({kind:'province',value:'Hưng Yên'});
  expect(resolveLocation('hung yen',parks)).toEqual({kind:'province',value:'Hưng Yên'});
  expect(resolveLocation('Thái Bình',parks)).toEqual({kind:'parkName',value:'Thái Bình',parkIds:['park-vsip-thai-binh']});
  expect(resolveLocation('Thai Binh',parks)).toEqual({kind:'parkName',value:'Thai Binh',parkIds:['park-vsip-thai-binh']});
  expect(resolveLocation('Lào Cai',parks)).toEqual({kind:'unresolved',value:'Lào Cai',parkIds:[]});
  expect(resolveLocation('Bi',parks)).toEqual({kind:'unresolved',value:'Bi',parkIds:[]}); // too short to match a park name
  expect(resolveLocation(null,parks)).toEqual({kind:'none'});expect(resolveLocation('Not specified',parks)).toEqual({kind:'none'});
 });
});

describe('resolveLocation: non-Latin input fails closed (review fix)',()=>{
 it('a Chinese place that is not in the catalogue is unresolved, never "none"',()=>{
  expect(resolveLocation('北京',parks)).toEqual({kind:'unresolved',value:'北京',parkIds:[]});
  expect(resolveLocation('太平省',parks)).toEqual({kind:'unresolved',value:'太平省',parkIds:[]});
 });
 it('a non-empty location that normalises to nothing is unresolved',()=>{
  expect(resolveLocation('—!?',parks)).toEqual({kind:'unresolved',value:'—!?',parkIds:[]});
 });
 it('an exact Unicode (Chinese) park name still matches',()=>{
  expect(resolveLocation('Đông Hải科技工业园区',parks)).toEqual({kind:'parkName',value:'Đông Hải科技工业园区',parkIds:['park-demo-02']});
 });
});

describe('public discovery location scope (staged smoke regression)',()=>{
 it('the exact smoke query is limited to the park named Thái Bình; no unrelated nationwide sources; no invented location',async()=>{
  classifierOut={...classifierOut,location:'Thái Bình'};
  const r=await ask(SMOKE);
  expect(ids(r)).toEqual(['asset-1','park-vsip-thai-binh']);
  expect(r.draft.location).toBeUndefined(); // "Thái Bình" is not a controlled value; Hưng Yên is never substituted
  expect(r.draft.assetType).toBe('ready_built_factory');
  const ctx=answerContext();
  expect(ctx).toContain('"matchedBy":"parkName"');expect(ctx).toContain('"province":"Hưng Yên"');
  expect(ctx).not.toContain('Đông Hải');expect(ctx).not.toContain('Kinh Bắc');
  // Staged final check: search data has matches:[] (admin-only) but assets present; the answer prompt must not read that as "no properties".
  const data=JSON.parse(ctx.slice(ctx.indexOf('DATA: ')+6));
  expect(data).toMatchObject({intent:'search',matches:[],totalMatchingAssets:1});expect(data.assets.map((a:any)=>a.id)).toEqual(['asset-1']);
  expect(ctx).toContain('Customer matching (intent "match", admin only): mention only assets in matches.results');
  expect(ctx).toContain('DATA.matches is always empty there and does NOT mean there are no properties; present the properties in DATA.assets');
  expect(ctx).toContain('only when totalMatchingAssets is 0');
 });
 it('unaccented input behaves the same',async()=>{classifierOut={...classifierOut,location:'Thai Binh'};const r=await ask('factory in Thai Binh');expect(ids(r)).toEqual(['asset-1','park-vsip-thai-binh']);});
 it('a province written without accents is canonicalised and kept in the draft',async()=>{
  classifierOut={...classifierOut,location:'Hung Yen'};const r=await ask('nhà xưởng ở Hung Yen');
  expect(r.draft.location).toBe('Hưng Yên');expect(ids(r)).toEqual(['asset-1','park-vsip-thai-binh']);
 });
 it('an unresolved location returns no listings instead of widening nationally, and tells the answer model why',async()=>{
  classifierOut={...classifierOut,location:'Lào Cai'};const r=await ask('nhà xưởng tại Lào Cai');
  expect(r.sources).toEqual([]);expect(r.draft.location).toBeUndefined();
  const ctx=answerContext();expect(ctx).toContain('"matchedBy":"unresolved"');expect(ctx).toContain('Results are intentionally empty');
 });
 it('a Chinese unknown location returns no listings (no nationwide widening)',async()=>{
  classifierOut={...classifierOut,location:'北京'};const r=await answer('public',session,{language:'zh',message:'我想在北京找厂房'}) as any;
  expect(r.sources).toEqual([]);expect(r.draft.location).toBeUndefined();
  const ctx=answerContext();expect(ctx).toContain('"matchedBy":"unresolved"');expect(ctx).not.toContain('Kinh Bắc');
 });
 it('exact provinces and regions keep their existing behaviour',async()=>{
  classifierOut={...classifierOut,location:'Bình Dương'};let r=await ask('nhà xưởng Bình Dương');expect(r.draft.location).toBe('Bình Dương');expect(ids(r)).toEqual(['asset-park-demo-13-ready_built_factory','park-demo-13']);
  classifierOut={...classifierOut,location:'North'};r=await ask('nhà xưởng miền Bắc');expect(r.draft.location).toBe('North');expect(ids(r)).not.toContain('park-demo-13');
 });
 it('no location keeps the unfiltered search (unchanged)',async()=>{classifierOut={...classifierOut,location:null};const r=await ask('nhà xưởng cho thuê');expect(ids(r)).toContain('asset-1');expect(ids(r)).toContain('asset-park-demo-13-ready_built_factory');});
 it('the classifier is told to keep non-catalogue place names verbatim',async()=>{
  classifierOut={...classifierOut,location:'Thái Bình'};await ask(SMOKE);
  const cls=(mocks.requestModel.mock.calls[0][0] as any[])[0].content as string;
  expect(cls).toContain('otherwise the place name exactly as the user wrote it; never substitute, translate or map it to a different province');
 });
});
