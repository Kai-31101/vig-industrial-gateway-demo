// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {placesError,filterPlaces,categoryCounts,effectiveKm} from './geoPlaces';
import {publishedBundle} from './contentRepository';
import {contentErrors} from './admin/model';
import {parks} from './data';
import {isPublicPark} from './leasing';
import {GeoMap,useLegacyProvider} from './GeoMap';
import {NearbyConnectivity} from './NearbyPlaces';
import type {NearbyPlace,IndustrialParkProfile} from './types';
afterEach(()=>{cleanup();vi.unstubAllEnvs();vi.unstubAllGlobals()});
const at='2026-11-26T01:00:00.000Z';
const place=(id:string,category:NearbyPlace['category'],km:number|null,straight:number,extra:Partial<NearbyPlace>={}):NearbyPlace=>({id,category,name:{vi:'Điểm '+id,en:'Place '+id,zh:'地点'+id},coordinates:{lat:20.5+straight/100,lng:106.5},straightKm:straight,drivingKm:km,drivingMinutes:km==null?null:Math.round(km*1.5),source:'goong',computedAt:at,...extra});
const sample=[place('h1','hospital',4,3),place('h2','hospital',12,9),place('a1','airport',45,38,{route:'_p~iF~ps|U_ulLnnqC_mqNvxq`@'}),place('t1','town',null,7),place('s1','seaport',80,60)];
describe('places validation',()=>{
 it('accepts a valid list and an absent one',()=>{expect(placesError(sample)).toBeUndefined();expect(placesError(undefined)).toBeUndefined();expect(placesError([])).toBeUndefined()});
 it('rejects coordinates outside Vietnam, negative distances, empty VI names, bad category and more than 40 points',()=>{
  expect(placesError([{...sample[0],coordinates:{lat:40,lng:106}}])).toBe('places_coordinates');
  expect(placesError([{...sample[0],coordinates:{lat:20,lng:Number.NaN}}])).toBe('places_coordinates');
  expect(placesError([{...sample[0],drivingKm:-1}])).toBe('places_distance');
  expect(placesError([{...sample[0],straightKm:-0.1}])).toBe('places_distance');
  expect(placesError([{...sample[0],name:{vi:' ',en:'x'}}])).toBe('places_name');
  expect(placesError([{...sample[0],category:'zoo'}])).toBe('places_item');
  expect(placesError(Array.from({length:41},(_,i)=>place('p'+i,'town',1,1)))).toBe('places_count');
 });
 it('feeds contentErrors for parks so bad places block save',()=>{
  const p=structuredClone(parks[0]);expect(contentErrors({...p,places:sample}).places).toBeUndefined();
  expect(contentErrors({...p,places:[{...sample[0],coordinates:{lat:0,lng:0}}]}).places).toBe('places_coordinates');
 });
});
describe('published projection',()=>{
 it('includes places in the public bundle and strips the internal osmId',()=>{
  const base=structuredClone(parks.find(isPublicPark)!) as IndustrialParkProfile;const published={...base,publicationStatus:'published' as const,places:sample.map(p=>({...p,osmId:'node/'+p.id}))};
  const bundle=publishedBundle([{id:base.id,kind:'park',data:published,published,state:'published',revision:1}] as any);
  const out=(bundle.parks[0] as any).places as NearbyPlace[];
  expect(out).toHaveLength(sample.length);expect(out.every(p=>!('osmId' in p))).toBe(true);expect(JSON.stringify(bundle)).not.toContain('node/h1');
  expect(out.find(p=>p.id==='a1')).toMatchObject({category:'airport',drivingKm:45,route:sample[2].route,source:'goong'});
 });
});
describe('list filtering by chip and radius',()=>{
 it('uses driving km when known, straight km otherwise, sorted nearest first',()=>{
  expect(effectiveKm(sample[3])).toBe(7);expect(filterPlaces(sample,null,0).map(p=>p.id)).toEqual(['h1','t1','h2','a1','s1']);
 });
 it('filters by category set and radius',()=>{
  expect(filterPlaces(sample,new Set(['hospital']),0).map(p=>p.id)).toEqual(['h1','h2']);
  expect(filterPlaces(sample,null,10).map(p=>p.id)).toEqual(['h1','t1']);
  expect(filterPlaces(sample,new Set(['hospital','airport']),20).map(p=>p.id)).toEqual(['h1','h2']);
  expect(categoryCounts(sample,10)).toEqual({hospital:1,town:1});
 });
});
describe('GeoMap provider',()=>{
 const props={language:'vi' as const,ariaLabel:'Bản đồ',center:{lat:20.5,lng:106.5},markers:[]};
 it('uses the legacy Leaflet map without rendering MapLibre when there is no Goong key',async()=>{
  vi.stubEnv('VITE_GOONG_MAPTILES_KEY','');vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}unobserve(){}});
  expect(useLegacyProvider()).toBe(true);
  const {container}=render(<GeoMap {...props}/>);
  expect(container.querySelector('.geo-map')!.getAttribute('data-provider')).toBe('legacy');
  await waitFor(()=>expect(container.querySelector('.leaflet-container')).toBeTruthy());
  expect(screen.getByRole('region',{name:'Bản đồ'})).toBeTruthy();
 });
 it('honours VITE_MAP_PROVIDER=legacy even with a key',()=>{
  vi.stubEnv('VITE_GOONG_MAPTILES_KEY','present');vi.stubEnv('VITE_MAP_PROVIDER','legacy');expect(useLegacyProvider()).toBe(true);
  vi.stubEnv('VITE_MAP_PROVIDER','');expect(useLegacyProvider()).toBe(false);
 });
});
describe('Nearby connectivity block',()=>{
 const park={...structuredClone(parks.find(isPublicPark)!),id:'park-vsip-test',coordinates:{lat:20.54,lng:106.52},places:sample} as IndustrialParkProfile;
 const setup=(p=park,language:'vi'|'en'|'zh'='vi')=>{vi.stubEnv('VITE_GOONG_MAPTILES_KEY','');vi.stubGlobal('ResizeObserver',class{observe(){}disconnect(){}unobserve(){}});return render(<NearbyConnectivity park={p} language={language}/>)};
 const chip=(n:RegExp)=>within(screen.getByRole('group',{name:'Lọc theo loại'})).queryByRole('button',{name:n})!;
 const items=()=>screen.getAllByRole('listitem').map(li=>li.textContent||'');
 it('shows chips with counts only for categories that have points, and a list sorted by distance',()=>{
  setup();expect(chip(/Bệnh viện/)).toBeTruthy();expect(chip(/Ga đường sắt/)).toBeNull();
  expect(within(chip(/Bệnh viện/)).getByText('2')).toBeTruthy();
  expect(items()[0]).toContain('Điểm h1');expect(items()[0]).toContain('4 km');expect(items()[0]).toMatch(/6 phút lái xe/);
  expect(items().find(t=>t.includes('Điểm t1'))).toContain('đường chim bay');
 });
 it('filters the list by chip and by radius',()=>{
  setup();fireEvent.click(chip(/Bệnh viện/));expect(items()).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Bán kính'),{target:{value:'5'}});expect(items()).toHaveLength(1);expect(items()[0]).toContain('Điểm h1');
  fireEvent.change(screen.getByLabelText('Bán kính'),{target:{value:'0'}});fireEvent.click(chip(/Bệnh viện/));expect(items()).toHaveLength(sample.length);
 });
 it('marks the selected item and shows the Goong date note; demo parks get the illustrative-data line',()=>{
  setup();fireEvent.click(screen.getAllByRole('button',{name:/Điểm a1/})[0]);expect(screen.getAllByRole('button',{name:/Điểm a1/})[0].getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText(/Khoảng cách lái xe theo Goong, cập nhật 26\/11\/2026/)).toBeTruthy();expect(screen.queryByText(/mang tính minh hoạ/)).toBeNull();
  cleanup();setup({...park,id:'park-demo-02'},'en');expect(screen.getByText(/illustrative \(demo data\)/)).toBeTruthy();
 });
 it('renders in Chinese',()=>{setup(park,'zh');expect(screen.getByRole('heading',{name:'交通连接与周边设施'})).toBeTruthy();expect(screen.getByText(/行车距离来自 Goong/)).toBeTruthy()});
});
