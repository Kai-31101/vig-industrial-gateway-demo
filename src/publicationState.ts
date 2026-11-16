/**
 * Single source of truth for "is this record visible on the public site?".
 * Mirrors publishedBundle(): a park is live when its published snapshot has publicationStatus 'published';
 * an asset is live when it has a published lease snapshot AND its parent park is live.
 */
type Rec={id:string;kind:string;state:string;data?:any;published?:any};
export function liveIds(drafts:Rec[]){
 const parks=new Set(drafts.filter(d=>d.kind==='park'&&d.published&&d.published.publicationStatus==='published').map(d=>d.id));
 const assets=new Set(drafts.filter(d=>d.kind==='asset'&&d.published&&d.published.transaction==='lease'&&parks.has(d.published.parkId)).map(d=>d.id));
 return {parks,assets,has:(d:Rec)=>(d.kind==='park'?parks:assets).has(d.id)};
}
/** Published/draft split used by the dashboard and the manager AI. */
export function catalogueSplit(drafts:Rec[]){
 const live=liveIds(drafts);
 const draftOnly=drafts.filter(d=>!live.has(d)),pending=new Set(drafts.filter(d=>live.has(d)&&d.state!=='published').map(d=>d.id));
 const count=(kind:string)=>{const all=drafts.filter(d=>d.kind===kind),hidden=all.filter(d=>!live.has(d));return {total:all.length,published:all.length-hidden.length,draft:hidden.length,publishedWithPendingChanges:all.filter(d=>pending.has(d.id)).length,hiddenByDraftPark:kind==='asset'?hidden.filter(d=>d.published&&!live.parks.has(d.published.parkId)).length:0,draftNames:hidden.slice(0,10).map(d=>d.data?.name)}};
 return {live,draftOnly,pending,summary:{parks:count('park'),assets:count('asset')}};
}
