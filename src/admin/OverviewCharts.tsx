import {useState} from 'react';

/* Lightweight HTML/CSS charts for the manager overview. Palette validated with the dataviz checker:
   series 1 #0d9488, series 2 #b7791f (light surface). Values always render in ink, never series colour. */

type Bar={key:string;label:string;value:number;hint?:string};

/** Column chart for change over time (one series → no legend; the title names it). */
export function ColumnChart({data,caption,unit}:{data:Bar[];caption:string;unit:string}){
 const [hover,setHover]=useState<number|null>(null);
 const raw=Math.max(1,...data.map(d=>d.value)),peak=raw<=2?2:Math.ceil(raw/2)*2,last=data.length-1;
 const ticks=[0,peak/2,peak];
 return <figure className="chart chart-columns" aria-label={caption}>
  <div className="chart-plot" onMouseLeave={()=>setHover(null)}>
   <div className="chart-grid" aria-hidden="true">{ticks.slice().reverse().map(t=><span key={t}><em>{t}</em></span>)}</div>
   <div className="chart-cols">{data.map((d,i)=><button type="button" key={d.key} className={`chart-col ${hover===i?'is-hover':''}`} onMouseEnter={()=>setHover(i)} onFocus={()=>setHover(i)} onBlur={()=>setHover(null)} aria-label={`${d.label}: ${d.value} ${unit}`}>
    <i style={{height:`${d.value/peak*100}%`}}/>{(i===last||hover===i)&&<b className="chart-col-value">{d.value}</b>}
    {hover===i&&<span className="chart-tip" role="tooltip"><strong>{d.value} {unit}</strong>{d.hint||d.label}</span>}
   </button>)}</div>
  </div>
  <div className="chart-axis" aria-hidden="true">{data.map((d,i)=><small key={d.key}>{data.length<=10||i%2===last%2?d.label:''}</small>)}</div>
  <SrTable caption={caption} rows={data.map(d=>[d.hint||d.label,d.value])}/>
 </figure>;
}

/** Ordered stages (funnel) as horizontal bars, one hue; count printed in ink at the bar end. */
export function StageBars({data,caption,onSelect}:{data:Bar[];caption:string;onSelect?:(key:string)=>void}){
 const peak=Math.max(1,...data.map(d=>d.value));
 return <figure className="chart chart-stages" aria-label={caption}><ol>{data.map(d=><li key={d.key}>
  <button type="button" onClick={()=>onSelect?.(d.key)} title={d.hint} aria-label={`${d.label}: ${d.value}`} disabled={!onSelect}>
   <span className="chart-stage-label" title={d.label}>{d.label}</span><span className="chart-stage-track"><i style={{width:`${Math.max(d.value?4:0,d.value/peak*100)}%`}}/></span><b>{d.value}</b>
  </button></li>)}</ol><SrTable caption={caption} rows={data.map(d=>[d.label,d.value])}/></figure>;
}

/** Two-series stacked bars (published vs draft) with legend + direct totals. */
export function StackedBars({data,series,caption,format}:{data:{key:string;label:string;values:[number,number]}[];series:[string,string];caption:string;format:(v:number)=>string}){
 const [hover,setHover]=useState<string|null>(null);
 const peak=Math.max(1,...data.map(d=>d.values[0]+d.values[1]));
 return <figure className="chart chart-stacked" aria-label={caption}>
  <p className="chart-legend"><span><i className="s1"/>{series[0]}</span><span><i className="s2"/>{series[1]}</span></p>
  <ul>{data.map(d=>{const total=d.values[0]+d.values[1];return <li key={d.key} onMouseEnter={()=>setHover(d.key)} onMouseLeave={()=>setHover(null)} tabIndex={0} onFocus={()=>setHover(d.key)} onBlur={()=>setHover(null)} aria-label={`${d.label}: ${series[0]} ${format(d.values[0])}, ${series[1]} ${format(d.values[1])}`}>
   <span className="chart-stage-label">{d.label}</span>
   <span className="chart-stack-track"><i className="s1" style={{width:`${d.values[0]/peak*100}%`}}/><i className="s2" style={{width:`${d.values[1]/peak*100}%`}}/>
    {hover===d.key&&<span className="chart-tip" role="tooltip"><strong>{d.label}</strong>{series[0]}: {format(d.values[0])}<br/>{series[1]}: {format(d.values[1])}</span>}</span>
   <b>{format(total)}</b></li>})}</ul>
  <SrTable caption={caption} rows={data.map(d=>[d.label,`${series[0]} ${format(d.values[0])} · ${series[1]} ${format(d.values[1])}`])}/>
 </figure>;
}

function SrTable({caption,rows}:{caption:string;rows:[string,string|number][]}){
 // A description list (not a table) keeps page-level table queries unambiguous.
 return <dl className="sr-only" aria-label={caption}>{rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}
