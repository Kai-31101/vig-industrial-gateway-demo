// Canonical chat commands shared by client routing and server intake. Exact whole-message matches only
// (after trimming, lower-casing, removing Vietnamese diacritics and trailing . ! 。 ！): quoted text, questions
// ("cancel?") or sentences that merely contain the word never match.
export const normalizeCommand=(text:string)=>text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/[.!。！]+$/,'').trim();
export const confirmsEnquiry=(text:string)=>['xac nhan','toi xac nhan','dong y gui','gui yeu cau','gui di','confirm','i confirm','yes, send','yes send','send enquiry','确认','确认发送','确认提交','发送需求'].includes(normalizeCommand(text));
export const cancelsEnquiry=(text:string)=>['huy','huy yeu cau','cancel','cancel enquiry','取消','取消需求'].includes(normalizeCommand(text));
