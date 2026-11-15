// Stable deployment identity shared by the browser and deployment preparation script.
export function contentFingerprint(value:unknown):string {
 const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 const source=JSON.stringify(canonical(value));let hash=2166136261;for(let i=0;i<source.length;i++)hash=Math.imul(hash^source.charCodeAt(i),16777619);return 'content-'+(hash>>>0).toString(16);
}
