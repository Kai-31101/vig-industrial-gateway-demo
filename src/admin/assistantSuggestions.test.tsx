// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppProvider} from '../AppContext';
import {AiChat} from '../AiChat';
import {api} from '../remote';

// Lets a test replace the enquiry list the assistant sees (the local seed always has enquiries).
vi.mock('../AppContext',async()=>{const m=await vi.importActual<any>('../AppContext');return {...m,useApp:()=>{const v=m.useApp();const o=(globalThis as any).__requests;return o===undefined?v:{...v,requests:o}}}});
vi.mock('../remote',()=>({remoteEnabled:false,ensureSession:vi.fn().mockResolvedValue({}),api:vi.fn().mockResolvedValue({text:'Câu trả lời thử',sources:[]})}));
const scopeData={parks:{published:16,draft:4},assets:{published:48,draft:12}};
const mount=(data:typeof scopeData|undefined=scopeData)=>render(<AppProvider><MemoryRouter><AiChat scope="admin" embedded scopeData={data}/></MemoryRouter></AppProvider>);
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.clearAllMocks();(globalThis as any).__requests=undefined});
afterEach(()=>{cleanup();(globalThis as any).__requests=undefined});

describe('admin assistant empty state follows the real data',()=>{
 it('with no enquiries: says so, hides enquiry suggestions and offers catalogue ones',()=>{
  (globalThis as any).__requests=[];
  mount();
  expect(screen.getByText(/Chưa có nhu cầu thuê nào · 4 KCN và 12 mặt bằng nháp chưa công bố/)).toBeTruthy();
  expect(screen.queryByRole('button',{name:/Tổng hợp yêu cầu mới/})).toBeNull();
  expect(screen.queryByRole('button',{name:/Matching khách hàng/})).toBeNull();
  expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByRole('button',{name:/Tóm tắt danh mục/})).toBeTruthy();
 });
 it('without drafts and enquiries offers a single catalogue suggestion',()=>{
  (globalThis as any).__requests=[];
  mount({parks:{published:16,draft:0},assets:{published:48,draft:0}});
  expect(screen.getAllByRole('button',{name:/KCN và mặt bằng/})).toHaveLength(1);
 });
 it('with enquiries: offers at most four suggestions, one matching suggestion and no duplicates',()=>{
  mount();
  const labels=screen.getAllByRole('button').map(b=>b.textContent||'').filter(x=>/yêu cầu|Matching|nhu cầu|danh mục/i.test(x));
  expect(screen.getByRole('button',{name:'Tổng hợp yêu cầu mới và tiến độ xử lý'})).toBeTruthy();
  expect(screen.getAllByRole('button',{name:/Matching khách hàng/})).toHaveLength(1);
  expect(document.querySelectorAll('.ai-suggest li').length).toBeLessThanOrEqual(4);
  expect(new Set(labels).size).toBe(labels.length);
 });
 it('links the data scope to the matching lists',()=>{
  mount();
  const hrefs=[...document.querySelectorAll('.ai-admin-scope a')].map(a=>a.getAttribute('href'));
  expect(hrefs).toEqual(['/admin/requests','/admin/industrial-parks','/admin/assets']);
 });
});

describe('admin assistant conversation',()=>{
 it('clears the conversation with a 5 second undo',async()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Tổng hợp yêu cầu mới và tiến độ xử lý'}));
  await screen.findByText('Câu trả lời thử');
  fireEvent.click(screen.getByRole('button',{name:/Hội thoại mới/}));
  expect(screen.queryByText('Câu trả lời thử')).toBeNull();
  expect(screen.getByText(/Đã xoá hội thoại/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Hoàn tác'}));
  expect(screen.getByText('Câu trả lời thử')).toBeTruthy();
  expect(screen.queryByText(/Đã xoá hội thoại/)).toBeNull();
 });
 it('shows an admin-specific error with the cause and keeps retry',async()=>{
  vi.mocked(api).mockRejectedValueOnce(new Error('limited'));
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Tổng hợp yêu cầu mới và tiến độ xử lý'}));
  const alert=await screen.findByRole('alert');
  expect(alert.textContent).toContain('giới hạn lượt hỏi AI');
  expect(alert.textContent).not.toContain('tìm kiếm và bộ lọc');
  vi.mocked(api).mockResolvedValueOnce({text:'Đã có câu trả lời',sources:[]});
  fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));
  await waitFor(()=>expect(screen.getByText('Đã có câu trả lời')).toBeTruthy());
 });
 it('lets only the message list be a live region',()=>{
  mount();
  fireEvent.click(screen.getByRole('button',{name:'Tổng hợp yêu cầu mới và tiến độ xử lý'}));
  expect(document.querySelector('.ai-messages')!.getAttribute('aria-live')).toBeNull();
  expect(document.querySelector('.ai-log')!.getAttribute('aria-live')).toBe('polite');
 });
});
