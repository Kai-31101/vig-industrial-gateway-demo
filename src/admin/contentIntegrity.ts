import type {Content} from './model';
export function sameContent(a:unknown,b:unknown):boolean {
 const clean=(v:any):any=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).filter(k=>k!=='_rowId').sort().map(k=>[k,clean(v[k])])):v;
 return JSON.stringify(clean(a))===JSON.stringify(clean(b));
}
// Approval belongs to the content that was reviewed, never to a replaceable row ID.
export function invalidateChangedApprovals(next:Content,previous?:Content):Content {
 const result=structuredClone(next);
 if('slug'in result){const old=previous&&'slug'in previous?previous:undefined;
 result.media=result.media.map(m=>{const prior=old?.media.find(x=>x.id===m.id);return prior&&!sameContent([prior.url,prior.type],[m.url,m.type])?{...m,approved:false}:m});
 result.documents=result.documents.map(d=>{const prior=old?.documents.find(x=>x.id===d.id);const identity=(x:typeof d)=>[x.sourceUrl,x.documentNumber,x.title,x.issuer,x.issueDate,x.category];return prior&&!sameContent(identity(prior),identity(d))?{...d,verificationStatus:'unverified',visibility:'admin_only'}:d});
 }else if(previous&&!('slug'in previous)&&previous.image!==result.image)result.imageApproved=false;
 return result;
}
