import {useEffect,useState,useRef} from 'react';
import {useApp} from './AppContext';
import './HomeAds.css';
import {adCopy} from './adCopy';
import type {Language} from './types';

const ads=[
  {image:'/images/ads/factory-construction.png',title:{vi:'Xây dựng nhà máy - nhà xưởng trong KCN',en:'Industrial park factory and warehouse construction',zh:'工业园区工厂与厂房建设'}},
  {image:'/images/ads/industrial-catering.png',title:{vi:'Cung cấp suất ăn công nghiệp',en:'Industrial catering services',zh:'工业园区团餐服务'}},
  {image:'/images/ads/vietcombank-vie.png',title:{vi:'Vietcombank – Chung niềm tin, vững tương lai',en:'Vietcombank advertisement',zh:'Vietcombank广告'}},
  {image:'/images/ads/workforce-services.png',title:{vi:'Dịch vụ tuyển dụng, đào tạo và cung cấp nhân lực',en:'Recruitment, training and workforce services',zh:'招聘、培训与人力资源服务'}},
  {image:'/images/ads/advertise-here.png',title:{vi:'Quảng cáo tại đây — Tiếp cận nhà xuất khẩu và nhà đầu tư',en:'Advertise here — Reach exporters & investors',zh:'在此投放广告 — 触达出口商与投资者'}},
];
const pools={top:[[4],[1,3]],bottom:[[2,0],[3,1]]};

export function AdCarousel({ids,label}:{ids:number[];label:string}) {
  const {language}=useApp();
  const text=(vi:string,en:string,zh:string)=>language==='vi'?vi:language==='zh'?zh:en;
  const regionRef=useRef<HTMLDivElement>(null);
  const previewRef=useRef<HTMLDialogElement>(null);
  const [previewId,setPreviewId]=useState<number|null>(null);
  useEffect(()=>{if(previewId!==null)previewRef.current?.showModal();},[previewId]);
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
    if(ids.length<2||offscreen||hover||focus||hidden||reduced||previewId!==null)return;
    const timer=window.setInterval(()=>setIndex(i=>i+1),3000);
    return ()=>window.clearInterval(timer);
  },[offscreen,hover,focus,hidden,reduced,ids.length,index,previewId]);
  const id=ids[index%ids.length];
  return <div ref={regionRef} className="ad-carousel" role="region" aria-roledescription={ids.length>1?'carousel':undefined} aria-label={label}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    onFocusCapture={()=>setFocus(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocus(false);}}>
    {index>0 && <div key={`out-${index}-${language}`} className="ad-slide-out" aria-hidden="true"><AdArtwork id={ids[(index-1)%ids.length]} language={language}/></div>}
    <button type="button" key={`${index}-${language}`} className={`ad-artwork${index>0?' ad-slide-in':''}`} onClick={()=>setPreviewId(id)} aria-label={`${adCopy[id].heading[language]} — ${text('Xem quảng cáo','View advertisement','查看广告')}`}><AdArtwork id={id} language={language}/></button>
    <dialog ref={previewRef} className="ad-preview" onClose={()=>setPreviewId(null)} aria-label={text('Xem quảng cáo','View advertisement','查看广告')}>
      <button type="button" className="ad-preview-close" onClick={()=>previewRef.current?.close()} aria-label={text('Đóng','Close','关闭')}>×</button>
      {previewId!==null&&<AdArtwork id={previewId} language={language}/>}
    </dialog>
  </div>;
}

function AdArtwork({id,language}:{id:number;language:Language}) {
  const copy=adCopy[id];
  return <div className={`ad-localized ad-theme-${id}`} lang={language}>
    <img src={ads[id].image} alt="" aria-hidden="true" width="2172" height="724" decoding="async"/>
    {id===2&&<span className="ad-bank-brand">{language==='vi'?'Chi nhánh Nam Sài Gòn':language==='zh'?'南西贡分行':'South Saigon Branch'}</span>}
    <div className="ad-copy"><strong>{copy.heading[language]}</strong><span>{copy.description[language]}</span><span className="ad-cta">{copy.action[language]} →</span>
      {id!==2&&id!==4&&<small>{language==='vi'?'Liên hệ':language==='zh'?'联系':'Contact'}: 0900 000 000</small>}
    </div>
    <span className="ad-disclosure">{language==='vi'?'Quảng cáo':language==='zh'?'广告':'Ads'}</span>
  </div>;
}

export function HomeAds({placement}:{placement:'top'|'bottom'}) {
  const {language}=useApp();
  return <section className={`page home-ads home-ads-${placement}`} aria-label={language==='vi'?'Quảng cáo':language==='zh'?'广告':'Advertisements'}>
    {pools[placement].map((ids,i)=><AdCarousel key={i} ids={ids} label={`Banner ${placement} ${i+1}`}/>)}
  </section>;
}
