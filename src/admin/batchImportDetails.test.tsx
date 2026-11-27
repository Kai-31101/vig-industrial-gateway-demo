// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import ExcelJS from 'exceljs';
import {initialAdmin} from './model';
import {parks,assets} from '../data';
import {templateWorkbook,readImport,draftWorkbook,importColumns,ASSET_DETAIL_COLUMNS} from './workbooks';

const toFile=(buffer:ArrayBuffer|ExcelJS.Buffer,name='x.xlsx')=>({name,size:(buffer as ArrayBuffer).byteLength,arrayBuffer:async()=>buffer} as unknown as File);
const store=()=>initialAdmin(parks,assets);
const products=(wb:ExcelJS.Workbook)=>wb.getWorksheet('Products')!;
const cell=(wb:ExcelJS.Workbook,header:string,value:string|number,row=2)=>{const ws=products(wb);const col=(ws.getRow(1).values as string[]).indexOf(header);expect(col).toBeGreaterThan(0);ws.getRow(row).getCell(col).value=value};

describe('batch import: asset detail columns',()=>{
  it('the template lists the new asset columns with clear dotted headers and keeps the original ones',()=>{
    for(const h of ['lotCode','zone.vi','zone.en','zone.zh','leasingStatus','waterM3Day','specs.clearHeightM','specs.floorLoadTonM2','specs.dockDoors','specs.fireSystem.vi','terms.vatIncluded','terms.minLeaseYears','terms.paymentNote.en','specsAsOf'])expect(importColumns.Products).toContain(h);
    for(const h of ['gallery','specsVerification'])expect(importColumns.Products).not.toContain(h);
    expect(importColumns.Products.slice(0,3)).toEqual(['action','id','parkId']);
    expect(ASSET_DETAIL_COLUMNS.length).toBeGreaterThan(20);
  });
  it('imports a sample row that fills the new columns, with parsed types and no errors',async()=>{
    const s=store(),wb=await templateWorkbook('both',true);
    const rows=await readImport(toFile(await wb.xlsx.writeBuffer()),s.drafts,'both');
    expect(rows.flatMap(r=>r.errors)).toEqual([]);
    const a:any=rows.find(r=>r.sheet==='Products')!.after;
    expect(a.lotCode).toBe('DEMO-01');expect(a.leasingStatus).toBe('available');expect(a.zone.vi).toBe('Khu A');
    expect(a.specs.clearHeightM).toBe(10);expect(a.specs.floorLoadTonM2).toBe(3);expect(a.terms.vatIncluded).toBe(false);expect(a.terms.minLeaseYears).toBe(3);
    expect(a.specs.dockDoors).toBeUndefined();expect(a.gallery).toBeUndefined();
  });
  it('validates new values with the same validators as the editor', async()=>{
    const wb=await templateWorkbook('both',true);
    cell(wb,'leasingStatus','maybe');cell(wb,'specs.clearHeightM','-4');cell(wb,'lotCode','bad code!');cell(wb,'terms.vatIncluded','yes');cell(wb,'waterM3Day','abc');cell(wb,'specsAsOf','2026-13-45');
    const rows=await readImport(toFile(await wb.xlsx.writeBuffer()),store().drafts,'both');
    const errs=rows.find(r=>r.sheet==='Products')!.errors.join(' ');
    for(const key of ['leasingStatus','specs.clearHeightM','lotCode','terms.vatIncluded','waterM3Day','specsAsOf'])expect(errs).toContain(key);
  });
  it('a legacy file without the new columns still imports',async()=>{
    const full=await templateWorkbook('both',true),src=products(full);
    const baseCount=(src.getRow(1).values as string[]).indexOf('lotCode')-1;
    const wb=new ExcelJS.Workbook();wb.addWorksheet('Instructions').addRow([full.getWorksheet('Instructions')!.getCell('A1').text]);
    wb.addWorksheet('Parks').addRows(full.getWorksheet('Parks')!.getRows(1,2)!.map(r=>(r.values as unknown[]).slice(1)));
    wb.addWorksheet('Products').addRows(src.getRows(1,2)!.map(r=>(r.values as unknown[]).slice(1,baseCount+1)));
    expect(products(wb).getRow(1).cellCount).toBe(baseCount);
    const rows=await readImport(toFile(await wb.xlsx.writeBuffer()),store().drafts,'both');
    expect(rows.flatMap(r=>r.errors)).toEqual([]);
    const a:any=rows.find(r=>r.sheet==='Products')!.after;expect(a.lotCode).toBeUndefined();expect(a.specs).toBeUndefined();expect(a.terms).toBeUndefined();
  });
  it('rejects an unknown or repeated extra column and keeps old header strictness', async()=>{
    const wb=await templateWorkbook('both',true);products(wb).getRow(1).getCell(products(wb).getRow(1).cellCount+1).value='mystery';
    await expect(readImport(toFile(await wb.xlsx.writeBuffer()),store().drafts,'both')).rejects.toThrow('template');
    const wb2=await templateWorkbook('both',true);products(wb2).getRow(1).getCell(4).value='renamed';
    await expect(readImport(toFile(await wb2.xlsx.writeBuffer()),store().drafts,'both')).rejects.toThrow('template');
  });
  it('exports the current drafts with the new columns and round-trips an update', async()=>{
    const s=store();const d:any=s.drafts.find(x=>x.kind==='asset')!;d.data.lotCode='Z-1';d.data.specs={clearHeightM:9};
    const wb=await draftWorkbook('Products',s.drafts);
    const ws=products(wb),hdr=ws.getRow(1).values as string[];
    const row=ws.getRows(2,ws.rowCount)!.find(r=>r.getCell(2).text===d.id)!;
    expect(row.getCell(hdr.indexOf('lotCode')).text).toBe('Z-1');expect(row.getCell(hdr.indexOf('specs.clearHeightM')).text).toBe('9');
    const rows=await readImport(toFile(await wb.xlsx.writeBuffer()),s.drafts,'Products');
    const back:any=rows.find(r=>r.id===d.id)!;expect(back.errors).toEqual([]);expect(back.after.lotCode).toBe('Z-1');expect(back.after.specs.clearHeightM).toBe(9);
  });
});
