import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from './AppContext';
import { StatePanel, emptyCopy } from './EmptyStates';

// Interactive UI review only, mounted by a DEV-only route. Not a network/auth simulator.
export function StatePreview() {
  const { language } = useApp();
  const [state, setState] = useState<'empty'|'no_results'|'loading'|'error'|'forbidden'|'loaded'>('empty');
  const options = {
    empty: ['Chưa có bản ghi','No records yet','暂无记录'],
    no_results: ['Không có kết quả phù hợp','No matching results','没有符合条件的结果'],
    loading: ['Đang tải nội dung','Loading content','正在加载内容'],
    error: ['Chưa tải được nội dung','Content could not be loaded','内容加载失败'],
    forbidden: ['Bạn chưa có quyền truy cập','You do not have access','您没有访问权限'],
    loaded: ['Nội dung đã sẵn sàng','Content is ready','内容已准备就绪'],
  };
  const pick = (v:string[]) => emptyCopy(language,v[0],v[1],v[2]);
  const descriptions = {
    empty: ['Nội dung sẽ xuất hiện tại đây sau khi được công bố. Trong lúc chờ, bạn có thể gửi nhu cầu tìm mặt bằng.','Content appears here once published. Meanwhile, you can submit a property requirement.','内容公开后将在此显示，您也可以先提交场地需求。'],
    no_results: ['Chưa có nội dung phù hợp với điều kiện đã chọn. Xóa bộ lọc để xem lại danh mục.','Nothing matches the selected criteria. Clear filters to see the directory.','没有符合所选条件的内容。请清除筛选查看列表。'],
    loading: ['Vui lòng chờ. Không cần gửi lại thao tác.','Please wait. There is no need to repeat the action.','请稍候，无需重复操作。'],
    error: ['Chưa thể hiển thị dữ liệu. Thử tải lại; không cần nhập lại điều kiện đã chọn.','The data cannot be shown yet. Retry without re-entering your selection.','暂时无法显示数据。重试无需重新输入筛选条件。'],
    forbidden: ['Nội dung này yêu cầu quyền phù hợp. Liên hệ quản trị viên để được kiểm tra quyền truy cập.','This content requires permission. Contact your administrator to review access.','此内容需要相应权限，请联系管理员检查访问权限。'],
    loaded: ['Thao tác phục hồi đã hoàn tất trong bản mô phỏng UI. Không có yêu cầu mạng hoặc thay đổi quyền thật.','Recovery completed in this UI preview. No real network request or permission change occurred.','界面演示中的恢复操作已完成，未发送真实网络请求或更改权限。'],
  };
  return <div className="page page-top"><h1>{emptyCopy(language,'Trạng thái nội dung — Bản xem thử UI','Content states — UI preview','内容状态 — 界面预览')}</h1>
    <p className="preview-note">{emptyCopy(language,'Chỉ mô phỏng hiển thị và thao tác; không thay đổi dữ liệu, không thực hiện phân quyền thật.','Display and interaction preview only; no data changes or real permission enforcement.','仅演示显示及交互，不修改数据，也不执行真实权限控制。')}</p>
    <label className="state-preview-controls">{emptyCopy(language,'Chọn trạng thái','Select state','选择状态')}
      <select value={state} onChange={e=>setState(e.target.value as typeof state)}>{Object.entries(options).map(([key,v])=><option key={key} value={key}>{pick(v)}</option>)}</select>
    </label>
    <StatePanel kind={state==='loaded'?'empty':state} title={pick(options[state])} text={pick(descriptions[state])}
      action={state==='error'||state==='no_results' ? <button className="button primary" onClick={()=>setState('loaded')}>{state==='error'?emptyCopy(language,'Thử tải lại (mô phỏng)','Retry (preview)','重试（演示）'):emptyCopy(language,'Xóa bộ lọc (mô phỏng)','Clear filters (preview)','清除筛选（演示）')}</button> : state==='empty' ? <Link className="button primary" to="/find-supply">{emptyCopy(language,'Gửi nhu cầu tìm mặt bằng','Submit a property requirement','提交场地需求')}</Link> : state!=='loading' ? <Link className="button outline" to="/home">{emptyCopy(language,'Về trang chủ','Back to home','返回首页')}</Link> : undefined}/>
    <Link to="/industrial-parks/vsip-thai-binh?demoState=partial">{emptyCopy(language,'Xem hồ sơ thiếu nhiều trường','View a partial profile','查看资料不完整的档案')}</Link>
  </div>;
}
