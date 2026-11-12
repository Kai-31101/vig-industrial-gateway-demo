import {describe,it,expect} from 'vitest';
import {parks} from './data';
import {parkCompleteness,sortParksByCompleteness} from './parkCompleteness';
describe('park completeness order',()=>{
 it('prefers documented coverage and excludes illustrative media and hidden values',()=>{
  const full=structuredClone(parks[2]);
  const sparse={...full,media:[{...full.media[0],url:'/images/industrial-parks/green-energy.png'}],suitableIndustries:[],availability:full.availability.map(a=>({...a,available:{...a.available,value:999,disclosureStatus:'not_disclosed' as const}}))};
  expect(parkCompleteness(full)).toBeGreaterThan(parkCompleteness(sparse));
  expect(sortParksByCompleteness([sparse,full])[0]).toBe(full);
 });
 it('counts a published zero and does not reward duplicate media or industries',()=>{
  const p=parks.find(p=>p.slug==='vsip-bac-ninh-i')!;
  expect(p.availability[0].available.value).toBe(0);
  const missing={...p,availability:[]};
  expect(parkCompleteness(p)-parkCompleteness(missing)).toBe(1);
  expect(parkCompleteness({...p,media:[...p.media,...p.media],suitableIndustries:[...p.suitableIndustries,...p.suitableIndustries]})).toBe(parkCompleteness(p));
 });
 it('keeps tie order stable and leaves source arrays unchanged',()=>{
  const a={...parks[0],id:'first'},b={...parks[0],id:'second'};
  const input=[a,b];expect(sortParksByCompleteness(input)).toEqual([a,b]);
  expect(sortParksByCompleteness(input)).not.toBe(input);
  const original=parks.map(p=>p.id);sortParksByCompleteness(parks);expect(parks.map(p=>p.id)).toEqual(original);
 });
});
