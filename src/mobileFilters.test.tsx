// @vitest-environment jsdom
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter,useLocation} from 'react-router-dom';
import {AppProvider} from './AppContext';
import {DiscoveryFilters} from './DiscoveryFilters';
beforeEach(()=>vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}})));
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
function URLState(){const location=useLocation();return <output data-testid="query">{location.search}</output>}
function setup(query=''){render(<AppProvider><MemoryRouter initialEntries={['/industrial-parks'+query]}><DiscoveryFilters resultCount={2}/><h2 id="directory-results" tabIndex={-1}>Results</h2><URLState/></MemoryRouter></AppProvider>)}
describe('mobile live filters',()=>{
 it('keeps canonical square metre filters when switching units and editing hectares',()=>{
  setup('?minArea=10000&maxArea=20000');fireEvent.click(screen.getByRole('button',{name:'Bộ lọc (1)'}));
  fireEvent.change(screen.getByLabelText('Đơn vị diện tích'),{target:{value:'ha'}});
  expect((screen.getByLabelText('Diện tích từ (ha)') as HTMLInputElement).value).toBe('1');
  expect(screen.getByTestId('query').textContent).toBe('?minArea=10000&maxArea=20000');
  fireEvent.change(screen.getByLabelText('Diện tích từ (ha)'),{target:{value:'1,5'}});
  expect(screen.getByTestId('query').textContent).toBe('?minArea=15000&maxArea=20000');
  fireEvent.change(screen.getByLabelText('Đơn vị diện tích'),{target:{value:'km2'}});
  expect((screen.getByLabelText('Diện tích từ (km²)') as HTMLInputElement).value).toBe('0,015');
  fireEvent.click(screen.getByRole('button',{name:'Xóa bộ lọc'}));
  expect((screen.getByLabelText('Đơn vị diện tích') as HTMLSelectElement).value).toBe('m2');
  expect(screen.getByTestId('query').textContent).toBe('');
 });

 it('counts multiselect and range as groups, excluding keyword, then clears all',()=>{
  setup('?q=park&utility=water&utility=electricity&minArea=1&maxArea=100');
  expect(screen.getByRole('button',{name:'Bộ lọc (2)'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Xóa tất cả'}));
  expect(screen.getByTestId('query').textContent).toBe('');
 });
 it('retains the last valid range and prevents closing until invalid input is resolved',()=>{
  setup('?minArea=100');fireEvent.click(screen.getByRole('button',{name:'Bộ lọc (1)'}));
  fireEvent.change(screen.getByLabelText('Diện tích đến (m²)'),{target:{value:'50'}});
  expect(screen.getByTestId('query').textContent).toBe('?minArea=100');
  fireEvent.click(screen.getByRole('button',{name:'Xem 2 kết quả'}));
  expect(document.activeElement).toBe(screen.getByRole('alert'));
  fireEvent.click(screen.getByRole('button',{name:'Đặt lại diện tích'}));
  fireEvent.click(screen.getByRole('button',{name:'Xem 2 kết quả'}));
  expect(document.activeElement?.id).toBe('directory-results');
  expect(screen.queryByRole('alert')).toBeNull();
 });
});
