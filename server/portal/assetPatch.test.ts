import {describe,expect,it,vi} from 'vitest';
vi.mock('../db',()=>({pool:{},ApiError:class ApiError extends Error{status:number;constructor(s:number,m:string){super(m);this.status=s}}}));
import {applyPatch,newAsset} from './content';
describe('portal asset patch: detail fields',()=>{
 const base=()=>({...newAsset('park-x','asset-x'),name:{vi:'a',en:'a',zh:'a'},description:{vi:'a',en:'a',zh:'a'},area:1000,image:'',type:'warehouse' as const});
 it('stores typed detail values and drops empty ones',()=>{
  const out=applyPatch('asset',base(),{lotCode:'B-12','zone.vi':'Khu B','specs.clearHeightM':'10,5','specs.dockDoors':'4','terms.vatIncluded':'false','terms.minLeaseYears':'','specs.dimensions':''}) as any;
  expect(out.lotCode).toBe('B-12');expect(out.zone.vi).toBe('Khu B');expect(out.specs).toEqual({clearHeightM:10.5,dockDoors:4});
  expect(out.terms).toEqual({vatIncluded:false});
  expect(applyPatch('asset',out,{'terms.vatIncluded':''}).terms).toBeUndefined();
 });
 it('rejects invalid detail values',()=>{
  for(const patch of [{lotCode:'bad code'},{'specs.dockDoors':'1.5'},{'specs.coverageMaxPct':'150'},{'specs.builtYear':'1800'},{'specsAsOf':'x'},{'terms.vatIncluded':'maybe'},{'specs.gallery':'x'}])expect(()=>applyPatch('asset',base(),patch)).toThrow();
 });
});
