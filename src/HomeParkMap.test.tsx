// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {parks} from './data';
import {HomeParkMap,filterInBounds,assetCountsByPark,pillCounts,applyFilters,hasCoords} from './HomeParkMap';
import type {IndustrialAsset,IndustrialParkProfile} from './types';
const seen:any[]=[];
vi.mock('./GeoMap',()=>({GeoMap:(p:any)=>{seen.push(p);return <div data-testid="geo" data-selected={p.selectedId||''} data-hover={p.hoverId||''} data-markers={p.markers.length} data-hubs={(p.extraMarkers||[]).length}><button onClick={()=>p.onSelect(p.markers[1].id)}>pin-1</button><button onClick={()=>p.onBounds({west:106.5,south:10.5,east:108.5,north:12.5})}>move</button></div>}}));
vi.mock('./EmptyStates',()=>({SafeImage:(p:any)=><img alt={p.alt} src={p.src||'fallback.png'}/>}));
vi.mock('./leasing',()=>({isPublicAsset:(a:any)=>a.transaction==='lease'}));
const mk=(id:string,province:string,n:number):IndustrialParkProfile=>({...structuredClone(parks[0]),id,slug:id,province,name:{vi:'KCN '+id,en:'Park '+id,zh:'园区'+id},coordinates:{lat:10+n,lng:106+n}} as any);
const set=[mk('a','Bắc Ninh',1),mk('b','Bắc Ninh',2),mk('c','Nghệ An',3),mk('d','Bình Dương',4)];
const asset=(id:string,parkId:string,transaction:'lease'|'sale'='lease'):IndustrialAsset=>({id,parkId,transaction} as any);
const assets=[asset('1','a'),asset('2','a'),asset('3','c'),asset('4','d','sale')];
const view=(l:'vi'|'en'|'zh'='vi')=>render(<MemoryRouter><HomeParkMap parks={set} assets={assets} language={l}/></MemoryRouter>);
const pill=(k:string)=>document.querySelector(`[data-pill=${k}]`) as HTMLElement;
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();seen.length=0});
describe('pure helpers',()=>{
 it('counts public lease assets, pill counts and filters',()=>{
  const c=assetCountsByPark(set,assets);expect(c).toEqual({a:2,c:1});
  expect(pillCounts(set,c,'')).toEqual({available:2,all:4});
  expect(pillCounts(set,c,'Bắc Ninh')).toEqual({available:1,all:2});
  expect(applyFilters(set,c,'available','').map(p=>p.id)).toEqual(['a','c']);
  expect(applyFilters(set,c,'all','Nghệ An').map(p=>p.id)).toEqual(['c']);
 });
 it('filters parks by the visible map bounds',()=>{
  const b={west:106.5,south:10.5,east:108.5,north:12.5};
  expect(filterInBounds(set,b).map(p=>p.id)).toEqual(['a','b']);
  expect(filterInBounds(set,null)).toHaveLength(4);
  expect(filterInBounds([{...set[0],coordinates:null} as any],b)).toEqual([]);
  expect(hasCoords(set[0])).toBe(true);
 });
});
describe('HomeParkMap',()=>{
 it('defaults to parks with assets and shows pill counts',()=>{
  view();expect(pill('available').textContent).toContain('(2)');expect(pill('all').textContent).toContain('(4)');
  expect(pill('available').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);expect(screen.getByTestId('geo').dataset.markers).toBe('2');
  fireEvent.click(pill('all'));expect(screen.getAllByRole('listitem')).toHaveLength(4);expect(screen.getByTestId('geo').dataset.markers).toBe('4');
 });
 it('filters by province and reports it in pill counts',()=>{
  view();fireEvent.click(pill('all'));
  fireEvent.change(screen.getByRole('combobox',{name:'Tỉnh / thành phố'}),{target:{value:'Bắc Ninh'}});
  expect(screen.getAllByRole('listitem')).toHaveLength(2);expect(pill('available').textContent).toContain('(1)');expect(pill('all').textContent).toContain('(2)');
 });
 it('updates the list from the map bounds after a debounce',()=>{
  vi.useFakeTimers();view();fireEvent.click(pill('all'));
  fireEvent.click(screen.getByText('move'));expect(screen.getAllByRole('listitem')).toHaveLength(4);
  act(()=>{vi.advanceTimersByTime(300)});
  expect(screen.getAllByRole('listitem').map(li=>li.getAttribute('data-park'))).toEqual(['a','b']);
  expect(document.querySelector('.home-map-count')!.textContent).toContain('2');
 });
 it('wires list, hover and pin selection',()=>{
  view();fireEvent.click(pill('all'));const geo=()=>screen.getByTestId('geo');
  const card=(id:string)=>document.querySelector(`[data-park=${id}]`) as HTMLElement;
  fireEvent.mouseEnter(card('c'));expect(geo().dataset.hover).toBe('c');fireEvent.mouseLeave(card('c'));expect(geo().dataset.hover).toBe('');
  fireEvent.click(within(card('c')).getByRole('button',{pressed:false}));expect(geo().dataset.selected).toBe('c');
  expect(within(card('c')).getAllByRole('button')[0].getAttribute('aria-current')).toBe('true');
  fireEvent.click(screen.getByText('pin-1'));expect(geo().dataset.selected).toBe('b');
  expect(card('b').className).toContain('active');
 });
 it('card buttons target the assets section and the consultation form of the park',()=>{
  view();const card=document.querySelector('[data-park=a]') as HTMLElement;
  expect(within(card).getByRole('link',{name:'Xem 2 mặt bằng'}).getAttribute('href')).toBe('/industrial-parks/a#park-assets');
  expect(within(card).getByRole('link',{name:'Nhận tư vấn'}).getAttribute('href')).toBe('/find-supply?parkId=a');
 });
 it('toggles hub layers (off by default)',()=>{
  view();const geo=()=>screen.getByTestId('geo');expect(geo().dataset.hubs).toBe('0');
  fireEvent.click(screen.getByRole('button',{name:/Sân bay/}));const air=Number(geo().dataset.hubs);expect(air).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button',{name:/Cảng biển/}));expect(Number(geo().dataset.hubs)).toBeGreaterThan(air);
  fireEvent.click(screen.getByRole('button',{name:/Sân bay/}));fireEvent.click(screen.getByRole('button',{name:/Cảng biển/}));expect(geo().dataset.hubs).toBe('0');
 });
 it('mounts the map only after the section approaches the viewport',()=>{
  let cb:any;const observe=vi.fn(),disconnect=vi.fn();
  vi.stubGlobal('IntersectionObserver',class{constructor(c:any,o:any){cb=c;expect(o.rootMargin).toBeTruthy()}observe=observe;disconnect=disconnect});
  view();expect(screen.queryByTestId('geo')).toBeNull();expect(observe).toHaveBeenCalled();
  act(()=>cb([{isIntersecting:false}]));expect(screen.queryByTestId('geo')).toBeNull();
  act(()=>cb([{isIntersecting:true}]));expect(screen.getByTestId('geo')).toBeTruthy();
 });
 it('labels in VI, EN and ZH',()=>{
  for(const [l,t,a,all,prov] of [['vi','Bản đồ khu công nghiệp','Đang có mặt bằng','Tất cả','Mọi tỉnh'],['en','Industrial park map','With available assets','All','All provinces'],['zh','工业园区地图','有可租物业','全部','所有省份']] as const){
   view(l);expect(screen.getByRole('heading',{name:t})).toBeTruthy();expect(pill('available').textContent).toContain(a);expect(pill('all').textContent).toContain(all);expect(screen.getByRole('option',{name:prov})).toBeTruthy();cleanup()}
 });
});
