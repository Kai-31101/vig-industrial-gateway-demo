// @vitest-environment jsdom
import {afterEach,it,expect} from 'vitest';
import {act,cleanup,screen,renderHook,fireEvent,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';
import {AppProvider} from '../AppContext';
import {AdminProvider,useAdmin} from './AdminContext';
import {OverviewDashboard} from './OverviewDashboard';
const wrapper=({children}:{children:ReactNode})=><MemoryRouter><AppProvider><AdminProvider>{children}<OverviewDashboard/></AdminProvider></AppProvider></MemoryRouter>;
afterEach(()=>{cleanup();localStorage.clear()});
it('defaults to all time and each catalogue card filters the detailed list',()=>{
 const h=renderHook(()=>useAdmin(),{wrapper});act(()=>h.result.current.enterDemo());
 expect((screen.getByLabelText('Khoảng thời gian') as HTMLSelectElement).value).toBe('all');
 const cards=screen.getByRole('region',{name:'Chọn danh sách'});
 fireEvent.click(within(cards).getByRole('button',{name:/Mặt bằng/}));
 expect(screen.getAllByRole('row').length-1).toBe(h.result.current.store.drafts.filter(d=>d.kind==='asset').length);
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'NO_SUCH_RECORD_123'}});
 expect(screen.getByText('Không có hồ sơ phù hợp bộ lọc.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
 expect(screen.getAllByRole('row').length-1).toBe(h.result.current.store.drafts.filter(d=>d.kind==='asset').length);
 fireEvent.click(within(cards).getByRole('button',{name:/Lĩnh vực/}));
 expect(document.querySelectorAll('.overview-industry-list article').length).toBeGreaterThan(0);
 fireEvent.click(document.querySelector('.overview-industry-list button')!);
 expect((screen.getByLabelText('Lĩnh vực') as HTMLSelectElement).value).not.toBe('');
});
it('rejects inverted custom enquiry dates without filtering the catalogue',()=>{
 const h=renderHook(()=>useAdmin(),{wrapper});act(()=>h.result.current.enterDemo());
 fireEvent.click(within(screen.getByRole('region',{name:'Chọn danh sách'})).getByRole('button',{name:/Khu công nghiệp/}));
 fireEvent.change(screen.getByLabelText('Khoảng thời gian'),{target:{value:'custom'}});
 fireEvent.change(screen.getByLabelText('Từ ngày'),{target:{value:'2026-11-10'}});
 fireEvent.change(screen.getByLabelText('Đến ngày'),{target:{value:'2026-11-01'}});
 expect(screen.getByRole('alert')).toBeTruthy();
 expect(screen.getAllByRole('row').length-1).toBe(h.result.current.store.drafts.filter(d=>d.kind==='park').length);
});
