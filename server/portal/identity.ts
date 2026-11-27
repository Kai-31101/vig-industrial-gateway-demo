// Portal identity: per-user accounts (scrypt) and a portal session independent of the admin `vsip_session`.
import {randomBytes,scrypt as scryptCb,timingSafeEqual,createHash} from 'node:crypto';
import type {VercelRequest,VercelResponse} from '@vercel/node';
import type {PoolClient} from 'pg';
import {ApiError} from '../db';

export const PORTAL_COOKIE='vsip_portal';
export const SESSION_ABSOLUTE_HOURS=12;
export const SESSION_IDLE_MINUTES=120;
const N=1<<15,R=8,P=1,KEYLEN=32;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
function scrypt(password:string,salt:Buffer,n=N):Promise<Buffer>{return new Promise((res,rej)=>scryptCb(password.normalize('NFC'),salt,KEYLEN,{N:n,r:R,p:P,maxmem:128*N*R*2},(e,k)=>e?rej(e):res(k)))}
export async function hashPassword(password:string){const salt=randomBytes(16);const key=await scrypt(password,salt);return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`}
const DUMMY='scrypt$32768$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
/** Constant-work verification; pass `null` to burn equivalent time for unknown accounts. */
export async function verifyPassword(password:string,stored:string|null){
 const [scheme,n,salt,key]=(stored||DUMMY).split('$');if(scheme!=='scrypt')return false;
 const derived=await scrypt(password,Buffer.from(salt,'base64'),Number(n));const expected=Buffer.from(key,'base64');
 return !!stored&&expected.length===derived.length&&timingSafeEqual(expected,derived);
}
export function passwordProblem(password:unknown,email:string):string|null{
 if(typeof password!=='string'||password.length<12||password.length>200)return 'password_length';
 if(!/[A-Za-zÀ-ỹ]/.test(password)||!/[\d\W_]/.test(password))return 'password_strength';
 if(password.trim().toLowerCase()===email.toLowerCase())return 'password_email';
 return null;
}
export const normalEmail=(v:unknown)=>typeof v==='string'?v.trim().toLowerCase():'';
export const validPortalEmail=(e:string)=>e.length<=254&&/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(e);

export function readCookie(req:VercelRequest,name:string){return String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||''}
const secure=()=>process.env.NODE_ENV==='production'?'; Secure':'';
export function setPortalCookie(res:VercelResponse,token:string){res.setHeader('Set-Cookie',`${PORTAL_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_ABSOLUTE_HOURS*3600}${secure()}`)}
export function clearPortalCookie(res:VercelResponse){res.setHeader('Set-Cookie',`${PORTAL_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`)}

export interface PortalUser{id:string;email:string;display_name:string}
export interface PortalAuth{user:PortalUser;tokenHash:string}

export async function openSession(c:PoolClient,userId:string){
 const token=randomBytes(32).toString('hex');
 await c.query(`INSERT INTO vsip.portal_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+make_interval(hours=>$3))`,[sha(token),userId,SESSION_ABSOLUTE_HOURS]);
 return token;
}
/** Resolves the portal session or throws 401. Never consults the admin session cookie. */
export async function portalAuth(c:PoolClient,req:VercelRequest):Promise<PortalAuth>{
 const token=readCookie(req,PORTAL_COOKIE);if(!/^[a-f0-9]{64}$/.test(token))throw new ApiError(401,'unauthenticated');
 const tokenHash=sha(token);
 const r=await c.query(`SELECT u.id,u.email,u.display_name,s.last_seen_at<now()-interval '5 minutes' AS touch FROM vsip.portal_sessions s JOIN vsip.portal_users u ON u.id=s.user_id
  WHERE s.token_hash=$1 AND s.expires_at>now() AND s.last_seen_at>now()-make_interval(mins=>$2) AND u.status='active'`,[tokenHash,SESSION_IDLE_MINUTES]);
 if(!r.rowCount)throw new ApiError(401,'unauthenticated');
 if(r.rows[0].touch)await c.query('UPDATE vsip.portal_sessions SET last_seen_at=now() WHERE token_hash=$1',[tokenHash]);
 const {id,email,display_name}=r.rows[0];return {user:{id,email,display_name},tokenHash};
}
export const tokenHashOf=sha;
