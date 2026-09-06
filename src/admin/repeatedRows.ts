// Stable identities belong to draft rows, not spreadsheet positions.
export function identifyRows<T>(value:T):T {
 if(Array.isArray(value))return value.map(item=>item&&typeof item==='object'?{...identifyRows(item),_rowId:(item as any)._rowId||(item as any).id||crypto.randomUUID()}:item) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,identifyRows(item)])) as T;
 return value;
}
const protectedKeys=new Set(['__proto__','constructor','prototype','publicationStatus','verificationStatus','visibility','approved','imageApproved','verifiedBy','lastVerifiedAt','conflicts','payment']);
export function importSafe(value:any):any {
 if(Array.isArray(value))return value.map(importSafe);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!protectedKeys.has(k)).map(([k,v])=>[k,importSafe(v)]));
 return value;
}
export function mergeImported(before:any,patch:any,template?:any):any {
 if(patch===null||patch==='')return before;
 if(Array.isArray(patch)){
  const rows=Array.isArray(before)?structuredClone(before):[];
  if(patch.every(x=>typeof x==='string'))return [...new Set([...rows,...patch])];
  const seen=new Set<string>();
  for(const item of patch){
   if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('row');
   const key=item._rowId||item.id;
   if(typeof key!=='string'||!key.trim()||seen.has(key))throw new Error('row_id');
   seen.add(key);
   const index=rows.findIndex((r:any)=>(r._rowId||r.id)===key);
   const merged=mergeImported(index<0?(template||{}):rows[index],item);
   if(index<0)rows.push({...merged,_rowId:key});else rows[index]=merged;
  }
  return rows;
 }
 if(patch&&typeof patch==='object'){
  const next={...before};
  for(const [key,v] of Object.entries(patch)){
   if(protectedKeys.has(key))throw new Error('protected_field');
   next[key]=mergeImported(next[key],v);
  }
  return next;
 }
 return patch;
}
