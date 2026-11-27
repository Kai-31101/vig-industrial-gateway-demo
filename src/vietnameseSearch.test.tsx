// @vitest-environment jsdom
// Vietnamese input in URL-bound directory search (2026-11-17). Reproduces the real failure mechanism: input events
// dispatched back-to-back (UniKey/EVKey Telex rewrite edits) and IME composition sequences, without act() between
// events, so React's controlled-value restore runs exactly as in the browser.
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {cleanup,render,waitFor,act} from '@testing-library/react';
import App from './App';
import {isComposingKey,normalizeSearch,searchIncludes} from './searchDraft';

const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
const edit=(el:HTMLInputElement,del:number,ins:string,composing=false)=>{const cur=el.value;setter.call(el,cur.slice(0,cur.length-del)+ins);el.dispatchEvent(new InputEvent('input',{bubbles:true,data:ins,isComposing:composing}));return el.value;};
const query=()=>new URLSearchParams(window.location.search).get('q');
const go=(url:string)=>{window.history.pushState({},'',url);window.dispatchEvent(new PopStateEvent('popstate'));};
const parksInput=()=>document.querySelector<HTMLInputElement>('.desktop-park-filters input, .mobile-search-row input')!;
const resultCount=()=>Number((document.body.textContent!.match(/(\d+) khu công nghiệp/)||[])[1]);

beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=false;});
afterEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;cleanup();window.history.replaceState({},'','/');});

const open=async(url='/industrial-parks')=>{window.history.replaceState({},'',url);render(<App/>);await waitFor(()=>expect(parksInput()).toBeTruthy());return parksInput();};

describe('Vietnamese search input',()=>{
 it('UniKey-style rewrite edits keep every intermediate value (Đ, ệ, dệt)',async()=>{
  const el=await open();el.focus();
  const seen=[edit(el,0,'Đ'),edit(el,0,'e'),edit(el,1,'ê'),edit(el,0,'t'),edit(el,2,'ệt')];
  expect(seen).toEqual(['Đ','Đe','Đê','Đêt','Đệt']);
  await waitFor(()=>expect(query()).toBe('Đệt'));
  expect(el.value).toBe('Đệt');
 });
 it('Thái Bình typed as Telex rewrites commits the final value and filters to the park',async()=>{
  const el=await open();el.focus();
  for(const [d,i] of [[0,'T'],[0,'h'],[0,'a'],[0,'i'],[2,'ái'],[0,' '],[0,'B'],[0,'i'],[0,'n'],[0,'h'],[3,'ình']] as [number,string][])edit(el,d,i);
  await waitFor(()=>expect(query()).toBe('Thái Bình'));
  expect(el.value).toBe('Thái Bình');
  await waitFor(()=>expect(resultCount()).toBeGreaterThan(0));
 });
 it('IME composition does not touch the URL until compositionend, then commits once',async()=>{
  const el=await open();el.focus();
  el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));
  for(const t of ['d','de','dê','dêt','dệt']){setter.call(el,t);el.dispatchEvent(new InputEvent('input',{bubbles:true,data:t,isComposing:true}));}
  await new Promise(r=>setTimeout(r,30));
  expect(query()).toBeNull();
  expect(el.value).toBe('dệt');
  el.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'dệt'}));
  await waitFor(()=>expect(query()).toBe('dệt'));
  expect(el.value).toBe('dệt');
  await waitFor(()=>expect(resultCount()).toBeGreaterThan(0)); // Vietnamese industry label ("Dệt may") matches
 });
 it('external URL changes (Back/Forward, clear) still replace the draft; other filters keep it',async()=>{
  const el=await open('/industrial-parks?q=Ninh');
  expect(el.value).toBe('Ninh');
  await act(async()=>{go('/industrial-parks?q=%C4%90%E1%BB%93ng%20Nai');});
  await waitFor(()=>expect(parksInput().value).toBe('Đồng Nai'));
  await act(async()=>{go('/industrial-parks?q=%C4%90%E1%BB%93ng%20Nai&region=South');});
  await waitFor(()=>expect(parksInput().value).toBe('Đồng Nai'));
  await act(async()=>{go('/industrial-parks');});
  await waitFor(()=>expect(parksInput().value).toBe(''));
 });
});

describe('matching helpers',()=>{
 it('treats NFD and NFC Vietnamese as equal without changing the shown text',()=>{
  expect(searchIncludes('Khu công nghiệp VSIP Thái Bình','Thái Bình'.normalize('NFD'))).toBe(true);
  expect(searchIncludes('KCN Đồng Nai','đồng')).toBe(true);
  expect(normalizeSearch('ĐỆT')).toBe('đệt');
 });
 it('treats Enter during IME composition (isComposing or keyCode 229) as composition confirmation',()=>{
  const ev=(isComposing:boolean,keyCode:number)=>({nativeEvent:{isComposing},keyCode}) as any;
  expect(isComposingKey(ev(true,13))).toBe(true);
  expect(isComposingKey(ev(false,229))).toBe(true);
  expect(isComposingKey(ev(false,13))).toBe(false);
 });
});
