// Localized intake wording: [vi, en, zh]. Generic and factual; no VSIP-specific claims.
export type T3=[string,string,string];
export const QUESTIONS:Record<string,T3>={
 assetType:['Bạn cần thuê đất công nghiệp, nhà xưởng xây sẵn, kho bãi hay xây dựng theo yêu cầu?','Are you looking for industrial land, a ready-built factory, a warehouse or build-to-suit?','您需要工业用地、标准厂房、仓库还是定制厂房？'],
 location:['Bạn muốn thuê ở tỉnh hoặc khu vực nào? Có thể trả lời “chưa xác định”.','Which province or region do you prefer? You can say “not specified”.','您希望在哪个省份或区域租赁？也可回答“待定”。'],
 areaMin:['Bạn cần diện tích tối thiểu và tối đa bao nhiêu? Vui lòng ghi đơn vị m², ha hoặc km².','What minimum and maximum area do you need? Include m², ha or km².','您需要的最小和最大面积是多少？请注明m²、ha或km²。'],
 industry:['Ngành sản xuất dự kiến của bạn là gì? Có thể trả lời “chưa xác định”.','What is your intended industry? You can say “not specified”.','您计划从事什么行业？也可回答“待定”。'],
 budget:['Ngân sách của bạn là bao nhiêu (VND/USD, trên m²/ha, theo tháng/năm/kỳ thuê)? Hoặc trả lời “thương lượng” / “chưa xác định”.','What is your budget (VND/USD, per m²/ha, per month/year/lease term)? Or say “negotiable” / “not specified”.','您的预算是多少（VND/USD，每m²/ha，每月/年/租期）？也可回答“面议”或“待定”。'],
 availabilityDate:['Bạn cần bàn giao khi nào? Ghi ngày YYYY-MM-DD hoặc trả lời “chưa xác định”.','When do you need the property? Use YYYY-MM-DD or say “not specified”.','您需要何时交付？请使用YYYY-MM-DD格式或回答“待定”。'],
 organization:['Tên doanh nghiệp của bạn là gì?','What is your company name?','您的企业名称是什么？'],
 contactName:['Ai là người liên hệ cho yêu cầu này?','Who is the contact person for this enquiry?','此需求的联系人是谁？'],
 email:['Vui lòng cung cấp email liên hệ hợp lệ.','Please provide a valid contact email address.','请提供有效的联系邮箱。'],
 phone:['Vui lòng cung cấp số điện thoại liên hệ (8–15 chữ số, có thể kèm mã quốc gia).','Please provide a contact phone number (8–15 digits, optionally with country code).','请提供联系电话（8至15位数字，可包含国家代码）。'],
 parkId:['KCN bạn chọn không còn trong danh mục. Bạn muốn chọn KCN nào, hoặc bỏ lựa chọn này?','That park is no longer in the catalogue. Which park would you like, or should I clear it?','该园区已不在目录中。请选择其他园区，或清除此选项。'],
 assetId:['Mặt bằng chưa khớp KCN đã chọn. Bạn muốn chọn mặt bằng nào, hoặc bỏ lựa chọn này?','The property does not match the selected park. Choose a property or ask me to clear it.','物业与所选园区不匹配。请选择物业或清除此选项。'],
 requirements:['Yêu cầu bổ sung cần ngắn hơn 5.000 ký tự. Bạn tóm tắt lại giúp mình nhé.','Please keep additional requirements below 5,000 characters.','请将其他要求控制在5,000个字符以内。'],
};
export const PAUSE_HINT:T3=['Nếu muốn dừng lại, nhắn “tạm dừng” để giữ bản nháp và tiếp tục xem mặt bằng — chưa có gì được gửi.','If you would rather stop here, say “pause” to keep this draft and keep browsing — nothing will be sent.','如想暂时停下，可回复“暂停”保留草稿并继续浏览——不会发送任何内容。'];
/** Second-attempt wording: explains the expected format and offers a way out. Never waives the field. */
export const RETRY:Record<string,T3>={
 assetType:['Mình chưa xác định được loại mặt bằng. Vui lòng chọn: đất công nghiệp, nhà xưởng xây sẵn, kho bãi hoặc xây dựng theo yêu cầu. Bạn cũng có thể hỏi ý nghĩa từng loại.','I could not match that to a property type. Please choose: industrial land, ready-built factory, warehouse or build-to-suit. You can also ask what each one means.','我未能识别物业类型。请选择：工业用地、标准厂房、仓库或定制厂房。您也可以询问各类型的含义。'],
 location:['Mình chưa nhận ra địa điểm này. Vui lòng nêu tỉnh (ví dụ Hải Phòng, Bình Dương), khu vực (miền Bắc, miền Trung, miền Nam) hoặc trả lời “chưa xác định”.','I could not recognise that location. Name a province (for example Hải Phòng or Bình Dương), a region (North, Central or South), or say “not specified”.','我未能识别该地点。请说明省份（如海防、平阳）、区域（北部、中部、南部），或回答“待定”。'],
 areaMin:['Vui lòng ghi diện tích dạng khoảng kèm đơn vị, ví dụ “10.000–20.000 m²” hoặc “1–2 ha”.','Please give the area as a range with a unit, for example “10,000–20,000 m²” or “1–2 ha”.','请以带单位的范围填写面积，例如“10,000–20,000 m²”或“1–2 ha”。'],
 industry:['Vui lòng nêu hoạt động chính, ví dụ Điện tử hoặc Chế biến thực phẩm, hoặc trả lời “chưa xác định”. Mình sẽ giữ nguyên mô tả của bạn.','Please name the main activity, for example Electronics or Food processing, or say “not specified”. I will keep any description you give.','请说明主要业务，例如电子或食品加工，或回答“待定”。我会保留您的描述。'],
 budget:['Vui lòng ghi ngân sách gồm số tiền, đơn vị tiền tệ, đơn vị diện tích và kỳ hạn (ví dụ “5 USD/m²/tháng”), hoặc trả lời “thương lượng” / “chưa xác định”.','Please give the budget as an amount with currency, area unit and period (for example “5 USD per m² per month”), or say “negotiable” or “not specified”.','请按金额、币种、面积单位和期限填写预算（例如“每月每m² 5 USD”），或回答“面议”/“待定”。'],
 availabilityDate:['Vui lòng ghi ngày dạng YYYY-MM-DD (ví dụ 2027-06-01) hoặc trả lời “chưa xác định”.','Please give a date as YYYY-MM-DD (for example 2027-06-01), or say “not specified”.','请以YYYY-MM-DD格式填写日期（例如2027-06-01），或回答“待定”。'],
 organization:['Vui lòng chỉ nhập tên doanh nghiệp, ví dụ “Công ty TNHH ABC”.','Please type only the company name, for example “ABC Manufacturing Co., Ltd”.','请仅输入企业名称，例如“ABC制造有限公司”。'],
 contactName:['Vui lòng chỉ nhập tên người liên hệ.','Please type only the contact person’s name.','请仅输入联系人姓名。'],
 email:['Email chưa đúng định dạng. Vui lòng nhập dạng ten@congty.com.','That does not look like an email address. Please type it like name@company.com.','邮箱格式不正确，请按 name@company.com 格式填写。'],
 phone:['Số điện thoại cần 8–15 chữ số, có thể kèm mã quốc gia (ví dụ +84 …).','Please type a phone number with 8–15 digits, optionally with a country code (for example +84 …).','电话号码需为8至15位数字，可包含国家代码（例如 +84 …）。'],
};
export function retryText(field:string,attempt:number,i:number){
 const base=RETRY[field]?.[i]||QUESTIONS[field]?.[i]||'';
 return attempt>=2||['organization','contactName','email','phone','areaMin','assetType'].includes(field)?`${base} ${PAUSE_HINT[i]}`:base;
}
export const ISSUE:Record<string,T3>={
 reversed:['Diện tích tối thiểu đang lớn hơn tối đa. Khoảng đúng là bao nhiêu?','The minimum area is larger than the maximum. What is the correct range?','最小面积大于最大面积。正确的范围是多少？'],
 needs_unit:['Con số {n} tính theo m² hay ha?','Is {n} in m² or ha?','{n} 的单位是m²还是ha？'],
 unit_unsupported:['Mình chỉ ghi nhận diện tích theo m², ha hoặc km². Bạn quy đổi giúp sang một trong các đơn vị này nhé.','I can record area only in m², ha or km². Could you give it in one of those units?','面积仅可按m²、ha或km²记录。请换算为其中一种单位。'],
 ambiguous_number:['Để tránh hiểu sai, bạn ghi lại con số không dùng dấu phân cách hàng nghìn giúp mình (ví dụ 2500 m² hoặc 2,5 ha).','To avoid misreading the number, please write it without thousand separators (for example 2500 m² or 2.5 ha).','为避免误读，请不使用千位分隔符重新填写数字（例如2500 m²或2.5 ha）。'],
 area_unknown:['Không sao, bạn vẫn có thể tiếp tục xem mặt bằng mà chưa cần diện tích. Tuy nhiên cần có khoảng diện tích trước khi gửi yêu cầu này. Bạn có thể nêu khoảng ước tính (ví dụ 5.000–10.000 m²), hoặc nhắn “tạm dừng” để giữ bản nháp và xem các mặt bằng.','That is fine — you can keep exploring without a fixed area. An area range is needed before this enquiry can be submitted, though. You can give an estimate (for example 5,000–10,000 m²), or say “pause” to keep this draft and explore properties.','没关系，您可以在不确定面积的情况下继续浏览。但提交本需求前需要提供面积范围。您可以给出估计范围（例如5,000–10,000 m²），或回复“暂停”保留草稿并浏览物业。'],
 type_unknown:['Không sao. Tóm tắt: đất công nghiệp là lô đất để tự xây; nhà xưởng xây sẵn là công trình có sẵn; kho bãi dùng để lưu trữ, phân phối; xây dựng theo yêu cầu là xây theo thông số của bạn. Loại nào phù hợp nhất? Bạn cũng có thể nhắn “tạm dừng” để xem trước.','That is fine. Briefly: industrial land is a plot you build on; a ready-built factory is an existing building; a warehouse is for storage and distribution; build-to-suit is built to your specifications. Which fits best? You can also say “pause” to browse first.','没关系。简单来说：工业用地是自建用的地块；标准厂房是已建成的厂房；仓库用于仓储和分拨；定制厂房按您的规格建设。哪种最合适？您也可以回复“暂停”先浏览。'],
 budget_parts:['Để hoàn tất ngân sách{known}, bạn cho mình biết thêm: {missing}.','To complete the budget{known}, please tell me {missing}.','为完善预算{known}，请补充：{missing}。'],
 calendar:['Ngày này không tồn tại trên lịch. Vui lòng nhập ngày hợp lệ (YYYY-MM-DD) hoặc trả lời “chưa xác định”.','That date does not exist on the calendar. Please give a valid date (YYYY-MM-DD) or say “not specified”.','该日期不存在。请填写有效日期（YYYY-MM-DD）或回答“待定”。'],
 past:['Ngày này đã qua. Vui lòng nhập ngày bàn giao trong tương lai hoặc trả lời “chưa xác định”.','That date is in the past. Please give a future handover date or say “not specified”.','该日期已过。请填写未来的交付日期或回答“待定”。'],
 ambiguous_date:['Đó là ngày/tháng hay tháng/ngày? Vui lòng ghi dạng YYYY-MM-DD.','Is that day/month or month/day? Please write it as YYYY-MM-DD.','这是日/月还是月/日？请使用YYYY-MM-DD格式。'],
 approx:['Mình đã ghi nhận “{approx}”. Bạn muốn để trống ngày cụ thể và giữ mốc thời gian này làm ghi chú, hay cung cấp ngày cụ thể (YYYY-MM-DD)?','I have noted “{approx}”. Should I leave the exact date unspecified and keep that timing as a note, or would you like to give a specific date (YYYY-MM-DD)?','已记录“{approx}”。是否不填写具体日期并将该时间作为备注保留，还是提供具体日期（YYYY-MM-DD）？'],
 invalid_email:['Email chưa đúng định dạng. Vui lòng kiểm tra lại (ví dụ ten@congty.com).','That does not look like a valid email address. Please check it (for example name@company.com).','邮箱格式似乎不正确，请检查（例如 name@company.com）。'],
 invalid_phone:['Đó chưa giống số điện thoại. Vui lòng nhập 8–15 chữ số, có thể kèm mã quốc gia.','That does not look like a phone number. Please give 8–15 digits, optionally with a country code.','这似乎不是电话号码。请填写8至15位数字，可包含国家代码。'],
 contact_unknown:['Không sao. Bộ phận Tiếp thị & Cho thuê nên liên hệ với ai về yêu cầu này? Nếu chưa sẵn sàng, nhắn “tạm dừng” — chưa có gì được gửi.','No problem. Who should Marketing & Leasing contact about this enquiry? If you are not ready, say “pause” — nothing will be sent.','没关系。市场推广与租赁部门应就此需求联系谁？如尚未准备好，请回复“暂停”——不会发送任何内容。'],
 representative:['Cảm ơn bạn. Mình không xác minh được việc đại diện, nên sẽ ghi đúng thông tin bạn cung cấp. Tên doanh nghiệp là doanh nghiệp mà yêu cầu thuê này dành cho (khách hàng của bạn), hoặc công ty của bạn nếu Bộ phận Tiếp thị & Cho thuê nên làm việc trực tiếp với bạn. Yêu cầu này dành cho doanh nghiệp nào?','Thanks. I cannot verify representation, so I will record exactly what you provide. The company name should be the business this enquiry is for (your client), or your own firm if Marketing & Leasing should deal with you directly. Which company is this enquiry for?','谢谢。我无法核实代理关系，因此会如实记录您提供的信息。企业名称应为本需求所服务的企业（您的客户），如市场推广与租赁部门应直接与您联系，也可填写您所在公司。本需求是为哪家企业提出的？'],
 representative_contact:['Người liên hệ là người mà Bộ phận Tiếp thị & Cho thuê nên liên hệ về yêu cầu này — có thể là bạn hoặc khách hàng của bạn. Mình không xác minh được việc đại diện. Ai là người liên hệ?','The contact person is whoever Marketing & Leasing should contact about this enquiry — you or your client. I cannot verify representation. Who should be the contact person?','联系人是市场推广与租赁部门就本需求应联系的人——可以是您，也可以是您的客户。我无法核实代理关系。请问联系人是谁？'],
 refusal:['Mình hiểu — mình sẽ không ghi nhận thông tin này. {field} là thông tin bắt buộc để gửi yêu cầu, nên yêu cầu chưa thể gửi nếu thiếu. Bạn có thể nhắn “tạm dừng” để giữ bản nháp và tiếp tục xem mặt bằng, hoặc “hủy” để bỏ bản nháp.','Understood — I will not record it. {field} is required to submit this enquiry, so it cannot be sent without it. You can say “pause” to keep this draft and keep browsing, or “cancel” to discard it.','明白，我不会记录该信息。提交本需求必须提供{field}，缺少则无法发送。您可以回复“暂停”保留草稿并继续浏览，或回复“取消”放弃草稿。'],
 refusal_repeat:['Mình hiểu. Yêu cầu vẫn chưa được gửi. Nhắn “tạm dừng” để tiếp tục xem mặt bằng hoặc “hủy” để bỏ bản nháp.','Understood. The enquiry remains unsent. Say “pause” to keep browsing or “cancel” to discard the draft.','明白。需求仍未发送。回复“暂停”继续浏览，或回复“取消”放弃草稿。'],
};
export const FIELD_LABEL:Record<string,T3>={
 assetType:['Loại mặt bằng','Property type','物业类型'],areaMin:['Diện tích','Area','面积'],organization:['Tên doanh nghiệp','Company name','企业名称'],contactName:['Người liên hệ','Contact person','联系人'],email:['Email','Email','邮箱'],phone:['Số điện thoại','Phone number','电话号码'],
 location:['Địa điểm','Location','地点'],industry:['Ngành','Industry','行业'],budget:['Ngân sách','Budget','预算'],availabilityDate:['Ngày bàn giao','Handover date','交付日期'],
};
export const PURPOSE:Record<string,T3>={
 organization:['Tên doanh nghiệp giúp Bộ phận Tiếp thị & Cho thuê biết doanh nghiệp nào đang gửi yêu cầu thuê để phản hồi phù hợp.','The company name identifies the business making the leasing enquiry, so Marketing & Leasing can prepare a relevant reply.','企业名称用于识别提出租赁需求的企业，以便市场推广与租赁部门准备相应回复。'],
 contact:['Thông tin liên hệ giúp Bộ phận Tiếp thị & Cho thuê phản hồi yêu cầu này, và chỉ được gửi đi sau khi bạn xác nhận bản tóm tắt.','Contact details let Marketing & Leasing reply to this enquiry, and they are only sent after you confirm the review summary.','联系方式用于市场推广与租赁部门回复本需求，且仅在您确认摘要后才会发送。'],
 areaMin:['Khoảng diện tích giúp xác định mặt bằng nào có thể phù hợp.','The area range shows which properties could fit your needs.','面积范围用于判断哪些物业可能适合您。'],
 other:['Thông tin này giúp thu hẹp các mặt bằng phù hợp; bạn có thể trả lời “chưa xác định”.','This helps narrow down suitable properties; you can say “not specified”.','此信息有助于筛选合适的物业；您也可以回答“待定”。'],
 assetType:['Loại mặt bằng quyết định những lựa chọn nào phù hợp với bạn.','The property type determines which options are relevant to you.','物业类型决定哪些选项与您相关。'],
};
export const CONTINUE_OR_PAUSE:T3=['Bạn có thể tiếp tục, hoặc nhắn “tạm dừng” để giữ bản nháp và xem mặt bằng.','You can continue, or say “pause” to keep this draft and keep browsing.','您可以继续，或回复“暂停”保留草稿并继续浏览。'];
export const ACK={
 locationUnknown:['Mình sẽ để trống địa điểm.','I will leave the location unspecified.','地点暂不指定。'] as T3,
 location:['Đã ghi nhận địa điểm: {v}.','Noted location: {v}.','已记录地点：{v}。'] as T3,
 area:['Đã ghi nhận diện tích: {v}.','Noted area: {v}.','已记录面积：{v}。'] as T3,
 industryUnknown:['Mình sẽ để trống ngành.','I will leave the industry unspecified.','行业暂不指定。'] as T3,
 industryUnmapped:['Mình đã giữ nguyên mô tả của bạn; nhóm ngành chuẩn để “chưa xác định” và mức độ phù hợp vẫn cần được xác nhận.','I have kept your description; the standard industry category stays unspecified, and suitability still needs confirmation.','已保留您的描述；标准行业类别暂为“待定”，适用性仍需确认。'] as T3,
 budgetUnknown:['Mình sẽ để trống ngân sách.','I will leave the budget unspecified.','预算暂不指定。'] as T3,
 budgetNegotiable:['Đã ghi nhận ngân sách: thương lượng.','Noted: budget negotiable.','已记录预算：面议。'] as T3,
 dateUnknown:['Mình sẽ để trống ngày bàn giao.','I will leave the handover date unspecified.','交付日期暂不指定。'] as T3,
 dateApprox:['Mình sẽ để trống ngày cụ thể và ghi chú “{v}”.','I will leave the exact date unspecified and keep “{v}” as a note.','具体日期暂不指定，并备注“{v}”。'] as T3,
 parkCleared:['Mình đã bỏ KCN đã chọn trước đó vì không thuộc {v}.','I removed the previously selected park because it is not in {v}.','已移除之前选择的园区，因为它不在{v}。'] as T3,
 updated:['Mình đã cập nhật thông tin.','I have updated the details.','已更新信息。'] as T3,
 resumed:['Tiếp tục yêu cầu của bạn.','Back to your enquiry.','继续您的需求。'] as T3,
};
export const PAUSED:T3=['Mình đã tạm dừng yêu cầu của bạn. Chưa có gì được gửi. Nhắn “tiếp tục” hoặc nhấn Tiếp tục yêu cầu khi bạn sẵn sàng. Lưu ý: bản nháp chỉ được giữ trong cửa sổ trình duyệt này.','I have paused your enquiry. Nothing has been sent. Say “resume” or tap Resume enquiry when you are ready. Note: the draft is kept only in this browser window.','已暂停您的需求，尚未发送任何内容。准备好后请回复“继续”或点击“继续需求”。注意：草稿仅保存在当前浏览器窗口中。'];
export const PAUSED_HINT:T3=['Yêu cầu của bạn đang tạm dừng — nhắn “tiếp tục” khi bạn sẵn sàng.','Your enquiry is paused — say “resume” when you are ready.','您的需求已暂停——准备好后请回复“继续”。'];
export const CONTINUE_PREFIX:T3=['Để tiếp tục yêu cầu:','To continue your enquiry:','继续您的需求：'];
export const REVIEW:T3=['Kiểm tra bản tóm tắt bên dưới. Nhắn “xác nhận” để gửi và đồng ý cho Bộ phận Tiếp thị & Cho thuê liên hệ theo thông tin này. Bạn cũng có thể nhắn nội dung cần sửa hoặc “hủy”. Chưa có yêu cầu nào được gửi.','Review the summary below. Reply “confirm” to submit and agree to Marketing & Leasing contacting you using these details. You can also type changes or “cancel”. Nothing has been submitted yet.','请核对下方摘要。回复“确认”即提交并同意市场推广与租赁部门通过这些信息联系您。也可输入修改内容或“取消”。目前尚未提交。'];
export const REGION_LABEL:Record<string,T3>={North:['miền Bắc','the North','北部'],Central:['miền Trung','Central Vietnam','中部'],South:['miền Nam','the South','南部']};
export const BUDGET_PART:Record<string,T3>={amount:['số tiền','the amount','金额'],currency:['đơn vị tiền tệ (VND hoặc USD)','the currency (VND or USD)','币种（VND或USD）'],areaBasis:['tính trên m² hay ha','whether it is per m² or per ha','按m²还是按ha计'],period:['theo tháng, theo năm hay cả kỳ thuê','whether it is per month, per year or for the whole lease term','按月、按年还是整个租期']};
export const fill=(s:string,v:Record<string,string>)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
