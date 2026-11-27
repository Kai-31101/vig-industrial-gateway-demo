// @vitest-environment node
// Nearest-amenities pipeline (Goong + curated hubs). Mocked fetch only: no Goong call is ever made from tests.
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {localArea} from './geo';
import {mentionsOtherCity,keywordsFor,acceptName,nearestHubs,pickNearest,keepNearestByDriving,findNearbyDetailed,findNearby,newGeoCache,GeoError,KEYWORDS} from './geo';
import {decodePolyline} from '../src/geoPlaces';
import {HUBS} from '../src/geoHubs';
import type {NearbyPlace} from '../src/types';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
const O={lat:20.54,lng:106.52};
const noSleep=async()=>{};
describe('curated hubs',()=>{
 it('contains resolved airports, seaports, stations and towns with Vietnamese coordinates',()=>{
  for(const c of ['airport','seaport','rail','town'])expect(HUBS.filter(h=>h.category===c).length).toBeGreaterThan(15);
  expect(HUBS.every(h=>h.coordinates.lat>8&&h.coordinates.lat<24&&h.coordinates.lng>102&&h.coordinates.lng<110&&h.name.vi&&h.name.en)).toBe(true);
  expect(HUBS.filter(h=>h.category==='airport').length).toBeGreaterThanOrEqual(22);
 });
 it('returns the nearest hubs per category inside the radius, nearest first (VSIP Thai Binh: Cat Bi airport, Hai Phong ports)',()=>{
  const got=nearestHubs(O),by=(c:string)=>got.filter(x=>x.category===c);
  expect(by('airport')[0].name.vi).toContain('Cát Bi');
  expect(by('seaport').length).toBeGreaterThan(0);expect(by('seaport').slice(0,3).every(x=>/Hải Phòng/.test(x.name.vi))).toBe(true);
  expect(by('airport').length).toBeLessThanOrEqual(5);
  for(const c of ['airport','seaport','rail','town']){const k=by(c).map(x=>x.straightKm);expect([...k].sort((a,b)=>a-b)).toEqual(k)}
  expect(got.every(x=>x.source==='curated+goong')).toBe(true);
 });
 it('finds nothing for a point far from every hub of a category (radius respected)',()=>{expect(nearestHubs({lat:22.8,lng:103.0}).some(x=>x.category==='seaport')).toBe(false)});
});
describe('name filters for keyword results',()=>{
 it('hospitals: keeps proper names, drops departments, clinics and bare words',()=>{
  expect(acceptName('hospital','Bệnh viện Đa khoa Thái Ninh')).toBeTruthy();
  for(const bad of ['Khoa khám bệnh - Bệnh viện Thái Ninh','Phòng khám đa khoa ABC','Nhà thuốc bệnh viện','Bệnh viện','Cổng Bệnh viện'])expect(acceptName('hospital',bad)).toBeNull();
 });
 it('industrial parks: drops bare "Khu Công Nghiệp", roads inside, companies',()=>{
  expect(acceptName('industrial_park','KCN Tiền Hải')).toBeTruthy();expect(acceptName('industrial_park','Khu công nghiệp Cầu Nghìn')).toBeTruthy();
  for(const bad of ['Khu Công Nghiệp','Đường trong KCN Tiền Hải','Công ty TNHH KCN ABC'])expect(acceptName('industrial_park',bad)).toBeNull();
 });
 it('highways: extracts a normalised ref (case variants collapse), drops non-route names',()=>{
  expect(acceptName('highway','Quốc lộ 37')!.ref).toBe('QL37');expect(acceptName('highway','QL39A')!.ref).toBe('QL39A');expect(acceptName('highway','ql37')!.ref).toBe('QL37');
  expect(acceptName('highway','Cao tốc Hà Nội - Hải Phòng CT.04')).toBeTruthy();expect(acceptName('highway','Đường trong KCN Tiền Hải')).toBeNull();expect(acceptName('highway','Bến xe quốc lộ')).toBeNull();
 });
 it('colleges: keeps universities/colleges, drops faculties and dormitories',()=>{
  expect(acceptName('college','Trường Đại học Thái Bình')).toBeTruthy();expect(acceptName('college','Cao đẳng Nghề Hải Phòng')).toBeTruthy();
  for(const bad of ['Khoa Kinh tế - Đại học Thái Bình','Ký túc xá Đại học Thái Bình','Đại học','Quảng Cáo Đăng Khoa','Tòa nhà C - Đại học Thái Bình','Nhà M - Ký túc xá Đại học Thái Bình'])expect(acceptName('college',bad)).toBeNull();
 });
 it('suffixes searches with the local city and also searches parks without the suffix',()=>{const k=keywordsFor('Thái Bình'),bare=KEYWORDS.filter(x=>x.category==='industrial_park');expect(k).toHaveLength(KEYWORDS.length+bare.length);expect(k.slice(0,KEYWORDS.length).every(x=>x.input.endsWith(' Thái Bình'))).toBe(true);expect(k.slice(KEYWORDS.length)).toEqual(bare);expect(keywordsFor()).toBe(KEYWORDS)});
 it('drops namesakes of other cities but keeps branches named after the park province',()=>{expect(mentionsOtherCity('Trường đại học sư phạm - Đại học Đà Nẵng','Thái Bình')).toBe(true);expect(mentionsOtherCity('Đại học Công nghiệp Hồ Chí Minh (cơ sở Thái Bình)','Thái Bình')).toBe(false);expect(mentionsOtherCity('Bệnh viện Đa khoa Thái Ninh','Thái Bình')).toBe(false);expect(mentionsOtherCity('Đại học Đà Nẵng',undefined)).toBe(false)});
 it('never keyword-searches airports, seaports or stations',()=>expect(KEYWORDS.map(k=>k.category).filter(c=>['airport','seaport','rail','town'].includes(c))).toEqual([]));
});
describe('selection and polyline',()=>{
 const cand=(category:any,i:number)=>({category,key:category+i,name:{vi:'x'+i,en:'x'+i},coordinates:O,straightKm:i,source:'goong' as const});
 it('takes 5 nearest candidates per category by straight line',()=>{expect(pickNearest(Array.from({length:8},(_,i)=>cand('hospital',8-i))).map(c=>c.straightKm)).toEqual([1,2,3,4,5])});
 it('keeps the 3 smallest driving distances per category, unknown driving last',()=>{
  const mk=(i:number,d:number|null):NearbyPlace=>({id:'h'+i,category:'hospital',name:{vi:'h'+i,en:'h'+i},coordinates:O,straightKm:i,drivingKm:d,drivingMinutes:d,source:'goong',computedAt:'2026-11-26T00:00:00Z'});
  expect(keepNearestByDriving([mk(1,30),mk(2,10),mk(3,null),mk(4,5),mk(5,20)]).map(p=>p.id)).toEqual(['h4','h2','h5']);
 });
 it('decodes the reference Google polyline',()=>expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([[38.5,-120.2],[40.7,-120.95],[43.252,-126.453]]));
});
describe('findNearbyDetailed (mocked Goong)',()=>{
 beforeEach(()=>vi.stubEnv('GOONG_API_KEY','test-key'));
 const predictions:Record<string,any[]>={
  'bệnh viện':[{place_id:'h1',structured_formatting:{main_text:'Bệnh viện Đa khoa Thái Ninh'}},{place_id:'h2',structured_formatting:{main_text:'Khoa khám bệnh - Bệnh viện Thái Ninh'}}],
  'quốc lộ':[{place_id:'q1',structured_formatting:{main_text:'Quốc lộ 39'}},{place_id:'q1b',structured_formatting:{main_text:'QL39'}}],
  'cao tốc':[],'trường đại học':[{place_id:'c1',structured_formatting:{main_text:'Trường Đại học Thái Bình'}}],'cao đẳng':[],
  'khu công nghiệp':[{place_id:'k1',structured_formatting:{main_text:'KCN Tiền Hải'}},{place_id:'k0',structured_formatting:{main_text:'Khu Công Nghiệp'}}]};
 const loc:Record<string,[number,number]>={h1:[20.58,106.5],q1:[20.545,106.525],q1b:[20.545,106.526],c1:[20.7,106.4],k1:[20.4,106.5]};
 const goong=(url:string)=>{
  const u=new URL(url);
  if(u.pathname==='/Place/AutoComplete')return Response.json({predictions:predictions[u.searchParams.get('input')!.replace(/ Thái Bình$/,'')]||[]});
  if(u.pathname==='/Place/Detail'){const l=loc[u.searchParams.get('place_id')!];return Response.json({result:{geometry:{location:{lat:l[0],lng:l[1]}}}})}
  if(u.pathname==='/distancematrix'){const n=u.searchParams.get('destinations')!.split('|').length;return Response.json({rows:[{elements:Array.from({length:n},(_,i)=>({status:'OK',distance:{value:12345+i*1000},duration:{value:1500}}))}]})}
  return Response.json({routes:[{overview_polyline:{points:'_p~iF~ps|U_ulLnnqC'}}]});
 };
 const mkFetch=(h:(u:string)=>Response|Promise<Response>=goong)=>vi.fn(async(url:string)=>h(url));
 it('combines curated hubs with filtered Goong keyword results; metres/seconds converted; routes for nearest seaport and airport',async()=>{
  const f=mkFetch();vi.stubGlobal('fetch',f);
  const {places,warnings}=await findNearbyDetailed({id:'p',coordinates:O,name:{vi:'VSIP Thái Bình'}},{sleep:noSleep,now:()=>new Date('2026-11-26T01:00:00Z')});
  const cats=[...new Set(places.map(p=>p.category))].sort();
  expect(cats).toEqual(['airport','college','highway','hospital','industrial_park','rail','seaport','town']);
  expect(places.filter(p=>p.category==='hospital').map(p=>p.name.vi)).toEqual(['Bệnh viện Đa khoa Thái Ninh']);
  expect(places.filter(p=>p.category==='highway')).toHaveLength(1);expect(places.find(p=>p.category==='highway')!.ref).toBe('QL39');
  expect(places.filter(p=>p.category==='industrial_park').map(p=>p.name.vi)).toEqual(['KCN Tiền Hải']);
  expect(places.find(p=>p.category==='airport')!.name.vi).toContain('Cát Bi');
  const h=places.find(p=>p.category==='hospital')!;expect(h.source).toBe('goong');expect(h.drivingMinutes).toBe(25);expect(h.computedAt).toBe('2026-11-26T01:00:00.000Z');expect(places.find(p=>p.category==='airport')!.source).toBe('curated+goong');
  expect(places.filter(p=>p.route).map(p=>p.category).sort()).toEqual(['airport','seaport']);expect(warnings).toEqual([]);
  expect(f.mock.calls.every(c=>String(c[0]).startsWith('https://rsapi.goong.io/'))).toBe(true);
  expect(f.mock.calls.filter(c=>String(c[0]).includes('/Place/AutoComplete')).length).toBe(keywordsFor('Thái Bình').length);
  expect(places.every(p=>!('osmId' in p))).toBe(true);
 });
 it('caches searches and details across runs (second run makes no AutoComplete/Detail calls)',async()=>{
  const f=mkFetch();vi.stubGlobal('fetch',f);const cache=newGeoCache();
  await findNearby({id:'p',coordinates:O},{sleep:noSleep,cache});const first=f.mock.calls.filter(c=>/Place\//.test(String(c[0]))).length;
  await findNearby({id:'p',coordinates:O},{sleep:noSleep,cache});expect(f.mock.calls.filter(c=>/Place\//.test(String(c[0]))).length).toBe(first);
 });
 it('keeps straight-line distances when the Distance Matrix fails and flags it',async()=>{
  vi.stubGlobal('fetch',mkFetch(u=>/distancematrix|direction/.test(u)?new Response('x',{status:500}):goong(u)));
  const {places,warnings}=await findNearbyDetailed({id:'p',coordinates:O},{sleep:noSleep});
  expect(places.length).toBeGreaterThan(5);expect(places.every(p=>p.drivingKm===null&&p.straightKm>=0)).toBe(true);expect(places.some(p=>p.route)).toBe(false);expect(warnings).toContain('driving_partial');
 });
 it('throws goong_failed when keyword search fails; never returns a silent partial result',async()=>{
  vi.stubGlobal('fetch',mkFetch(u=>/Place\/AutoComplete/.test(u)?new Response('x',{status:500}):goong(u)));
  await expect(findNearby({id:'p',coordinates:O},{sleep:noSleep})).rejects.toMatchObject({code:'goong_failed'});
 });
 it('requires coordinates and a server key',async()=>{
  await expect(findNearby({coordinates:null},{sleep:noSleep})).rejects.toMatchObject({code:'bad_origin'});
  vi.stubEnv('GOONG_API_KEY','');await expect(findNearby({coordinates:O},{sleep:noSleep})).rejects.toBeInstanceOf(GeoError);
 });
});

describe('local area from coordinates',()=>{
 it('uses the nearest city hub, not the stored province (VSIP Thai Binh is recorded as Hung Yen after the merger)',()=>{
  const a=localArea({lat:20.54,lng:106.52});
  expect(a.search).toBe('Thái Bình');expect(a.cities).toContain('Thái Bình');
  expect(mentionsOtherCity('Trường đại học y Thái Bình',a.cities)).toBe(false);
  expect(mentionsOtherCity('Trường Đại học Bách khoa Hà Nội',a.cities)).toBe(true);
 });
 it('has no local city far from every hub',()=>{expect(localArea({lat:8,lng:112})).toEqual({search:undefined,cities:[]})});
});
