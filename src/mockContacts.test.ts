// @vitest-environment jsdom
// Placeholder contact correction (vig.example -> vsip.example): exact matches only, null-safe, idempotent,
// applied on the local snapshot path; seeded demo identities keep working with their old addresses locally.
import {afterEach,describe,expect,it} from 'vitest';
import {normalizeMockContact,normalizeMockContacts,normalizeDraftsContacts,normalizeDemoIdentities,demoLoginAlias} from './mockContacts';
import {CONTENT_KEY,deploymentId,internalBackup,loadContent,publicInventory} from './contentRepository';
import {initialAdmin} from './admin/model';
import {parks,assets} from './data';

const park=(contact:unknown)=>({id:'p1',name:{en:'P'},revision:7,contact});

describe('normalizeMockContact',()=>{
 it('converts only the exact generated placeholders',()=>{
  const out=normalizeMockContact(park({email:'contact6@vig.example',website:'vig.example',phone:'+84 28 1234 5678',person:'Desk'}));
  expect(out.contact).toEqual({email:'contact6@vsip.example',website:'vsip.example',phone:'+84 28 1234 5678',person:'Desk'});
  expect(out.id).toBe('p1');expect(out.revision).toBe(7);expect(out.name).toEqual({en:'P'});
 });
 it('returns the same object when contact, email or website is absent or null',()=>{
  for(const r of [park(undefined),park(null),park({}),park({phone:'1'}),{id:'x'},null,undefined,park('text')]) expect(normalizeMockContact(r as any)).toBe(r);
  const onlyEmail=normalizeMockContact(park({email:'contact1@vig.example'}));expect(onlyEmail.contact).toEqual({email:'contact1@vsip.example'});
  const onlyWebsite=normalizeMockContact(park({website:'vig.example'}));expect(onlyWebsite.contact).toEqual({website:'vsip.example'});
 });
 it('never touches real or arbitrary user-entered addresses',()=>{
  for(const c of [{email:'north.marketing@vsip.com.vn',website:'https://vsip.com.vn'},{email:'someone@vig.example'},{email:'contact6@vig.example.com'},{email:'xcontact6@vig.example'},{email:'contact@vig.example'},{website:'https://vig.example'},{website:'vig.example.vn'}]){
   const r=park(c);expect(normalizeMockContact(r)).toBe(r);
  }
 });
 it('is idempotent and keeps array identity when nothing changes',()=>{
  const once=normalizeMockContact(park({email:'contact2@vig.example',website:'vig.example'}));
  expect(normalizeMockContact(once)).toBe(once);
  const list=[park({email:'a@b.vn'})];expect(normalizeMockContacts(list)).toBe(list);
  const drafts=[{id:'d',data:park({email:'a@b.vn'})}];expect(normalizeDraftsContacts(drafts)).toBe(drafts);
 });
 it('normalizes both draft data and the published copy',()=>{
  const [d]=normalizeDraftsContacts([{id:'d',revision:3,data:park({email:'contact3@vig.example'}),published:park({website:'vig.example'})}]);
  expect((d.data as any).contact.email).toBe('contact3@vsip.example');expect((d.published as any).contact.website).toBe('vsip.example');expect(d.revision).toBe(3);
 });
});

describe('demo identities',()=>{
 it('renames only the seeded identities by id and exact old address',()=>{
  const users=[{id:'sa',email:'superadmin@vig.example'},{id:'admin',email:'someone-else@vig.example'},{id:'u-real',email:'admin@vig.example'},{id:'operator',email:'operator@vsip.example'}];
  expect(normalizeDemoIdentities(users)).toEqual([{id:'sa',email:'superadmin@vsip.example'},{id:'admin',email:'someone-else@vig.example'},{id:'u-real',email:'admin@vig.example'},{id:'operator',email:'operator@vsip.example'}]);
  const unchanged=[{id:'u1',email:'a@b.vn'}];expect(normalizeDemoIdentities(unchanged)).toBe(unchanged);
 });
 it('seeds use the new addresses and the old seeded addresses alias to them for local login',()=>{
  const seeded=initialAdmin(parks,assets).users;
  expect(seeded.find(u=>u.id==='sa')?.email).toBe('superadmin@vsip.example');
  expect(seeded.some(u=>/@vig\.example$/.test(u.email))).toBe(false);
  expect(demoLoginAlias('admin@vig.example')).toBe('admin@vsip.example');
  expect(demoLoginAlias('someone@vig.example')).toBe('someone@vig.example');
 });
 it('seed park contacts use vsip.example',()=>{
  expect(JSON.stringify(parks)).not.toMatch(/vig\.example/);
 });
});

describe('stale local snapshot',()=>{
 afterEach(()=>localStorage.removeItem(CONTENT_KEY));
 it('shows corrected placeholders without reset and keeps real edits and revisions',()=>{
  const store=initialAdmin(parks,assets);
  const ids=store.drafts.filter(d=>d.kind==='park').slice(0,2).map(d=>d.id);
  store.drafts=store.drafts.map(d=>d.id===ids[0]?{...d,revision:9,data:{...(d.data as any),contact:{...(d.data as any).contact,email:'contact1@vig.example',website:'vig.example'}},published:{...(d.published as any),contact:{...(d.published as any).contact,email:'contact1@vig.example',website:'vig.example'}}}
   :d.id===ids[1]?{...d,data:{...(d.data as any),contact:{...(d.data as any).contact,email:'leasing@real-company.vn'}},published:{...(d.published as any),contact:{...(d.published as any).contact,email:'leasing@real-company.vn'}}}:d);
  localStorage.setItem(CONTENT_KEY,JSON.stringify({...internalBackup(store),baseDeploymentId:deploymentId()}));
  const loaded=loadContent().snapshot!;
  const first=loaded.drafts.find(d=>d.id===ids[0])!;
  expect((first.data as any).contact.email).toBe('contact1@vsip.example');expect((first.published as any).contact.website).toBe('vsip.example');expect(first.revision).toBe(9);
  const pub=publicInventory().parks;
  expect(pub.find(p=>p.id===ids[0])?.contact?.email).toBe('contact1@vsip.example');
  expect(pub.find(p=>p.id===ids[1])?.contact?.email).toBe('leasing@real-company.vn');
  // stored snapshot is not rewritten by reading
  expect(localStorage.getItem(CONTENT_KEY)).toContain('contact1@vig.example');
 });
});
