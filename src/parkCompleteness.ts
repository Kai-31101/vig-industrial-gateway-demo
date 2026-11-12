import type {IndustrialParkProfile, SourcedValue} from './types';

// Coverage only, not a quality score or investment recommendation. Each group has
// one vote so extra photos, industries or duplicated documents cannot boost rank.
const known = (s?: SourcedValue<unknown>) => s?.disclosureStatus === 'public' && s.value != null && (typeof s.value !== 'number' || Number.isFinite(s.value)) && (typeof s.value !== 'string' || s.value.trim().length > 0);
export function parkCompleteness(p:IndustrialParkProfile):number {
  const sourceExists=(id?:string)=>Boolean(id && p.documents.some(d=>d.id===id && d.visibility==='public' && /^https?:\/\//.test(d.sourceUrl || '')));
  const sourced=(s?:SourcedValue<unknown>)=>known(s)&&sourceExists(s?.sourceDocumentId);
  const groups=[
    p.status !== 'unknown',
    sourced(p.totalArea),
    sourced(p.industrialLandArea),
    p.availability.some(a=>sourced(a.available)), // A published zero is complete data.
    ['electricity','water','wastewater'].filter(key=>p.utilities.some(u=>u.key===key&&sourced(u.capacity))).length / 3,
    p.connectivity.length ? p.connectivity.filter(c=>sourced(c.distanceKm)).length / p.connectivity.length : 0,
    p.suitableIndustries.length>0 && sourceExists(p.industrySourceDocumentId),
    p.contact && sourceExists(p.contact.sourceDocumentId) ? (Number(Boolean(p.contact.email))+Number(Boolean(p.contact.phone))+Number(p.contact.scope==='project'))/3 : 0,
    p.media.some(m=>m.approved&&/^https?:\/\//.test(m.url)), // Local conceptual illustrations do not qualify.
    p.documents.some(d=>d.visibility==='public'&&d.verificationStatus==='verified'&&['establishment_decision','enterprise_registration','legal_approval'].includes(d.category)&&Boolean(d.sourceUrl)),
    Boolean(p.coordinates && Number.isFinite(p.coordinates.lat) && Number.isFinite(p.coordinates.lng)),
    [p.provinceProfile.population,p.provinceProfile.grdp,p.provinceProfile.growthRate].filter(sourced).length/3,
    [p.workforce.laborForce,p.workforce.skilledLabor,p.workforce.catchmentPopulation].filter(sourced).length/3,
    p.incentives.some(i=>sourceExists(i.sourceDocumentId)),
    p.phases.some(phase=>sourced(phase.area)),
    p.tenants.some(t=>t.displayAllowed&&Boolean(t.name.trim())),
  ];
  return groups.reduce<number>((sum,value)=>sum+Number(value),0);
}
export function sortParksByCompleteness(parks:IndustrialParkProfile[]):IndustrialParkProfile[] {
  return parks.map((park,index)=>({park,index,score:parkCompleteness(park)}))
    .sort((a,b)=>b.score-a.score||a.index-b.index).map(row=>row.park);
}
