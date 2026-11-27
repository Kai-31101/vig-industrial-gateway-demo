// Portal-editable field allowlist and flat projection. Shared by server (authority) and UI (labels/inputs).
import type {IndustrialAsset,IndustrialParkProfile} from '../types';
export type FieldKind='text'|'textarea'|'number'|'date'|'email'|'select'|'image'|'list';
export interface FieldDef{key:string;label:string;kind:FieldKind;options?:[string,string][];required?:boolean;group?:string}
export const PARK_STATUS:[string,string][]=[['operational','Đang hoạt động'],['developing','Đang phát triển'],['planned','Quy hoạch'],['unknown','Chưa xác định']];
export const ASSET_TYPES:[string,string][]=[['industrial_land','Đất công nghiệp'],['ready_built_factory','Nhà xưởng xây sẵn'],['warehouse','Kho xây sẵn'],['build_to_suit','Xây theo yêu cầu']];
export const TRANSACTIONS:[string,string][]=[['lease','Cho thuê'],['sale','Bán']];
/** Operational availability (R11). Existing records default to 'unknown'; vacancy is never inferred. */
export const LEASING_STATUS:[string,string][]=[['unknown','Chưa xác định'],['available','Còn trống'],['reserved','Đã giữ chỗ'],['leased','Đã cho thuê']];
/** Tri-state: an unanswered VAT question is stored as absent, never as "excluded". */
export const VAT_OPTIONS:[string,string][]=[['','Chưa xác định'],['true','Đã gồm VAT'],['false','Chưa gồm VAT']];
export const PRICE_MODES:[string,string][]=[['not_available','Liên hệ / chưa công bố'],['negotiable','Thương lượng'],['specific','Giá cụ thể']];
export const PARK_FIELDS:FieldDef[]=[
 {key:'name.vi',label:'Tên KCN (VI)',kind:'text',required:true,group:'Định danh'},{key:'name.en',label:'Tên KCN (EN)',kind:'text',required:true,group:'Định danh'},{key:'name.zh',label:'Tên KCN (ZH)',kind:'text',required:true,group:'Định danh'},
 {key:'province',label:'Tỉnh/thành',kind:'text',required:true,group:'Vị trí & quy mô'},{key:'address.vi',label:'Địa chỉ (VI)',kind:'text',required:true,group:'Vị trí & quy mô'},
 {key:'totalArea',label:'Tổng diện tích (ha)',kind:'number',required:true,group:'Vị trí & quy mô'},{key:'status',label:'Tình trạng hoạt động',kind:'select',options:PARK_STATUS,required:true,group:'Vị trí & quy mô'},
 {key:'summary.vi',label:'Giới thiệu (VI)',kind:'textarea',required:true,group:'Giới thiệu'},{key:'summary.en',label:'Giới thiệu (EN)',kind:'textarea',required:true,group:'Giới thiệu'},{key:'summary.zh',label:'Giới thiệu (ZH)',kind:'textarea',required:true,group:'Giới thiệu'},
 {key:'contact.email',label:'Email liên hệ',kind:'email',group:'Liên hệ'},{key:'contact.phone',label:'Điện thoại',kind:'text',group:'Liên hệ'},
];
export const ASSET_FIELDS:FieldDef[]=[
 {key:'name.vi',label:'Tên mặt bằng (VI)',kind:'text',required:true,group:'Định danh'},{key:'name.en',label:'Tên mặt bằng (EN)',kind:'text',required:true,group:'Định danh'},{key:'name.zh',label:'Tên mặt bằng (ZH)',kind:'text',required:true,group:'Định danh'},
 {key:'type',label:'Loại mặt bằng',kind:'select',options:ASSET_TYPES,required:true,group:'Thông tin'},{key:'transaction',label:'Hình thức',kind:'select',options:TRANSACTIONS,required:true,group:'Thông tin'},
 {key:'leasingStatus',label:'Tình trạng cho thuê',kind:'select',options:LEASING_STATUS,group:'Thông tin'},
 {key:'area',label:'Diện tích',kind:'number',required:true,group:'Thông tin'},{key:'unit',label:'Đơn vị',kind:'select',options:[['m²','m²'],['ha','ha']],required:true,group:'Thông tin'},
 {key:'availableFrom',label:'Bàn giao từ ngày',kind:'date',group:'Thông tin'},
 {key:'powerMva',label:'Công suất điện (MVA)',kind:'number',group:'Thông tin'},
 {key:'industries',label:'Ngành nghề phù hợp (cách nhau bởi dấu phẩy)',kind:'list',group:'Thông tin'},
 {key:'lotCode',label:'Mã lô (tối đa 12 ký tự)',kind:'text',group:'Thông tin'},
 {key:'zone.vi',label:'Phân khu / giai đoạn (VI)',kind:'text',group:'Thông tin'},{key:'zone.en',label:'Phân khu / giai đoạn (EN)',kind:'text',group:'Thông tin'},{key:'zone.zh',label:'Phân khu / giai đoạn (ZH)',kind:'text',group:'Thông tin'},
 {key:'waterM3Day',label:'Cấp nước (m³/ngày)',kind:'number',group:'Thông tin'},
 {key:'specs.dimensions',label:'Kích thước (vd. 400 × 500 m)',kind:'text',group:'Thông số kỹ thuật'},{key:'specs.frontage.vi',label:'Mặt tiền (VI)',kind:'text',group:'Thông số kỹ thuật'},{key:'specs.frontage.en',label:'Mặt tiền (EN)',kind:'text',group:'Thông số kỹ thuật'},{key:'specs.frontage.zh',label:'Mặt tiền (ZH)',kind:'text',group:'Thông số kỹ thuật'},{key:'specs.coverageMaxPct',label:'Mật độ xây dựng tối đa (%)',kind:'number',group:'Thông số kỹ thuật'},{key:'specs.leaseTermUntil',label:'Thời hạn thuê đất đến ngày',kind:'date',group:'Thông số kỹ thuật'},
 {key:'specs.clearHeightM',label:'Chiều cao thông thủy (m)',kind:'number',group:'Thông số kỹ thuật'},{key:'specs.floorLoadTonM2',label:'Tải trọng sàn (tấn/m²)',kind:'number',group:'Thông số kỹ thuật'},{key:'specs.officeAreaM2',label:'Diện tích văn phòng (m²)',kind:'number',group:'Thông số kỹ thuật'},{key:'specs.dockDoors',label:'Số cửa/bến container',kind:'number',group:'Thông số kỹ thuật'},{key:'specs.floors',label:'Số tầng',kind:'number',group:'Thông số kỹ thuật'},{key:'specs.builtYear',label:'Năm hoàn thành',kind:'number',group:'Thông số kỹ thuật'},
 {key:'specs.fireSystem.vi',label:'Hệ thống PCCC (VI)',kind:'text',group:'Thông số kỹ thuật'},{key:'specs.fireSystem.en',label:'Hệ thống PCCC (EN)',kind:'text',group:'Thông số kỹ thuật'},{key:'specs.fireSystem.zh',label:'Hệ thống PCCC (ZH)',kind:'text',group:'Thông số kỹ thuật'},{key:'specsAsOf',label:'Ngày cập nhật thông số',kind:'date',group:'Thông số kỹ thuật'},
 {key:'terms.vatIncluded',label:'Giá đã gồm VAT?',kind:'select',options:VAT_OPTIONS,group:'Điều kiện thuê'},{key:'terms.minLeaseYears',label:'Thời hạn thuê tối thiểu (năm)',kind:'number',group:'Điều kiện thuê'},{key:'terms.depositMonths',label:'Đặt cọc (số tháng)',kind:'number',group:'Điều kiện thuê'},
 {key:'terms.paymentNote.vi',label:'Điều kiện thanh toán (VI)',kind:'text',group:'Điều kiện thuê'},{key:'terms.paymentNote.en',label:'Điều kiện thanh toán (EN)',kind:'text',group:'Điều kiện thuê'},{key:'terms.paymentNote.zh',label:'Điều kiện thanh toán (ZH)',kind:'text',group:'Điều kiện thuê'},{key:'terms.feeNote.vi',label:'Phí quản lý / hạ tầng (VI)',kind:'text',group:'Điều kiện thuê'},{key:'terms.feeNote.en',label:'Phí quản lý / hạ tầng (EN)',kind:'text',group:'Điều kiện thuê'},{key:'terms.feeNote.zh',label:'Phí quản lý / hạ tầng (ZH)',kind:'text',group:'Điều kiện thuê'},
 {key:'pricing.mode',label:'Giá',kind:'select',options:PRICE_MODES,group:'Giá'},{key:'pricing.amount',label:'Đơn giá',kind:'number',group:'Giá'},
 {key:'pricing.currency',label:'Tiền tệ',kind:'select',options:[['USD','USD'],['VND','VND']],group:'Giá'},{key:'pricing.areaBasis',label:'Theo',kind:'select',options:[['m²','m²'],['ha','ha']],group:'Giá'},{key:'pricing.period',label:'Kỳ',kind:'select',options:[['month','tháng'],['year','năm'],['term','kỳ thuê']],group:'Giá'},
 {key:'image',label:'Ảnh đại diện (ảnh đã duyệt của KCN)',kind:'image',required:true,group:'Ảnh'},
 {key:'description.vi',label:'Mô tả (VI)',kind:'textarea',required:true,group:'Mô tả'},{key:'description.en',label:'Mô tả (EN)',kind:'textarea',required:true,group:'Mô tả'},{key:'description.zh',label:'Mô tả (ZH)',kind:'textarea',required:true,group:'Mô tả'},
];
export const fieldsFor=(kind:'park'|'asset')=>kind==='park'?PARK_FIELDS:ASSET_FIELDS;
const get=(o:any,path:string)=>path.split('.').reduce((v,k)=>v==null?undefined:v[k],o);
/** Flat, display-safe projection of the editable fields (strings; '' for empty). */
export function projectFields(kind:'park'|'asset',data:IndustrialParkProfile|IndustrialAsset|null|undefined):Record<string,string>{
 const out:Record<string,string>={};if(!data)return out;
 for(const f of fieldsFor(kind)){let v:any=f.key==='totalArea'?get(data,'totalArea.value'):get(data,f.key);out[f.key]=Array.isArray(v)?v.join(', '):v==null?(f.key==='leasingStatus'?'unknown':''):String(v)}
 return out;
}
export const optionLabel=(f:FieldDef,v:string)=>f.kind==='image'?(v.split('/').pop()||v):f.options?.find(o=>o[0]===v)?.[1]??v;
