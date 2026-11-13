// @vitest-environment jsdom
import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,render,screen,renderHook,act} from '@testing-library/react';
import App from './App';
import {AppProvider,useApp} from './AppContext';
import {parks,assets} from './data';
import {isPublicPark,isPublicAsset,validLeasingContext} from './leasing';
afterEach(cleanup);
const base={kind:'find_supply' as const,transaction:'lease' as const,service:'Find Supply'};
describe('VSIP leasing scope',()=>{
 it('retains published demo inventory while rejecting arbitrary published parks and sale assets',()=>{
  expect(parks.filter(isPublicPark)).toHaveLength(16);
  expect(assets.filter(a=>isPublicAsset(a,parks))).toHaveLength(48);
  expect(isPublicPark({...parks[0],id:'outside',publicationStatus:'published'})).toBe(false);
  expect(isPublicAsset({...assets[0],transaction:'sale'},parks)).toBe(false);
 });
 it('validates contact intent, direction, transaction and parent context',()=>{
  expect(validLeasingContext(base,parks,assets)).toBe(true);
  expect(validLeasingContext({...base,service:'Meeting / Connection',assetId:assets[0].id,parkId:assets[0].parkId},parks,assets)).toBe(true);
  for(const patch of [{kind:'find_demand' as const},{transaction:'sale' as const},{service:'Premium Matching'},{parkId:'outside'},{assetId:'outside'},{assetId:assets[0].id,parkId:parks.find(p=>p.id!==assets[0].parkId)!.id}]) expect(validLeasingContext({...base,...patch},parks,assets)).toBe(false);
 });
 it('enforces policy at intake and preserves legacy history',()=>{
  const h=renderHook(useApp,{wrapper:AppProvider});const input={...h.result.current.requests[0],...base};const count=h.result.current.requests.length;
  expect(()=>h.result.current.createRequest({...input,kind:'find_demand'})).toThrow();
  expect(()=>h.result.current.createRequest({...input,transaction:'sale'})).toThrow();
  expect(h.result.current.requests).toHaveLength(count);
  act(()=>{h.result.current.createRequest({...input,service:'Meeting / Connection'})});
  expect(h.result.current.requests).toHaveLength(count+1);
  expect(h.result.current.requests.some(r=>r.kind==='find_demand')).toBe(true);
 });
 it.each(['/find-demand','/industrial-expo'])('retires direct public route %s without a submission form',route=>{
  window.location.hash='#'+route;const {container}=render(<App/>);
  expect(container.querySelector('form')).toBeNull();expect(screen.getByText(/Không tiếp nhận mặt bằng/)).toBeTruthy();
 });
 it('removes landlord and Expo links from homepage while retaining two property categories',()=>{
  window.location.hash='#/home';const {container}=render(<App/>);
  expect(container.querySelector('a[href="/find-demand"]')).toBeNull();expect(container.querySelector('a[href="/industrial-expo"]')).toBeNull();
  expect(container.querySelector('.funnel-card a[href="/assets?type=industrial_land"]')).toBeTruthy();
  expect(container.querySelector('.funnel-card a[href="/assets?type=ready_built_factory"]')).toBeTruthy();
 });
 it('selects site visit intent from the legacy meeting link without brokerage packages',()=>{
  window.location.hash='#/find-supply?support=meeting';render(<App/>);
  expect((screen.getByRole('radio',{name:'Yêu cầu khảo sát'}) as HTMLInputElement).checked).toBe(true);
  expect(screen.getByRole('radio',{name:'Tư vấn thuê'})).toBeTruthy();
  expect(screen.queryByText('Ghép nối chuyên sâu')).toBeNull();
  expect(screen.queryByRole('option',{name:'Nhận chuyển nhượng'})).toBeNull();
 });
});
