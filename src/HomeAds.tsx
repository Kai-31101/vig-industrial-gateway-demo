import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {useApp} from './AppContext';
import './HomeAds.css';

const titles=['Nhà xưởng cho thuê','Đất công nghiệp cho thuê','Nhà xưởng xây sẵn','Đất công nghiệp','Kho logistics cho thuê','Nhà xưởng theo yêu cầu','Khu công nghiệp xanh','Kho xưởng cho thuê','Mặt bằng sản xuất','Quỹ đất cho doanh nghiệp'];
const pools={top:[[1,3,5],[2,4,6]],bottom:[[2,7,9],[1,8,10]]};

export function AdCarousel({ids,label}:{ids:number[];label:string}) {
  const {language}=useApp();
  const text=(vi:string,en:string,zh:string)=>language==='vi'?vi:language==='zh'?zh:en;
  const [index,setIndex]=useState(0);
  const [paused,setPaused]=useState(false);
  const [hover,setHover]=useState(false);
  const [focus,setFocus]=useState(false);
  const [hidden,setHidden]=useState(document.hidden);
  const [reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);
  useEffect(()=>{
    const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion=()=>setReduced(query?.matches??false);
    const visibility=()=>setHidden(document.hidden);
    query?.addEventListener('change',motion);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{query?.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  useEffect(()=>{
    if(paused||hover||focus||hidden||reduced)return;
    const timer=window.setInterval(()=>setIndex(i=>(i+1)%ids.length),5000);
    return ()=>window.clearInterval(timer);
  },[paused,hover,focus,hidden,reduced,ids.length,index]);
  const id=ids[index];
  const land=[2,4,7,10].includes(id);
  return <div className="ad-carousel" role="region" aria-roledescription="carousel" aria-label={label}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
    onFocusCapture={()=>setFocus(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocus(false);}}>
    <Link className="ad-artwork" to={land?'/industrial-parks':'/find-supply'} aria-label={`${titles[id-1]} — ${text('Xem chi tiết','View details','查看详情')}`}>
      <img src={`/images/ads/industrial-${id}.jpg`} alt={`${titles[id-1]}. ${text('Ảnh minh họa AI. Liên hệ 0900 000 000 là số minh họa.','AI illustration. Contact 0900 000 000 is a placeholder.','AI示意图。0900 000 000为示例号码。')}`} width="2172" height="724" loading="lazy" decoding="async" />
    </Link>
    <div className="ad-toolbar">
      <span>{text('Quảng cáo · Ảnh minh họa','Advertisement · Illustration','广告 · 示意图')}</span>
      <div className="ad-controls">
        <button type="button" aria-label={text('Ảnh trước','Previous ad','上一张')} onClick={()=>setIndex(i=>(i+ids.length-1)%ids.length)}><ChevronLeft size={16}/></button>
        {ids.map((n,i)=><button key={n} type="button" className={`ad-dot ${index===i?'active':''}`} aria-label={text(`Ảnh ${i+1}`,`Ad ${i+1}`,`第${i+1}张`)} aria-current={index===i?'true':undefined} onClick={()=>setIndex(i)}><span/></button>)}
        <button type="button" aria-label={text('Ảnh tiếp','Next ad','下一张')} onClick={()=>setIndex(i=>(i+1)%ids.length)}><ChevronRight size={16}/></button>
        <button type="button" aria-label={paused?text('Tiếp tục tự chuyển','Resume slideshow','继续播放'):text('Dừng tự chuyển','Pause slideshow','暂停播放')} aria-pressed={paused} onClick={()=>setPaused(p=>!p)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button>
      </div>
    </div>
  </div>;
}

export function HomeAds({placement}:{placement:'top'|'bottom'}) {
  return <section className={`page home-ads home-ads-${placement}`} aria-label={placement==='top'?'Quảng cáo sau tìm kiếm':'Quảng cáo sau hồ sơ KCN'}>
    {pools[placement].map((ids,i)=><AdCarousel key={i} ids={ids} label={`Banner ${placement} ${i+1}`}/>)}
  </section>;
}
