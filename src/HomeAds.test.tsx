// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppProvider} from './AppContext';
import {HomeAds} from './HomeAds';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const setup=()=>render(<AppProvider><MemoryRouter><HomeAds placement="top"/><HomeAds placement="bottom"/></MemoryRouter></AppProvider>);
describe('homepage advertisement carousels',()=>{
 it('keeps the first banner fixed and labels every banner as Ads',()=>{
  vi.useFakeTimers();setup();
  const first=screen.getByRole('region',{name:'Banner top 1'});
  expect(screen.getAllByText('Ads')).toHaveLength(4);
  act(()=>vi.advanceTimersByTime(15000));
  expect(within(first).getByRole('img').getAttribute('src')).toContain('advertise-here.png');
  expect(first.querySelector('.ad-slide-in')).toBeNull();
  expect(first.querySelector('.ad-slide-out')).toBeNull();
  expect(first.hasAttribute('aria-roledescription')).toBe(false);
 });
 it('pauses offscreen and waits a complete interval after becoming visible',()=>{
  vi.useFakeTimers();
  const callbacks:((entries:{isIntersecting:boolean}[])=>void)[]=[];
  vi.stubGlobal('IntersectionObserver',class {constructor(callback:(entries:{isIntersecting:boolean}[])=>void){callbacks.push(callback)}observe(){}disconnect(){}});
  setup();const first=screen.getByRole('region',{name:'Banner bottom 1'});
  act(()=>callbacks[2]([{isIntersecting:false}]));
  act(()=>vi.advanceTimersByTime(9000));expect(within(first).getByRole('img').getAttribute('src')).toContain('vietcombank-vie.png');
  act(()=>callbacks[2]([{isIntersecting:true}]));
  act(()=>vi.advanceTimersByTime(2999));expect(within(first).getByRole('img').getAttribute('src')).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(1));expect(within(first).getByRole('img').getAttribute('src')).toContain('factory-construction.png');
 });
 it('renders two banners in each location and rotates independently every three seconds',()=>{
  vi.useFakeTimers();setup();
  expect(screen.getAllByRole('img')).toHaveLength(4);
  const first=screen.getByRole('region',{name:'Banner bottom 1'});
  const second=screen.getByRole('region',{name:'Banner top 2'});
  const src=(el:HTMLElement)=>within(el).getByRole('img').getAttribute('src');
  expect(src(first)).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(2999));expect(src(first)).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(1));expect(src(first)).toContain('factory-construction.png');
  fireEvent.mouseEnter(first);
  act(()=>vi.advanceTimersByTime(3000));expect(src(first)).toContain('factory-construction.png');expect(src(second)).toContain('industrial-catering.png');
  fireEvent.mouseLeave(first);
  act(()=>vi.advanceTimersByTime(3000));expect(src(first)).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(3000));expect(src(first)).toContain('factory-construction.png');
  expect(first.querySelector('.ad-slide-in')).not.toBeNull();
  expect(first.querySelector('.ad-slide-out')?.getAttribute('src')).toContain('vietcombank-vie.png');
 });
 it('keeps focus pause and safe CTAs without a visible control toolbar',()=>{
  vi.useFakeTimers();setup();
  const first=screen.getByRole('region',{name:'Banner bottom 1'});const q=within(first);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
  fireEvent.focus(q.getByRole('link'));act(()=>vi.advanceTimersByTime(3000));expect(q.getByRole('img').getAttribute('src')).toContain('vietcombank-vie.png');
  expect(q.getByRole('link').getAttribute('href')).toBe('/images/ads/vietcombank-vie.png');
  expect(screen.getAllByRole('link').every(a=>!a.getAttribute('href')?.startsWith('tel:'))).toBe(true);
 });
});
