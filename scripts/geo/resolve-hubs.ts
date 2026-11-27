// Authoring-time tool: resolves the curated hub list (airports, seaports, railway stations, city centres) through
// Goong (Place AutoComplete -> Place Detail) and writes src/geoHubs.ts. Run via the wrapper; the key is never printed.
//   node scripts/geo/with-goong-env.mjs npx tsx scripts/geo/resolve-hubs.ts
// `check` is only a rough expected location (degrees) used to flag a wrong match; it is NOT stored.
import {writeFileSync} from 'node:fs';
import {haversineKm} from '../../src/geoPlaces';
type Seed=[query:string,vi:string,en:string,check:[number,number]];
const AIRPORTS:Seed[]=[
 ['Sân bay quốc tế Nội Bài','Sân bay quốc tế Nội Bài','Noi Bai International Airport',[21.22,105.81]],['Sân bay quốc tế Cát Bi','Sân bay quốc tế Cát Bi','Cat Bi International Airport',[20.82,106.72]],
 ['Sân bay quốc tế Vân Đồn','Sân bay quốc tế Vân Đồn','Van Don International Airport',[21.12,107.41]],['Sân bay Điện Biên Phủ','Sân bay Điện Biên Phủ','Dien Bien Phu Airport',[21.40,103.01]],
 ['Sân bay Thọ Xuân','Sân bay Thọ Xuân','Tho Xuan Airport',[19.90,105.47]],['Sân bay quốc tế Vinh','Sân bay quốc tế Vinh','Vinh International Airport',[18.74,105.67]],
 ['Sân bay Đồng Hới','Sân bay Đồng Hới','Dong Hoi Airport',[17.52,106.59]],['Sân bay quốc tế Phú Bài','Sân bay quốc tế Phú Bài','Phu Bai International Airport',[16.40,107.70]],
 ['Sân bay quốc tế Đà Nẵng','Sân bay quốc tế Đà Nẵng','Da Nang International Airport',[16.04,108.20]],['Sân bay Chu Lai','Sân bay Chu Lai','Chu Lai Airport',[15.41,108.71]],
 ['Sân bay Phù Cát','Sân bay Phù Cát','Phu Cat Airport',[13.95,109.04]],['Sân bay Tuy Hòa','Sân bay Tuy Hòa','Tuy Hoa Airport',[13.05,109.34]],
 ['Sân bay quốc tế Cam Ranh','Sân bay quốc tế Cam Ranh','Cam Ranh International Airport',[12.00,109.22]],['Sân bay Liên Khương','Sân bay Liên Khương','Lien Khuong Airport',[11.75,108.37]],
 ['Sân bay Buôn Ma Thuột','Sân bay Buôn Ma Thuột','Buon Ma Thuot Airport',[12.67,108.12]],['Sân bay Pleiku','Sân bay Pleiku','Pleiku Airport',[14.00,108.02]],
 ['Sân bay quốc tế Tân Sơn Nhất','Sân bay quốc tế Tân Sơn Nhất','Tan Son Nhat International Airport',[10.82,106.66]],['Sân bay Côn Đảo','Sân bay Côn Đảo','Con Dao Airport',[8.73,106.63]],
 ['Sân bay quốc tế Cần Thơ','Sân bay quốc tế Cần Thơ','Can Tho International Airport',[10.09,105.71]],['Sân bay Rạch Giá','Sân bay Rạch Giá','Rach Gia Airport',[9.96,105.13]],
 ['Sân bay Cà Mau','Sân bay Cà Mau','Ca Mau Airport',[9.18,105.18]],['Sân bay quốc tế Phú Quốc','Sân bay quốc tế Phú Quốc','Phu Quoc International Airport',[10.17,103.99]]];
const SEAPORTS:Seed[]=[
 ['Cảng Lạch Huyện','Cảng quốc tế Lạch Huyện (Hải Phòng)','Lach Huyen International Port (Hai Phong)',[20.80,106.83]],['Cảng Đình Vũ','Cảng Đình Vũ (Hải Phòng)','Dinh Vu Port (Hai Phong)',[20.84,106.80]],
 ['Cảng Chùa Vẽ','Cảng Chùa Vẽ (Hải Phòng)','Chua Ve Port (Hai Phong)',[20.85,106.73]],['Cảng Hải Phòng','Cảng Hải Phòng (Hoàng Diệu)','Hai Phong Port (Hoang Dieu)',[20.86,106.69]],
 ['Cảng Cái Lân','Cảng Cái Lân (Quảng Ninh)','Cai Lan Port (Quang Ninh)',[20.97,107.07]],['Cảng Nghi Sơn','Cảng Nghi Sơn (Thanh Hóa)','Nghi Son Port (Thanh Hoa)',[19.35,105.78]],
 ['Cảng Cửa Lò','Cảng Cửa Lò (Nghệ An)','Cua Lo Port (Nghe An)',[18.81,105.73]],['Cảng Vũng Áng','Cảng Vũng Áng (Hà Tĩnh)','Vung Ang Port (Ha Tinh)',[18.08,106.35]],
 ['Cảng Chân Mây','Cảng Chân Mây (Huế)','Chan May Port (Hue)',[16.30,108.02]],['Cảng Tiên Sa','Cảng Tiên Sa (Đà Nẵng)','Tien Sa Port (Da Nang)',[16.12,108.22]],
 ['Cảng Dung Quất','Cảng Dung Quất (Quảng Ngãi)','Dung Quat Port (Quang Ngai)',[15.38,108.80]],['Cảng Kỳ Hà Chu Lai','Cảng Kỳ Hà (Chu Lai)','Ky Ha Port (Chu Lai)',[15.45,108.67]],
 ['Cảng Quy Nhơn','Cảng Quy Nhơn','Quy Nhon Port',[13.76,109.25]],['Cảng Nha Trang','Cảng Nha Trang','Nha Trang Port',[12.22,109.20]],
 ['Cảng Ba Ngòi, Cam Ranh, Khánh Hòa','Cảng Ba Ngòi (Cam Ranh)','Ba Ngoi Port (Cam Ranh)',[11.89,109.15]],['Cảng Cát Lái','Cảng Cát Lái (TP. Hồ Chí Minh)','Cat Lai Port (Ho Chi Minh City)',[10.77,106.79]],
 ['Cảng Hiệp Phước','Cảng Hiệp Phước (TP. Hồ Chí Minh)','Hiep Phuoc Port (Ho Chi Minh City)',[10.62,106.76]],['Cảng Cái Mép','Cảng Cái Mép (Bà Rịa - Vũng Tàu)','Cai Mep Port (Ba Ria - Vung Tau)',[10.52,107.03]],
 ['Cảng Thị Vải','Cảng Thị Vải (Bà Rịa - Vũng Tàu)','Thi Vai Port (Ba Ria - Vung Tau)',[10.55,107.02]],['Cảng Phú Mỹ','Cảng Phú Mỹ (Bà Rịa - Vũng Tàu)','Phu My Port (Ba Ria - Vung Tau)',[10.57,107.04]],
 ['Cảng Cái Cui','Cảng Cái Cui (Cần Thơ)','Cai Cui Port (Can Tho)',[10.00,105.73]]];
const STATIONS:Seed[]=[
 ['Ga Hà Nội','Ga Hà Nội','Hanoi Railway Station',[21.025,105.841]],['Ga Giáp Bát','Ga Giáp Bát','Giap Bat Station',[20.98,105.84]],['Ga Yên Viên','Ga Yên Viên','Yen Vien Station',[21.09,105.91]],
 ['Ga Hải Phòng','Ga Hải Phòng','Hai Phong Station',[20.86,106.68]],['Ga Lào Cai','Ga Lào Cai','Lao Cai Station',[22.43,103.97]],['Ga Đồng Đăng','Ga Đồng Đăng','Dong Dang Station',[21.94,106.73]],
 ['Ga Vinh','Ga Vinh','Vinh Station',[18.68,105.68]],['Ga Đông Hà','Ga Đông Hà','Dong Ha Station',[16.82,107.10]],['Ga Huế','Ga Huế','Hue Station',[16.46,107.58]],
 ['Ga Đà Nẵng','Ga Đà Nẵng','Da Nang Station',[16.07,108.21]],['Ga Diêu Trì','Ga Diêu Trì','Dieu Tri Station',[13.85,109.13]],['Ga Nha Trang','Ga Nha Trang','Nha Trang Station',[12.25,109.18]],
 ['Ga Tháp Chàm','Ga Tháp Chàm','Thap Cham Station',[11.57,108.99]],['Ga Sóng Thần','Ga Sóng Thần','Song Than Station',[10.88,106.74]],['Ga Sài Gòn','Ga Sài Gòn','Saigon Station',[10.78,106.68]],
 ['Ga Biên Hòa','Ga Biên Hòa','Bien Hoa Station',[10.95,106.84]],['Ga Thanh Hóa','Ga Thanh Hóa','Thanh Hoa Station',[19.80,105.78]],['Ga Ninh Bình','Ga Ninh Bình','Ninh Binh Station',[20.25,105.97]],
 ['Ga Nam Định','Ga Nam Định','Nam Dinh Station',[20.42,106.17]],['Ga Bắc Giang','Ga Bắc Giang','Bac Giang Station',[21.28,106.19]],['Ga Thái Nguyên','Ga Thái Nguyên','Thai Nguyen Station',[21.58,105.84]],
 ['Ga Phủ Lý','Ga Phủ Lý','Phu Ly Station',[20.54,105.92]],['Ga Đồng Hới','Ga Đồng Hới','Dong Hoi Station',[17.48,106.62]],['Ga Quảng Ngãi','Ga Quảng Ngãi','Quang Ngai Station',[15.12,108.80]],
 ['Ga Tuy Hòa','Ga Tuy Hòa','Tuy Hoa Station',[13.09,109.31]]];
const TOWNS:Seed[]=[
 ['Hà Nội','Hà Nội','Hanoi',[21.03,105.85]],['Hải Phòng','Hải Phòng','Hai Phong',[20.86,106.68]],['Hạ Long','Hạ Long (Quảng Ninh)','Ha Long (Quang Ninh)',[20.95,107.08]],
 ['Bắc Ninh','Bắc Ninh','Bac Ninh',[21.19,106.07]],['Hưng Yên','Hưng Yên','Hung Yen',[20.65,106.05]],['Thái Bình','Thái Bình','Thai Binh',[20.45,106.34]],
 ['Nam Định','Nam Định','Nam Dinh',[20.42,106.17]],['Ninh Bình','Ninh Bình','Ninh Binh',[20.25,105.97]],['Hải Dương','Hải Dương','Hai Duong',[20.94,106.33]],
 ['Vĩnh Yên','Vĩnh Yên (Vĩnh Phúc)','Vinh Yen (Vinh Phuc)',[21.31,105.60]],['Bắc Giang','Bắc Giang','Bac Giang',[21.27,106.19]],['Thái Nguyên','Thái Nguyên','Thai Nguyen',[21.59,105.84]],
 ['Việt Trì','Việt Trì (Phú Thọ)','Viet Tri (Phu Tho)',[21.32,105.40]],['Lào Cai','Lào Cai','Lao Cai',[22.48,103.97]],['Thanh Hóa','Thanh Hóa','Thanh Hoa',[19.81,105.78]],
 ['Thành phố Vinh, Nghệ An','Vinh (Nghệ An)','Vinh (Nghe An)',[18.68,105.68]],['Hà Tĩnh','Hà Tĩnh','Ha Tinh',[18.34,105.91]],['Đồng Hới','Đồng Hới (Quảng Trị)','Dong Hoi (Quang Tri)',[17.47,106.62]],
 ['Huế','Huế','Hue',[16.46,107.59]],['Đà Nẵng','Đà Nẵng','Da Nang',[16.05,108.21]],['Tam Kỳ','Tam Kỳ (Đà Nẵng)','Tam Ky (Da Nang)',[15.57,108.47]],
 ['Quảng Ngãi','Quảng Ngãi','Quang Ngai',[15.12,108.80]],['Quy Nhơn','Quy Nhơn','Quy Nhon',[13.78,109.22]],['Nha Trang','Nha Trang','Nha Trang',[12.24,109.19]],
 ['Đà Lạt','Đà Lạt','Da Lat',[11.94,108.44]],['Buôn Ma Thuột','Buôn Ma Thuột','Buon Ma Thuot',[12.67,108.04]],['Pleiku','Pleiku','Pleiku',[13.98,108.00]],
 ['Thành phố Hồ Chí Minh','TP. Hồ Chí Minh','Ho Chi Minh City',[10.78,106.70]],['Biên Hòa','Biên Hòa (Đồng Nai)','Bien Hoa (Dong Nai)',[10.95,106.82]],['Thủ Dầu Một','Thủ Dầu Một','Thu Dau Mot',[10.99,106.65]],
 ['Tây Ninh','Tây Ninh','Tay Ninh',[11.31,106.10]],['Vũng Tàu','Vũng Tàu','Vung Tau',[10.35,107.08]],['Thành phố Tân An, Long An','Tân An (Long An)','Tan An (Long An)',[10.53,106.41]],
 ['Cần Thơ','Cần Thơ','Can Tho',[10.04,105.78]],['Vĩnh Long','Vĩnh Long','Vinh Long',[10.25,105.97]],['Thành phố Long Xuyên, An Giang','Long Xuyên (An Giang)','Long Xuyen (An Giang)',[10.38,105.43]],
 ['Cà Mau','Cà Mau','Ca Mau',[9.18,105.15]],['Thành phố Phan Thiết, Bình Thuận','Phan Thiết','Phan Thiet',[10.93,108.10]],['Đông Hà','Đông Hà','Dong Ha',[16.82,107.10]],['Phủ Lý','Phủ Lý','Phu Ly',[20.54,105.91]]];
const SETS:[string,Seed[]][]=[['airport',AIRPORTS],['seaport',SEAPORTS],['rail',STATIONS],['town',TOWNS]];
const key=process.env.GOONG_API_KEY;if(!key)throw new Error('GOONG_API_KEY missing (run through scripts/geo/with-goong-env.mjs)');
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function goong(path:string,params:Record<string,string>){const r=await fetch('https://rsapi.goong.io'+path+'?'+new URLSearchParams({...params,api_key:key!}),{signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('http_'+r.status);return r.json() as Promise<any>}
const out:any[]=[];const flagged:string[]=[];
for(const [category,seeds] of SETS)for(const [query,vi,en,check] of seeds){
 let best:any=null;
 try{
  const ac=await goong('/Place/AutoComplete',{input:query,limit:'5'});await sleep(250);
  // prefer the candidate whose detail location is nearest to the expected area (guards against namesakes elsewhere)
  for(const p of (ac.predictions||[]).slice(0,3)){
   const d=await goong('/Place/Detail',{place_id:p.place_id});await sleep(250);const loc=d?.result?.geometry?.location;if(!loc)continue;
   const km=haversineKm({lat:check[0],lng:check[1]},{lat:loc.lat,lng:loc.lng});
   if(!best||km<best.km)best={km,lat:loc.lat,lng:loc.lng,desc:String(p.description).slice(0,70)};
   if(km<8)break;
  }
 }catch(e){flagged.push(`${category} ${vi}: ERROR ${(e as Error).message}`)}
 const tol=category==='town'?15:category==='seaport'?12:8;
 if(!best||best.km>tol){flagged.push(`${category} ${vi}: ${best?`${best.km.toFixed(1)} km from expected (${best.desc})`:'no result'}`);console.log('FLAG',category,vi,best?best.km.toFixed(1):'-');continue}
 out.push({category,name:{vi,en,zh:en},coordinates:{lat:Math.round(best.lat*1e5)/1e5,lng:Math.round(best.lng*1e5)/1e5}});
 console.log('OK  ',category,vi,'|',best.desc,'|',best.lat.toFixed(4),best.lng.toFixed(4),'| off',best.km.toFixed(1),'km');
}
const header=`// Curated transport/city hubs. Coordinates were resolved with Goong (Place AutoComplete -> Place Detail) by scripts/geo/resolve-hubs.ts on ${new Date().toISOString().slice(0,10)}.\n// Do not edit by hand; rerun the script. Used by server/geo.ts (nearest hubs per park) - there is no keyword search for these categories.\n`;
writeFileSync('src/geoHubs.ts',header+`import type {NearbyCategory,LocalizedText} from './types';\nexport interface Hub {category:Extract<NearbyCategory,'airport'|'seaport'|'rail'|'town'>;name:LocalizedText;coordinates:{lat:number;lng:number}}\nexport const HUBS:Hub[]=${JSON.stringify(out,null,1)};\n`);
console.log('written',out.length,'hubs; flagged',flagged.length);flagged.forEach(f=>console.log(' !',f));
