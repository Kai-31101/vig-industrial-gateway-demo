import type {IndustrialRequest,RequestStatus} from './types';

/**
 * Twenty demo leasing enquiries (find_supply) spread over statuses, industries, regions and dates,
 * so dashboards, filters and AI matching have realistic volume. Contacts use reserved example domains.
 * Seeded into the database by scripts/db/seed-mock-requests.ts (idempotent).
 */
type Row=[org:string,contact:string,country:string,industry:string,assetType:string,location:string,areaMin:number,areaMax:number,status:RequestStatus,daysAgo:number,owner:string,budget:string,availability:string,requirements:string,park?:string];
const ROWS:Row[]=[
 ['Shenzhen Brightway Electronics','Chen Wei','+86','Electronics','Ready-built factory','North',8000,12000,'submitted',1,'','USD 4.2/m²/month','2027-03-01','Clean room ISO 8, 3 MVA, near Hai Phong port.'],
 ['Osaka Precision Parts','Takeshi Mori','+81','Precision engineering','Ready-built factory','Bắc Ninh',5000,7000,'submitted',2,'','Negotiable','2027-01-15','Floor load 3 t/m², 2 MVA, Japanese-speaking support.'],
 ['Mekong Fresh Foods','Trần Thu Hà','+84','Food processing','Industrial land','South',20000,30000,'submitted',3,'','VND 2.8M/m²/term','2027-06-01','Wastewater treatment capacity 500 m³/day.'],
 ['Hanwha Battery Systems','Park Ji-hoon','+82','Battery systems','Build-to-suit','North',40000,60000,'submitted',5,'','Negotiable','2027-09-01','Fire separation, 10 MVA, hazardous goods storage.'],
 ['Nordic Solar Components','Lars Nilsen','+45','Renewable energy equipment','Industrial land','Central',30000,50000,'submitted',6,'','USD 90/m²/term','2027-12-01','Coastal access for heavy logistics.'],
 ['Bavaria Auto Interiors','Jonas Weber','+49','Automotive','Ready-built factory','Hải Phòng',10000,15000,'under_review',9,'operator','EUR 4/m²/month','2027-02-01','Proximity to tier-1 OEM, 4 MVA.'],
 ['Saigon Cold Chain','Lê Minh Quân','+84','Cold-chain logistics','Warehouse','Bình Dương',6000,9000,'under_review',12,'operator','USD 5/m²/month','2026-12-15','−25 °C zone, 12 m clear height.'],
 ['Taipei Smart Devices','Lin Yu-ting','+886','Smart electronics','Ready-built factory','North',6000,8000,'under_review',15,'admin','Negotiable','2027-04-01','ESD flooring, 24/7 security.'],
 ['PharmaCore Vietnam','Đỗ Thanh Tùng','+84','Pharmaceuticals','Build-to-suit','Hà Nội',15000,20000,'under_review',18,'operator','Negotiable','2027-08-01','GMP-ready shell, stable water supply.'],
 ['Kyushu Robotics','Hiroshi Tanaka','+81','Robotics','Ready-built factory','Bắc Ninh',4000,6000,'verified',22,'operator','USD 4.5/m²/month','2027-02-15','Overhead crane 10 t.'],
 ['Singapore Data Hub','Rachel Tan','+65','Data centers','Industrial land','Bình Dương',25000,35000,'verified',27,'admin','Negotiable','2027-10-01','Dual power feed 40 MVA, fibre redundancy.'],
 ['Vina Textile Group','Phạm Ngọc Anh','+84','Textiles','Ready-built factory','Nghệ An',12000,18000,'verified',33,'operator','VND 95k/m²/month','2027-01-01','Steam supply, dye wastewater permit.'],
 ['Incheon Logistics Partners','Kim Soo-min','+82','Logistics','Warehouse','Hải Phòng',15000,25000,'matching',38,'operator','USD 4.8/m²/month','2027-03-15','Bonded warehouse, 30 dock doors.'],
 ['GreenPack Asia','Nguyễn Bảo Châu','+84','Sustainable packaging','Ready-built factory','Long An',7000,10000,'matching',44,'operator','Negotiable','2027-05-01','Recycled-paper storage, 2.5 MVA.'],
 ['Medtronic Supply VN','Sarah Collins','+1','Medical devices','Build-to-suit','Đồng Nai',10000,14000,'matching',51,'admin','Negotiable','2027-11-01','ISO 13485 clean area, quiet zone.'],
 ['Thai Steel Fabricators','Somchai Prasert','+66','Steel fabrication','Industrial land','Bà Rịa–Vũng Tàu',30000,45000,'connection_scheduled',58,'operator','USD 80/m²/term','2027-07-01','Deep-water port within 15 km.'],
 ['Hanoi Furniture Export','Vũ Đức Long','+84','Furniture','Warehouse','Bình Định',8000,12000,'connection_scheduled',66,'operator','VND 70k/m²/month','2027-02-01','Dust extraction, timber storage permit.'],
 ['Delta Agro Machinery','Trương Văn Phúc','+84','Agricultural machinery','Ready-built factory','Cần Thơ',5000,8000,'closed',79,'operator','Negotiable','2026-12-01','Assembly line, river logistics.'],
 ['Busan Marine Logistics','Choi Dong-wook','+82','Marine logistics','Warehouse','Quảng Ninh',10000,16000,'closed',92,'admin','USD 4/m²/month','2026-11-30','Container yard 1 ha.'],
 ['Quick Retail Trading','Ngô Hải Yến','+84','Consumer electronics','Warehouse','Hà Nội',300,500,'rejected',105,'operator','Under budget','2026-11-01','Retail showroom, not industrial use.'],
];
const NOW=Date.parse('2026-11-17T03:00:00Z'),DAY=86400000;
const iso=(t:number)=>new Date(t).toISOString();
const slug=(s:string)=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'');
const FLOW:RequestStatus[]=['submitted','under_review','verified','matching','connection_scheduled','closed'];
const STEP:Record<string,{vi:string;en:string}>={submitted:{vi:'Đã tiếp nhận yêu cầu',en:'Request submitted'},under_review:{vi:'Bắt đầu xác minh thông tin',en:'Verification started'},verified:{vi:'Đã xác minh nhu cầu',en:'Request verified'},matching:{vi:'Bắt đầu ghép nối mặt bằng',en:'Matching started'},connection_scheduled:{vi:'Đã hẹn khảo sát với khách hàng',en:'Site visit scheduled'},closed:{vi:'Đã đóng yêu cầu',en:'Request closed'},rejected:{vi:'Từ chối: không phù hợp mục đích công nghiệp',en:'Rejected: not an industrial use'}};

export const mockLeasingRequests:IndustrialRequest[]=ROWS.map((r,i)=>{
 const [organization,contactName,dial,industry,assetType,location,areaMin,areaMax,status,daysAgo,owner,budgetOrPrice,availabilityDate,requirements]=r;
 const submitted=NOW-daysAgo*DAY-(i%5)*3600000,id=`VSIP-2026-${String(101+i).padStart(3,'0')}`;
 const path=status==='rejected'?['submitted','under_review','rejected']:FLOW.slice(0,FLOW.indexOf(status)+1);
 const activities=path.map((s,k)=>({id:`${id}-a${k+1}`,at:iso(submitted+k*DAY*Math.max(1,Math.floor(daysAgo/(path.length+1)))),actor:k===0?'System':owner==='admin'?'Nguyễn Lan Anh':'Phạm An',action:STEP[s]}));
 const success=status==='closed'&&i%2===1;
 return {
  id,kind:'find_supply',organization,contactName,email:`${slug(contactName)}@example.com`,phone:`${dial} 000 ${String(1000+i*37).slice(0,4)}`,
  service:'Leasing advisory',assetType,industrialParkName:'',location,areaMin,areaMax,transaction:'lease',budgetOrPrice,industry,availabilityDate,requirements,
  status,submittedAt:iso(submitted),assignedTo:owner,activities,entrySource:(['form','ai_chat','park','asset'] as const)[i%4],direction:'inbound',consent:true,revision:path.length,
  ...(status==='rejected'?{rejectionReason:'Retail showroom request is outside industrial leasing scope.'}:{}),
  ...(status==='closed'?{outcome:{result:success?'success':'unsuccessful',note:success?'Lease heads of terms signed after site visit.':'Customer chose another province for tax reasons.',requesterConfirmed:success,partnerConfirmed:success,confirmedOn:iso(submitted+daysAgo*DAY*0.8).slice(0,10),recordedBy:'Phạm An'} as const}:{}),
 } as IndustrialRequest;
});
