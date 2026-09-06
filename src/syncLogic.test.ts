import {describe,it,expect} from 'vitest';
import {identifyRows,mergeImported} from './admin/repeatedRows';
import {candidateChecks} from './matching';
import {assetPriceText} from './assetPrice';
import {parks,assets} from './data';
import type {IndustrialRequest} from './types';
import {mockTradeExpos,visibleVigExpos} from './TradeExpoSection';
import {matchesParkFilters,matchesAssetFilters} from './DiscoveryFilters';
describe('Crossing synchronization',()=>{
 it('shows only explicitly VIG-owned public expos',()=>{
  expect(visibleVigExpos(mockTradeExpos)).toHaveLength(3);
  expect(visibleVigExpos([{...mockTradeExpos[0],ownerId:''},{...mockTradeExpos[0],isPublic:false}])).toEqual([]);
 });
 it('combines area and province filters and never treats undisclosed land as available',()=>{
  const p={...parks[0],totalArea:{...parks[0].totalArea,value:1,unit:'ha'}};
  expect(matchesParkFilters(p,new URLSearchParams('minArea=10000&maxArea=10000'))).toBe(true);
  expect(matchesParkFilters(p,new URLSearchParams('province=other'))).toBe(false);
  expect(matchesParkFilters({...p,availability:p.availability.map(a=>({...a,available:{...a.available,value:999,disclosureStatus:'not_disclosed'}}))},new URLSearchParams('available=yes'))).toBe(false);
  expect(matchesAssetFilters({...assets[0],area:1,unit:'ha'},p,new URLSearchParams('minArea=10000&maxArea=10000'))).toBe(true);
 });
 it('updates repeated rows by identity, not order, and retains omitted/blank fields',()=>{
  const before=[{_rowId:'a',name:'A',capacity:10},{_rowId:'b',name:'B',capacity:20}];
  const after=mergeImported(before,[{_rowId:'b',name:'',capacity:21},{_rowId:'a',capacity:11}]);
  expect(after).toEqual([{_rowId:'a',name:'A',capacity:11},{_rowId:'b',name:'B',capacity:21}]);
  expect(mergeImported(before,[{_rowId:'b',capacity:22}])[0]).toEqual(before[0]);
 });
 it('blocks duplicate or missing row identities and imported verification',()=>{
  expect(()=>mergeImported([],[{name:'A'}])).toThrow();
  expect(()=>mergeImported([],[{_rowId:'a'},{_rowId:'a'}])).toThrow();
  expect(()=>mergeImported([],[{_rowId:'a',verificationStatus:'verified'}])).toThrow();
 });
 it('preserves assigned identities across serialization and does not remove list choices',()=>{
  const rows=identifyRows([{name:'A'},{name:'B'}]);
  expect(identifyRows(JSON.parse(JSON.stringify(rows)))).toEqual(rows);
  expect(mergeImported(['Electronics'],['Logistics'])).toEqual(['Electronics','Logistics']);
 });
 it('distinguishes unknown criteria from definite area mismatches',()=>{
  const r={location:'unrecognized location',industry:'',assetType:assets[0].type,areaMin:1,areaMax:2} as IndustrialRequest;
  const checks=candidateChecks(r,parks[0],assets);
  expect(checks.find(c=>c.key==='location')?.state).toBe('unknown');
  expect(checks.find(c=>c.key==='area')?.state).toBe('unmatched');
 });
 it('never leaks hidden prices, even with an old specific value',()=>{
  const a={...assets[0],priceMode:'negotiable' as const,price:{...assets[0].price,value:4.5,disclosureStatus:'not_disclosed' as const}};
  expect(assetPriceText(a,'vi')).toBe('Không công bố');
  expect(assetPriceText({...a,price:{...a.price,disclosureStatus:'public'}},'vi')).toBe('Thỏa thuận');
 });
});
