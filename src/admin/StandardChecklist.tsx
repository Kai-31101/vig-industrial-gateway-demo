import type {Content,Draft} from './model';
import {isPark,publicationIssues} from './model';
import {useText} from './ui';
const groups=[
 ['Identity','Nhận diện','识别',['name','summary','parkType','totalArea','status'],['name','summary','identity']],
 ['Operator','Đơn vị vận hành','运营商',['operator'],['operator']],
 ['Location','Vị trí','位置',['province','address','coordinates'],['location']],
 ['Phases','Giai đoạn phát triển','开发阶段',['phases'],['phases']],
 ['Availability','Quỹ đất khả dụng','供应情况',['availability'],['availability']],
 ['Connectivity','Kết nối giao thông','交通连接',['connectivity'],['connectivity']],
 ['Utilities','Hạ tầng kỹ thuật','公用设施',['utilities'],['utilities']],
 ['Provincial context','Bối cảnh địa phương','地方概况',['provinceProfile'],[]],
 ['Workforce','Nguồn nhân lực','劳动力',['workforce'],[]],
 ['Target industries','Ngành thu hút đầu tư','目标产业',['suitableIndustries'],['industries']],
 ['Incentives','Ưu đãi đầu tư','投资优惠',['incentives'],['incentives']],
 ['Investment procedure','Quy trình đầu tư','投资流程',['process'],[]],
 ['Logistics','Logistics','物流',['logistics'],[]],
 ['Amenities','Tiện ích','配套设施',['amenities'],[]],
 ['Sustainability','Phát triển bền vững','可持续发展',['sustainability'],[]],
 ['Community','Cộng đồng','社区',['community'],[]],
 ['Existing tenants','Doanh nghiệp hiện hữu','入驻企业',['tenants'],[]],
 ['Media and masterplan','Hình ảnh & quy hoạch','媒体与规划',['media'],['media']],
 ['Legal documents','Hồ sơ pháp lý','法律文件',['documents'],['legal']],
 ['Contact','Liên hệ','联系方式',['contact'],['contact']],
 ['Sources and governance','Nguồn & quản trị dữ liệu','来源与治理',['sourceDocumentId','sourceLanguage','dataOwner','lastVerifiedAt','verifiedBy'],['source']],
] as const;
function present(v:unknown):boolean{if(v==null)return false;if(typeof v==='string')return !!v.trim();if(typeof v==='number')return Number.isFinite(v);if(typeof v==='boolean')return v;if(Array.isArray(v))return v.some(present);if(typeof v==='object'){const x=v as Record<string,unknown>;if('disclosureStatus'in x)return x.disclosureStatus==='not_disclosed'||present(x.value);return Object.entries(x).some(([k,v])=>!['id','_rowId','verificationStatus','unit'].includes(k)&&present(v))}return false}
export function checklist(data:Content,all:Draft[]){const issues=publicationIssues(data,all),values=data as unknown as Record<string,unknown>;const source=isPark(data)?groups:[['Asset identity','Nhận diện sản phẩm','地产识别',['name','description','type','area','unit','transaction'],['name','summary','asset']],['Parent park','KCN liên kết','关联园区',['parkId'],['parkId']],['Image','Hình ảnh','图片',['image'],['media']],['Price','Giá','价格',['price'],['price']]] as const;return source.map(([en,vi,zh,keys,rules])=>{const count=keys.filter(k=>present(values[k])).length,missing=rules.filter(r=>issues.some(i=>i===r||i.startsWith(r+'.')));return {en,vi,zh,missing,state:!count?'missing':missing.length||count<keys.length?'partial':'present'}})}
export function StandardChecklist({data,all}:{data:Content;all:Draft[]}){const t=useText();return <div className="table-scroll"><table className="workflow-table"><thead><tr><th>{t('Nhóm dữ liệu chuẩn','Standard data group','标准数据组')}</th><th>{t('Tình trạng','Coverage','覆盖状态')}</th><th>{t('Điều kiện còn thiếu','Missing publication conditions','缺失发布条件')}</th></tr></thead><tbody>{checklist(data,all).map(g=><tr key={g.en}><td>{t(g.vi,g.en,g.zh)}</td><td><span className="workflow-badge">{g.state==='present'?t('Có dữ liệu','Present','已有数据'):g.state==='partial'?t('Chưa đầy đủ','Partial','部分数据'):t('Chưa có','Missing','暂无数据')}</span></td><td>{g.missing.length?t('Cần bổ sung trước công bố','Required before publication','发布前必须补充'):t('Không có điều kiện bắt buộc còn thiếu','No missing mandatory conditions','无缺失必填条件')}</td></tr>)}</tbody></table></div>}
