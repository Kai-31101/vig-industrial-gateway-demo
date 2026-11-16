import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import type {VercelRequest,VercelResponse} from '@vercel/node';
import {pool,ApiError} from './db';
export const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const cookieName='vsip_session';
export function cookie(req:VercelRequest){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)||''}
export async function session(req:VercelRequest){const token=cookie(req);if(!/^[a-f0-9]{64}$/.test(token))throw new ApiError(401,'session');const r=await pool.query('SELECT * FROM vsip.session_info($1)',[hash(token)]);if(!r.rowCount)throw new ApiError(401,'session');return {...r.rows[0],tokenHash:hash(token)} as {workspace_id:string;scope:'demo'|'internal';revision:number;tokenHash:string}}
export async function limited(req:VercelRequest,bucket:string,max:number,seconds:number){const ip=String(req.headers['x-forwarded-for']||'local').split(',')[0];const key=createHmac('sha256',process.env.SESSION_SECRET!).update(ip).digest('hex');const r=await pool.query('SELECT vsip.limit_request($1,$2,$3) AS allowed',[bucket+':'+key,max,seconds]);if(!r.rows[0].allowed)throw new ApiError(429,'limited')}
export function csrf(req:VercelRequest){if(req.method!=='POST')return;const origin=req.headers.origin;const expected=process.env.APP_ORIGIN||'https://vsip-beta.vercel.app';if(origin!==expected&&!(process.env.NODE_ENV!=='production'&&/^http:\/\/localhost:5173$|^http:\/\/127\.0\.0\.1:5173$/.test(origin||'')))throw new ApiError(403,'origin')}
export function setCookie(res:VercelResponse,token:string){res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`)}
export const newToken=()=>randomBytes(32).toString('hex');
export function validAdminKey(value:unknown){const key=process.env.ADMIN_ACCESS_TOKEN;if(!key||typeof value!=='string')return false;const a=Buffer.from(hash(value)),b=Buffer.from(hash(key));return timingSafeEqual(a,b)}
