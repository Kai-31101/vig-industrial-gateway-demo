// Guards the checkbox/radio root cause found on 2026-11-17: text-field rules (min-height, padding, full width) must
// never match checkbox/radio glyphs, and control labels must be inline rows with a compact, non-stretching glyph.
import {describe,expect,it} from 'vitest';
import fs from 'fs';
const css=(f:string)=>fs.readFileSync(f,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const rules=(src:string)=>[...src.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m=>({sel:m[1].trim(),body:m[2]}));
const styles=css('src/styles.css'),admin=css('src/admin/admin.css'),mobile=css('src/mobile.css');

describe('checkbox/radio control alignment',()=>{
 it('public text-field sizing never applies to checkbox/radio glyphs',()=>{
  const sized=rules(styles).filter(r=>/\.request-form input\b/.test(r.sel)&&/min-height\s*:\s*var\(--control-h\)|padding\s*:\s*10px 12px/.test(r.body));
  expect(sized.length).toBeGreaterThan(0);
  for(const r of sized)for(const part of r.sel.split(',').filter(p=>/\.request-form input/.test(p)))expect(part).toMatch(/:not\(\[type=checkbox\]\):not\(\[type=radio\]\)/);
 });
 it('public checkbox glyph is compact and fixed, label is an inline first-line-aligned row at every width',()=>{
  const glyph=rules(styles).find(r=>r.sel==='.request-form label > input[type=checkbox]');
  expect(glyph?.body).toMatch(/flex:\s*none/);expect(glyph?.body).toMatch(/width:\s*18px/);expect(glyph?.body).toMatch(/height:\s*18px/);expect(glyph?.body).toMatch(/min-height:\s*0/);expect(glyph?.body).toMatch(/padding:\s*0/);
  const row=rules(styles).find(r=>r.sel==='.request-form label:has(> input[type=checkbox])');
  expect(row?.body).toMatch(/flex-direction:\s*row/);expect(row?.body).toMatch(/align-items:\s*flex-start/);
  // no phone-only override that re-centres the glyph (multi-line consent drifted 10px)
  expect(mobile).not.toMatch(/\.request-form input\[type=checkbox\]\s*\{[^}]*align-self:\s*center/);
 });
 it('admin text-field sizing never applies to radios or checkboxes',()=>{
  const field=rules(admin).find(r=>r.sel.includes('.workflow-page input:not(')&&/min-height:\s*44px/.test(r.body));
  expect(field).toBeTruthy();
  for(const part of field!.sel.split(',').filter(p=>/\.(workflow-page|admin-confirm) input/.test(p)))expect(part).toMatch(/:not\(\[type=checkbox\]\):not\(\[type=radio\]\)/);
 });
 it('admin control-first and boolean-field labels are rows; the permission matrix keeps its own cell layout',()=>{
  expect(admin).toMatch(/label:not\(\[data-field-path\]\):not\(\.matrix-check\):has\(> input:is\(\[type=checkbox\],\[type=radio\]\):first-child\)\{flex-direction:row;align-items:flex-start/);
  expect(admin).toMatch(/label\[data-field-path\]:has\(> input\[type=checkbox\]\)\{display:flex;flex-direction:row/);
  expect(admin).toMatch(/label\[data-field-path\] > input\[type=checkbox\]\{order:-1/);
 });
});
