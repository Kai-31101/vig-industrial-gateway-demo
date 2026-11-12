// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppProvider} from './AppContext';
import {HomeAds} from './HomeAds';
afterEach(()=>{cleanup();vi.useRealTimers();});
const setup=()=>render(<AppProvider><MemoryRouter><HomeAds placement="top"/><HomeAds placement="bottom"/></MemoryRouter></AppProvider>);
describe('homepage advertisement carousels',()=>{
 it('renders two banners in each location and rotates independently every five seconds',()=>{
  vi.useFakeTimers();setup();
  expect(screen.getAllByRole('img')).toHaveLength(4);
  const first=screen.getByRole('region',{name:'Banner top 1'});
  const second=screen.getByRole('region',{name:'Banner top 2'});
  const src=(el:HTMLElement)=>within(el).getByRole('img').getAttribute('src');
  expect(src(first)).toContain('industrial-1.jpg');
  act(()=>vi.advanceTimersByTime(4999));expect(src(first)).toContain('industrial-1.jpg');
  act(()=>vi.advanceTimersByTime(1));expect(src(first)).toContain('industrial-3.jpg');
  fireEvent.mouseEnter(first);
  act(()=>vi.advanceTimersByTime(5000));expect(src(first)).toContain('industrial-3.jpg');expect(src(second)).toContain('industrial-6.jpg');
  fireEvent.mouseLeave(first);
  act(()=>vi.advanceTimersByTime(5000));expect(src(first)).toContain('industrial-5.jpg');
 });
 it('supports manual navigation, pause, focus pause and safe CTAs without dialing the illustrative number',()=>{
  vi.useFakeTimers();setup();
  const first=screen.getByRole('region',{name:'Banner top 1'});const q=within(first);
  fireEvent.click(q.getByRole('button',{name:'Ảnh trước'}));expect(q.getByRole('img').getAttribute('src')).toContain('industrial-5.jpg');
  fireEvent.click(q.getByRole('button',{name:'Dừng tự chuyển'}));
  act(()=>vi.advanceTimersByTime(10000));expect(q.getByRole('img').getAttribute('src')).toContain('industrial-5.jpg');
  fireEvent.click(q.getByRole('button',{name:'Tiếp tục tự chuyển'}));
  fireEvent.focus(q.getByRole('link'));act(()=>vi.advanceTimersByTime(5000));expect(q.getByRole('img').getAttribute('src')).toContain('industrial-5.jpg');
  expect(q.getByRole('link').getAttribute('href')).toBe('/find-supply');
  expect(screen.getAllByRole('link').every(a=>!a.getAttribute('href')?.startsWith('tel:'))).toBe(true);
 });
});
