// API paths: GET /api/catalogue and admin state() return corrected placeholder contacts; real data untouched.
import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:mocks.query})}));
vi.mock('./security',()=>({csrf:()=>{},cookie:()=>'',hash:(x:string)=>x,newToken:()=>'t',setCookie:()=>{},session:async()=>({scope:'demo',workspace_id:'w',tokenHash:'h',revision:1}),limited:async()=>{},validAdminKey:()=>false}));
vi.mock('./ai',()=>({answer:vi.fn()}));
vi.mock('./enquiryChat',()=>({enquiryChat:vi.fn()}));
import handler from './handler';
import {state} from './repository';

const stale={id:'p-old',name:{en:'Old'},revision:4,contact:{email:'contact6@vig.example',website:'vig.example',phone:'+84 1'}};
const real={id:'p-real',name:{en:'Real'},contact:{email:'north.marketing@vsip.com.vn',website:'https://vsip.com.vn'}};
const bare={id:'p-bare',name:{en:'Bare'}};
const res=()=>{const r:any={headers:{},body:undefined,statusCode:200};r.setHeader=(k:string,v:string)=>{r.headers[k]=v};r.json=(b:unknown)=>{r.body=b;return r};r.status=(c:number)=>{r.statusCode=c;return r};return r};

describe('mock contact correction on the API',()=>{
 beforeEach(()=>mocks.query.mockReset());
 it('GET /api/catalogue serves vsip.example for exact placeholders and leaves real or absent contacts unchanged',async()=>{
  mocks.query.mockResolvedValueOnce({rows:[{kind:'park',payload:stale},{kind:'park',payload:real},{kind:'park',payload:bare},{kind:'asset',payload:{id:'a1',parkId:'p-old'}}]});
  const r=res();await handler({method:'GET',query:{route:'catalogue'},url:'/api/catalogue',headers:{}} as any,r);
  expect(r.body.parks[0]).toEqual({...stale,contact:{email:'contact6@vsip.example',website:'vsip.example',phone:'+84 1'}});
  expect(r.body.parks[1]).toBe(real);expect(r.body.parks[2]).toBe(bare);
  expect(JSON.stringify(r.body)).not.toMatch(/vig\.example/);
 });
 it('admin state() corrects draft and published payloads and seeded identities only',async()=>{
  const now=new Date();
  mocks.query.mockImplementation(async(q:any)=>{const sql=String(q?.text??q??"");
   if(sql.includes('FROM vsip.content_items'))return {rows:[{kind:'park',id:'p-old',revision:4,state:'published',payload:stale,published_payload:stale,updated_at:now,updated_by:'x'},{kind:'park',id:'p-real',revision:2,state:'draft',payload:real,published_payload:null,updated_at:now,updated_by:'x'}]};
   if(sql.includes('workspace_config'))return {rows:[{key:'adminMeta',value:{users:[{id:'sa',email:'superadmin@vig.example',name:'SA'},{id:'u9',email:'admin@vig.example',name:'Real invitee'}]}}]};
   return {rows:[]};
  });
  const out=await state({query:mocks.query} as any,'w');
  const old=out.store.drafts.find(d=>d.id==='p-old')!;
  expect((old.data as any).contact.email).toBe('contact6@vsip.example');expect((old.published as any).contact.website).toBe('vsip.example');expect(old.revision).toBe(4);
  expect(out.store.drafts.find(d=>d.id==='p-real')!.data).toBe(real);
  expect(out.store.users.find(u=>u.id==='sa')!.email).toBe('superadmin@vsip.example');
  expect(out.store.users.find(u=>u.id==='u9')!.email).toBe('admin@vig.example');
 });
});
