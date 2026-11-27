// Park portal capability catalogue. Shared by the server (authority) and the UI (presentation only).
export const RESERVED_CAPS=['review.decide','publish','members.manage','roles.manage'] as const;
export const GRANTABLE_CAPS=['park.view','property.view','review.view','activity.view','members.view','profile.edit','property.edit','property.create','revision.submit','archive.request'] as const;
export type GrantableCap=typeof GRANTABLE_CAPS[number];
export type Cap=GrantableCap|typeof RESERVED_CAPS[number];
export const ALL_CAPS:Cap[]=[...GRANTABLE_CAPS,...RESERVED_CAPS];
/** A capability requires each listed capability (closure enforced on save). */
export const CAP_DEPS:Partial<Record<GrantableCap,GrantableCap[]>>={
 'profile.edit':['park.view'],'property.edit':['property.view'],'property.create':['property.edit'],
 'revision.submit':['review.view'],'archive.request':['property.edit'],
};
export const EDITOR_CAPS:GrantableCap[]=['park.view','property.view','review.view','activity.view','members.view','profile.edit','property.edit','property.create','revision.submit','archive.request'];
export const VIEWER_CAPS:GrantableCap[]=['park.view','property.view','review.view','activity.view'];
export const CAP_GROUPS:{group:string;reserved?:boolean;items:[Cap,string][]}[]=[
 {group:'Xem',items:[['park.view','Xem tổng quan & hồ sơ KCN'],['property.view','Xem danh sách mặt bằng'],['review.view','Xem bản đề xuất & so sánh'],['activity.view','Xem nhật ký hoạt động'],['members.view','Xem danh sách thành viên']]},
 {group:'Soạn nội dung',items:[['profile.edit','Soạn nháp hồ sơ KCN'],['property.edit','Soạn nháp mặt bằng'],['property.create','Tạo mặt bằng mới (nháp)'],['revision.submit','Gửi duyệt / rút lại bản của mình'],['archive.request','Đề nghị lưu trữ mặt bằng']]},
 {group:'Dành riêng Chủ sở hữu (không cấp được)',reserved:true,items:[['review.decide','Duyệt / từ chối'],['publish','Xuất bản / lưu trữ công khai'],['members.manage','Quản lý thành viên'],['roles.manage','Quản lý vai trò & quyền']]},
];
export const CAP_LABEL:Record<string,string>=Object.fromEntries(CAP_GROUPS.flatMap(g=>g.items));
export const isGrantable=(c:string):c is GrantableCap=>(GRANTABLE_CAPS as readonly string[]).includes(c);
/** Returns the missing dependency, or null when the set is closed. */
export function missingDependency(caps:readonly string[]):string|null{for(const c of caps){for(const d of CAP_DEPS[c as GrantableCap]||[])if(!caps.includes(d))return `${c}->${d}`}return null}
/** Adds dependencies of `cap` (UI helper for the role matrix). */
export function withDependencies(caps:readonly string[],cap:GrantableCap):GrantableCap[]{const out=new Set<GrantableCap>(caps.filter(isGrantable));const add=(c:GrantableCap)=>{if(out.has(c))return;out.add(c);(CAP_DEPS[c]||[]).forEach(add)};out.delete(cap);add(cap);return GRANTABLE_CAPS.filter(c=>out.has(c))}
/** Removes `cap` and everything depending on it (UI helper). */
export function withoutDependents(caps:readonly string[],cap:GrantableCap):GrantableCap[]{const rm=new Set<string>([cap]);let grew=true;while(grew){grew=false;for(const [c,ds] of Object.entries(CAP_DEPS))if(!rm.has(c)&&ds!.some(d=>rm.has(d))){rm.add(c);grew=true}}return GRANTABLE_CAPS.filter(c=>caps.includes(c)&&!rm.has(c))}
