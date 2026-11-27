// Deterministic demo values for the optional asset detail fields (lot code, zone, status, specs, terms, gallery).
// Everything here is a DEMO fixture: specsVerification stays 'unverified' and none of it is an official figure,
// including for VSIP Thai Binh, which is a real park. A handful of assets are left without specs on purpose so the
// "missing data" states stay testable, and a few are reserved / leased / unknown to exercise every status.
import type {IndustrialAsset,IndustrialParkProfile,LocalizedText} from './types';
const L=(vi:string,en:string,zh:string):LocalizedText=>({vi,en,zh});
/** Indexes (in seed order) of assets that intentionally have no technical specs, terms or gallery. */
export const DEMO_WITHOUT_SPECS=[5,11,17,23,29,41];
const LEASED=[13,34];
const round=(n:number,step:number)=>Math.round(n/step)*step;

export function withDemoDetails(list:IndustrialAsset[],parks:IndustrialParkProfile[],galleryPool:string[]):IndustrialAsset[]{
 const perPark=new Map<string,number>();
 return list.map((asset,n)=>{
  const parkIndex=parks.findIndex(p=>p.id===asset.parkId),park=parks[parkIndex];
  const slot=perPark.get(asset.parkId)||0;perPark.set(asset.parkId,slot+1);
  const letter='ABC'[slot%3];
  const phase=park?.phases?.[0]?.name;
  const zone=L(`Khu ${letter}${phase?.vi?` · ${phase.vi}`:''}`,`Zone ${letter}${phase?.en?` · ${phase.en}`:''}`,`${letter}区${phase?.zh?` · ${phase.zh}`:''}`);
  const leasingStatus:NonNullable<IndustrialAsset['leasingStatus']>=LEASED.includes(n)?'leased':n%10===9?'unknown':n%10>=7?'reserved':'available';
  const base:Partial<IndustrialAsset>={lotCode:`A-0${slot+1}`,zone,leasingStatus};
  if(DEMO_WITHOUT_SPECS.includes(n))return {...asset,...base};
  const land=asset.type==='industrial_land'||asset.type==='build_to_suit',factory=asset.type==='ready_built_factory';
  const m2=asset.unit==='ha'?asset.area*10000:asset.area;
  const pool=galleryPool.filter(u=>u!==asset.image),start=n%Math.max(1,pool.length);
  const gallery=Array.from({length:3+(n%2)},(_,k)=>pool[(start+k)%pool.length]).filter((u,k,all)=>u&&all.indexOf(u)===k).map((url,k)=>({url,approved:true,caption:L(`Ảnh minh họa ${k+1} (không phải ảnh thực tế)`,`Illustration ${k+1} (not an actual photograph)`,`示意图 ${k+1}（非实景）`)}));
  const terms:NonNullable<IndustrialAsset['terms']>={
   vatIncluded:false,minLeaseYears:3+(n%3),
   ...(land?{}:{depositMonths:3+(n%4),paymentNote:L('Thanh toán theo quý, trả trước (số liệu demo)','Paid quarterly in advance (demo figure)','按季度预付（演示数据）')}),
   feeNote:L('Phí quản lý hạ tầng tính riêng theo quy định của KCN (số liệu demo)','Infrastructure management fee charged separately per park rules (demo figure)','基础设施管理费按园区规定另计（演示数据）'),
  };
  let specs:NonNullable<IndustrialAsset['specs']>;
  if(land){
   const width=Math.max(10,round(Math.sqrt(m2/1.5),10)),depth=Math.max(10,round(m2/width,10)),front=40+(n%5)*10;
   specs={dimensions:`${width} × ${depth} m`,frontage:L(`Mặt tiền ${front} m`,`Frontage ${front} m`,`临街面宽 ${front} 米`),coverageMaxPct:60+(n%3)*5,leaseTermUntil:`${2058+(n%13)}-12-31`};
  }else if(factory){
   specs={clearHeightM:9+(n%4),floorLoadTonM2:[2,2.5,3][n%3],officeAreaM2:round(m2*(0.05+0.01*(n%4)),10),dockDoors:2+(n%3),floors:1+(n%2),builtYear:2023+(n%3),fireSystem:L('Sprinkler tự động','Automatic sprinkler system','自动喷淋系统')};
  }else{
   specs={clearHeightM:10+(n%3),floorLoadTonM2:3+(n%3),dockDoors:4+(n%5),floors:1,builtYear:2024,fireSystem:L('Sprinkler tự động','Automatic sprinkler system','自动喷淋系统')};
  }
  return {...asset,...base,...(land?{waterM3Day:200+(n%7)*100}:{}),gallery,specs,terms,specsAsOf:'2026-11-20',specsVerification:'unverified' as const};
 });
}
