import {useRef,useLayoutEffect} from 'react';
import type {Language} from './types';
export const areaFactors = {m2:1,ha:10000,km2:1000000};
export type AreaUnit = keyof typeof areaFactors;
export function convertArea(value:string,from:AreaUnit,to:AreaUnit){
  return value === '' || value === '.' ? value : String(Number((Number(value)*areaFactors[from]/areaFactors[to]).toPrecision(15)));
}
export function formatArea(value:string,language:Language){
  if(!value)return '';
  const [integer,fraction]=value.split('.');
  const group=language==='vi'?'.':',';
  return (integer||'0').replace(/\B(?=(\d{3})+(?!\d))/g,group)+(fraction===undefined?'':(language==='vi'?',':'.')+fraction);
}
export function parseArea(value:string,language:Language){
  const raw=value.replace(/[\s\u00a0\u202f]/g,'').split(language==='vi'?'.':',').join('').replace(language==='vi'?',':'.','.');
  return /^\d*(\.\d*)?$/.test(raw)?raw:null;
}
export function AreaInput({value,onChange,language}:{value:string;onChange:(value:string)=>void;language:Language}){
  const ref=useRef<HTMLInputElement>(null);
  const caret=useRef<number|null>(null);
  useLayoutEffect(()=>{const input=ref.current,before=caret.current;caret.current=null;if(!input||before===null||document.activeElement!==input)return;
    const decimal=language==='vi'?',':'.';let at=0,count=0;
    while(at<input.value.length&&count<before){const c=input.value[at++];if(/\d/.test(c)||c===decimal)count++}input.setSelectionRange(at,at);
  },[value,language]);
  return <input ref={ref} type="text" inputMode="decimal" autoComplete="off" value={formatArea(value,language)} onChange={e=>{
    const text=e.target.value, decimal=language==='vi'?',':'.';
    const meaningful=(s:string)=>[...s].filter(c=>/\d/.test(c)||c===decimal).length;
    const before=meaningful(text.slice(0,e.target.selectionStart??text.length));
    const raw=parseArea(text,language);if(raw===null)return;
    caret.current=before;
    onChange(raw);

  }}/>;
}

