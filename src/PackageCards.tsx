import type {Language} from './types';
import type {ServicePackage} from './servicePackages';
import './packages.css';

export function PackageCards({packages,language,value,onChange}:{packages:ServicePackage[];language:Language;value:string;onChange?:(id:string)=>void}){
  return <div className="package-cards">{packages.map(p=>{
    const c=p.content[language];
    return <label key={p.id} className={`package-card ${value===p.id?'is-selected':''}`}>
      <div className="package-card-heading">{onChange&&<input type="radio" name="service" value={p.id} checked={value===p.id} onChange={()=>onChange(p.id)}/>}<strong>{c.name}</strong></div>
      <p className="package-audience">{c.audience}</p>
      <ul>{c.benefits.split('\n').filter(x=>x.trim()).map((b,i)=><li key={i}>{b}</li>)}</ul>
      <p className="package-scope">{c.scope}</p>
    </label>;
  })}</div>;
}
