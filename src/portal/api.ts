// Portal API client. Authority lives on the server; this only transports requests with the portal cookie.
export class PortalError extends Error{constructor(public status:number,public code:string,public fields?:Record<string,string>){super(code)}}
export async function papi<T=any>(path:string,body?:unknown):Promise<T>{
 const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 let j:any={};try{j=await r.json()}catch{}
 if(!r.ok)throw new PortalError(r.status,j.error||'server',j.fields);
 return j as T;
}
const ERR:Record<string,string>={
 stale:'Nội dung vừa được thay đổi ở nơi khác. Tải lại để xem bản mới nhất rồi thử lại.',locked:'Nội dung đang có bản chờ duyệt hoặc đã duyệt; không thể chỉnh sửa.',archived:'Mặt bằng đã lưu trữ.',
 unchanged:'Chưa có thay đổi so với bản đang công khai.',publication:'Chưa đủ điều kiện công khai.',validation:'Thông tin chưa hợp lệ. Kiểm tra các trường được đánh dấu.',
 permission:'Vai trò hiện tại không có quyền thực hiện thao tác này.',not_found:'Không có quyền truy cập hoặc nội dung không tồn tại.',
 owner_suspended:'Quyền duyệt/xuất bản của Chủ sở hữu đang bị quản trị nền tảng tạm khoá.',no_owner:'KCN chưa có Chủ sở hữu hoạt động; duyệt và xuất bản đang bị khoá.',
 stale_base:'Nội dung công khai đã thay đổi kể từ khi gửi bản này. Tác giả cần rút lại và cập nhật.',reason_required:'Cần nhập lý do từ chối.',self_confirmation_required:'Cần xác nhận tự duyệt nội dung do chính bạn soạn.',
 state:'Trạng thái đã thay đổi. Tải lại trang.',role:'Vai trò không thuộc KCN này.',email:'Email chưa hợp lệ.',already_member:'Người này đã là thành viên.',already_owner:'Người này đã là Chủ sở hữu.',
 dependency:'Thiếu quyền phụ thuộc.',reserved_capability:'Quyền dành riêng Chủ sở hữu không thể cấp.',role_in_use:'Vai trò đang được sử dụng.',template_role:'Không thể xoá vai trò mẫu.',duplicate_name:'Tên vai trò đã tồn tại.',name:'Tên chưa hợp lệ.',
 credentials:'Email hoặc mật khẩu không đúng.',limited:'Thao tác quá nhiều lần. Vui lòng thử lại sau.',unauthenticated:'Phiên đăng nhập đã hết hạn.',origin:'Yêu cầu không hợp lệ.',
 invitation_expired:'Lời mời đã hết hạn.',invitation_revoked:'Lời mời đã bị thu hồi.',invitation_superseded:'Lời mời đã được thay bằng lời mời mới hơn.',invitation_accepted:'Lời mời đã được sử dụng.',invitation_invalid:'Lời mời không còn hiệu lực.',invitation_issuer_invalid:'Người mời không còn quyền Chủ sở hữu; lời mời không còn hiệu lực.',invitation_role_invalid:'Vai trò trong lời mời không còn tồn tại.',
 email_mismatch:'Lời mời này dành cho email khác với tài khoản đang đăng nhập.',sign_in_required:'Email này đã có tài khoản. Đăng nhập để chấp nhận lời mời.',
 not_author:'Chỉ người soạn hoặc Chủ sở hữu được bỏ bản nháp này.',platform_authority_unconfigured:'Chưa cấu hình quyền quản trị nền tảng.',list:'Danh sách chưa hợp lệ.',password_length:'Mật khẩu cần từ 12 ký tự.',password_strength:'Mật khẩu cần có chữ và số hoặc ký tự đặc biệt.',password_email:'Mật khẩu không được trùng email.',no_draft:'Chưa có bản nháp để gửi duyệt.',not_published:'Mặt bằng chưa công khai.',owner_immutable:'Không thể thay đổi Chủ sở hữu tại đây.',removed:'Thành viên đã bị gỡ.',conflict:'Xung đột dữ liệu, vui lòng tải lại.',server:'Có lỗi máy chủ. Vui lòng thử lại.',
};
export const ISSUE:Record<string,string>={name:'Tên cần đủ VI/EN/ZH',summary:'Giới thiệu/Mô tả cần đủ VI/EN/ZH',media:'Cần ảnh đại diện đã duyệt',lease_only:'Chỉ công khai mặt bằng cho thuê',pricing:'Giá cụ thể cần đơn giá > 0',parkId:'KCN chưa công khai',asset:'Thiếu diện tích/đơn vị/loại',price:'Thiếu giá công bố',industries:'Ngành nghề bị hạn chế',identity:'Thiếu định danh KCN',location:'Thiếu vị trí',contact:'Thiếu liên hệ',capabilities:'Quyền chưa hợp lệ'};
export const errText=(e:unknown)=>e instanceof PortalError?(ERR[e.code]||ERR.server):ERR.server;
