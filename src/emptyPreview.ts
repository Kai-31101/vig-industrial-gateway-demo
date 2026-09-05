import type { IndustrialParkProfile, IndustrialAsset, SourcedValue } from './types';

// Local UI evidence fixtures only. Never change source records or publication gates.
export function previewPark(source: IndustrialParkProfile, mode: string | null): IndustrialParkProfile {
  if (!['partial', 'minimal'].includes(mode || '')) return source;
  const missing = <T>(value: SourcedValue<T>): SourcedValue<T> => ({ ...value, value: null, disclosureStatus: 'not_available' });
  const blank = { vi: '', en: '', zh: '' };
  return { ...source, name: { vi: 'KCN minh họa — Hồ sơ đang bổ sung', en: 'Demo park — Profile in progress', zh: '示范园区 — 资料完善中' },
    summary: mode === 'minimal' ? blank : { vi: 'Hồ sơ minh họa cách hiển thị khi một số thông tin dự án chưa được cung cấp.', en: 'A UI sample showing how incomplete project information is presented.', zh: '用于展示项目资料不完整时的界面示例。' },
    industrialLandArea: missing(source.industrialLandArea), totalArea: mode === 'minimal' ? missing(source.totalArea) : source.totalArea,
    phases: [], availability: [], media: [], documents: [], incentives: [], process: [], contact: null,
    economicZone: blank, operator: { ...source.operator, overview: blank, website: '', portfolioStats: [] },
    connectivity: [], coordinates: null, utilities: mode === 'minimal' ? [] : source.utilities.slice(0,3).map((u,i) => ({...u,capacity:i===0 ? u.capacity : {...u.capacity,value:null,disclosureStatus:i===1?'not_disclosed':'not_available'}})),
    amenities: [], suitableIndustries: mode === 'minimal' ? [] : source.suitableIndustries.slice(0,2), sustainability: [], community: [],
    provinceProfile: { ...source.provinceProfile, population: missing(source.provinceProfile.population), grdp: missing(source.provinceProfile.grdp), growthRate: missing(source.provinceProfile.growthRate), context: blank },
    workforce: { ...source.workforce, laborForce: missing(source.workforce.laborForce), skilledLabor: missing(source.workforce.skilledLabor), catchmentPopulation: missing(source.workforce.catchmentPopulation), salaryBenchmark: [], trainingInstitutions: [] },
    logistics: { shippingRoutes: [], indicativeCosts: [] }, conflicts: [],
  };
}

export function previewAsset(source: IndustrialAsset, mode: string | null): IndustrialAsset {
  if (mode !== 'partial') return source;
  return { ...source, name: {vi:'Nhà xưởng minh họa — Thông tin đang bổ sung',en:'Demo factory — Information in progress',zh:'示范厂房 — 资料完善中'}, image:'', description:{vi:'',en:'',zh:''}, availableFrom:'', powerMva:undefined,
    price:{...source.price,value:null,disclosureStatus:'not_disclosed'} };
}
