// @vitest-environment jsdom
import {afterEach,it,expect} from 'vitest';
import {act,cleanup,screen,renderHook} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {ReactNode} from 'react';
import {AppProvider} from '../AppContext';
import {AdminProvider,useAdmin} from './AdminContext';
import {RelatedAssets} from './RelatedAssets';
import {emptyAsset} from '../contentSchema';
import {parks} from '../data';
const wrapper=({children}:{children:ReactNode})=><MemoryRouter><AppProvider><AdminProvider>{children}<RelatedAssets parkId={parks[0].id} saved/></AdminProvider></AppProvider></MemoryRouter>;
afterEach(()=>{cleanup();localStorage.clear()});
it('renders incomplete linked drafts and carries the parent park into creation',()=>{
 const hook=renderHook(()=>useAdmin(),{wrapper});
 act(()=>hook.result.current.login('superadmin@vsip.example','VigDemo@2026'));
 const asset={...emptyAsset('qa-incomplete-linked'),parkId:parks[0].id,name:{vi:'QA linked draft',en:'QA linked draft',zh:'测试草稿'}};
 act(()=>expect(hook.result.current.save(asset).ok).toBe(true));
 const view=screen;
 expect(view.getByText('QA linked draft')).toBeTruthy();
 expect(view.getByText('Chưa nhập')).toBeTruthy();
 expect(view.getByRole('link',{name:'Thêm mặt bằng'}).getAttribute('href')).toBe(`/admin/assets/new?parkId=${parks[0].id}`);
});
