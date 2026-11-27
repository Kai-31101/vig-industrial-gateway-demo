// @vitest-environment jsdom
// Mobile layout pass (2026-11-17): dashboard reading order, editor section selector, catalogue filter toggle/chips.
import {afterEach,describe,expect,it} from 'vitest';
import {act,cleanup,fireEvent,renderHook,screen,within} from '@testing-library/react';
import {Link,MemoryRouter,Route,Routes} from 'react-router-dom';
import type {ReactNode} from 'react';
import {AppProvider} from '../AppContext';
import {AdminProvider,useAdmin} from './AdminContext';
import {OverviewDashboard} from './OverviewDashboard';
import {ContentEditor,ContentList} from './ContentEditor';

afterEach(()=>{cleanup();localStorage.clear()});
const mount=(node:ReactNode,path='/')=>{const wrapper=({children}:{children:ReactNode})=><MemoryRouter initialEntries={[path]}><AppProvider><AdminProvider>{children}{node}</AdminProvider></AppProvider></MemoryRouter>;const h=renderHook(()=>useAdmin(),{wrapper});act(()=>h.result.current.enterDemo());return h};
const editor=(kind:'park'|'asset',path:string)=>mount(<Routes><Route path={kind==='park'?'/admin/industrial-parks/:id/edit':'/admin/assets/:id/edit'} element={<ContentEditor kind={kind}/>}/></Routes>,path);

describe('dashboard reading order',()=>{
 it('orders To do, key metrics, then the AI brief in the document, so screen order and focus order agree',()=>{
  mount(<OverviewDashboard/>);
  const todo=screen.getByRole('region',{name:'Việc cần làm'});
  const kpis=screen.getByRole('region',{name:'Chỉ số chính'});
  const ai=screen.getByRole('region',{name:'Tóm tắt hôm nay'});
  expect(todo.compareDocumentPosition(kpis)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(kpis.compareDocumentPosition(ai)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(ai.compareDocumentPosition(screen.getByRole('heading',{name:/Nhu cầu thuê theo/}))&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(todo).getAllByRole('listitem').length).toBeGreaterThan(0);
 });
 it('keeps the extra AI summary lines and suggested questions behind one labelled disclosure',()=>{
  mount(<OverviewDashboard/>);
  const ai=screen.getByRole('region',{name:'Tóm tắt hôm nay'});
  const toggle=screen.getByRole('button',{name:'Xem thêm tóm tắt và gợi ý'});
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  const [list,prompts]=toggle.getAttribute('aria-controls')!.split(' ').map(id=>document.getElementById(id)!);
  expect(list.tagName).toBe('UL');
  expect(list.querySelectorAll('li:not(.overview-ai-extra)')).toHaveLength(1);
  expect(prompts.className).not.toContain('open');
  expect(ai.className).not.toContain('expanded');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(toggle.textContent).toBe('Thu gọn tóm tắt');
  expect(prompts.className).toContain('open');
  expect(ai.className).toContain('expanded');
 });
});

describe.each([['park','/admin/industrial-parks/park-vsip-thai-binh/edit'],['asset','/admin/assets/asset-1/edit']] as const)('%s editor section selector',(kind,path)=>{
 it('switches sections, names the panel by its heading and keeps in-progress edits',()=>{
  editor(kind,path);
  const select=screen.getByRole('combobox',{name:'Nhóm thông tin'}) as HTMLSelectElement;
  const panel=document.getElementById('editor-content-panel')!;
  const heading=()=>document.getElementById(panel.getAttribute('aria-labelledby')!)!;
  expect(heading().tagName).toBe('H2');
  const first=heading().textContent;
  const name=panel.querySelector<HTMLInputElement>('[data-field-path="name"] input')!;
  fireEvent.change(name,{target:{value:'Bản nháp kiểm thử'}});
  fireEvent.change(select,{target:{value:select.options[1].value}});
  expect(heading().textContent).toBe(select.options[1].textContent);
  expect(heading().textContent).not.toBe(first);
  fireEvent.change(select,{target:{value:select.options[0].value}});
  expect(panel.querySelector<HTMLInputElement>('[data-field-path="name"] input')!.value).toBe('Bản nháp kiểm thử');
  expect(document.querySelector('.editor-dirty')!.textContent).toBe('Có thay đổi chưa lưu');
 });
});

describe('editor validation jump',()=>{
 it('marks the section with errors in the selector and jumps back to it from the error list',async()=>{
  const h=editor('park','/admin/industrial-parks/park-vsip-thai-binh/edit');
  const before=h.result.current.store.drafts.find(d=>d.id==='park-vsip-thai-binh')!.revision;
  const panel=document.getElementById('editor-content-panel')!;
  fireEvent.change(panel.querySelector<HTMLInputElement>('[data-field-path="slug"] input')!,{target:{value:'Bad Slug!'}});
  const select=screen.getByRole('combobox',{name:'Nhóm thông tin'}) as HTMLSelectElement;
  fireEvent.change(select,{target:{value:select.options[4].value}});
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Lưu thay đổi'}))});
  expect([...select.options].find(o=>o.value==='identity')!.textContent).toMatch(/\(1 lỗi\)/);
  expect(h.result.current.store.drafts.find(d=>d.id==='park-vsip-thai-binh')!.revision).toBe(before);
  fireEvent.click(within(screen.getByRole('alert')).getAllByRole('button')[0]);
  expect(select.value).toBe('identity');
  expect(panel.querySelector<HTMLInputElement>('[data-field-path="slug"] input')!.value).toBe('Bad Slug!');
 });
});

describe.each(['asset','park'] as const)('%s list filters',kind=>{
 it('collapses secondary filters behind a counted toggle, with removable chips and clear-all',()=>{
  mount(<ContentList kind={kind}/>);
  const total=()=>Number(screen.getAllByRole('status').map(s=>s.textContent||'').find(s=>/\d/.test(s))!.match(/\d+/)![0]);
  const baseline=total();
  const toggle=screen.getByRole('button',{name:/^Bộ lọc/});
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  const status=screen.getByRole('combobox',{name:'Trạng thái'}) as HTMLSelectElement;
  const data=screen.getByRole('combobox',{name:'Dữ liệu'}) as HTMLSelectElement;
  fireEvent.change(status,{target:{value:'published'}});
  fireEvent.change(data,{target:{value:'mandatory'}});
  const twoFilters=total();
  expect(within(toggle).getByText('2')).toBeTruthy();
  const chips=within(screen.getByRole('list',{name:'Bộ lọc đang áp dụng'})).getAllByRole('button');
  expect(chips).toHaveLength(2);
  fireEvent.click(toggle); // collapsing keeps the filters
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(status.value).toBe('published');
  expect(total()).toBe(twoFilters);
  fireEvent.click(screen.getByRole('button',{name:/^Bỏ lọc: Dữ liệu/}));
  expect(data.value).toBe('all');
  expect(status.value).toBe('published');
  expect(within(toggle).getByText('1')).toBeTruthy();
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'zzz-none'}});
  fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
  expect(status.value).toBe('all');
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  expect(screen.queryByRole('list',{name:'Bộ lọc đang áp dụng'})).toBeNull();
  expect(total()).toBe(baseline);
 });
});

describe('catalogue filters do not leak between parks and assets',()=>{
 const total=()=>Number(screen.getAllByRole('status').map(s=>s.textContent||'').find(s=>/\d/.test(s))!.match(/\d+/)![0]);
 const app=(path:string)=>mount(<><nav><Link to="/admin/assets">to-assets</Link><Link to="/admin/industrial-parks">to-parks</Link></nav><Routes><Route path="/admin/assets" element={<ContentList kind="asset"/>}/><Route path="/admin/industrial-parks" element={<ContentList kind="park"/>}/></Routes></>,path);
 it('assets park filter does not follow to the parks list',()=>{
  app('/admin/industrial-parks');const parks=total();
  fireEvent.click(screen.getByText('to-assets'));
  fireEvent.change(screen.getByRole('combobox',{name:'Khu công nghiệp'}),{target:{value:'park-vsip-thai-binh'}});
  fireEvent.change(screen.getByRole('searchbox'),{target:{value:'1'}});
  expect(screen.getByRole('list',{name:'Bộ lọc đang áp dụng'})).toBeTruthy();
  fireEvent.click(screen.getByText('to-parks'));
  expect(total()).toBe(parks);
  expect(screen.queryByRole('list',{name:'Bộ lọc đang áp dụng'})).toBeNull();
  expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('');
  expect(screen.getByRole('button',{name:/^Bộ lọc/}).getAttribute('aria-expanded')).toBe('false');
 });
 it('parks province filter does not follow to the assets list',()=>{
  app('/admin/assets');const assets=total();
  fireEvent.click(screen.getByText('to-parks'));
  const province=screen.getByRole('combobox',{name:'Tỉnh / thành'}) as HTMLSelectElement;
  fireEvent.change(province,{target:{value:province.options[1].value}});
  expect(screen.getAllByRole('button',{name:/^Bỏ lọc: Tỉnh/})).toHaveLength(1);
  fireEvent.click(screen.getByText('to-assets'));
  expect(total()).toBe(assets);
  expect(screen.queryByRole('list',{name:'Bộ lọc đang áp dụng'})).toBeNull();
  expect((screen.getByRole('combobox',{name:'Trạng thái'}) as HTMLSelectElement).value).toBe('all');
 });
});
