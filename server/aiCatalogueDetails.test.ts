// The public assistant receives the PUBLISHED asset detail fields (and only those); the model transport is mocked.
import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({requestModel:vi.fn(),query:vi.fn()}));
vi.mock('./aiTransport',()=>({requestModel:mocks.requestModel,modelConfig:()=>({key:'test-key',model:'test-model'})}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:vi.fn().mockResolvedValue({rows:[]})})}));
vi.mock('./repository',()=>({state:vi.fn()}));
import {answer} from './ai';
import {publicAssetDetails} from '../src/assetFields';

const parks=[{id:'p-hp',slug:'qa-north',province:'Hải Phòng',region:'North',suitableIndustries:['Electronics'],restrictedIndustries:[],name:{en:'QA North Park'}}];
const lot={id:'asset-hp-1',parkId:'p-hp',type:'ready_built_factory',area:5000,unit:'m²',name:{en:'QA Factory'},powerMva:4,availableFrom:'2027-03-01',
 lotCode:'A-07',zone:{vi:'Khu A',en:'Zone A',zh:'A区'},leasingStatus:'reserved',waterM3Day:450,specsAsOf:'2026-10-01',specsVerification:'reviewed',
 specs:{clearHeightM:10,floorLoadTonM2:3,dockDoors:4,fireSystem:{en:'Sprinkler'},sourceDocumentId:'doc-secret-1'},
 terms:{vatIncluded:false,minLeaseYears:3,paymentNote:{en:'Quarterly'}},
 gallery:[{url:'/images/x.jpg',approved:true}],dataOwner:'internal-owner',verifiedBy:'someone@example.com',sourceDocumentId:'doc-secret-2'};
const session={workspace_id:'w',tokenHash:'t'};
beforeEach(()=>{vi.clearAllMocks();
 mocks.query.mockImplementation(async(sql:string)=>sql.includes('public_catalogue')?{rows:[...parks.map(p=>({kind:'park',payload:p})),{kind:'asset',payload:lot}]}:{rows:[{allowed:true}]});
 mocks.requestModel.mockImplementation(async(_m:any,json:boolean)=>({text:json?JSON.stringify({allowed:true,intent:'search',actor:'tenant',parkIds:[]}):'Grounded answer.',usage:{}}));
});
describe('AI catalogue: public asset detail fields',()=>{
 it('sends published lot values (power, handover, specs, terms, status) and no internal fields',async()=>{
  await answer('public',session,{language:'en',message:'factories in the North'});
  const data=(mocks.requestModel.mock.calls[1][0] as any[]).map(m=>m.content).join('\n');
  for(const expected of ['"powerMva":4','"availableFrom":"2027-03-01"','"lotCode":"A-07"','"leasingStatus":"reserved"','"waterM3Day":450','"clearHeightM":10','"dockDoors":4','"minLeaseYears":3','"vatIncluded":false','"specsVerification":"reviewed"','"specsAsOf":"2026-10-01"','Khu A'])expect(data).toContain(expected);
  for(const forbidden of ['doc-secret-1','doc-secret-2','internal-owner','someone@example.com','/images/x.jpg','"gallery"'])expect(data).not.toContain(forbidden);
 });
 it('publicAssetDetails omits empties, gallery and internal keys, and returns nothing for a legacy asset',()=>{
  expect(publicAssetDetails({id:'a'} as any)).toEqual({});
  expect(publicAssetDetails({lotCode:' ',zone:{vi:'',en:'',zh:''},specs:{clearHeightM:null,fireSystem:{vi:'',en:'',zh:''}},terms:{}} as any)).toEqual({});
  const d=publicAssetDetails(lot as any);
  expect(Object.keys(d).sort()).toEqual(['leasingStatus','lotCode','specs','specsAsOf','specsVerification','terms','waterM3Day','zone']);
  expect(JSON.stringify(d)).not.toContain('doc-secret');
 });
});
