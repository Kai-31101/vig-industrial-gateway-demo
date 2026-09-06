// @vitest-environment jsdom
import {afterEach,describe,it,expect} from 'vitest';
import {act,cleanup,renderHook,render,screen,fireEvent} from '@testing-library/react';
import type {ReactNode} from 'react';
import {AppProvider} from './AppContext';
import {AdminProvider,useAdmin} from './admin/AdminContext';
import {PackageCards} from './PackageCards';
import {packageSeeds,packageCopyErrors} from './servicePackages';
import {routePermission,firstAdminPage} from './admin/model';
afterEach(cleanup);
const wrapper=({children}:{children:ReactNode})=><AppProvider><AdminProvider>{children}</AdminProvider></AppProvider>;
describe('Service package content',()=>{
 it('provides complete three-language content and four options per funnel',()=>{expect(packageSeeds).toHaveLength(6);for(const p of packageSeeds)expect(packageCopyErrors(p.content)).toEqual([]);for(const kind of ['find_supply','find_demand'])expect(packageSeeds.filter(p=>p.kinds.includes(kind as 'find_supply'))).toHaveLength(4)});
 it('renders localized benefits and allows selection by card content',()=>{let selected='';render(<PackageCards packages={[packageSeeds[0]]} language="zh" value="" onChange={id=>selected=id}/>);expect(screen.getByText('明确工业地产需求')).toBeTruthy();fireEvent.click(screen.getByText('明确工业地产需求'));expect(selected).toBe('Find Supply')});
 it('blocks incomplete translations and excessive benefit rows',()=>{const c=structuredClone(packageSeeds[0].content);c.zh.name=' ';c.en.benefits=Array(6).fill('Benefit').join('\n');expect(packageCopyErrors(c)).toEqual(['en.benefits','zh.name'])});
 it('requires permission and atomically saves all languages with audit and revision',()=>{const h=renderHook(useAdmin,{wrapper});const c=structuredClone(packageSeeds[0].content);c.en.name='Updated supply';act(()=>expect(h.result.current.savePackage('Find Supply',c,1).error).toBe('permission'));act(()=>h.result.current.login('admin@vig.example','VigDemo@2026'));act(()=>expect(h.result.current.savePackage('Find Supply',c,1).ok).toBe(true));expect(h.result.current.store.packages[0].content.en.name).toBe('Updated supply');expect(h.result.current.store.audit[0].action).toBe('package-content');act(()=>expect(h.result.current.savePackage('Find Supply',c,1).error).toBe('stale'));c.zh.name='';act(()=>expect(h.result.current.savePackage('Find Supply',c,2).error).toBe('validation'));expect(h.result.current.store.packages[0].revision).toBe(2);act(()=>h.result.current.reset());expect(h.result.current.store.packages).toEqual(packageSeeds)});
 it('rechecks permissions at save and supports package-only access',()=>{const h=renderHook(useAdmin,{wrapper});act(()=>h.result.current.login('superadmin@vig.example','VigDemo@2026'));const matrix=structuredClone(h.result.current.store.matrix);matrix.ADMIN=['P22'];act(()=>h.result.current.configure(matrix,1));act(()=>h.result.current.login('admin@vig.example','VigDemo@2026'));expect(firstAdminPage(h.result.current.current,h.result.current.store.matrix)).toBe('/admin/packages');expect(routePermission('/admin/packages')).toBe('P22');act(()=>expect(h.result.current.savePackage('Find Supply',packageSeeds[0].content,1).error).toBe('permission'))});
});
