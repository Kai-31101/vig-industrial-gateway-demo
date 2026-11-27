// Park-scoped content access for the portal. Scope rule (approved design §4):
//   profile  -> content_items kind='park'  AND id = :parkId      (park_id is NULL on park rows)
//   property -> content_items kind='asset' AND park_id = :parkId
// All reads/writes happen in the authoritative portal workspace (default `internal`) under RLS.
import type {PoolClient} from 'pg';
import {ApiError} from '../db';
import {fieldsFor} from '../../src/portal/fields';
import {contentErrors,publicationIssues,type Draft} from '../../src/admin/model';
import {emptyAsset,emptyPark,withPricing,pricingOf} from '../../src/contentSchema';
import {compactAsset} from '../../src/assetFields';
import {publishedBundle} from '../../src/contentRepository';
import type {IndustrialAsset,IndustrialParkProfile} from '../../src/types';

export type Kind='park'|'asset';
export const workspace=()=>process.env.PORTAL_WORKSPACE||'internal';
export const notFound=()=>new ApiError(404,'not_found');
export async function useWorkspace(c:PoolClient){await c.query("SELECT set_config('app.workspace_id',$1,true)",[workspace()])}

export interface EntityRow{kind:Kind;id:string;park_id:string|null;revision:number;state:string;payload:any;published_payload:any;fingerprint:string}
export interface Meta{published_version:number;published_fingerprint:string;archived:boolean}

export async function parkRow(c:PoolClient,parkId:string){
 if(typeof parkId!=='string'||!/^[a-z0-9][a-z0-9-]{0,80}$/.test(parkId))return null;
 const r=await c.query(`SELECT id,payload->'name' AS name FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' AND id=$2`,[workspace(),parkId]);
 return r.rows[0] as {id:string;name:{vi:string;en:string}}|undefined||null;
}
/** Loads an entity only if it belongs to `parkId`; otherwise the neutral not-found. */
export async function entityRow(c:PoolClient,parkId:string,kind:Kind,id:string,lock=false):Promise<EntityRow|null>{
 if(kind==='park'&&id!==parkId)return null;
 const r=await c.query(`SELECT kind,id,park_id,revision,state,payload,published_payload,coalesce(md5(published_payload::text),'') AS fingerprint FROM vsip.content_items
  WHERE workspace_id=$1 AND kind=$2 AND id=$3 AND ${kind==='park'?'park_id IS NULL':'park_id=$4'}${lock?' FOR UPDATE':''}`,kind==='park'?[workspace(),kind,id]:[workspace(),kind,id,parkId]);
 return r.rows[0]||null;
}
/** Portal version counter; detects publishes made outside the portal (fingerprint change) and bumps once. */
export async function syncMeta(c:PoolClient,parkId:string,row:EntityRow):Promise<Meta>{
 const pub=row.published_payload?1:0;
 await c.query(`INSERT INTO vsip.portal_entity_meta(entity_kind,entity_id,park_id,published_version,published_fingerprint) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[row.kind,row.id,parkId,pub,row.fingerprint]);
 const m=(await c.query(`SELECT published_version,published_fingerprint,archived FROM vsip.portal_entity_meta WHERE entity_kind=$1 AND entity_id=$2 FOR UPDATE`,[row.kind,row.id])).rows[0] as Meta;
 if(m.published_fingerprint!==row.fingerprint){const v=m.published_version+1;await c.query(`UPDATE vsip.portal_entity_meta SET published_version=$3,published_fingerprint=$4,archived=false WHERE entity_kind=$1 AND entity_id=$2`,[row.kind,row.id,v,row.fingerprint]);return {published_version:v,published_fingerprint:row.fingerprint,archived:false}}
 return m;
}

const set=(o:any,path:string,v:unknown)=>{const ks=path.split('.');let t=o;for(const k of ks.slice(0,-1)){if(t[k]==null||typeof t[k]!=='object')t[k]={};t=t[k]}t[ks[ks.length-1]]=v};
/** Applies an allowlisted flat patch. Unknown keys or invalid selections -> 400. */
export function applyPatch(kind:Kind,base:any,patch:unknown,images:string[]=[]){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new ApiError(400,'validation');
 const defs=fieldsFor(kind);const data=structuredClone(base);const errors:Record<string,string>={};
 for(const [key,raw] of Object.entries(patch as Record<string,unknown>)){
  const f=defs.find(d=>d.key===key);if(!f){errors[key]='unknown';continue}
  if(typeof raw!=='string'||raw.length>(f.kind==='textarea'?4000:300)){errors[key]='length';continue}
  const v=raw.trim();
  if(f.kind==='select'&&!f.options!.some(o=>o[0]===v)){errors[key]='selection';continue}
  if(key==='terms.vatIncluded'){set(data,key,v===''?undefined:v==='true');continue}
  if(f.kind==='number'){if(v===''){if(f.required){errors[key]='required';continue}set(data,key==='totalArea'?'totalArea.value':key,null);continue}const n=Number(v.replace(',','.'));if(!Number.isFinite(n)||n<=0){errors[key]='positive';continue}set(data,key==='totalArea'?'totalArea.value':key,n);continue}
  if(f.kind==='list'){const items=v?v.split(',').map(x=>x.trim()).filter(Boolean):[];if(items.length>20||items.some(x=>x.length>80||/[<>]/.test(x))){errors[key]='list';continue}set(data,key,[...new Set(items)]);continue}
  if(f.kind==='image'){if(!images.includes(v)){errors[key]='image';continue}data.image=v;data.imageApproved=true;continue}
  if(f.kind==='date'&&v&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v)))){errors[key]='date';continue}
  if(key.startsWith('contact.')&&data.contact==null)data.contact=structuredClone(emptyPark('').contact);
  set(data,key,v);
 }
 if(Object.keys(errors).length)throw Object.assign(new ApiError(400,'validation'),{fields:errors});
 const out=kind==='asset'?compactAsset(withPricing(data as IndustrialAsset,(data as IndustrialAsset).pricing??pricingOf(data as IndustrialAsset))):data;
 const ce=contentErrors(out,base);if(Object.keys(ce).length)throw Object.assign(new ApiError(400,'validation'),{fields:ce});
 return out;
}
export function newAsset(parkId:string,id:string){const a=emptyAsset(id);a.parkId=parkId;return a}

/** All drafts of the portal workspace, in the admin Draft shape (for publication rules and the public bundle). */
export async function allDrafts(c:PoolClient):Promise<Draft[]>{
 const rows=(await c.query(`SELECT kind,id,revision,state,payload,published_payload,updated_at,updated_by FROM vsip.content_items WHERE workspace_id=$1 ORDER BY kind DESC,id`,[workspace()])).rows;
 return rows.map(r=>({id:r.id,kind:r.kind,revision:r.revision,state:r.state,data:r.payload,...(r.published_payload?{published:r.published_payload}:{}),updatedAt:r.updated_at.toISOString(),updatedBy:r.updated_by}));
}
/** Publication gate: a new property must be fully publishable; an update may not introduce new issues. */
export function publicationGate(kind:Kind,after:any,before:any,drafts:Draft[]){
 const others=drafts.filter(d=>!(d.kind===kind&&d.id===after.id));
 const now=new Set(publicationIssues(after,[...others,{id:after.id,kind,data:after,revision:1,state:'draft',updatedAt:'',updatedBy:'',...(before?{published:before}:{})}]));
 if(!before)return [...now];
 const prior=new Set(publicationIssues(before,drafts));return [...now].filter(i=>!prior.has(i));
}
export function bundleFrom(drafts:Draft[]){return publishedBundle(drafts)}
/** Images a park may reuse for its properties: approved park media and already-approved property images. */
export async function parkImages(c:PoolClient,parkId:string):Promise<string[]>{
 const park=(await c.query(`SELECT coalesce(published_payload,payload) AS p FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' AND id=$2`,[workspace(),parkId])).rows[0]?.p;
 const media=(park?.media||[]).filter((m:any)=>m.approved&&m.url&&m.type!=='video').map((m:any)=>String(m.url));
 const assets=(await c.query(`SELECT DISTINCT coalesce(published_payload,payload)->>'image' AS u FROM vsip.content_items WHERE workspace_id=$1 AND kind='asset' AND park_id=$2 AND coalesce(published_payload,payload)->>'imageApproved'='true'`,[workspace(),parkId])).rows.map(r=>r.u).filter(Boolean);
 return [...new Set([...media,...assets])].filter(u=>/^\/images\/[\w./-]+$|^https:\/\/[^\s]+$/.test(u)).slice(0,40);
}
export const nameOf=(p:any)=>String(p?.name?.vi||p?.name?.en||p?.id||'');
export type {IndustrialParkProfile,IndustrialAsset};
