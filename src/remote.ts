export const remoteEnabled=import.meta.env.MODE!=='test'&&import.meta.env.VITE_DATA_BACKEND==='neon';
export async function api<T=any>(path:string,body?:unknown):Promise<T>{const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(path.startsWith('ai/')?110000:45000)});const j=await r.json();if(!r.ok)throw new Error(j.error||'server');return j}
let opening:Promise<any>|undefined;
export function ensureSession(){if(!opening)opening=api('session',{}).finally(()=>{opening=undefined});return opening}
