import {createHmac,timingSafeEqual} from 'node:crypto';

// Command phrases are shared with the client so routing and server intake use one exact-match definition.
export {confirmsEnquiry,cancelsEnquiry} from '../src/enquiryCommands';
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
