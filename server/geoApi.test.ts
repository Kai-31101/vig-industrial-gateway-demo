// @vitest-environment node
// POST /api/admin/geo/nearby: demo -> 403, internal -> 200 preview. DB, rate limiter and network are mocked.
import {afterEach,describe,it,expect,vi} from 'vitest';
const {query,limited}=vi.hoisted(()=>({query:vi.fn(),limited:vi.fn(async()=>{})}));
vi.mock('./db',()=>{class ApiError extends Error{constructor(public status:number,public code:string){super(code)}}return {ApiError,tx:async(fn:any)=>fn({query}),pool:{query}}});
vi.mock('./security',()=>({limited}));
import {adminGeoNearby,publicGeoRoute} from './geoApi';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();query.mockReset();limited.mockClear();vi.useRealTimers()});
const res=()=>{const r:any={code:200,body:undefined,setHeader(){},status(c:number){r.code=c;return r},json(b:any){r.body=b;return r}};return r};
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

describe('publicGeoRoute',()=>{
 const park={id:'park-a',coordinates:{lat:20.5,lng:106.5},places:[{id:'sea-1',coordinates:{lat:20.8,lng:106.8}}]};
 const asset={id:'asset-a',parkId:'park-a',coordinates:{lat:20.51,lng:106.51}};
 const rq=(q:Record<string,string>):any=>({headers:{},query:q,url:'/api/geo/route'});
 const db=()=>query.mockImplementation(async(_s:string,p:any[])=>({rows:p[0]==='park'&&p[1]==='park-a'?[{payload:park}]:p[0]==='asset'&&p[1]==='asset-a'?[{payload:asset}]:[]}));
 const goongOk=()=>{const f=vi.fn(async(_u:string)=>Response.json({routes:[{overview_polyline:{points:'abc'},legs:[{distance:{value:5400},duration:{value:780},steps:[{html_instructions:'Rẽ <b>phải</b> vào QL10',distance:{value:120}},{html_instructions:'',distance:{value:5}}]}]}]}));vi.stubGlobal('fetch',f);return f};
 it('uses the lot as origin, strips html, never returns the key, sets cache header',async()=>{
  vi.stubEnv('GOONG_API_KEY','secret-key');db();const f=goongOk();
  const headers:Record<string,string>={};const r=res();r.setHeader=(k:string,v:string)=>{headers[k]=v};
  await publicGeoRoute(rq({kind:'asset',id:'asset-a',place:'sea-1',mode:'truck'}),r,);
  const u=new URL(f.mock.calls[0][0]);expect(u.searchParams.get('origin')).toBe('20.51,106.51');expect(u.searchParams.get('destination')).toBe('20.8,106.8');expect(u.searchParams.get('vehicle')).toBe('truck');
  expect(r.body).toEqual({distanceM:5400,durationS:780,polyline:'abc',steps:[{text:'Rẽ phải vào QL10',distanceM:120}]});
  expect(JSON.stringify(r.body)).not.toContain('secret-key');expect(headers['Cache-Control']).toContain('s-maxage=604800');expect(limited).toHaveBeenCalledWith(expect.anything(),'route',120,3600);
 });
 it('falls back to the park for park pages and for assets without coordinates',async()=>{
  vi.stubEnv('GOONG_API_KEY','k');query.mockImplementation(async(_s:string,p:any[])=>({rows:p[0]==='park'?[{payload:park}]:[{payload:{parentless:1,parkId:'park-a'}}]}));const f=goongOk();
  await publicGeoRoute(rq({kind:'park',id:'park-a',place:'sea-1'}),res());expect(new URL(f.mock.calls[0][0]).searchParams.get('origin')).toBe('20.5,106.5');expect(new URL(f.mock.calls[0][0]).searchParams.get('vehicle')).toBe('car');
  await publicGeoRoute(rq({kind:'asset',id:'asset-a',place:'sea-1'}),res());expect(new URL(f.mock.calls[1][0]).searchParams.get('origin')).toBe('20.5,106.5');
 });
 it('validates params (400), 404 for unknown park/asset/place, no network on bad input',async()=>{
  vi.stubEnv('GOONG_API_KEY','k');db();const f=goongOk();
  for(const q of [{kind:'x',id:'a',place:'b'},{kind:'park',id:'',place:'b'},{kind:'park',id:'park-a',place:'a b'},{kind:'park',id:'park-a',place:'sea-1',mode:'bike'},{kind:'park',id:'a;drop',place:'sea-1'}])
   await expect(publicGeoRoute(rq(q),res())).rejects.toMatchObject({status:400});
  await expect(publicGeoRoute(rq({kind:'park',id:'nope',place:'sea-1'}),res())).rejects.toMatchObject({status:404});
  await expect(publicGeoRoute(rq({kind:'park',id:'park-a',place:'unknown'}),res())).rejects.toMatchObject({status:404});
  await expect(publicGeoRoute(rq({kind:'asset',id:'nope',place:'sea-1'}),res())).rejects.toMatchObject({status:404});
  expect(f).not.toHaveBeenCalled();
 });
 it('maps Goong failures to 502 without leaking details',async()=>{
  vi.stubEnv('GOONG_API_KEY','k');db();vi.stubGlobal('fetch',vi.fn(async()=>Response.json({routes:[]})));
  await expect(publicGeoRoute(rq({kind:'park',id:'park-a',place:'sea-1'}),res())).rejects.toMatchObject({status:502});
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('boom k')}));
  await expect(publicGeoRoute(rq({kind:'park',id:'park-a',place:'sea-1'}),res())).rejects.toMatchObject({status:502,code:'goong_failed'});
 });
});
