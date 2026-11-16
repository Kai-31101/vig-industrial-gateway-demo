import {useApp} from './AppContext';
import {industryLabel} from './industryLabels';

export function ChatEnquiryReview({draft:d,active=false}:{draft:any;active?:boolean}){
 const {language,parks,assets}=useApp(),i=language==='vi'?0:language==='en'?1:2;
 const t=(vi:string,en:string,zh:string)=>[vi,en,zh][i];
 const number=(n:number)=>Number(n).toLocaleString(language==='vi'?'vi-VN':language==='zh'?'zh-CN':'en-US');
 const type:Record<string,string[]>={industrial_land:['Đất công nghiệp','Industrial land','工业用地'],ready_built_factory:['Nhà xưởng xây sẵn','Ready-built factory','标准厂房'],warehouse:['Kho bãi','Warehouse','仓库'],build_to_suit:['Xây dựng theo yêu cầu','Build-to-suit','定制厂房']};
 const location=({North:t('Miền Bắc','North','北部'),Central:t('Miền Trung','Central','中部'),South:t('Miền Nam','South','南部'),'Not specified':t('Chưa xác định','Not specified','待定')} as any)[d.location]||d.location;
 const b=d.budget;
 const rows=[
  [t('Doanh nghiệp','Company','企业'),d.organization],
  [t('Người liên hệ','Contact person','联系人'),d.contactName],[t('Email','Email','邮箱'),d.email],[t('Điện thoại','Phone','电话'),d.phone],
  [t('Loại mặt bằng','Property type','物业类型'),type[d.assetType]?.[i]],
  [t('Diện tích','Area','面积'),`${number(d.areaMin)}–${number(d.areaMax)} m²`],
  [t('Khu vực','Location','区域'),location],[t('Ngành nghề','Industry','行业'),industryLabel(d.industry,language)],
  [t('KCN / mặt bằng','Park / property','园区 / 物业'),[parks.find(p=>p.id===d.parkId)?.name[language],assets.find(a=>a.id===d.assetId)?.name[language]].filter(Boolean).join(' · ')||'—'],
  [t('Ngân sách','Budget','预算'),b?.mode==='specific'?`${number(b.amount)} ${b.currency}/${b.areaBasis}/${b.period==='month'?t('tháng','month','月'):b.period==='year'?t('năm','year','年'):t('kỳ thuê','lease term','租期')}`:b?.mode==='negotiable'?t('Thương lượng','Negotiable','面议'):t('Chưa xác định','Not specified','待定')],
  [t('Bàn giao','Required date','交付日期'),d.dateUnknown?t('Chưa xác định','Not specified','待定'):d.availabilityDate],
  [t('Yêu cầu bổ sung','Additional requirements','其他要求'),d.requirements||'—'],
 ];
 return <section className="chat-request chat-enquiry-review" aria-label={t('Kiểm tra yêu cầu trước khi gửi','Review enquiry before sending','发送前核对需求')}><h4>{active?t('Yêu cầu chưa gửi — chờ xác nhận','Unsent enquiry — awaiting confirmation','需求尚未发送 — 等待确认'):t('Bản tóm tắt trong hội thoại','Conversation summary','对话摘要')}</h4><dl className="request-review">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{active&&<p>{t('Nhắn “xác nhận” để gửi, nội dung cần sửa để cập nhật, hoặc “hủy”.','Reply “confirm” to submit, type changes to update, or “cancel”.','回复“确认”提交，输入修改内容更新，或回复“取消”。')}</p>}</section>;
}
