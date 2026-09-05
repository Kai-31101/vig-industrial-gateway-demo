import ExcelJS from 'exceljs';
import {parks,assets} from '../data';
import {newContent,blank} from './ContentEditor';
import {contentErrors,type Draft,type ImportRow,type Content,type ContentKind} from './model';
export const IMPORT_VERSION='VIG-DEMO-1';
export const IMPORT_LIMITS={bytes:5*1024*1024,rows:500};
export function flatten(value:any,path=''):Record<string,unknown>{
  if(value&&typeof value==='object'){return Object.fromEntries(Object.entries(value).filter(([k])=>!['conflicts','payment','publicationStatus','id','verifiedBy','lastVerifiedAt','verificationStatus','visibility','approved','imageApproved'].includes(k)).flatMap(([k,v])=>Object.entries(flatten(v,path?`${path}.${k}`:k))))}
  return {[path]:value};
}
export const importColumns={Parks:['action','id',...Object.keys(flatten(parks[0]))],Products:['action','id',...Object.keys(flatten(assets[0]))]};
function setPath(root:any,path:string,value:unknown,sample:any){const keys=path.split('.');let obj=root,shape=sample;keys.slice(0,-1).forEach((key,index)=>{shape=shape?.[key];if(obj[key]==null)obj[key]=shape&&typeof shape==='object'?blank(shape):/^\d+$/.test(keys[index+1])?[]:{};obj=obj[key]});obj[keys.at(-1)!]=value;}
export async function templateWorkbook(mode:string,sample=false){const wb=new ExcelJS.Workbook();const info=wb.addWorksheet('Instructions');info.addRows([[IMPORT_VERSION],['DEMO ONLY: 5 MB / 500 rows. Production limits require approval.'],['Empty update cells retain saved values. Import creates drafts only.'],['Parks before Products. Use explicit IDs; no fuzzy name matching.'],['Review full records in VIG before publishing. No verification can be imported.']]);
  for(const name of (mode==='both'?['Parks','Products']:[mode]) as ('Parks'|'Products')[]){const ws=wb.addWorksheet(name);ws.addRow(importColumns[name]);ws.getRow(1).font={bold:true};ws.views=[{state:'frozen',ySplit:1}];ws.columns.forEach(c=>c.width=23);
    if(sample){const row:Record<string,string>={action:'create',id:name==='Parks'?'demo-import-park':'demo-import-product','name.vi':name==='Parks'?'KCN minh họa mới':'Nhà xưởng minh họa','name.en':name==='Parks'?'Demo industrial park':'Demo factory','name.zh':name==='Parks'?'演示园区':'演示厂房',parkId:'demo-import-park'};if(name==='Products'){row.area='12000';row.unit='m²';row.type='ready_built_factory';row.transaction='lease'}ws.addRow(importColumns[name].map(k=>row[k]||''));}
  }return wb;
}
export async function readImport(file:File,drafts:Draft[],mode:string):Promise<ImportRow[]>{
  if(!file.name.toLowerCase().endsWith('.xlsx')||file.size>IMPORT_LIMITS.bytes)throw new Error('file');
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(await file.arrayBuffer());
  if(wb.getWorksheet('Instructions')?.getCell('A1').text!==IMPORT_VERSION)throw new Error('template');
  const names=(mode==='both'?['Parks','Products']:[mode]) as ('Parks'|'Products')[];const rows:ImportRow[]=[];
  for(const sheet of names){const ws=wb.getWorksheet(sheet);if(!ws)throw new Error('template');const headers=importColumns[sheet];if(ws.getRow(1).cellCount!==headers.length||headers.some((h,i)=>ws.getRow(1).getCell(i+1).text!==h))throw new Error('template');if(ws.rowCount>IMPORT_LIMITS.rows+1)throw new Error('limit');
    ws.eachRow((row,n)=>{if(n===1)return;const values:Record<string,string>={},errors:string[]=[];headers.forEach((key,i)=>{const c=row.getCell(i+1);if(c.type===ExcelJS.ValueType.Formula||c.type===ExcelJS.ValueType.Hyperlink)errors.push(key+': formula/link object');values[key]=c.text.trim()});if(!Object.values(values).some(Boolean))return;
      const id=values.id,action=values.action as 'create'|'update',old=drafts.find(d=>d.id===id),kind:ContentKind=sheet==='Parks'?'park':'asset';
      if(!id||!['create','update'].includes(action))errors.push('id/action');if(action==='create'&&old||action==='update'&&(!old||old.kind!==kind))errors.push('record');
      const after=structuredClone(old?.data||newContent(kind,id));const schema=flatten(sheet==='Parks'?parks[0]:assets[0]);
      for(const key of headers.slice(2)){const v=values[key];if(!v)continue;const shape=schema[key];let parsed:unknown=v;if(typeof shape==='number'){parsed=Number(v);if(!Number.isFinite(parsed))errors.push(key)}if(typeof shape==='boolean'){if(!['true','false'].includes(v))errors.push(key);parsed=v==='true'}setPath(after,key,parsed,sheet==='Parks'?parks[0]:assets[0]);}
      errors.push(...Object.keys(contentErrors(after)));rows.push({sheet,row:n,id,action,parkId:(after as any).parkId||'',values,errors,warnings:['Draft only; review required'],before:old?.data,after:after as Content,revision:old?.revision});
    });
  }
  if(rows.length>IMPORT_LIMITS.rows)throw new Error('limit');
  for(const row of rows){if(rows.filter(r=>r.id===row.id).length>1)row.errors.push('duplicate');}
  for(const row of rows.filter(r=>r.sheet==='Products')){const parent=rows.find(r=>r.sheet==='Parks'&&r.id===row.parkId);if(parent?.errors.length||!parent&&!drafts.some(d=>d.kind==='park'&&d.id===row.parkId))row.errors.push('parkId');}
  return rows;
}
export async function downloadWorkbook(wb:ExcelJS.Workbook,name:string){const bytes=await wb.xlsx.writeBuffer();const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function fileFingerprint(file:File){const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
