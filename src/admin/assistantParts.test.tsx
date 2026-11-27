// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AppProvider} from '../AppContext';
import {AssistantMatches,AssistantStats,type AdminLookup} from './AssistantParts';

afterEach(cleanup);
const lookup:AdminLookup={
 asset:id=>id==='asset-1'?{name:'Nhà xưởng A',park:'KCN Một',href:'/admin/assets/asset-1/edit'}:null,
 request:id=>({name:id,href:'/admin/requests/'+id}),
};
const matches=[{requestId:'REQ-9',organization:'Công ty Alpha',results:[
 {assetId:'asset-1',score:75,publicationState:'published',checks:[{key:'location',state:'matched'},{key:'industry',state:'unknown'}]},
 {assetId:'asset-2',score:50,publicationState:'draft',checks:[]},
]}];
const mount=(node:JSX.Element)=>render(<AppProvider><MemoryRouter>{node}</MemoryRouter></AppProvider>);

describe('assistant matching result',()=>{
 it('shows names with links instead of bare ids, a score and the same publication badges as the catalogue',()=>{
  const {container}=mount(<AssistantMatches matches={matches} lookup={lookup}/>);
  expect(screen.getByRole('link',{name:'Công ty Alpha'}).getAttribute('href')).toBe('/admin/requests/REQ-9');
  const asset=screen.getByRole('link',{name:'Nhà xưởng A'});
  expect(asset.getAttribute('href')).toBe('/admin/assets/asset-1/edit');
  expect(screen.getByText('KCN Một')).toBeTruthy();
  expect(screen.getByText('75%')).toBeTruthy();
  expect(container.querySelector('.workflow-badge.state-published')?.textContent).toBe('Đã công bố');
  expect(container.querySelector('.workflow-badge.state-draft')?.textContent).toBe('Bản nháp');
  expect(screen.getByText(/phải công bố trước khi chào/)).toBeTruthy();
 });
 it('says "confirm budget, power, availability" once per request, not per row',()=>{
  mount(<AssistantMatches matches={matches} lookup={lookup}/>);
  expect(screen.getAllByText(/Cần xác nhận ngân sách, điện và thời điểm bàn giao/)).toHaveLength(1);
 });
 it('lists criteria with their state',()=>{
  const {container}=mount(<AssistantMatches matches={matches} lookup={lookup}/>);
  const first=within(container.querySelector('.ai-match-checks') as HTMLElement);
  expect(first.getByText(/Vị trí/).closest('li')?.getAttribute('data-state')).toBe('matched');
  expect(first.getByText(/Ngành/).closest('li')?.getAttribute('data-state')).toBe('unknown');
 });
});

describe('assistant statistics',()=>{
 it('renders the server statistics as small tables using the shared status names',()=>{
  mount(<AssistantStats stats={{statuses:[{status:'submitted',count:2},{status:'matching',count:1}],industries:[{industry:null,count:3}]}}/>);
  expect(screen.getByRole('table',{name:'Theo trạng thái'})).toBeTruthy();
  expect(screen.getByRole('rowheader',{name:'Đã tiếp nhận'})).toBeTruthy();
  expect(screen.getByRole('rowheader',{name:'Đang chuẩn bị phương án'})).toBeTruthy();
  expect(screen.getByRole('rowheader',{name:'Chưa nêu'})).toBeTruthy();
 });
 it('renders nothing for empty statistics',()=>{
  const {container}=mount(<AssistantStats stats={{statuses:[],industries:[]}}/>);
  expect(container.querySelector('.ai-stats')).toBeNull();
 });
});
