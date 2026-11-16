import pg from 'pg';
import {attachDatabasePool} from '@vercel/functions';
const url=process.env.DATABASE_URL;
if(!url)throw new Error('Database is not configured');
export const pool=new pg.Pool({connectionString:url,max:4,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,statement_timeout:20000});
attachDatabasePool(pool);
export async function tx<T>(work:(c:pg.PoolClient)=>Promise<T>):Promise<T>{const c=await pool.connect();try{await c.query('BEGIN');const out=await work(c);await c.query('COMMIT');return out}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
export class ApiError extends Error {constructor(public status:number,public code:string){super(code)}}
