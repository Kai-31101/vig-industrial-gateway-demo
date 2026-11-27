// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {AppProvider} from './AppContext';
import {assets,parks} from './data';
import {DiscoveryFilters,AssetSortSelect,matchesAssetFilters,matchesDetails,sortAssets,sortKeyOf} from './DiscoveryFilters';
import {leasingKeyOf,powerThresholds,powerLabel,zoneOptions,zoneValue} from './assetDisplay';
import {isPublicAsset} from './leasing';
import type {IndustrialAsset} from './types';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const q=(s:string)=>new URLSearchParams(s);
const base=assets[1];
const priced=(id:string,amount:number|null,over:Partial<IndustrialAsset>={},period:'month'|'term'='term',currency:'USD'|'VND'='USD'):IndustrialAsset=>({...base,id,pricing:{mode:amount==null?'negotiable':'specific',amount,currency,areaBasis:'m²',period},...over} as IndustrialAsset);
const ids=(l:IndustrialAsset[])=>l.map(a=>a.id);

describe('sortAssets',()=>{
 const list=[priced('c',30),priced('a',10),priced('nego',null),priced('other',1,{},'month'),priced('b',20),priced('leased',5,{leasingStatus:'leased'}),priced('vnd',1,{},'term','VND')];
 it('price asc: same basis first, others after in original order, leased always last',()=>{
  expect(ids(sortAssets(list,'price-asc'))).toEqual(['a','b','c','nego','other','vnd','leased']);
 });
 it('price desc keeps non-comparable after the comparable ones and never converts bases',()=>{
  expect(ids(sortAssets(list,'price-desc'))).toEqual(['c','b','a','nego','other','vnd','leased']);
 });
 it('area sorts in m2 across ha and m2 and keeps leased last',()=>{
  const l=[{...base,id:'1',area:2,unit:'ha' as const},{...base,id:'2',area:5000,unit:'m²' as const},{...base,id:'3',area:1,unit:'ha' as const,leasingStatus:'leased' as const}];
  expect(ids(sortAssets(l,'area-asc'))).toEqual(['2','1','3']);
  expect(ids(sortAssets(l,'area-desc'))).toEqual(['1','2','3']);
 });
 it('"updated" orders by newest price/specs date, ties keep input order, leased last',()=>{
  const at=(asOf:string)=>({specsAsOf:undefined,price:{...base.price,asOf}});
  const l=[priced('old',1,at('2026-01-01')),priced('new',1,at('2026-09-01')),priced('tieA',1,at('2026-05-01')),priced('tieB',1,at('2026-05-01')),priced('l',1,{leasingStatus:'leased',...at('2026-12-01')})];
  expect(ids(sortAssets(l,'updated'))).toEqual(['new','tieA','tieB','old','l']);
 });
 it('reads sort from the URL and falls back to the default',()=>{
  expect(sortKeyOf(q('sort=price-asc'))).toBe('price-asc');expect(sortKeyOf(q('sort=bogus'))).toBe('updated');expect(sortKeyOf(q(''))).toBe('updated');
 });
});

describe('leasing, power and zone filters',()=>{
 const a=priced('x',1,{leasingStatus:'available',powerMva:5,zone:{vi:'Khu A',en:'Zone A',zh:'A区'},parkId:'p1'});
 const now=new Date('2026-11-27T00:00:00Z');
 it('leasing filter uses the card derivation including coming soon',()=>{
  expect(leasingKeyOf({leasingStatus:'unknown',availableFrom:'2027-02-01'},now)).toBe('upcoming');
  expect(leasingKeyOf({leasingStatus:'unknown',availableFrom:'2026-01-01'},now)).toBe('');
  expect(matchesDetails({...a,leasingStatus:'unknown',availableFrom:'2027-02-01'},q('leasing=upcoming'),now)).toBe(true);
  expect(matchesDetails({...a,leasingStatus:'unknown',availableFrom:'2027-02-01'},q('leasing=available'),now)).toBe(false);
  expect(matchesDetails(a,q('leasing=available'),now)).toBe(true);
  expect(matchesDetails({...a,leasingStatus:'leased'},q('leasing=leased'),now)).toBe(true);
  expect(matchesDetails({...a,leasingStatus:'reserved'},q('leasing=reserved'),now)).toBe(true);
 });
 it('minimum power excludes assets without a value',()=>{
  expect(matchesDetails(a,q('minPower=5'))).toBe(true);expect(matchesDetails(a,q('minPower=6'))).toBe(false);
  expect(matchesDetails({...a,powerMva:undefined},q('minPower=1'))).toBe(false);
  expect(matchesDetails({...a,powerMva:undefined},q(''))).toBe(true);
 });
 it('power thresholds come from the data and use kVA below 1 MVA',()=>{
  expect(powerThresholds([{powerMva:2},{powerMva:5},{powerMva:5},{powerMva:undefined}])).toEqual([2,5]);
  const many=[1,2,3,4,5,6,7,8,9].map(v=>({powerMva:v}));const t=powerThresholds(many);expect(t.length).toBeLessThanOrEqual(4);expect(t.every(v=>many.some(m=>m.powerMva===v))).toBe(true);
  expect(powerLabel(0.5,'en')).toBe('500 kVA');expect(powerLabel(5,'en')).toBe('5 MVA');
 });
 it('zones are keyed by park so same-named zones of different parks stay separate',()=>{
  const b={...a,id:'y',parkId:'p2'};
  expect(zoneValue(a)).toBe('p1~Khu A');expect(zoneOptions([a,b,a]).map(o=>o.value)).toEqual(['p1~Khu A','p2~Khu A']);
  expect(zoneValue({...a,zone:undefined})).toBe('');
  const park={province:'',region:'',id:'p1',name:{vi:'',en:''}} as any;
  expect(matchesAssetFilters(a,park,q('zone='+encodeURIComponent('p1~Khu A')))).toBe(true);
  expect(matchesAssetFilters(b,park,q('zone='+encodeURIComponent('p1~Khu A')))).toBe(false);
  expect(matchesAssetFilters({...a,zone:undefined},park,q('zone='+encodeURIComponent('p1~Khu A')))).toBe(false);
 });
});

function URLState(){const l=useLocation();return <output data-testid="query">{l.search}</output>}
function setup(query='',mobile=false){
 vi.stubGlobal('matchMedia',()=>({matches:mobile,addEventListener(){},removeEventListener(){}}));
 render(<AppProvider><MemoryRouter initialEntries={['/assets'+query]}><DiscoveryFilters asset resultCount={3}/><AssetSortSelect list={assets.filter(a=>isPublicAsset(a,parks))}/><h2 id="directory-results" tabIndex={-1}>R</h2><URLState/></MemoryRouter></AppProvider>);
}
const query=()=>screen.getByTestId('query').textContent;
describe('filter UI: URL round trip, counter, chips, clear',()=>{
 it('writes leasing, power and zone to the URL, counts them as groups and shows chips (mobile sheet)',()=>{
  setup('',true);
  fireEvent.click(screen.getByRole('button',{name:/Bộ lọc/}));
  fireEvent.change(screen.getByLabelText('Tình trạng'),{target:{value:'available'}});
  const power=screen.getByLabelText('Điện tối thiểu') as HTMLSelectElement;const pv=[...power.options].map(o=>o.value).filter(Boolean);expect(pv.length).toBeGreaterThan(0);
  fireEvent.change(power,{target:{value:pv[0]}});
  const zone=screen.getByLabelText('Phân khu') as HTMLSelectElement;const zv=[...zone.options].map(o=>o.value).filter(Boolean);expect(zv.length).toBeGreaterThan(0);
  expect(zone.options[1].textContent).toContain(' · ');
  fireEvent.change(zone,{target:{value:zv[0]}});
  const p=new URLSearchParams(query()!);expect(p.get('leasing')).toBe('available');expect(p.get('minPower')).toBe(pv[0]);expect(p.get('zone')).toBe(zv[0]);
  expect(screen.getByRole('button',{name:/Bộ lọc \(3\)/})).toBeTruthy();
  const chips=screen.getByLabelText('Bộ lọc đang áp dụng');expect(within(chips).getByText(/Còn trống/)).toBeTruthy();expect(within(chips).getByText(/Điện ≥/)).toBeTruthy();
  fireEvent.click(within(chips).getByText(/Còn trống/));expect(new URLSearchParams(query()!).get('leasing')).toBeNull();
 });
 it('restores filters from the URL and clearing keeps the sort',()=>{
  const pw=String(powerThresholds(assets.filter(a=>isPublicAsset(a,parks)))[0]);setup('?leasing=reserved&minPower='+pw+'&sort=area-desc');
  expect((screen.getByLabelText('Tình trạng') as HTMLSelectElement).value).toBe('reserved');
  expect((screen.getByLabelText('Điện tối thiểu') as HTMLSelectElement).value).toBe(pw);
  expect(screen.getByText(/Bộ lọc tìm kiếm \(2\)/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
  expect(query()).toBe('?sort=area-desc');
 });
 it('sort is stored in the URL, the default leaves it clean, and it is not counted as a filter',()=>{
  setup('');
  const sort=screen.getByLabelText('Sắp xếp') as HTMLSelectElement;expect([...sort.options].map(o=>o.textContent)).toEqual(['Mới cập nhật','Diện tích tăng dần','Diện tích giảm dần','Giá thấp → cao','Giá cao → thấp']);
  fireEvent.change(sort,{target:{value:'price-asc'}});expect(query()).toBe('?sort=price-asc');
  expect(screen.getByText(/Chỉ so sánh giá cùng cơ sở/)).toBeTruthy();
  expect(screen.getByText(/Bộ lọc tìm kiếm/).textContent).not.toMatch(/\(\d\)/);
  fireEvent.change(sort,{target:{value:'updated'}});expect(query()).toBe('');
 });
});
