// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {AppProvider} from './AppContext';
import {parks,assets} from './data';
import {pricingOf} from './contentSchema';
import {isPublicPark} from './leasing';
import {DiscoveryFilters,hasPublishedSale,homeSearchTarget,matchesAssetFilters,matchesParkFilters,priceBands,priceBasisKey} from './DiscoveryFilters';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const q=(s:string)=>new URLSearchParams(s);
const park=parks.find(isPublicPark)!;
const specific=(amount:number,period:'month'|'term'='month')=>({...assets[1],pricing:{mode:'specific' as const,amount,currency:'USD' as const,areaBasis:'m²' as const,period}});
function URLState(){const l=useLocation();return <output data-testid="query">{l.search}</output>}
function setup(asset:boolean,query='',mobile=false){vi.stubGlobal('matchMedia',()=>({matches:mobile,addEventListener(){},removeEventListener(){}}));render(<AppProvider><MemoryRouter initialEntries={[(asset?'/assets':'/industrial-parks')+query]}><DiscoveryFilters asset={asset} resultCount={3}/><h2 id="directory-results" tabIndex={-1}>R</h2><URLState/></MemoryRouter></AppProvider>)}
describe('phase 1 filters: logic',()=>{
 it('filters parks by parkType',()=>{
  expect(matchesParkFilters(park,q('parkType='+encodeURIComponent(park.parkType.vi)))).toBe(true);
  expect(matchesParkFilters(park,q('parkType='+encodeURIComponent('khác')))).toBe(false);
 });
 it('filters assets by type',()=>{
  const a={...assets[1],type:'warehouse' as const};
  expect(matchesAssetFilters(a,park,q('type=warehouse'))).toBe(true);
  expect(matchesAssetFilters(a,park,q('type=industrial_land'))).toBe(false);
  expect(matchesAssetFilters(a,park,q('type=all'))).toBe(true);
 });
 it('compares price only within the same basis and treats negotiable/unavailable as contact',()=>{
  const month=specific(4),term=specific(90,'term'),nego={...assets[1],pricing:{mode:'negotiable' as const,amount:null,currency:'USD' as const,areaBasis:'m²' as const,period:'month' as const}};
  const range=q('priceMin=3&priceMax=5&priceBasis='+encodeURIComponent(priceBasisKey(month)));
  expect(matchesAssetFilters(month,park,range)).toBe(true);
  expect(matchesAssetFilters(specific(9),park,range)).toBe(false);
  expect(matchesAssetFilters({...term,pricing:{...term.pricing,amount:4}},park,range)).toBe(false);
  expect(matchesAssetFilters(nego,park,range)).toBe(false);
  expect(matchesAssetFilters(nego,park,q('priceMode=contact'))).toBe(true);
  expect(matchesAssetFilters({...nego,pricing:{...nego.pricing,mode:'not_available' as const}},park,q('priceMode=contact'))).toBe(true);
  expect(matchesAssetFilters(month,park,q('priceMode=contact'))).toBe(false);
 });
 it('derives price bands from the most common basis in the data, without conversion',()=>{
  const {basis,bands}=priceBands(assets);
  expect(basis).toBe('USD/m²/month');
  expect(bands.length).toBeGreaterThan(0);
  const amounts=assets.filter(a=>priceBasisKey(a)===basis).map(a=>pricingOf(a).amount as number);
  expect(bands[0].min).toBe(Math.min(...amounts));expect(bands[bands.length-1].max).toBe(Math.max(...amounts));
 });
 it('offers "Mua" only when a published sale asset exists',()=>{
  expect(hasPublishedSale(assets,parks)).toBe(false);
  expect(hasPublishedSale([{...assets[1],transaction:'sale'}],parks)).toBe(true);
 });
 it('routes the homepage search to the right URL',()=>{
  const base={q:' kho ',region:'',industry:'',status:'',kind:'',deal:''};
  expect(homeSearchTarget({...base,kind:'park:Khu công nghiệp sinh thái',status:'operational'})).toEqual({pathname:'/industrial-parks',search:'q=kho&status=operational&parkType=Khu%20c%C3%B4ng%20nghi%E1%BB%87p%20sinh%20th%C3%A1i'});
  expect(homeSearchTarget({...base,kind:'asset:warehouse',region:'South',status:'operational'})).toEqual({pathname:'/assets',search:'q=kho&region=South&type=warehouse'});
  expect(homeSearchTarget({...base,deal:'lease',industry:'electronics'})).toEqual({pathname:'/assets',search:'q=kho&industry=electronics&transaction=lease'});
  expect(homeSearchTarget({...base,q:''})).toEqual({pathname:'/industrial-parks',search:''});
 });
});
describe('phase 1 filters: UI',()=>{
 it('hides "Mua" on the asset page and shows lease',()=>{
  setup(true);
  const select=screen.getByLabelText('Hình thức') as HTMLSelectElement;
  expect([...select.options].map(o=>o.textContent)).toEqual(['Tất cả','Cho thuê']);
 });
 it('writes price band and negotiable options to the URL and clears them',()=>{
  setup(true);
  const select=screen.getByLabelText(/Khoảng giá/) as HTMLSelectElement;
  expect([...select.options].at(-1)!.textContent).toBe('Giá thỏa thuận / liên hệ');
  fireEvent.change(select,{target:{value:select.options[1].value}});
  const query=screen.getByTestId('query').textContent!;
  expect(query).toContain('priceMin=');expect(query).toContain('priceBasis=USD%2Fm%C2%B2%2Fmonth');
  fireEvent.change(select,{target:{value:'contact'}});
  expect(screen.getByTestId('query').textContent).toBe('?priceMode=contact');
  fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
  expect(screen.getByTestId('query').textContent).toBe('');
 });
 it('counts parkType and price as filter groups on mobile and shows chips',()=>{
  setup(false,'?parkType='+encodeURIComponent(park.parkType.vi)+'&priceMin=1&priceMax=2&priceBasis=USD%2Fm%C2%B2%2Fmonth',true);
  expect(screen.getByRole('button',{name:'Bộ lọc (2)'})).toBeTruthy();
  expect(screen.getByRole('button',{name:new RegExp(park.parkType.vi)})).toBeTruthy();
  expect(screen.getByRole('button',{name:/USD\/m²\/tháng/})).toBeTruthy();
 });
 it('exposes park type and asset type selects in the mobile sheet',()=>{
  setup(false,'',true);fireEvent.click(screen.getByRole('button',{name:'Bộ lọc'}));
  fireEvent.change(screen.getByLabelText('Loại hình'),{target:{value:park.parkType.vi}});
  expect(screen.getByTestId('query').textContent).toBe('?parkType='+encodeURIComponent(park.parkType.vi).replace(/%20/g,'+'));
 });
});
