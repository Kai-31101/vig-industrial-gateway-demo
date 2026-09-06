import type {Language, RequestKind} from './types';

export interface PackageCopy { name:string; audience:string; benefits:string; scope:string }
export interface ServicePackage { id:string; kinds:RequestKind[]; revision:number; content:Record<Language,PackageCopy> }
const copy=(name:string,audience:string,benefits:string,scope:string):PackageCopy=>({name,audience,benefits,scope});
export const packageSeeds:ServicePackage[] = [
  {id:'Find Supply',kinds:['find_supply'],revision:1,content:{
    vi:copy('Tìm nguồn cung','Doanh nghiệp đang tìm địa điểm đầu tư.','Làm rõ nhu cầu về mặt bằng\nTiếp cận KCN và sản phẩm phù hợp','Tiếp nhận nhu cầu và đề xuất nguồn cung để bạn xem xét.'),
    en:copy('Find Supply','Businesses seeking an investment location.','Clarify your property requirements\nDiscover relevant parks and assets','Receive your requirements and suggest supply options for review.'),
    zh:copy('寻找供应','适合寻找投资落地地点的企业。','明确工业地产需求\n了解合适的园区和物业','接收需求并提供供应选项供您评估。')}},
  {id:'Find Demand',kinds:['find_demand'],revision:1,content:{
    vi:copy('Tìm khách thuê / mua','Chủ đầu tư KCN và đơn vị có mặt bằng cần khai thác.','Làm rõ đối tượng khách hàng mục tiêu\nTiếp cận nhu cầu thuê hoặc mua phù hợp','Tiếp nhận thông tin nguồn cung và hỗ trợ tìm nhu cầu phù hợp.'),
    en:copy('Find Demand','Park developers and owners with available property.','Define your target tenants or buyers\nExplore relevant leasing or purchase demand','Receive your supply information and help identify relevant demand.'),
    zh:copy('寻找需求','适合园区开发商及有可用物业的业主。','明确目标租户或买家\n了解相关租赁或购买需求','接收供应信息并协助寻找适合的需求。')}},
  {id:'Premium Matching',kinds:['find_supply','find_demand'],revision:1,content:{
    vi:copy('Ghép nối chuyên sâu','Nhu cầu có tiêu chí kỹ thuật hoặc ngành nghề cụ thể.','Rà soát tiêu chí ưu tiên\nLàm rõ mức độ phù hợp của từng đề xuất\nHỗ trợ lựa chọn đối tác để kết nối','Hỗ trợ đánh giá và lập danh sách đề xuất; không cam kết kết quả giao dịch.'),
    en:copy('Premium Matching','Requirements with specific technical or industry criteria.','Review priority requirements\nUnderstand why each option fits\nChoose partners to connect with','Support evaluation and shortlisting; transaction outcomes are not guaranteed.'),
    zh:copy('深度匹配','适合具有特定技术或行业条件的需求。','梳理优先条件\n了解各选项的匹配理由\n选择拟对接的合作伙伴','协助评估和筛选，不保证交易结果。')}},
  {id:'Supply Sourcing',kinds:['find_supply'],revision:1,content:{
    vi:copy('Tìm kiếm nguồn cung theo yêu cầu','Doanh nghiệp cần mở rộng lựa chọn mặt bằng.','Tìm kiếm theo khu vực và tiêu chí đã thống nhất\nTổng hợp thông tin để so sánh phương án','VIG hỗ trợ tìm và tổng hợp nguồn cung theo yêu cầu đã làm rõ.'),
    en:copy('Supply Sourcing','Businesses needing a wider selection of properties.','Search against agreed regions and criteria\nCompare consolidated property information','VIG helps identify and consolidate supply against clarified requirements.'),
    zh:copy('定向寻源','适合需要扩大物业选择范围的企业。','根据约定区域和条件寻找供应\n汇总信息以比较方案','VIG根据已明确的需求协助寻找并汇总供应。')}},
  {id:'Market Outreach',kinds:['find_demand'],revision:1,content:{
    vi:copy('Tiếp cận thị trường','Đơn vị có nguồn cung muốn tiếp cận nhóm khách hàng mục tiêu.','Làm rõ ngành và thị trường ưu tiên\nChuẩn bị thông tin giới thiệu mặt bằng\nHỗ trợ tiếp cận đối tác phù hợp','Phạm vi hỗ trợ tiếp cận được trao đổi sau khi tiếp nhận yêu cầu.'),
    en:copy('Market Outreach','Supply owners seeking relevant target markets.','Define priority sectors and markets\nPrepare property introduction information\nSupport relevant partner outreach','Outreach scope is discussed after your request is received.'),
    zh:copy('市场拓展','适合希望接触目标市场的供应方。','明确优先行业和市场\n准备物业介绍资料\n协助接触相关合作伙伴','接收需求后协商市场拓展的支持范围。')}},
  {id:'Meeting / Connection',kinds:['find_supply','find_demand'],revision:1,content:{
    vi:copy('Hỗ trợ gặp gỡ và kết nối','Các bên đã xác định đối tác muốn trao đổi.','Chuyển yêu cầu đến đầu mối phù hợp\nLàm rõ nội dung cần trao đổi\nHỗ trợ điều phối bước kết nối tiếp theo','Gửi yêu cầu điều phối; không phải xác nhận lịch gặp.'),
    en:copy('Meeting / Connection','Parties who have identified a partner to speak with.','Reach the appropriate contact\nClarify discussion topics\nCoordinate the next connection step','Request coordination; this is not a confirmed meeting booking.'),
    zh:copy('会面与对接支持','适合已确定希望洽谈对象的各方。','联系合适的负责人\n明确洽谈议题\n协调下一步对接','提交协调请求，不代表会面已获确认。')}}
];
export const packageCopyErrors=(content:ServicePackage['content'])=>
  (['vi','en','zh'] as Language[]).flatMap(lang=>(['name','audience','benefits','scope'] as const).filter(key=>{
    const value=content?.[lang]?.[key];
    return typeof value!=='string'||!value.trim()||value.length>({name:80,audience:200,benefits:700,scope:350}[key])||(key==='benefits'&&(value.split('\n').filter(v=>v.trim()).length>5||value.split('\n').some(v=>v.trim().length>140)));
  }).map(key=>`${lang}.${key}`));
