import {useId} from 'react';
import './LotusChatIcon.css';

// Reuses the original HCMC Investment Hub lotus and its navy/gold orbit treatment.
export function LotusChatIcon(){
 const ringId=useId();
 return <div className="lotus-chat-icon" aria-hidden="true">
  <span className="lotus-chat-flare"/><span className="lotus-chat-flare lotus-chat-flare-delayed"/>
  <svg className="lotus-chat-ring" viewBox="0 0 73 73" fill="none">
   <defs><linearGradient id={ringId} x1="17" y1="58" x2="59" y2="29" gradientUnits="userSpaceOnUse"><stop stopColor="#02357D"/><stop offset=".45" stopColor="#EECEAF"/><stop offset="1" stopColor="#F08C29"/></linearGradient></defs>
   <circle cx="36.5" cy="36.5" r="34.8" stroke="white" strokeOpacity=".14" strokeWidth=".7"/>
   <circle cx="36.5" cy="36.5" r="35.8" stroke={`url(#${ringId})`} strokeWidth="1.2"/>
  </svg>
  <svg className="lotus-chat-orbit" viewBox="0 0 66 67" fill="none"><circle cx="58.5" cy="2.4" r="2.4" fill="#F08C29"/><circle cx="63" cy="49.5" r="1.6" fill="#EFAB68"/><circle cx="33" cy="64" r="2.5" fill="#EECEAF"/><circle cx="3" cy="11.7" r="3" fill="#536A8E"/></svg>
  <img src="/images/ai-lotus.png" alt="" width="68" height="56"/>
 </div>;
}
