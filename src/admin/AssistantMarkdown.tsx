import {Fragment,type ReactNode} from 'react';
import {Link} from 'react-router-dom';

/**
 * Small, safe renderer for the admin assistant's answers.
 * Builds React elements only (never raw HTML); supports paragraphs, lists, tables, **bold** and links
 * restricted to http(s) URLs or internal /admin/... paths. Used by the admin assistant only.
 */
export type Block={type:'p';text:string}|{type:'ul';items:string[]}|{type:'ol';items:string[]}|{type:'table';head:string[];rows:string[][]};

/** Returns a href that is safe to render, or null. Only http(s) and internal /admin paths pass. */
export function safeHref(url:string):{href:string;internal:boolean}|null{
 const u=url.trim();
 if(/^https?:\/\/[^\s]+$/i.test(u))return {href:u,internal:false};
 if(/^\/admin(\/[A-Za-z0-9._~!$&'()*+,;=:@%\-/?#]*)?$/.test(u)&&!u.startsWith('//'))return {href:u,internal:true};
 return null;
}
const cells=(line:string)=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
const isSeparator=(line:string)=>/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)&&line.includes('-');
const BULLET=/^\s*(?:[-*•])\s+(.*)$/,ORDERED=/^\s*\d+[.)]\s+(.*)$/;

export function parseBlocks(source:string):Block[]{
 const lines=source.replace(/\r\n?/g,'\n').split('\n'),blocks:Block[]=[];
 let i=0;
 while(i<lines.length){
  const line=lines[i];
  if(!line.trim()){i++;continue}
  if(line.trim().startsWith('|')&&i+1<lines.length&&isSeparator(lines[i+1])){
   const head=cells(line),rows:string[][]=[];i+=2;
   while(i<lines.length&&lines[i].trim().startsWith('|')){rows.push(cells(lines[i]));i++}
   blocks.push({type:'table',head,rows});continue;
  }
  if(BULLET.test(line)||ORDERED.test(line)){
   const ordered=ORDERED.test(line)&&!BULLET.test(line),items:string[]=[];
   while(i<lines.length){const m=(ordered?ORDERED:BULLET).exec(lines[i]);if(!m)break;items.push(m[1]);i++}
   blocks.push({type:ordered?'ol':'ul',items});continue;
  }
  const para:string[]=[];
  while(i<lines.length&&lines[i].trim()&&!BULLET.test(lines[i])&&!ORDERED.test(lines[i])&&!(lines[i].trim().startsWith('|')&&i+1<lines.length&&isSeparator(lines[i+1]))){para.push(lines[i].replace(/^\s*#{1,6}\s+(.*)$/,'**$1**').trim());i++}
  if(para.length)blocks.push({type:'p',text:para.join('\n')});
 }
 return blocks;
}

const INLINE=/(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)|https?:\/\/[^\s<>)\]]+)/g;
function inline(text:string):ReactNode[]{
 const out:ReactNode[]=[];let last=0,k=0;
 const link=(label:string,url:string,key:number)=>{
  const s=safeHref(url);
  if(!s)return <Fragment key={key}>{label}</Fragment>;
  return s.internal?<Link key={key} to={s.href}>{label}</Link>:<a key={key} href={s.href} target="_blank" rel="noopener noreferrer">{label}</a>;
 };
 for(const m of text.matchAll(INLINE)){
  const idx=m.index??0,tok=m[0];
  if(idx>last)out.push(<Fragment key={k++}>{text.slice(last,idx)}</Fragment>);
  if(tok.startsWith('**'))out.push(<strong key={k++}>{tok.slice(2,-2)}</strong>);
  else if(tok.startsWith('['))out.push(link(/^\[([^\]]+)\]/.exec(tok)![1],/\(([^)]+)\)$/.exec(tok)![1],k++));
  else out.push(link(tok,tok,k++));
  last=idx+tok.length;
 }
 if(last<text.length)out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
 return out;
}
const withBreaks=(text:string)=>text.split('\n').flatMap((l,i)=>i?[<br key={'b'+i}/>,...inline(l)]:inline(l));

export function AssistantMarkdown({text}:{text:string}){
 return <div className="ai-md">{parseBlocks(text).map((b,i)=>{
  if(b.type==='p')return <p key={i}>{withBreaks(b.text)}</p>;
  if(b.type==='ul')return <ul key={i}>{b.items.map((x,j)=><li key={j}>{inline(x)}</li>)}</ul>;
  if(b.type==='ol')return <ol key={i}>{b.items.map((x,j)=><li key={j}>{inline(x)}</li>)}</ol>;
  return <div className="ai-md-table" key={i}><table><thead><tr>{b.head.map((h,j)=><th key={j} scope="col">{inline(h)}</th>)}</tr></thead><tbody>{b.rows.map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>;
 })}</div>;
}
