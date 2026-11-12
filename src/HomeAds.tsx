import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {useApp} from './AppContext';
import './HomeAds.css';

const titles=['Nhà xưởng cho thuê','Đất công nghiệp cho thuê','Nhà xưởng xây sẵn','Đất công nghiệp','Kho logistics cho thuê','Nhà xưởng theo yêu cầu','Khu công nghiệp xanh','Kho xưởng cho thuê','Mặt bằng sản xuất','Quỹ đất cho doanh nghiệp'];
const pools={top:[[1,3,5],[2,4,6]],bottom:[[2,7,9],[1,8,10]]};

export function AdCarousel({ids,label}:{ids:number[];label:string}) {
  const {language}=useApp();
  const text=(vi:string,en:string,zh:string)=>language==='vi'?vi:language==='zh'?zh:en;
  const [index,setIndex]=useState(0);
  const [hover,setHover]=useState(false);
  const [focus,setFocus]=useState(false);
  const [hidden,setHidden]=useState(document.hidden);
  const [reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);
  useEffect(()=>{
    ids.forEach(id=>{const image=new Image();image.src=`/images/ads/industrial-${id}.jpg`;});
  },[ids]);
  useEffect(()=>{
    const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion=()=>setReduced(query?.matches??false);
    const visibility=()=>setHidden(document.hidden);
    query?.addEventListener('change',motion);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{query?.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(hover||focus||hidden||reduced)return;
    const timer=window.setInterval(()=>setIndex(i=>i+1),5000);
    return ()=>window.clearInterval(timer);
  },[hover,focus,hidden,reduced,ids.length,index]);
  const id=ids[index%ids.length];
  const land=[2,4,7,10].includes(id);
  return <div className="ad-carousel" role="region" aria-roledescription="carousel" aria-label={label}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    onFocusCapture={()=>setFocus(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocus(false);}}>
    {index>0 && <img key={`out-${index}`} className="ad-slide-out" src={`/images/ads/industrial-${ids[(index-1)%ids.length]}.jpg`} alt="" aria-hidden="true" width="2172" height="724" />}
    <Link key={index} className={`ad-artwork${index>0?' ad-slide-in':''}`} to={land?'/industrial-parks':'/find-supply'} aria-label={`${titles[id-1]} — ${text('Xem chi tiết','View details','查看详情')}`}>
      <img src={`/images/ads/industrial-${id}.jpg`} alt={`${titles[id-1]}. ${text('Ảnh minh họa AI. Liên hệ 0900 000 000 là số minh họa.','AI illustration. Contact 0900 000 000 is a placeholder.','AI示意图。0900 000 000为示例号码。')}`} width="2172" height="724" loading="eager" decoding="async" />
    </Link>

  </div>;
}

export function HomeAds({placement}:{placement:'top'|'bottom'}) {
  return <section className={`page home-ads home-ads-${placement}`} aria-label={placement==='top'?'Quảng cáo sau tìm kiếm':'Quảng cáo sau hồ sơ KCN'}>
    {pools[placement].map((ids,i)=><AdCarousel key={i} ids={ids} label={`Banner ${placement} ${i+1}`}/>)}
  </section>;
}
