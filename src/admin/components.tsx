import {Children,cloneElement,isValidElement,type ReactNode} from 'react';
import {useText} from './ui';
export function PageHeader({title,description,actions}:{title:string;description?:string;actions?:ReactNode}){return <div className="admin-title"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="admin-actions">{actions}</div>}</div>}
export function MetricCard({label,value}:{label:string;value:ReactNode}){return <article className="admin-panel metric-card"><dl><dt>{label}</dt><dd>{value}</dd></dl></article>}
export function DataTable({children,className='',total,...props}:{children:ReactNode;className?:string;total?:number;[key:string]:any}){
 const t=useText(),parts=Children.toArray(children) as any[];
 const head=parts.find(c=>isValidElement(c)&&c.type==='thead');
 const headerRow=head&&Children.toArray(head.props.children)[0] as any;
 const labels=headerRow?Children.toArray(headerRow.props.children).map((c:any)=>c.props?.children):[];
 let count=0;
 const content=parts.map(part=>{
  if(!isValidElement(part)||part.type!=='tbody')return part;
  const body=part as any;const rows=Children.toArray(body.props.children).map((row:any)=>{
   if(!isValidElement(row)||row.type!=='tr')return row;count++;
   return cloneElement(row as any,{role:'row'},Children.toArray((row as any).props.children).map((cell:any,index)=>isValidElement(cell)?cloneElement(cell as any,{role:'cell'},<>{labels[index]&&<span className="table-cell-label" aria-hidden="true">{labels[index]}</span>}<div className="table-cell-value">{(cell as any).props.children}</div></>):cell));
  });return cloneElement(body,{},rows);
 });
 return <><p className="table-result-count" role="status">{total??count} {t('kết quả','results','条结果')}</p><table {...props} className={`admin-data-table ${className}`} role="table">{content}</table></>;
}
