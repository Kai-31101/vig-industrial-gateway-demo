/** Demo-only exhibitor roster for Expo reports. Deterministic per expo so exports and screenshots are stable. */
export interface MockExhibitor{id:string;name:string;country:string;industry:string;products:number;enquiries:number;status:'approved'}
const POOL:Record<string,[string,string,string][]>={
 'expo-cn':[['Shenzhen Brightway Electronics','China','Electronics'],['Suzhou Nanotek Semiconductor','China','Semiconductors'],['Guangzhou Polymer Moulding','China','Advanced materials'],['Hefei Smart Grid Systems','China','Electrical equipment'],['Xiamen Precision Motors','China','Industrial machinery'],['Hai Phong Components JSC','Vietnam','Electronics'],['Bac Ninh Cable & Wire','Vietnam','Electronics'],['Ningbo Cold Chain Logistics','China','Cold-chain logistics'],['Dongguan PCB Assembly','China','Electronics'],['VSIP Supplier Network','Vietnam','Industrial components']],
 'expo-kr':[['Busan Port Logistics','Korea','Logistics'],['Incheon Smart Warehouse','Korea','Warehousing'],['Saigon Newport Partners','Vietnam','Port logistics'],['Hanjin Supply Solutions','Korea','Logistics'],['Mekong Cold Storage','Vietnam','Warehousing'],['Seoul Fleet Telematics','Korea','Logistics'],['Binh Duong Packaging','Vietnam','Packaging'],['Ulsan Industrial Gas','Korea','Industrial components']],
 'expo-global':[['Nordic Solar Parks','Denmark','Renewable energy equipment'],['GreenSteel Asia','Singapore','Advanced materials'],['EcoWater Treatment','Netherlands','Construction technology'],['Mekong Biomass Power','Vietnam','Renewable energy equipment'],['Osaka Heat Recovery','Japan','Advanced materials'],['Sunrise Rooftop PV','Vietnam','Renewable energy equipment'],['Circular Pack Vietnam','Vietnam','Advanced materials'],['Temasek Eco Estates','Singapore','Construction technology'],['Bavaria E-Mobility','Germany','Advanced materials']],
};
export function mockExhibitors(expoId:string):MockExhibitor[]{
 return (POOL[expoId]||[]).map(([name,country,industry],i)=>({id:`${expoId}-ex${String(i+1).padStart(2,'0')}`,name,country,industry,products:6+((i*7+expoId.length)%14),enquiries:3+((i*5+expoId.length*3)%17),status:'approved'}));
}
/** Trend points are stored as dd/mm; anchor them to the expo year for date filtering. */
export const trendDate=(ddmm:string,year:string)=>{const [d,m]=ddmm.split('/');return `${year}-${m}-${d}`};
