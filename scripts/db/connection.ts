import pg from 'pg';
import {loadEnvFile} from 'node:process';
const envFile=process.env.DB_ENV_FILE||'.env.neon.dev';
try{loadEnvFile(envFile)}catch{if(!process.env.DATABASE_URL_UNPOOLED)throw new Error(`Missing ${envFile} or DATABASE_URL_UNPOOLED`)}
const url=process.env.DATABASE_URL_UNPOOLED;
if(!url)throw new Error('DATABASE_URL_UNPOOLED is required');
const parsed=new URL(url);
if(parsed.hostname.includes('-pooler'))throw new Error('Migrations require a direct connection');
if(!parsed.hostname.endsWith('.neon.tech')||parsed.pathname!=='/vsip')throw new Error('Expected the isolated Neon VSIP database');
parsed.searchParams.set('sslmode','verify-full');
export const client=new pg.Client({connectionString:parsed.toString(),connectionTimeoutMillis:15000,statement_timeout:30000});
export async function run(work:()=>Promise<void>){try{await client.connect();await work()}catch(e){console.error(e instanceof Error?e.message:'Database operation failed');process.exitCode=1}finally{await client.end()}}
