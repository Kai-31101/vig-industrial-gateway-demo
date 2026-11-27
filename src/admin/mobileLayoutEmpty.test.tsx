// @vitest-environment jsdom
// Dashboard with nothing outstanding: no enquiries and every record published. The To do region must still lead
// the page with an honest empty state (mobile layout pass 2026-11-17).
import {afterEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,renderHook,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';

vi.mock('../requestFixtures',async orig=>({...(await orig() as object),initialRequests:[]}));
vi.mock('../requestMockData',async orig=>({...(await orig() as object),mockLeasingRequests:[]}));
vi.mock('./AdminContext',async orig=>{
 const real=await orig() as typeof import('./AdminContext');
 // Same admin state, but every draft is presented as published so nothing awaits review or authoring.
 const useAdminActions=()=>{const a=real.useAdminActions();return {...a,store:{...a.store,drafts:a.store.drafts.map(d=>({...d,state:'published' as const}))}}};
 return {...real,useAdminActions,useAdmin:useAdminActions};
});

import {AppProvider} from '../AppContext';
import {AdminProvider,useAdmin} from './AdminContext';
import {OverviewDashboard} from './OverviewDashboard';

afterEach(()=>{cleanup();localStorage.clear()});

describe('dashboard empty work queue',()=>{
 it('leads with To do and an honest empty state, before key metrics and the AI brief',()=>{
  const wrapper=({children}:{children:ReactNode})=><MemoryRouter><AppProvider><AdminProvider>{children}<OverviewDashboard/></AdminProvider></AppProvider></MemoryRouter>;
  const h=renderHook(()=>useAdmin(),{wrapper});
  act(()=>h.result.current.enterDemo());
  const todo=screen.getByRole('region',{name:'Việc cần làm'});
  expect(within(todo).getByText('Không có việc tồn đọng.')).toBeTruthy();
  expect(within(todo).queryAllByRole('listitem')).toHaveLength(0);
  const kpis=screen.getByRole('region',{name:'Chỉ số chính'});
  const ai=screen.getByRole('region',{name:'Tóm tắt hôm nay'});
  expect(todo.compareDocumentPosition(kpis)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(kpis.compareDocumentPosition(ai)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 });
});
