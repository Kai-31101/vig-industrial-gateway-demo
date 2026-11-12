import type { IndustrialParkProfile, LocalizedText, SourcedValue, ParkContact } from './types';
import enrichment from './vsipEnrichment.json';
const l = (vi:string,en:string,zh:string):LocalizedText => ({vi,en,zh});
export function enrichVsipProfiles(parks:IndustrialParkProfile[]) {
  for (const row of enrichment) {
    const park=parks.find(p=>p.slug===row.slug);
    if (!park) throw new Error(`Unknown enrichment project: ${row.slug}`);
    const infrastructureSource=park.documents.find(d=>d.sourceUrl===row.infrastructureSource)!.id;
    const source=<T,>(value:T|null,unit?:string):SourcedValue<T>=>({value,unit,sourceDocumentId:infrastructureSource,verificationStatus:value===null?'unverified':'reviewed',disclosureStatus:value===null?'not_available':'public'});
    park.utilities=[
      {key:'electricity',label:l('Cấp điện','Electricity supply','供电'),capacity:source(row.electricity.value,row.electricity.unit)},
      {key:'water',label:l('Cấp nước','Water supply','供水'),capacity:source(row.water,'m³/day')},
      {key:'wastewater',label:l('Xử lý nước thải','Wastewater treatment','污水处理'),capacity:source(row.wastewater,'m³/day')},
    ];
    park.connectivity=row.gateways.map(g=>({type:g.type as 'airport'|'port',name:l(`${g.type==='airport'?'Sân bay':'Cảng'} ${g.vi}`,`${g.en} ${g.type==='airport'?'Airport':'Port'}`,`${g.en}${g.type==='airport'?'机场':'港口'}`),distanceKm:source(g.km,'km'),status:'unknown'}));
    park.suitableIndustries=row.industries;
    park.industryNote=row.industries.length===0
      ? l('Chưa tìm thấy danh mục ngành nghề công bố đủ rõ. Liên hệ VSIP để xác nhận khả năng tiếp nhận dự án.','A sufficiently specific published sector list has not been found. Contact VSIP to confirm project eligibility.','尚未找到明确公布的行业清单，请联系 VSIP 确认项目准入条件。')
      : row.industryBasis==='existing_sectors'
      ? l('Các lĩnh vực đã thu hút doanh nghiệp theo nguồn công bố; việc tiếp nhận dự án mới cần xác nhận với chủ đầu tư.','Published sectors represented by existing investors; confirm new-project acceptance with the developer.','已入驻投资者所属行业；新项目准入须向开发商确认。')
      : l('Định hướng thu hút đầu tư theo nguồn công bố; cần xác nhận điều kiện tiếp nhận của từng dự án.','Published investment focus; confirm eligibility for each proposed project.','来源公布的招商方向；各项目准入条件须另行确认。');
    if(row.industries.length) {
      const id=row.industrySource===row.infrastructureSource?infrastructureSource:`industry-${park.slug}`;
      park.industrySourceDocumentId=id;
      if(!park.documents.some(d=>d.id===id))park.documents.push({id,title:l('Nguồn ngành nghề thu hút','Industry focus source','招商行业来源'),category:'presentation',issuer:l(row.industryIssuer,row.industryIssuer,row.industryIssuer),language:'en',visibility:'public',verificationStatus:'reviewed',sourceUrl:row.industrySource});
    }
    const contactId=`contact-${park.slug}`;
    const contact=row.contact;
    park.contact={office:l(contact.officeVi,contact.officeEn,`${contact.officeEn} 联络处`),address:l(contact.addressVi,contact.addressEn,contact.addressEn),person:'',title:contact.scope==='project'?l('Đầu mối dự án theo danh bạ công bố','Published project contact','公布的项目联系人'):contact.scope==='regional'?l('Văn phòng hỗ trợ chung khu vực – cần yêu cầu chuyển đúng dự án','Shared area office – request routing to this project','区域共享联络处，请要求转接该项目'):l('Đầu mối tập đoàn – chưa có liên hệ riêng của dự án','Group investment desk – dedicated project contact not found','集团投资联络处，尚无项目专属联系方式'),phone:contact.phone,email:contact.email,website:'https://www.vsip.com.vn/en/contact/',channels:['Email','Phone'],sourceDocumentId:contactId,scope:contact.scope as ParkContact['scope']};
    park.documents.push({id:contactId,title:l('Nguồn thông tin liên hệ','Contact directory source','联系方式来源'),category:'presentation',issuer:l(contact.issuer,contact.issuer,contact.issuer),language:'en',visibility:'public',verificationStatus:'reviewed',sourceUrl:contact.sourceUrl});
  }
}
