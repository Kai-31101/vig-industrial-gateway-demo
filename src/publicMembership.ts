import {parks,assets} from './data';
const parkIds=new Set(parks.map(p=>p.id)),assetIds=new Set(assets.map(a=>a.id));
export const publicParkMember=(id:string)=>parkIds.has(id);
export const publicAssetMember=(id:string)=>assetIds.has(id);
export function registerPublished(kind:'park'|'asset',id:string){(kind==='park'?parkIds:assetIds).add(id);}
export function unregisterPublished(kind:'park'|'asset',id:string){(kind==='park'?parkIds:assetIds).delete(id);}
export function resetMembership(){parkIds.clear();assetIds.clear();parks.forEach(p=>parkIds.add(p.id));assets.forEach(a=>assetIds.add(a.id));}
