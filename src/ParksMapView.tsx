import {useApp} from './AppContext';
import {HomeParkMap,hasCoords} from './HomeParkMap';
import type {IndustrialParkProfile,Language} from './types';
const c3=(l:Language,vi:string,en:string,zh:string)=>l==='vi'?vi:l==='zh'?zh:en;
/** Directory map: the homepage map + list layout for the parks matching the page filters. No prices or availability figures on pins. */
export function ParksMapView({parks,language}:{parks:IndustrialParkProfile[];language:Language}){
 const {assets}=useApp();
 const missing=parks.length-parks.filter(hasCoords).length;
 return <div className="parks-map-view">
  <HomeParkMap bare parks={parks} assets={assets} language={language}/>
  {missing>0&&<p className="parks-map-note">{c3(language,`${missing} khu công nghiệp chưa có vị trí trên bản đồ; xem ở dạng danh sách.`,`${missing} ${missing===1?'park is':'parks are'} not on the map yet; see the list view.`,`${missing} 个园区暂未标注在地图上，请在列表视图中查看。`)}</p>}
 </div>;
}
