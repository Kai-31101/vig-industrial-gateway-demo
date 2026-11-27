// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import {act,cleanup,fireEvent,render,renderHook,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';
import {AppProvider} from '../AppContext';
import App from '../App';
import {AdminProvider,useAdmin} from './AdminContext';
import {UsersPage} from './Users';
import {OverviewDashboard} from './OverviewDashboard';
import {areaRange} from './insights';

window.scrollTo=(()=>{}) as typeof window.scrollTo;
afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState(null,'','/')});
const mount=(node:ReactNode)=>{const wrapper=({children}:{children:ReactNode})=><MemoryRouter><AppProvider><AdminProvider>{children}{node}</AdminProvider></AppProvider></MemoryRouter>;const h=renderHook(()=>useAdmin(),{wrapper});act(()=>h.result.current.enterDemo());return h};

describe('admin 404',()=>{
 it('shows an admin not-found page with a way back instead of leaving for /home',async()=>{
  window.history.replaceState(null,'','/admin/khong-ton-tai');
  render(<App/>);
  await screen.findByText('Không tìm thấy trang quản trị');
  expect(window.location.pathname).toBe('/admin/khong-ton-tai');
  expect(screen.getByRole('link',{name:'Về Tổng quan'}).getAttribute('href')).toMatch(/^\/admin\//);
 });
 it('keeps unknown public URLs going to the public home page',async()=>{
  window.history.replaceState(null,'','/khong-ton-tai-cong-khai');
  render(<App/>);
  await waitFor(()=>expect(window.location.pathname).toBe('/home'));
 });
});

describe('invite dialog',()=>{
 it('is a native dialog that Esc (cancel) closes',()=>{
  mount(<UsersPage/>);
  fireEvent.click(screen.getByRole('button',{name:'Mời người dùng'}));
  const dialog=document.querySelector('dialog.admin-confirm') as HTMLDialogElement;
  expect(dialog).toBeTruthy();
  expect(dialog.getAttribute('aria-label')).toBe('Mời người dùng');
  const cancel=new Event('cancel',{cancelable:true});
  fireEvent(dialog,cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(document.querySelector('dialog.admin-confirm')).toBeNull();
 });
});

describe('overview honesty',()=>{
 it('names the summary without AI branding and does not restate the KPI numbers',()=>{
  mount(<OverviewDashboard/>);
  const region=screen.getByRole('region',{name:'Tóm tắt hôm nay'});
  expect(within(region).queryByText(/Hỏi AI để xem mặt bằng phù hợp nhất/)).toBeNull();
  expect(region.querySelector('h2 svg')).toBeNull();
  expect(within(region).getByRole('heading',{name:'Tóm tắt hôm nay'})).toBeTruthy();
 });
 it('uses the same request status names as the list',()=>{
  mount(<OverviewDashboard/>);
  expect(screen.getAllByText('Đang chuẩn bị phương án').length).toBeGreaterThan(0);
  expect(screen.queryByText('Đang ghép nối')).toBeNull();
 });
 it('formats a single-value area range once',()=>{
  expect(areaRange(12000,12000,'vi')).toBe('12.000 m²');
  expect(areaRange(5000,12000,'vi')).toBe('5.000–12.000 m²');
 });
});
