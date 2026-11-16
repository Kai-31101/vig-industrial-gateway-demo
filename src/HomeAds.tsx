import {useEffect,useState,useRef} from 'react';
import {useApp} from './AppContext';
import './HomeAds.css';

const ads=[
  {image:'/images/ads/factory-construction.png',title:{vi:'Xây dựng nhà máy - nhà xưởng trong KCN',en:'Industrial park factory and warehouse construction',zh:'工业园区工厂与厂房建设'}},
  {image:'/images/ads/industrial-catering.png',title:{vi:'Cung cấp suất ăn công nghiệp',en:'Industrial catering services',zh:'工业园区团餐服务'}},
  {image:'/images/ads/vietcombank-vie.png',title:{vi:'Vietcombank – Chung niềm tin, vững tương lai',en:'Vietcombank advertisement',zh:'Vietcombank广告'}},
  {image:'/images/ads/workforce-services.png',title:{vi:'Dịch vụ tuyển dụng, đào tạo và cung cấp nhân lực',en:'Recruitment, training and workforce services',zh:'招聘、培训与人力资源服务'}},
];
const pools={top:[[0,2],[1,3]],bottom:[[2,0],[3,1]]};

export function AdCarousel({ids,label}:{ids:number[];label:string}) {
  const {language}=useApp();
  const text=(vi:string,en:string,zh:string)=>language==='vi'?vi:language==='zh'?zh:en;
  const regionRef=useRef<HTMLDivElement>(null);
  const [offscreen,setOffscreen]=useState(false);
  useEffect(()=>{if(typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(([entry])=>setOffscreen(!entry.isIntersecting));if(regionRef.current)observer.observe(regionRef.current);return()=>observer.disconnect()},[]);
  const [index,setIndex]=useState(0);
  const [hover,setHover]=useState(false);
  const [focus,setFocus]=useState(false);
  const [hidden,setHidden]=useState(document.hidden);
  const [reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);
  useEffect(()=>{
    ids.forEach(id=>{const image=new Image();image.src=ads[id].image;});
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
    if(offscreen||hover||focus||hidden||reduced)return;
    const timer=window.setInterval(()=>setIndex(i=>i+1),3000);
    return ()=>window.clearInterval(timer);
  },[offscreen,hover,focus,hidden,reduced,ids.length,index]);
  const id=ids[index%ids.length];
  const ad=ads[id];
  return <div ref={regionRef} className="ad-carousel" role="region" aria-roledescription="carousel" aria-label={label}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    onFocusCapture={()=>setFocus(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocus(false);}}>
    {index>0 && <img key={`out-${index}`} className="ad-slide-out" src={ads[ids[(index-1)%ids.length]].image} alt="" aria-hidden="true" width="2172" height="724" />}
    <a key={index} className={`ad-artwork${index>0?' ad-slide-in':''}`} href={ad.image} target="_blank" rel="noreferrer" aria-label={`${ad.title[language]} — ${text('Xem ảnh quảng cáo','View advertisement','查看广告图片')}`}>
      <img src={ad.image} alt={`${ad.title[language]}. ${id===2?text('Banner do người dùng cung cấp.','User-provided banner.','用户提供的广告。'):text('Ảnh minh họa AI. Liên hệ 0900 000 000 là số minh họa.','AI illustration. Contact 0900 000 000 is a placeholder.','AI示意图。0900 000 000为示例号码。')}`} width="2172" height="724" loading="eager" decoding="async" />
    </a>

  </div>;
}

export function HomeAds({placement}:{placement:'top'|'bottom'}) {
  return <section className={`page home-ads home-ads-${placement}`} aria-label={placement==='top'?'Quảng cáo sau tìm kiếm':'Quảng cáo sau hồ sơ KCN'}>
    {pools[placement].map((ids,i)=><AdCarousel key={i} ids={ids} label={`Banner ${placement} ${i+1}`}/>)}
  </section>;
}
