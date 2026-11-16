import {createHmac,timingSafeEqual} from 'node:crypto';

const normalize=(text:string)=>text.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[.!。！]+$/,'').trim();
export const confirmsEnquiry=(text:string)=>['xac nhan','toi xac nhan','dong y gui','gui yeu cau','gui di','confirm','i confirm','yes, send','yes send','send enquiry','确认','确认发送','确认提交','发送需求'].includes(normalize(text));
export const cancelsEnquiry=(text:string)=>['huy','huy yeu cau','cancel','cancel enquiry','取消','取消需求'].includes(normalize(text));
export function signEnquiry(draft:unknown,session:string,secret:string,now=Date.now()){
 const payload=Buffer.from(JSON.stringify({draft,session,expires:now+30*60*1000})).toString('base64url');
 return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url');
}
export function readEnquiry(token:unknown,session:string,secret:string,now=Date.now()):any|null{
 try{
  if(typeof token!=='string'||token.length>30000)return null;
  const parts=token.split('.');if(parts.length!==2)return null;
  const expected=createHmac('sha256',secret).update(parts[0]).digest();const actual=Buffer.from(parts[1],'base64url');
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  return data.session===session&&Number.isFinite(data.expires)&&data.expires>=now?data.draft:null;
 }catch{return null}
}
