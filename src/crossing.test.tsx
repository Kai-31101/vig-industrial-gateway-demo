// @vitest-environment jsdom
import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,render,screen,fireEvent} from '@testing-library/react';
import App from './App';
afterEach(cleanup);
describe('Cross-Epic UI contracts',()=>{
 it('carries the homepage keyword into the directory URL and filter',()=>{
  window.location.hash='#/home';render(<App/>);
  const input=screen.getByLabelText('Tìm kiếm công nghiệp');
  fireEvent.change(input,{target:{value:'Thái Bình'}});
  fireEvent.keyDown(input,{key:'Enter'});
  expect(decodeURIComponent(window.location.search)).toContain('q=Thái Bình');
  expect(screen.getByDisplayValue('Thái Bình')).toBeTruthy();
 });
 it('unknown confirmation does not announce success or expose a seed contact',()=>{
  window.location.hash='#/request-confirmation/VIG-2026-001';render(<App/>);
  expect(screen.queryByText('VIG đã tiếp nhận yêu cầu')).toBeNull();
  expect(screen.queryByText('Korea Future Electronics')).toBeNull();
 });
 it('direct request keeps the parent read-only and provides explicit price/date modes',()=>{
  window.location.hash='#/find-supply?assetId=asset-1';render(<App/>);
  expect((screen.getByLabelText('Tên khu công nghiệp') as HTMLSelectElement).disabled).toBe(true);
  expect(screen.getByText('Nhà xưởng xây sẵn 1')).toBeTruthy();
  const mode=screen.getByLabelText(/Chế độ giá\/ngân sách/);
  fireEvent.change(mode,{target:{value:'specific'}});
  expect(screen.getByLabelText('Mã tiền tệ')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Chưa xác định ngày bàn giao'));
  expect(screen.queryByLabelText('Thời điểm bàn giao *')).toBeNull();
 });
 it('empty chat opens a compact discovery state without supplier conversation',()=>{
  window.location.hash='#/home';render(<App/>);
  fireEvent.click(screen.getByLabelText('Mở trao đổi với khu công nghiệp'));
  expect(screen.getByText('Chưa có hội thoại')).toBeTruthy();
  expect(screen.queryByLabelText('Nội dung trao đổi')).toBeNull();
 });
});
