// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import {act,cleanup,fireEvent,renderHook,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';
import {AppProvider} from '../AppContext';
import {AdminProvider,useAdmin} from './AdminContext';
import {OverviewDashboard} from './OverviewDashboard';
import {ContentList} from './ContentEditor';
import {PermissionMatrix} from './PermissionMatrix';
import {askAiLink,formatArea,tidyNumber,withinDays} from './insights';

afterEach(()=>{cleanup();localStorage.clear()});
const mount=(node:ReactNode)=>{const wrapper=({children}:{children:ReactNode})=><MemoryRouter><AppProvider><AdminProvider>{children}{node}</AdminProvider></AppProvider></MemoryRouter>;const h=renderHook(()=>useAdmin(),{wrapper});act(()=>h.result.current.enterDemo());return h};

describe('manager overview',()=>{
 it('leads with the AI brief and work queue, and keeps the detail table closed until asked',()=>{
  const h=mount(<OverviewDashboard/>);
  expect(screen.getByRole('region',{name:'AI tóm tắt hôm nay'})).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
  const drafts=h.result.current.store.drafts.filter(d=>d.state==='draft').length;
  const todo=screen.getByRole('heading',{name:'Việc cần làm'}).closest('section')!;
  const links=within(todo).getAllByRole('link');
  expect(drafts).toBeGreaterThan(0);
  expect(links.length).toBeGreaterThan(0);
  expect(links.length).toBeLessThanOrEqual(5);
  fireEvent.click(within(screen.getByRole('region',{name:'Chọn danh sách'})).getByRole('button',{name:/Khu công nghiệp/}));
  expect(screen.getByRole('table')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Thu gọn'}));
  expect(screen.queryByRole('table')).toBeNull();
 });
 it('sends typed questions to the assistant with the text in the URL',()=>{
  expect(askAiLink('Mặt bằng 10.000 m²?','match')).toBe('/admin/assistant?ask=M%E1%BA%B7t%20b%E1%BA%B1ng%2010.000%20m%C2%B2%3F&hint=match');
 });
});

describe('catalogue list',()=>{
 it('pages long lists, counts every match and opens records from the row',()=>{
  const h=mount(<ContentList kind="asset"/>);
  const total=h.result.current.store.drafts.filter(d=>d.kind==='asset').length;
  expect(total).toBeGreaterThan(20);
  expect(screen.getAllByRole('row').length-1).toBe(20);
  expect(screen.getByRole('status').textContent).toContain(String(total));
  fireEvent.click(screen.getByRole('button',{name:'Sau'}));
  expect(screen.getAllByRole('row').length-1).toBe(Math.min(20,total-20));
  expect(screen.queryByText('Mở hồ sơ')).toBeNull();
 });
});

describe('quick edit',()=>{
 it('saves availability from the side panel without opening the full form',async()=>{
  const h=mount(<ContentList kind="asset"/>);
  const target=h.result.current.store.drafts.find(d=>d.kind==='asset')!;
  fireEvent.click(screen.getAllByRole('button',{name:'Sửa nhanh'})[0]);
  fireEvent.change(screen.getByLabelText('Sẵn sàng bàn giao từ'),{target:{value:'2027-03-01'}});
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi',hidden:true}))});
  const saved=h.result.current.store.drafts.find(d=>d.id===target.id)!;
  expect((saved.data as any).availableFrom).toBe('2027-03-01');
  expect(saved.revision).toBe(target.revision+1);
 });
});

describe('permission matrix',()=>{
 it('shows business roles only, hides internal codes and offers save only after a change',()=>{
  const h=mount(<PermissionMatrix/>);
  act(()=>{h.result.current.login('superadmin@vig.example','VigDemo@2026')});
  expect(screen.queryByRole('columnheader',{name:'Super Admin'})).toBeNull();
  expect(screen.queryByText('P01')).toBeNull();
  expect(screen.queryByRole('button',{name:'Lưu thay đổi'})).toBeNull();
  const box=screen.getByLabelText(/^OPERATOR P01/) as HTMLInputElement;
  fireEvent.click(box);
  expect(screen.getByRole('button',{name:'Lưu thay đổi'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:/Nội dung & dữ liệu/}));
  expect(screen.queryByLabelText(/^OPERATOR P01/)).toBeNull();
 });
});

describe('display helpers',()=>{
 it('formats areas, trims float noise and buckets dates',()=>{
  expect(formatArea(1260000,'vi')).toBe('126 ha');
  expect(formatArea(8500,'en')).toBe('8,500 m²');
  expect(tidyNumber(11.440000000000001)).toBe(11.44);
  const now=Date.parse('2026-11-16T00:00:00Z');
  expect(withinDays('2026-11-14T00:00:00Z',0,7,now)).toBe(true);
  expect(withinDays('2026-11-05T00:00:00Z',0,7,now)).toBe(false);
  expect(withinDays('2026-11-05T00:00:00Z',7,14,now)).toBe(true);
 });
});
