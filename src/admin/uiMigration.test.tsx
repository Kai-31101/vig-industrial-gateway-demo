// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import {act,cleanup,fireEvent,render,renderHook,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';
import {AppProvider} from '../AppContext';
import {AdminProvider,useAdmin} from './AdminContext';
import {AdminFrame} from './AdminFrame';
import App from '../App';
import {ContentList} from './ContentEditor';

afterEach(()=>{cleanup();localStorage.clear();window.history.replaceState(null,'','/')});

describe('admin shell after the UI migration',()=>{
 it('names the rail actions even when the compact rail hides their text, and says the public link ends the admin session',()=>{
  const wrapper=({children}:{children:ReactNode})=><MemoryRouter initialEntries={['/admin/dashboard']}><AppProvider><AdminProvider>{children}<AdminFrame><p>content</p></AdminFrame></AdminProvider></AppProvider></MemoryRouter>;
  const h=renderHook(()=>useAdmin(),{wrapper});
  act(()=>h.result.current.enterDemo());
  const publicLinks=screen.getAllByRole('button',{name:'Trang công khai (thoát phiên quản trị)'});
  expect(publicLinks.length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button',{name:'Khôi phục demo'}).length).toBeGreaterThan(0);
 });
});

describe('enquiry waiting column',()=>{
 it('never claims an enquiry is on track; non-waiting rows say they are not awaiting a response',async()=>{
  window.history.replaceState(null,'','/admin/requests');
  render(<App/>);
  const table=await screen.findByRole('table');
  expect(table.textContent).not.toContain('Đúng tiến độ');
  expect(table.textContent).not.toContain('On track');
  const rows=table.querySelectorAll('tbody tr');
  expect(rows.length).toBeGreaterThan(0);
  const cells=[...table.querySelectorAll('.sla')].map(n=>n.textContent||'');
  expect(cells.every(c=>/ngày chờ|Mới hôm nay|Không chờ phản hồi/.test(c))).toBe(true);
  expect(cells.some(c=>c.includes('Không chờ phản hồi'))).toBe(true);
 });
});

describe('quick edit drawer',()=>{
 it('returns focus to the row button that opened it',()=>{
  const wrapper=({children}:{children:ReactNode})=><MemoryRouter><AppProvider><AdminProvider>{children}<ContentList kind="park"/></AdminProvider></AppProvider></MemoryRouter>;
  const h=renderHook(()=>useAdmin(),{wrapper});
  act(()=>h.result.current.enterDemo());
  const trigger=screen.getAllByRole('button',{name:/Sửa nhanh/})[0];
  trigger.focus();
  fireEvent.click(trigger);
  const close=screen.getByRole('button',{name:'Đóng',hidden:true});
  close.focus();
  expect(document.activeElement).toBe(close);
  fireEvent.click(close);
  expect(document.activeElement).toBe(trigger);
 });
});
