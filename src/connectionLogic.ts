import type {ConnectionOutcome,IndustrialRequest} from './types';
export const successfulConnection=(r:IndustrialRequest)=>r.status==='closed'&&r.outcome?.result==='success'&&validOutcome(r.outcome);
export function validOutcome(o:ConnectionOutcome|undefined){
 if(!o||!['success','unsuccessful'].includes(o.result)||!o.note.trim()||!o.recordedBy)return false;
 if(o.result==='unsuccessful')return true;
 const parsed=Date.parse(o.confirmedOn);
 return o.requesterConfirmed&&o.partnerConfirmed&&/^\d{4}-\d{2}-\d{2}$/.test(o.confirmedOn)&&!Number.isNaN(parsed)&&new Date(parsed).toISOString().slice(0,10)===o.confirmedOn&&o.confirmedOn<=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
}
export const connectionMetrics=(rows:IndustrialRequest[])=>{
 const unique=[...new Map(rows.map(r=>[r.id,r])).values()];
 const total=unique.length,success=unique.filter(successfulConnection).length;
 return {total,success,inbound:unique.filter(r=>r.direction==='inbound').length,outbound:unique.filter(r=>r.direction==='outbound').length,unknown:unique.filter(r=>!r.direction).length,active:unique.filter(r=>!['closed','rejected'].includes(r.status)).length,rate:total?Math.round(success/total*100):null};
};
