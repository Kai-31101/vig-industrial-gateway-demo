// POST /api/admin/geo/nearby {parkId}: internal sessions only; returns a PREVIEW of nearby places, never saves.
import type {VercelRequest,VercelResponse} from '@vercel/node';
import {tx,ApiError} from './db';
import {limited} from './security';
import {findNearbyDetailed,GeoError} from './geo';
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
