// POST /api/admin/geo/nearby {parkId}: internal sessions only; returns a PREVIEW of nearby places, never saves.
import type {VercelRequest,VercelResponse} from '@vercel/node';
import {tx,pool,ApiError} from './db';
import {limited} from './security';
import {findNearbyDetailed,GeoError,GOONG_BASE} from './geo';
export async function adminGeoNearby(req:VercelRequest,res:VercelResponse,s:{scope:string;workspace_id:string},body:any){
 if(s.scope!=='internal')throw new ApiError(403,'permission');
 await limited(req,'geo-nearby',20,3600);
 const parkId=typeof body?.parkId==='string'?body.parkId:'';if(!parkId||parkId.length>200)throw new ApiError(400,'validation');
 const park=await tx(async c=>{await c.query("SELECT set_config('app.workspace_id',$1,true)",[s.workspace_id]);return (await c.query("SELECT payload FROM vsip.content_items WHERE workspace_id=$1 AND kind='park' AND id=$2",[s.workspace_id,parkId])).rows[0]?.payload});
 if(!park)throw new ApiError(404,'not_found');
 try{const {places,warnings}=await findNearbyDetailed({id:parkId,province:park.province,coordinates:park.coordinates,name:park.name},{});return res.json({parkId,places,warnings})}
 catch(e){
  if(e instanceof GeoError)throw new ApiError(e.code==='goong_key_missing'?503:e.code==='bad_origin'?400:502,e.code==='bad_origin'?'validation':e.code);
  throw new ApiError(502,'geo_failed');
 }
}

/** GET /api/geo/route?kind=park|asset&id=&place=&mode=car|truck: public. Origin (asset lot, else its park) and destination (a published park place)
 *  come ONLY from vsip.public_catalogue; the client never sends coordinates. Goong key stays on the server. */
const SAFE_ID=/^[A-Za-z0-9._:-]{1,200}$/,isPt=(c:any)=>c&&Number.isFinite(c.lat)&&Number.isFinite(c.lng)&&Math.abs(c.lat)<=90&&Math.abs(c.lng)<=180;
const stripHtml=(h:unknown)=>String(h||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
export async function publicGeoRoute(req:VercelRequest,res:VercelResponse){
 await limited(req,'route',120,3600);
 const url=new URL(req.url||'/','http://localhost'),q=(k:string)=>{const v=(req.query as any)?.[k];return typeof v==='string'?v:url.searchParams.get(k)||''};
 const kind=q('kind'),id=q('id'),place=q('place'),mode=q('mode')||'car';
 if(!['park','asset'].includes(kind)||!SAFE_ID.test(id)||!SAFE_ID.test(place)||!['car','truck'].includes(mode))throw new ApiError(400,'validation');
 const row=async(k:string,i:string)=>(await pool.query('SELECT payload FROM vsip.public_catalogue WHERE kind=$1 AND id=$2',[k,i])).rows[0]?.payload;
 const first=await row(kind,id);if(!first)throw new ApiError(404,'not_found');
 const park=kind==='park'?first:await row('park',String(first.parkId||''));if(!park)throw new ApiError(404,'not_found');
 const dest=(Array.isArray(park.places)?park.places:[]).find((p:any)=>p?.id===place)?.coordinates;
 const origin=kind==='asset'&&isPt(first.coordinates)?first.coordinates:park.coordinates;
 if(!isPt(dest)||!isPt(origin))throw new ApiError(404,'not_found');
 const key=process.env.GOONG_API_KEY;if(!key)throw new ApiError(503,'goong_key_missing');
 let j:any;
 try{
  const qs=new URLSearchParams({origin:`${origin.lat},${origin.lng}`,destination:`${dest.lat},${dest.lng}`,vehicle:mode,api_key:key});
  const r=await fetch(`${GOONG_BASE}/direction?${qs}`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('http');j=await r.json();
 }catch{throw new ApiError(502,'goong_failed')}
 const rt=j?.routes?.[0],leg=rt?.legs?.[0],points=rt?.overview_polyline?.points;
 if(!leg||typeof points!=='string'||!points||!Number.isFinite(leg.distance?.value)||!Number.isFinite(leg.duration?.value))throw new ApiError(502,'no_route');
 const steps=(Array.isArray(leg.steps)?leg.steps:[]).map((s:any)=>({text:stripHtml(s.html_instructions||s.instructions),distanceM:Math.round(Number(s.distance?.value)||0)})).filter((s:any)=>s.text);
 res.setHeader('Cache-Control','public, s-maxage=604800, stale-while-revalidate=86400');
 return res.json({distanceM:Math.round(leg.distance.value),durationS:Math.round(leg.duration.value),polyline:points,steps});
}
