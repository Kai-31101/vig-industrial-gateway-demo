// Portal-editable field allowlist and flat projection. Shared by server (authority) and UI (labels/inputs).
import type {IndustrialAsset,IndustrialParkProfile} from '../types';
export type FieldKind='text'|'textarea'|'number'|'date'|'email'|'select'|'image'|'list';
export interface FieldDef{key:string;label:string;kind:FieldKind;options?:[string,string][];required?:boolean;group?:string}
export const PARK_STATUS:[string,string][]=[['operational','Đang hoạt động'],['developing','Đang phát triển'],['planned','Quy hoạch'],['unknown','Chưa xác định']];
export const ASSET_TYPES:[string,string][]=[['industrial_land','Đất công nghiệp'],['ready_built_factory','Nhà xưởng xây sẵn'],['warehouse','Kho xây sẵn'],['build_to_suit','Xây theo yêu cầu']];
export const TRANSACTIONS:[string,string][]=[['lease','Cho thuê'],['sale','Bán']];
/** Operational availability (R11). Existing records default to 'unknown'; vacancy is never inferred. */
export const LEASING_STATUS:[string,string][]=[['unknown','Chưa xác định'],['available','Còn trống'],['reserved','Đã giữ chỗ'],['leased','Đã cho thuê']];
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
