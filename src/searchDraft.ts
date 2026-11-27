import {useEffect,useRef,useState,type ChangeEvent,type CompositionEvent,type KeyboardEvent} from 'react';

/**
 * URL-bound search input that is safe for Vietnamese input methods.
 *
 * Root cause (2026-11-17): the inputs were controlled directly by the URL query. React Router applies
 * setSearchParams as a transition, so after every input event React restored the DOM to the *stale* URL value
 * before the next edit. UniKey/EVKey (Telex, which rewrite text with backspace + replacement) and IME composition
 * then edited the wrong text ("Dệt" → "ệt", "dệt" → "dêdệtdệt").
 *
 * The input now renders an urgent local draft. URL commits are skipped while an IME composition is active and
 * happen once on compositionend. URL changes that echo our own commits are ignored; genuine external changes
 * (Back/Forward, "clear filters") replace the draft. The displayed text is never transformed.
 */
export function useSearchDraft(urlValue:string,commit:(value:string)=>void){
 const [draft,setDraft]=useState(urlValue);
 const composing=useRef(false);
 const committed=useRef(urlValue);
 const pending=useRef<string[]>([]);
 useEffect(()=>{
  if(urlValue===committed.current){pending.current=[];return;}
  if(pending.current.includes(urlValue))return; // stale echo of an earlier keystroke still settling
  if(composing.current)return;
  committed.current=urlValue;pending.current=[];setDraft(urlValue);
 },[urlValue]);
 const push=(value:string)=>{if(value===committed.current)return;committed.current=value;pending.current.push(value);commit(value);};
 return {
  value:draft,
  onChange:(event:ChangeEvent<HTMLInputElement>)=>{const value=event.target.value;setDraft(value);if(!composing.current&&!(event.nativeEvent as InputEvent).isComposing)push(value);},
  onCompositionStart:()=>{composing.current=true;},
  onCompositionEnd:(event:CompositionEvent<HTMLInputElement>)=>{composing.current=false;const value=event.currentTarget.value;setDraft(value);push(value);},
 };
}

/** Enter that only confirms an IME composition must not trigger search/navigation (keyCode 229 = legacy IME signal). */
export const isComposingKey=(event:KeyboardEvent<HTMLElement>)=>event.nativeEvent.isComposing||event.keyCode===229;

/** Unicode- and case-insensitive containment for Vietnamese text (NFC vs NFD input compares equal). Matching only. */
export const normalizeSearch=(text:string)=>text.normalize('NFC').toLocaleLowerCase('vi');
export const searchIncludes=(haystack:string,query:string)=>normalizeSearch(haystack).includes(normalizeSearch(query.trim()));
