import type {IndustrialParkProfile, IndustrialAsset, IndustrialRequest, Language} from './types';
import {parks as demoParks} from './data';
// This deployment deliberately retains the approved demo fixtures. Membership is
// a demo visibility scope, never evidence of VSIP ownership or verification.
export const portfolioMode = 'demo' as const;
const demoIds = new Set(demoParks.map(p => p.id));
export const isPublicPark = (park: IndustrialParkProfile) => park.publicationStatus === 'published' && demoIds.has(park.id);
export const isPublicAsset = (asset: IndustrialAsset, parks: IndustrialParkProfile[]) => asset.transaction === 'lease' && parks.some(p => p.id === asset.parkId && isPublicPark(p));
export const leasingIntents = ['Find Supply', 'Meeting / Connection'] as const;
export const leasingIntentLabel = (intent:string, language:Language) => intent === 'Meeting / Connection'
  ? ({vi:'Yêu cầu khảo sát',en:'Site visit request',zh:'实地考察申请'})[language]
  : ({vi:'Tư vấn thuê',en:'Leasing consultation',zh:'租赁咨询'})[language];
export const leasingTeam = (language:Language) => ({vi:'Bộ phận Tiếp thị & Cho thuê',en:'Marketing & Leasing Department',zh:'市场推广与租赁部'})[language];
export function validLeasingContext(input: Pick<IndustrialRequest,'kind'|'transaction'|'service'|'parkId'|'assetId'>, parks:IndustrialParkProfile[], assets:IndustrialAsset[]) {
  if(input.kind !== 'find_supply' || input.transaction !== 'lease' || !leasingIntents.some(x=>x===input.service)) return false;
  const asset=input.assetId ? assets.find(a=>a.id===input.assetId) : undefined;
  if(input.assetId && (!asset || !isPublicAsset(asset,parks))) return false;
  if(input.parkId && !parks.some(p=>p.id===input.parkId && isPublicPark(p))) return false;
  return !(asset && input.parkId && asset.parkId !== input.parkId);
}
