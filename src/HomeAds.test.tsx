// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppProvider,useApp} from './AppContext';
import {HomeAds} from './HomeAds';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const LanguagePicker=()=>{const {setLanguage}=useApp();return <><button onClick={()=>setLanguage('en')}>English test</button><button onClick={()=>setLanguage('zh')}>Chinese test</button></>};
const setup=()=>render(<AppProvider><MemoryRouter><LanguagePicker/><HomeAds placement="top"/><HomeAds placement="bottom"/></MemoryRouter></AppProvider>);
describe('homepage advertisement carousels',()=>{
 it('keeps the first banner fixed and labels the ad sections as Ads without overlays',()=>{
  vi.useFakeTimers();setup();
  const first=screen.getByRole('region',{name:'Banner top 1'});
  // Original advertisement images only (user request 2026-11-17): no visible overlay text; ads are identified by the localized region label.
  expect(screen.getAllByRole('region',{name:'Quảng cáo'})).toHaveLength(2);
  expect(document.querySelectorAll('.ad-copy,.ad-disclosure,.ad-bank-brand,.ad-localized')).toHaveLength(0);
  act(()=>vi.advanceTimersByTime(15000));
  expect(first.querySelector('.ad-artwork img')?.getAttribute('src')).toContain('advertise-here.png');
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
  act(()=>vi.advanceTimersByTime(9000));expect(first.querySelector('.ad-artwork img')?.getAttribute('src')).toContain('vietcombank-vie.png');
  act(()=>callbacks[2]([{isIntersecting:true}]));
  act(()=>vi.advanceTimersByTime(2999));expect(first.querySelector('.ad-artwork img')?.getAttribute('src')).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(1));expect(first.querySelector('.ad-artwork img')?.getAttribute('src')).toContain('factory-construction.png');
 });
 it('renders two banners in each location and rotates independently every three seconds',()=>{
  vi.useFakeTimers();setup();
  expect(document.querySelectorAll('.ad-artwork img')).toHaveLength(4);
  const first=screen.getByRole('region',{name:'Banner bottom 1'});
  const second=screen.getByRole('region',{name:'Banner top 2'});
  const src=(el:HTMLElement)=>el.querySelector('.ad-artwork img')?.getAttribute('src');
  expect(src(first)).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(2999));expect(src(first)).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(1));expect(src(first)).toContain('factory-construction.png');
  fireEvent.mouseEnter(first);
  act(()=>vi.advanceTimersByTime(3000));expect(src(first)).toContain('factory-construction.png');expect(src(second)).toContain('industrial-catering.png');
  fireEvent.mouseLeave(first);
  act(()=>vi.advanceTimersByTime(3000));expect(src(first)).toContain('vietcombank-vie.png');
  act(()=>vi.advanceTimersByTime(3000));expect(src(first)).toContain('factory-construction.png');
  expect(first.querySelector('.ad-slide-in')).not.toBeNull();
  expect(first.querySelector('.ad-slide-out img')?.getAttribute('src')).toContain('vietcombank-vie.png');
 });
 it('keeps focus pause and safe CTAs without a visible control toolbar',()=>{
  vi.useFakeTimers();setup();
  const first=screen.getByRole('region',{name:'Banner bottom 1'});const q=within(first);
  expect(first.querySelector('.ad-controls')).toBeNull();
  fireEvent.focus(q.getByRole('button',{name:/Xem quảng cáo/}));act(()=>vi.advanceTimersByTime(3000));expect(first.querySelector('.ad-artwork img')?.getAttribute('src')).toContain('vietcombank-vie.png');
  expect(q.getByRole('button',{name:/Xem quảng cáo/}).getAttribute('type')).toBe('button');
  expect(screen.queryAllByRole('link').every(a=>!a.getAttribute('href')?.startsWith('tel:'))).toBe(true);
 });
 it('updates visible copy and outgoing slides when the locale changes',()=>{
  vi.useFakeTimers();setup();act(()=>vi.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole('button',{name:'English test'}));
  expect(screen.getByRole('button',{name:'Advertise here — View advertisement'})).toBeTruthy();
  expect([...document.querySelectorAll('.ad-localized')].every(el=>el.getAttribute('lang')==='en')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Chinese test'}));
  expect(screen.getByRole('button',{name:'在此投放广告 — 查看广告'})).toBeTruthy();
  expect([...document.querySelectorAll('.ad-localized')].every(el=>el.getAttribute('lang')==='zh')).toBe(true);
  expect(screen.queryByText('Advertise here')).toBeNull();
 });

});
