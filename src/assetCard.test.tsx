// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {cleanup,render,within,waitFor,fireEvent} from '@testing-library/react';
import App from './App';
import {assets,parks} from './data';
import {structuralErrors,withPricing,pricingOf,emptyAsset} from './contentSchema';
import {parseContentSnapshot,publishedBundle,CONTENT_KEY} from './contentRepository';
import {assetPriceText,assetPriceParts} from './assetPrice';
import {assetDetailErrors,compactAsset,mergeMissingDetails,pickDetailKeys,ASSET_DETAIL_KEYS} from './assetFields';
import {cardSpecChips,formatHandover,formatDate,leasingBadge,leasedLast,lotCodeOf} from './assetDisplay';
import {initialAdmin} from './admin/model';
import type {IndustrialAsset} from './types';

(globalThis as any).ResizeObserver??=class{observe(){}unobserve(){}disconnect(){}};
afterEach(cleanup);
beforeEach(()=>{try{localStorage.clear();sessionStorage.clear()}catch{}});
const go=(path:string)=>window.history.pushState({},'',path);
const find=(type:string)=>assets.find(a=>a.type===type&&a.specs&&a.terms&&a.leasingStatus==='available')!;

describe('asset detail fields: schema',()=>{
 it('accepts records without any new field and validates the new ones',()=>{
  const base=emptyAsset('x');
  expect(assetDetailErrors(base)).toEqual({});
  expect(assetDetailErrors({...base,lotCode:'A-01',waterM3Day:300,specs:{clearHeightM:9,coverageMaxPct:60,builtYear:2024,dockDoors:2,leaseTermUntil:'2060-12-31'},terms:{vatIncluded:false,minLeaseYears:3},specsAsOf:'2026-11-20',gallery:[{url:'/images/a.png',approved:false}]})).toEqual({});
  const bad=assetDetailErrors({...base,lotCode:'bad code!',waterM3Day:0,leasingStatus:'x' as any,specs:{clearHeightM:-1,coverageMaxPct:101,builtYear:1800,dockDoors:1.5,leaseTermUntil:'2060-13-40'},terms:{minLeaseYears:0},specsAsOf:'soon',gallery:[{url:'javascript:1',approved:false}]});
  expect(Object.keys(bad).sort()).toEqual(['gallery.0.url','leasingStatus','lotCode','specs.builtYear','specs.clearHeightM','specs.coverageMaxPct','specs.dockDoors','specs.leaseTermUntil','specsAsOf','terms.minLeaseYears','waterM3Day'].sort());
  expect(assetDetailErrors({...base,gallery:Array.from({length:13},(_,i)=>({url:`/images/${i}.png`,approved:true}))}).gallery).toBe('gallery');
  expect(structuralErrors({...base,lotCode:'??'}).lotCode).toBe('lotCode');
 });
 it('still restores an old snapshot that has none of the new keys',()=>{
  const admin=initialAdmin(parks,assets.map(a=>({...a,gallery:undefined,specs:undefined,terms:undefined,lotCode:undefined,zone:undefined,leasingStatus:undefined,waterM3Day:undefined,specsAsOf:undefined,specsVerification:undefined})));
  const raw=JSON.stringify({version:1,revision:1,drafts:admin.drafts,audit:[],batches:[]});
  expect(()=>parseContentSnapshot(raw)).not.toThrow();
  const withNew=JSON.stringify({version:1,revision:1,drafts:initialAdmin(parks,assets).drafts,audit:[],batches:[]});
  expect(()=>parseContentSnapshot(withNew)).not.toThrow();
  expect(CONTENT_KEY).toBeTruthy();
 });
 it('exports the new public keys, only approved gallery images, and strips internal source ids',()=>{
  const a:IndustrialAsset={...find('ready_built_factory'),gallery:[{url:'/images/a.png',approved:true},{url:'/images/b.png',approved:false}],price:{...find('ready_built_factory').price,sourceDocumentId:'secret-doc'}};
  const park={...parks.find(p=>p.id===a.parkId)!,publicationStatus:'published' as const};
  const bundle=publishedBundle([{id:park.id,kind:'park',data:park,published:park,state:'published',revision:1},{id:a.id,kind:'asset',data:a,published:a,state:'published',revision:1}] as any);
  const out=bundle.assets[0] as any;
  for(const k of ['lotCode','zone','leasingStatus','specs','terms','specsAsOf','specsVerification'])expect(out[k]).toBeDefined();
  expect(out.gallery).toEqual([{url:'/images/a.png',approved:true}]);
  expect(JSON.stringify(out)).not.toContain('secret-doc');
  const none=publishedBundle([{id:park.id,kind:'park',data:park,published:park,state:'published',revision:1},{id:a.id,kind:'asset',data:a,published:{...a,gallery:[{url:'/images/b.png',approved:false}]},state:'published',revision:1}] as any);
  expect((none.assets[0] as any).gallery).toBeUndefined();
 });
 it('compactAsset drops empty detail values and keeps explicit false',()=>{
  const out=compactAsset({...emptyAsset('x'),lotCode:' ',zone:{vi:'',en:'',zh:''},gallery:[{url:'',approved:false}],specs:{dimensions:'',clearHeightM:null},terms:{vatIncluded:false,minLeaseYears:null}} as IndustrialAsset);
  expect(out.lotCode).toBeUndefined();expect(out.zone).toBeUndefined();expect(out.gallery).toBeUndefined();expect(out.specs).toBeUndefined();
  expect(out.terms).toEqual({vatIncluded:false});
 });
});

describe('apply-asset-details merge',()=>{
 const seed=pickDetailKeys(find('industrial_land'));
 it('fills missing fields on a record that has none',()=>{
  const r=mergeMissingDetails({id:'a',name:'n'} as any,seed);
  expect(r.changed).toBe(true);for(const k of ASSET_DETAIL_KEYS)if((seed as any)[k]!==undefined)expect((r.value as any)[k]).toEqual((seed as any)[k]);
 });
 it('never overwrites a non-empty value, field by field',()=>{
  const existing:any={id:'a',lotCode:'Z-9',leasingStatus:'reserved',specs:{dimensions:'1 × 1 m',coverageMaxPct:50},terms:{vatIncluded:true},zone:{vi:'Khu X',en:'',zh:''},gallery:[{url:'/images/own.png',approved:true}]};
  const r=mergeMissingDetails(existing,seed);
  expect(r.value.lotCode).toBe('Z-9');expect(r.value.leasingStatus).toBe('reserved');
  expect(r.value.specs.dimensions).toBe('1 × 1 m');expect(r.value.specs.coverageMaxPct).toBe(50);
  expect(r.value.specs.leaseTermUntil).toBe((seed.specs as any).leaseTermUntil);
  expect(r.value.terms.vatIncluded).toBe(true);expect(r.value.terms.minLeaseYears).toBe((seed.terms as any).minLeaseYears);
  expect(r.value.zone.vi).toBe('Khu X');expect(r.value.zone.en).toBe((seed.zone as any).en);
  expect(r.value.gallery).toEqual(existing.gallery);
 });
 it('is idempotent',()=>{
  const once=mergeMissingDetails({id:'a'} as any,seed).value;
  const twice=mergeMissingDetails(once,seed);
  expect(twice.changed).toBe(false);expect(twice.value).toEqual(once);
 });
 it('treats empty strings and nulls as missing',()=>{
  const r=mergeMissingDetails({id:'a',lotCode:'',waterM3Day:null,specs:{dimensions:''}} as any,seed);
  expect(r.value.lotCode).toBe(seed.lotCode);expect(r.value.specs.dimensions).toBe((seed.specs as any).dimensions);
 });
});

describe('asset display helpers',()=>{
 it('formats handover dates per language',()=>{
  expect(formatHandover('2027-02-01','vi')).toBe('02/2027');expect(formatHandover('2027-02-01','en')).toBe('Feb 2027');expect(formatHandover('2027-02-01','zh')).toBe('2027年2月');
  expect(formatHandover('2027-02-15','vi')).toBe('15/02/2027');expect(formatDate('2026-11-20','en')).toBe('20 Nov 2026');expect(formatDate('2026-11-20','zh')).toBe('2026年11月20日');
  expect(formatHandover('','vi')).toBe('');expect(formatHandover('not a date','vi')).toBe('');
 });
 it('shows a status only when one is stated or a future date is published',()=>{
  const now=new Date('2026-11-27');
  expect(leasingBadge({leasingStatus:'available',availableFrom:'2027-01-01'},'vi',now)?.label).toBe('Còn trống');
  expect(leasingBadge({leasingStatus:'leased',availableFrom:''},'vi',now)?.tone).toBe('');
  expect(leasingBadge({leasingStatus:'unknown',availableFrom:''},'vi',now)).toBeNull();
  expect(leasingBadge({availableFrom:'2020-01-01'},'vi',now)).toBeNull();
  expect(leasingBadge({availableFrom:'2027-04-01'},'vi',now)?.label).toBe('Sắp có · 04/2027');
 });
 it('chooses at most three chips by type and skips empty values',()=>{
  const land=find('industrial_land'),fac=find('ready_built_factory');
  expect(cardSpecChips(land,'vi')).toHaveLength(3);expect(cardSpecChips(land,'vi')[0]).toMatch(/^Điện .* MVA$/);
  expect(cardSpecChips(fac,'vi')[0]).toMatch(/^Cao /);expect(cardSpecChips(fac,'vi').length).toBeLessThanOrEqual(3);
  const bare={...land,specs:undefined,waterM3Day:undefined,powerMva:undefined as any,availableFrom:''};
  expect(cardSpecChips(bare,'vi')).toEqual([]);
 });
 it('sorts leased assets last and resolves the lot code',()=>{
  const list=[{id:'1',leasingStatus:'leased'},{id:'2'},{id:'3',leasingStatus:'leased'},{id:'4'}] as any[];
  expect(leasedLast(list).map(a=>a.id)).toEqual(['2','4','1','3']);
  expect(lotCodeOf({id:'a',lotCode:' B-2 '})).toBe('B-2');
  expect(lotCodeOf({id:'a'},{masterplan:{plots:[{assetId:'a',code:'A-03'}]}} as any)).toBe('A-03');
  expect(lotCodeOf({id:'a'})).toBe('');
 });
 it('price labels cover specific, negotiable, not available and not disclosed',()=>{
  const a=find('industrial_land');
  expect(assetPriceText(a,'vi')).toMatch(/USD\/m²\/kỳ thuê$/);
  const priced=withPricing(a,pricingOf(a)),p=assetPriceParts(priced,'vi');expect(p.amount+p.basis).toBe(assetPriceText(priced,'vi'));expect(p.specific).toBe(true);
  const set=(mode:any)=>withPricing(a,{mode,amount:null,currency:'USD',areaBasis:'m²',period:'month'});
  expect(assetPriceText(set('negotiable'),'vi')).toBe('Thỏa thuận');
  expect(assetPriceText(set('not_available'),'vi')).toBe('Chưa có thông tin');
  const hidden=withPricing({...a,price:{...a.price,value:null,disclosureStatus:'not_disclosed'}},{mode:'not_available',amount:null,currency:'USD',areaBasis:'m²',period:'month'});
  expect(hidden.price.disclosureStatus).toBe('not_disclosed');
  expect(assetPriceText(hidden,'vi')).toBe('Không công bố');expect(assetPriceText(hidden,'en')).toBe('Not disclosed');
  expect(assetPriceText(assets[0],'vi')).toBe('Không công bố');
 });
});

describe('asset card and detail page',()=>{
 it('renders the card content per type, with two actions and honest empties',async()=>{
  go('/assets');const {container}=render(<App/>);
  await waitFor(()=>expect(container.querySelectorAll('.asset-card').length).toBeGreaterThan(10));
  const cards=[...container.querySelectorAll<HTMLElement>('.asset-card')];
  const land=cards.find(c=>/Lô đất công nghiệp 2\b/.test(c.textContent||''))!;
  expect(land.querySelector('.asset-lot-code')?.textContent).toContain('A-01');
  expect(within(land).getByText('Còn trống')).toBeTruthy();
  expect(land.textContent).toMatch(/Điện 5 MVA/);expect(land.textContent).toMatch(/Nước 300 m³\/ngày/);expect(land.textContent).toMatch(/Bàn giao 02\/2027/);
  expect(land.textContent).toContain('chưa gồm VAT');expect(land.textContent).not.toMatch(/2027-02-01/);
  const links=[...land.querySelectorAll('.asset-card-actions a')];
  expect(links).toHaveLength(2);expect(links[0].textContent).toContain('Xem chi tiết');expect(links[0].getAttribute('href')).toBe('/assets/asset-2');expect(links[1].textContent).toContain('Hỏi thuê');
  expect(land.textContent).not.toMatch(/Trao đổi|Mua|Bán\b|\b0 (m|ha)/);
  // the asset without specs only shows what exists
  const bare=cards.find(c=>/Lô đất công nghiệp 6\b/.test(c.textContent||''))!;
  expect(bare.querySelector('.asset-card-specs')?.textContent).not.toMatch(/Nước/);
  // leased cards: grey badge, similar-asset link, listed after the others
  const leased=container.querySelectorAll('.asset-card[data-leasing-status="leased"]');
  expect(leased.length).toBe(2);
  const order=cards.map(c=>c.getAttribute('data-leasing-status'));
  expect(order.lastIndexOf(null as any)).toBeLessThan(order.indexOf('leased'));
  expect(within(leased[0] as HTMLElement).getByText('Tìm mặt bằng tương tự')).toBeTruthy();
  expect(container.textContent).toContain('Không công bố'.slice(0,0));
 });
 it('renders the detail sections in order and hides empty ones',async()=>{
  const a=find('ready_built_factory');go(`/assets/${a.id}`);const {container}=render(<App/>);
  await waitFor(()=>expect(container.querySelector('.asset-detail-v2')).toBeTruthy());
  expect(container.querySelectorAll('h1')).toHaveLength(1);
  const ids=[...container.querySelectorAll('.asset-detail-section')].map(s=>s.id);
  expect(ids.slice(0,3)).toEqual(['asset-specs','asset-infrastructure','asset-industries']);
  expect(ids[ids.length-1]).toBe('asset-others');
  expect(container.querySelector('.asset-offer')?.textContent).toMatch(/Thuê tối thiểu/);
  expect(container.querySelector('.asset-offer')?.textContent).toContain('Giá tham khảo; VSIP xác nhận khi báo giá.');
  expect(container.querySelectorAll('.asset-gallery-thumbs li').length).toBeGreaterThan(1);
  expect(container.querySelector('.breadcrumbs a[href$="?tab=assets"]')).toBeTruthy();
  cleanup();
  const bare=assets.find(x=>!x.specs&&x.type==='industrial_land')!;go(`/assets/${bare.id}`);
  const second=render(<App/>);
  await waitFor(()=>expect(second.container.querySelector('.asset-detail-v2')).toBeTruthy());
  expect(second.container.querySelector('#asset-specs')).toBeNull();
  expect(second.container.querySelector('.asset-gallery-thumbs')).toBeNull();
  expect(second.container.textContent).not.toMatch(/Chưa có thông tin: /);
 });
 it('opens the "Mặt bằng" tab for #park-assets and ?tab=assets',async()=>{
  const p=parks.find(x=>x.id==='park-demo-02')!;
  for(const url of [`/industrial-parks/${p.slug}#park-assets`,`/industrial-parks/${p.slug}?tab=assets`]){
   go(url);const {container,unmount}=render(<App/>);
   await waitFor(()=>expect(container.querySelector('.detail-page.assets')).toBeTruthy());
   expect(container.querySelector('.park-primary-tabs button.active')?.textContent).toMatch(/Mặt bằng/);
   unmount();sessionStorage.clear();
  }
  go(`/industrial-parks/${p.slug}`);const plain=render(<App/>);
  await waitFor(()=>expect(plain.container.querySelector('.detail-page.information')).toBeTruthy());
 });
 it('has VI, EN and ZH copy for the card (no raw keys)',async()=>{
  go('/assets');const {container}=render(<App/>);
  await waitFor(()=>expect(container.querySelector('.asset-card')).toBeTruthy());
  const select=container.querySelector<HTMLSelectElement>('.language-select select')!;
  for(const [lang,view] of [['en','View details'],['zh','查看详情']] as const){
   fireEvent.change(select,{target:{value:lang}});
   await waitFor(()=>expect(container.querySelector('.asset-card-actions a')?.textContent).toContain(view));
   expect(container.querySelector('.asset-card')?.textContent).not.toMatch(/undefined|\[object/);
  }
 });
});
