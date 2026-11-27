// @vitest-environment node
// POST /api/admin/geo/nearby: demo -> 403, internal -> 200 preview. DB, rate limiter and network are mocked.
import {afterEach,describe,it,expect,vi} from 'vitest';
const {query,limited}=vi.hoisted(()=>({query:vi.fn(),limited:vi.fn(async()=>{})}));
vi.mock('./db',()=>{class ApiError extends Error{constructor(public status:number,public code:string){super(code)}}return {ApiError,tx:async(fn:any)=>fn({query}),pool:{query}}});
vi.mock('./security',()=>({limited}));
import {adminGeoNearby} from './geoApi';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();query.mockReset();limited.mockClear();vi.useRealTimers()});
const res=()=>{const r:any={code:200,body:undefined,status(c:number){r.code=c;return r},json(b:any){r.body=b;return r}};return r};
const req:any={headers:{}};
describe('adminGeoNearby',()=>{
 it('rejects demo sessions with 403 before touching the database or the network',async()=>{
  const f=vi.fn();vi.stubGlobal('fetch',f);
  await expect(adminGeoNearby(req,res(),{scope:'demo',workspace_id:'w'},{parkId:'p'})).rejects.toMatchObject({status:403});
  expect(query).not.toHaveBeenCalled();expect(f).not.toHaveBeenCalled();
 });
 it('returns a preview for internal sessions (rate limited), without saving anything',async()=>{
  vi.stubEnv('GOONG_API_KEY','test-key');
  query.mockImplementation(async(sql:string)=>sql.includes('SELECT payload')?{rows:[{payload:{coordinates:{lat:20.54,lng:106.52},name:{vi:'VSIP Thái Bình',en:'VSIP Thai Binh'}}}]}:{rows:[]});
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
   const u=new URL(url);
   if(u.pathname==='/Place/AutoComplete')return Response.json({predictions:u.searchParams.get('input')==='bệnh viện Thái Bình'?[{place_id:'h1',structured_formatting:{main_text:'Bệnh viện Đa khoa Thái Ninh'}}]:[]});
   if(u.pathname==='/Place/Detail')return Response.json({result:{geometry:{location:{lat:20.55,lng:106.5}}}});
   if(u.pathname==='/distancematrix'){const n=u.searchParams.get('destinations')!.split('|').length;return Response.json({rows:[{elements:Array.from({length:n},()=>({status:'OK',distance:{value:5000},duration:{value:600}}))}]})}
   return Response.json({routes:[]});
  }));
  vi.useFakeTimers();
  const r=res();const p=adminGeoNearby(req,r,{scope:'internal',workspace_id:'internal'},{parkId:'park-vsip-thai-binh'});await vi.runAllTimersAsync();await p;
  expect(limited).toHaveBeenCalledWith(req,'geo-nearby',20,3600);
  const hos=r.body.places.filter((p:any)=>p.category==='hospital');expect(hos).toHaveLength(1);expect(hos[0]).toMatchObject({drivingKm:5,drivingMinutes:10});expect(r.body.places.some((p:any)=>p.category==='airport')).toBe(true);
  expect(query.mock.calls.every(c=>!/INSERT|UPDATE|DELETE/i.test(String(c[0])))).toBe(true);
 });
 it('maps a missing park to 404 and upstream failure to 502',async()=>{
  vi.stubEnv('GOONG_API_KEY','test-key');
  query.mockResolvedValue({rows:[]});
  await expect(adminGeoNearby(req,res(),{scope:'internal',workspace_id:'internal'},{parkId:'nope'})).rejects.toMatchObject({status:404});
  query.mockImplementation(async(sql:string)=>sql.includes('SELECT payload')?{rows:[{payload:{coordinates:{lat:20.5,lng:106.5},name:{vi:'A'}}}]}:{rows:[]});
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('x',{status:500})));
  vi.useFakeTimers();const p=adminGeoNearby(req,res(),{scope:'internal',workspace_id:'internal'},{parkId:'p'});const done=expect(p).rejects.toMatchObject({status:502,code:'goong_failed'});await vi.runAllTimersAsync();await done;
 });
});
