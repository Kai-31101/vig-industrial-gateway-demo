// @vitest-environment jsdom
import {afterEach,describe,expect,it} from 'vitest';
import {cleanup,render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AssistantMarkdown,parseBlocks,safeHref} from './AssistantMarkdown';

afterEach(cleanup);
const html=(text:string)=>render(<MemoryRouter><AssistantMarkdown text={text}/></MemoryRouter>).container;

describe('admin assistant markdown',()=>{
 it('renders paragraphs, bold, lists and tables as elements',()=>{
  const c=html('Tóm tắt **quan trọng**\n\n- một\n- hai\n\n1. a\n2. b\n\n| Cột | Số |\n|---|---|\n| X | 5 |');
  expect(c.querySelector('p strong')?.textContent).toBe('quan trọng');
  expect(c.querySelectorAll('ul li')).toHaveLength(2);
  expect(c.querySelectorAll('ol li')).toHaveLength(2);
  expect(c.querySelectorAll('table thead th')).toHaveLength(2);
  expect(c.querySelector('table tbody td')?.textContent).toBe('X');
 });
 it('never turns text into raw HTML',()=>{
  const c=html('<img src=x onerror="alert(1)"> <script>alert(2)</script> **ok**');
  expect(c.querySelector('img')).toBeNull();
  expect(c.querySelector('script')).toBeNull();
  expect(c.textContent).toContain('<img src=x onerror="alert(1)">');
 });
 it('links only http(s) and internal /admin paths',()=>{
  expect(safeHref('https://example.com/a')).toEqual({href:'https://example.com/a',internal:false});
  expect(safeHref('/admin/requests/REQ-1')).toEqual({href:'/admin/requests/REQ-1',internal:true});
  for(const bad of ['javascript:alert(1)','data:text/html,x','//evil.example','/home','ftp://x.y','/adminx'])expect(safeHref(bad)).toBeNull();
  const c=html('[sạch](https://example.com) [nội bộ](/admin/assets/a1/edit) [xấu](javascript:alert) [ngoài](//evil.example)');
  const links=[...c.querySelectorAll('a')].map(a=>a.getAttribute('href'));
  expect(links).toEqual(['https://example.com','/admin/assets/a1/edit']);
  expect(c.querySelector('a[href^="https"]')?.getAttribute('rel')).toBe('noopener noreferrer');
 });
 it('parses a table only when the separator row exists',()=>{
  expect(parseBlocks('| a | b |\n| c | d |')[0].type).toBe('p');
  expect(parseBlocks('| a | b |\n|---|---|\n| c | d |')[0].type).toBe('table');
 });
});
