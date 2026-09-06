import type {IndustrialAsset,IndustrialParkProfile,IndustrialRequest} from './types';
export type MatchState='matched'|'unmatched'|'unknown';
export function candidateChecks(r:IndustrialRequest,p:IndustrialParkProfile,assets:IndustrialAsset[]){
 const norm=(s:string)=>s.trim().toLocaleLowerCase();
 const region:Record<string,string>={north:'North','northern vietnam':'North',central:'Central','central vietnam':'Central',south:'South','southern vietnam':'South'};
 const types:Record<string,string>={'industrial land':'industrial_land','ready-built factory':'ready_built_factory',warehouse:'warehouse','build-to-suit':'build_to_suit',industrial_land:'industrial_land',ready_built_factory:'ready_built_factory',build_to_suit:'build_to_suit'};
 const type=types[norm(r.assetType)],location=norm(r.location),industry=norm(r.industry);
 const stock=assets.filter(a=>a.parkId===p.id&&(!r.assetId||a.id===r.assetId));
 const sameType=type?stock.filter(a=>a.type===type):stock;
 const validRange=Number.isFinite(r.areaMin)&&Number.isFinite(r.areaMax)&&r.areaMin>0&&r.areaMin<=r.areaMax;
 return [
  {key:'location',state:(location===norm(p.province)?'matched':region[location]?region[location]===p.region?'matched':'unmatched':'unknown') as MatchState},
  {key:'industry',state:(!industry||['not specified','chưa xác định'].includes(industry)?'unknown':p.restrictedIndustries.some(i=>norm(i)===industry)?'unmatched':p.suitableIndustries.some(i=>norm(i)===industry)?'matched':'unknown') as MatchState},
  {key:'type',state:(!type?'unknown':sameType.length?'matched':stock.length?'unmatched':'unknown') as MatchState},
  {key:'area',state:(!validRange||!sameType.length?'unknown':sameType.some(a=>{const area=a.area*(a.unit==='ha'?10000:1);return area>=r.areaMin&&area<=r.areaMax})?'matched':sameType.some(a=>a.area>0)?'unmatched':'unknown') as MatchState},
 ];
}
