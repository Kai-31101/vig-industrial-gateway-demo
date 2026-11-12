import {describe,it,expect} from 'vitest';
import {parks} from './data';
describe('VSIP source enrichment',()=>{
 it('binds infrastructure, sectors and contacts to each owning profile source',()=>{
  expect(parks.filter(p=>p.suitableIndustries.length>0)).toHaveLength(21);
  for(const park of parks){
   expect(park.utilities.map(u=>u.key)).toEqual(['electricity','water','wastewater']);
   for(const utility of park.utilities){
    expect(utility.capacity.value).not.toBeNull();
    expect(park.documents.find(d=>d.id===utility.capacity.sourceDocumentId)?.sourceUrl).toMatch(/^https:\/\//);
   }
   expect(park.contact?.email).not.toBe('communications@vsip.com.vn');
   expect(park.documents.find(d=>d.id===park.contact?.sourceDocumentId)?.sourceUrl).toMatch(/^https:\/\//);
   if(park.suitableIndustries.length)expect(park.documents.some(d=>d.id===park.industrySourceDocumentId)).toBe(true);
   expect(park.connectivity.every(c=>c.status==='unknown')).toBe(true);
  }
 });
 it('preserves voltage and phase distinctions instead of inventing uniform capacities',()=>{
  const get=(slug:string,key:string)=>parks.find(p=>p.slug===slug)!.utilities.find(u=>u.key===key)!.capacity;
  expect(get('vsip-bac-ninh-i','electricity').unit).toBe('kV');
  expect(get('vsip-binh-dinh','electricity').unit).toBe('MW');
  expect(get('vsip-ii-binh-duong','water').value).toBe('VSIP II: 20,000; expansion: 50,000');
  expect(get('vsip-ii-binh-duong','wastewater').value).toBe('VSIP II: 12,000; expansion: 41,000');
  expect(parks.find(p=>p.slug==='vsip-thai-binh')?.suitableIndustries).toEqual([]);
 });
 it('keeps local, shared-office and group contacts distinguishable',()=>{
  expect(parks.find(p=>p.slug==='vsip-can-tho')?.contact?.email).toBe('vsip.cantho@vsip.com.vn');
  expect(parks.find(p=>p.slug==='vsip-hai-phong-ii')?.contact?.scope).toBe('regional');
  expect(parks.find(p=>p.slug==='vsip-quang-ninh')?.contact?.scope).toBe('group');
  expect(parks.find(p=>p.slug==='vsip-quang-ngai-i')?.contact?.email).toBe('marketing.qn@vsip.com.vn');
 });
});
