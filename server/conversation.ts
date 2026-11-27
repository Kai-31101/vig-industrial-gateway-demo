// Deterministic conversation interpreter for the public leasing assistant.
// Pure functions only: no I/O, no model calls. Output can only pre-fill draft fields
// that are re-validated server-side or change wording; nothing here can confirm,
// submit or set consent.
import {findPhones} from '../src/requestSchema';
export type Lang='vi'|'en'|'zh';
export type Field='assetType'|'location'|'areaMin'|'industry'|'budget'|'availabilityDate'|'organization'|'contactName'|'email'|'phone';
export const OPTIONAL_UNKNOWN:string[]=['location','industry','budget','availabilityDate'];
export const CONTACT_FIELDS:string[]=['organization','contactName','email','phone'];

// ---------- text normalisation ----------
export const fold=(s:string)=>s.toLowerCase().replace(/đ/g,'d').normalize('NFD').replace(/[̀-ͯ]/g,'')
 .replace(/[‐-―−]/g,'-').replace(/[“”«»„]/g,'"').replace(/[‘’]/g,"'").replace(/？/g,'?').replace(/！/g,'!')
 .replace(/，/g,',').replace(/：/g,':').replace(/；/g,';').replace(/。/g,'.').replace(/、/g,',').replace(/\s+/g,' ').trim();
const esc=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const cjk=/[㐀-鿿]/;
export type Span=[number,number];
/** Find phrase occurrences in already-folded text. Latin phrases need word boundaries; longest phrases win overlaps. */
export function findPhrases(f:string,phrases:string[]):Span[]{
 const out:Span[]=[];
 for(const p of [...phrases].sort((a,b)=>b.length-a.length)){
  if(!p)continue;
  if(!/[a-z0-9]/.test(p)){let i=f.indexOf(p);while(i>=0){out.push([i,i+p.length]);i=f.indexOf(p,i+p.length)}}
  else{const re=new RegExp(`(?<![a-z0-9])${esc(p)}(?![a-z0-9])`,'g');let m;while((m=re.exec(f)))out.push([m.index,m.index+m[0].length])}
 }
 const kept:Span[]=[];for(const s of out)if(!kept.some(k=>s[0]<k[1]&&s[1]>k[0]))kept.push(s);
 return kept.sort((a,b)=>a[0]-b[0]);
}
const blank=(f:string,spans:Span[])=>{let r=f;for(const [a,b] of spans)r=r.slice(0,a)+' '.repeat(Math.max(0,b-a))+r.slice(b);return r};
const cut=(f:string,spans:Span[])=>{let r=f;for(const [a,b] of [...spans].sort((x,y)=>y[0]-x[0]))r=r.slice(0,Math.max(0,a))+' '+r.slice(b);return r};

const FILLER_LATIN=new Set(['i','we','our','my','me','it','its',"it's",'is','are','am','was','be','yet','still','the','a','an','for','now','at','moment','just','so','far','honestly','sorry','ok','okay','well','hmm','please','thanks','thank','you','currently','right','really','actually','only','but','though','have','has',"haven't",'had','to','of','in','that','this','one','fine','suitable','any','also','then','would','like','prefer','preferably','want','need','needs','about','around','approximately','roughly','approx','maybe','probably','will','with','we\'re','i\'m',
 'toi','minh','chung','em','anh','chi','ben','hien','tai','van','con','thi','nhe','nha','roi','oi','la','cung','dang','se','cho','o','duoc','khoang','tam','can','muon','thue','nhung','thoi','a','vay','day','nay','hay','luc','cai','kia','thuc','ra','leave','keep','as','blank','empty','de','trong','cu','open','left']);
const FILLER_CJK=['我们','我','还','目前','暂时','现在','呢','吧','啊','的','了','先','也','就','但是','但','只','需要','要','大约','左右','大概','在','嗯','好','个'];
/** Text left after removing matched spans, punctuation and filler words. Empty => the reply was fully understood. */
export function residual(f:string,spans:Span[],extraFiller:string[]=[]){
 let r=cut(f,spans).replace(/[.,!?;:"'()[\]{}\-–~…/]+/g,' ');
 for(const p of [...extraFiller.filter(p=>cjk.test(p)),...FILLER_CJK].sort((a,b)=>b.length-a.length))r=r.split(p).join(' ');
 const extra=new Set(extraFiller);
 return r.split(/\s+/).filter(Boolean).filter(w=>!FILLER_LATIN.has(w)&&!extra.has(w)).join(' ').trim();
}

// ---------- phrase lists (folded) ----------
const UNKNOWN_GENERIC=['chua xac dinh','chua biet','chua ro','chua quyet dinh','chua chot','chua nghi ra','chua co','khong biet','khong ro','chua tinh','not specified','unspecified','not decided','not decided yet','undecided','have not decided','haven\'t decided','not sure','unsure',"don't know",'do not know','dont know','no idea','unknown','tbd','to be decided','to be determined','not yet','待定','还没确定','还未确定','没确定','未确定','不确定','不知道','还不知道','未定','尚未确定','没想好','还没想好','还没定','没定'];
const UNKNOWN_BY_FIELD:Record<string,string[]>={
 location:['dau cung duoc','o dau cung duoc','cho nao cung duoc','khu vuc nao cung duoc','tinh nao cung duoc','noi nao cung duoc','khong quan trong','tuy','anywhere','any location','any province','any region','no preference','doesn\'t matter','does not matter','not chosen','haven\'t chosen','have not chosen','chua chon','chua chon tinh','no province yet','都可以','哪里都可以','哪里都行','都行','无所谓','没有偏好','不限','还没选'],
 industry:['chua chon nganh','no preference','khong quan trong','不限'],
 budget:['chua co ngan sach','khong co ngan sach','no budget yet','no budget','没有预算','预算待定'],
 availabilityDate:['bat cu luc nao','luc nao cung duoc','linh hoat','flexible','anytime','any time','随时','灵活'],
 areaMin:[], assetType:[],
};
const FIELD_FILLER:Record<string,string[]>={
 location:['tinh','khu','vuc','dia','diem','vi','tri','province','provinces','region','location','city','area','where','省','区域','地区','地点','位置','省份'],
 industry:['nganh','linh','vuc','industry','sector','category','categories','行业','产业'],
 budget:['ngan','sach','budget','price','rent','gia','预算','价格','租金'],
 availabilityDate:['ngay','thoi','gian','diem','ban','giao','date','time','timing','handover','move','in','日期','时间','交付'],
 areaMin:['dien','tich','area','size','total','tong','面积','规模','we','need'],
 assetType:['loai','hinh','type','mat','bang','类型','property'],
};
const NEGOTIABLE=['thuong luong','co the thuong luong','thoa thuan','negotiable','negotiate','to be negotiated','open to negotiation','面议','可议','可协商','协商','议价'];
const PAUSE=['pause','pause this','pause the enquiry','pause my enquiry','hold on','not now','stop for now','tam dung','tam ngung','de sau','de luc khac','暂停','先停','以后再说','先不填'];
const RESUME=['resume','resume my enquiry','resume the enquiry','continue','continue my enquiry','continue the enquiry','continue enquiry','back to my enquiry','tiep tuc','tiep tuc yeu cau','tiep tuc yeu cau thue','quay lai yeu cau','继续','继续需求','继续申请','恢复','恢复需求'];
const REFUSAL=['rather not','prefer not','would rather not','don\'t want to share','do not want to share','don\'t want to give','do not want to give','don\'t want to provide','do not want to provide','won\'t share','will not share','not comfortable','khong muon cung cap','khong muon chia se','khong muon dua','khong muon de lai','khong cung cap','xin phep khong','khong tien cung cap','不想提供','不想透露','不想给','不方便提供','不方便透露','不方便','拒绝','不提供'];
const QUESTION_ANY=['la gi','nghia la gi','la sao','de lam gi','what is','what does','what are','是什么','什么是','什么意思','为什么','what for','why do you need','why need','co khong','duoc khong','phai khong'];
const QUESTION_START=['why','what','how','which','where','when','who','can you','could you','do you','does it','is it','is there','are there','should i','tai sao','vi sao','sao lai','lam sao','the nao','bao nhieu','co the','co phai'];
const HYPOTHETICAL=['if i said','if i say','if i were to','if i type','if i typed','if i click','if i press','if i write','suppose','what if','neu toi noi','neu minh noi','neu toi tra loi','neu toi go','neu minh go','neu toi nhap','neu toi bam','neu toi viet','gia su','如果我说','如果我输入','如果我点击','如果我按','如果我写','假如','假设','要是我说'];
const EDIT_VERBS=['change','update','edit','correct','correction','actually','instead','replace','remove','clear','delete','set','make it','sua','doi','thay','cap nhat','bo','xoa','chinh','thuc ra','修改','更改','改为','改成','换成','删除','去掉','清除','其实'];
const AFFIRM=['yes','yeah','yep','ok','okay','sure','right','correct','co','vang','u','dung','duoc','dong y','好','是的','是','可以','对','行','嗯'];

// ---------- turn classification ----------
const stripQuoted=(f:string)=>f.replace(/"[^"]*"/g,' ').replace(/(^|\s)'[^']{2,}'/g,' ').replace(/「[^」]*」/g,' ');
export type TurnKind='pause'|'resume'|'refusal'|'question'|'hypothetical'|'answer';
export function classifyTurn(text:string):{kind:TurnKind;followUp:boolean}{
 const f=fold(text);if(!f)return {kind:'answer',followUp:false};
 if(findPhrases(f,HYPOTHETICAL).length)return {kind:'hypothetical',followUp:false};
 const fq=stripQuoted(f);
 const pause=findPhrases(fq,PAUSE);
 if(pause.length&&!/\?\s*$/.test(fq)){const rest=residual(fq,pause,['enquiry','request','yeu','cau','需求','申请','instead','thay','vao','do','this','it','let\'s','lets','and']);return {kind:'pause',followUp:/[a-z㐀-鿿]{3,}/.test(rest)}}
 const resume=findPhrases(fq,RESUME);if(resume.length&&!residual(fq,resume,['enquiry','request','yeu','cau','thue','需求','申请','please','nhe','let\'s','lets']))return {kind:'resume',followUp:false};
 if(findPhrases(fq,REFUSAL).length)return {kind:'refusal',followUp:false};
 if(/[?]\s*$/.test(fq)||/吗\s*$/.test(fq)||findPhrases(fq,QUESTION_ANY).length)return {kind:'question',followUp:false};
 if(findPhrases(fq,UNKNOWN_GENERIC).length)return {kind:'answer',followUp:false};
 const first=fq.replace(/^[^a-z㐀-鿿]+/,'');
 if(first.split(' ').length>=3&&QUESTION_START.some(q=>new RegExp(`^${esc(q)}(?![a-z])`).test(first)))return {kind:'question',followUp:false};
 return {kind:'answer',followUp:false};
}
// Idioms that contain edit words but mean something else ("thay mặt" = on behalf of, "bỏ qua" = ignore), and negated edits.
const NOT_EDIT=['thay mat','bo qua','khong xoa','dung xoa','khong doi','dung doi','khong sua','dung sua',"don't change","do not change","don't remove","do not remove","don't delete","do not delete",'不要删除','别删','不要修改','不用改','不要更改'];
export const hasEditVerb=(text:string)=>{const f=stripQuoted(fold(text));return findPhrases(cut(f,findPhrases(f,NOT_EDIT)),EDIT_VERBS).length>0};
export const isBareAffirmation=(text:string)=>{const f=fold(text);const s=findPhrases(f,AFFIRM);return s.length>0&&!residual(f,s)};

// ---------- numbers ----------
const PLAUSIBLE_M2:[number,number]=[100,10_000_000];
/** Parse a localized number. null if malformed, 'ambiguous' if it cannot be decided safely from locale + unit context. */
export function parseNumber(raw:string,lang:Lang,toM2?:number):number|'ambiguous'|null{
 const s=raw.trim();
 if(/^\d{1,3}(?:[  ]\d{3})+$/.test(s))return Number(s.replace(/[  ]/g,''));
 if(/^\d+$/.test(s))return Number(s);
 const dots=(s.match(/\./g)||[]).length,commas=(s.match(/,/g)||[]).length;
 if(dots&&commas){const last=Math.max(s.lastIndexOf('.'),s.lastIndexOf(','));const grp=s[last]==='.'?',':'.';const int=s.slice(0,last),frac=s.slice(last+1);if(!new RegExp(`^\\d{1,3}(?:${esc(grp)}\\d{3})*$`).test(int)||!/^\d+$/.test(frac))return null;return Number(int.split(grp).join('')+'.'+frac)}
 const sep=dots?'.':',';const count=dots||commas;
 if(count>1)return new RegExp(`^\\d{1,3}(?:${esc(sep)}\\d{3})+$`).test(s)?Number(s.split(sep).join('')):null;
 const [int,frac]=s.split(sep);if(!/^\d+$/.test(int||'')||!/^\d+$/.test(frac||''))return null;
 const decimal=Number(int+'.'+frac);
 if(frac.length!==3||int.length>3)return decimal;
 const grouped=Number(int+frac);
 if(toM2){const ok=(n:number)=>n*toM2>=PLAUSIBLE_M2[0]&&n*toM2<=PLAUSIBLE_M2[1];if(ok(grouped)&&!ok(decimal))return grouped;if(ok(decimal)&&!ok(grouped))return decimal;if(!ok(decimal)&&!ok(grouped))return null}
 const localeDecimal=lang==='vi'?',':'.';
 return sep===localeDecimal?'ambiguous':grouped;
}
const NUM_RE=/(?<![a-z\d.,²])(?:\d{1,3}(?:[  ]\d{3})+(?!\d)|\d+(?:[.,]\d+)*)/g;

// ---------- area ----------
const AREA_UNITS:[RegExp,number|'unsupported'][]=[
 [/^(km²|km2|km 2|平方公里|square kilomet(?:er|re)s?)/,1_000_000],
 [/^(m²|m2|㎡|sqm|sq m|sq\.m|square met(?:er|re)s?|met vuong|m vuong|平方米|平米|平方)/,1],
 [/^(ha|hecta|hectares?|hec ta|hec-ta|公顷)(?![a-z])/,10_000],
 [/^(sq ?ft|square feet|feet|ft2|mau|sao|亩|acres?)(?![a-z])/,'unsupported'],
];
export type AreaResult={areaMin?:number;areaMax?:number;issue?:'reversed'|'unit_unsupported'|'needs_unit'|'ambiguous_number';pending?:{min:string;max:string};spans:Span[]};
export function parseArea(text:string,lang:Lang,pending?:{min:string;max:string}|null):AreaResult|null{
 const f=fold(text);
 const finish=(a:string,b:string,facA:number,facB:number,sp:Span[]):AreaResult=>{
  const x=parseNumber(a,lang,facA),y=parseNumber(b,lang,facB);
  if(x==='ambiguous'||y==='ambiguous'||x===null||y===null)return {issue:'ambiguous_number',spans:sp};
  const min=Math.round(x*facA*100)/100,max=Math.round(y*facB*100)/100;
  if(min<=0||max<=0)return {issue:'ambiguous_number',spans:sp};
  if(max<min)return {issue:'reversed',spans:sp};
  return {areaMin:min,areaMax:max,spans:sp};
 };
 const nums:{raw:string;start:number;end:number;unit?:number|'unsupported';unitEnd?:number}[]=[];
 NUM_RE.lastIndex=0;let m;
 while((m=NUM_RE.exec(f))){const end=m.index+m[0].length;const after=f.slice(end);const lead=after.length-after.trimStart().length;let unit,unitEnd;for(const [re,factor] of AREA_UNITS){const u=after.trimStart().match(re);if(u){unit=factor;unitEnd=end+lead+u[0].length;break}}nums.push({raw:m[0],start:m.index,end,unit,unitEnd})}
 if(!nums.length){
  if(!pending)return null;
  const g=residual(f,[],['in','bang','theo','don','vi','unit','units','tinh','单位','用']).replace(/\s+/g,' ');
  for(const [re,factor] of AREA_UNITS){const u=g.match(re);if(u&&u[0].length===g.length){if(factor==='unsupported')return {issue:'unit_unsupported',spans:[[0,f.length]]};return finish(pending.min,pending.max,factor,factor,[[0,f.length]])}}
  return null;
 }
 if(nums.length>2)return null;
 const spans:Span[]=nums.map(n=>[n.start,n.unitEnd||n.end]);
 if(nums.length===2){
  const between=f.slice(nums[0].unitEnd||nums[0].end,nums[1].start);
  if(!/^\s*(-|~|to|and|den|toi|到|至|va)\s*$/.test(between))return null;
  spans.push([nums[0].unitEnd||nums[0].end,nums[1].start]);
 }
 spans.push(...findPhrases(f,['between','from','tu','khoang','tam','从','约','大约','tong cong','total']));
 if(nums.some(n=>n.unit==='unsupported'))return {issue:'unit_unsupported',spans};
 const last=nums[nums.length-1];
 const facB=last.unit as number|undefined, facA=(nums[0].unit as number|undefined)??facB;
 if(facB===undefined||facA===undefined)return {issue:'needs_unit',pending:{min:nums[0].raw,max:last.raw},spans};
 return finish(nums[0].raw,last.raw,facA,facB,spans);
}

// ---------- location ----------
const ZH_PROVINCES:Record<string,string>={'海防':'Hải Phòng','河内':'Hà Nội','北宁':'Bắc Ninh','兴安':'Hưng Yên','广宁':'Quảng Ninh','宁平':'Ninh Bình','清化':'Thanh Hóa','义安':'Nghệ An','岘港':'Đà Nẵng','广义':'Quảng Ngãi','平定':'Bình Định','庆和':'Khánh Hòa','平阳':'Bình Dương','同奈':'Đồng Nai','隆安':'Long An','西宁':'Tây Ninh','巴地头顿':'Bà Rịa–Vũng Tàu','芹苴':'Cần Thơ','后江':'Hậu Giang','安江':'An Giang'};
const REGIONS:[string,string[]][]=[
 ['North',['mien bac','phia bac','khu vuc phia bac','khu vuc mien bac','bac bo','northern vietnam','the north','north','northern','北部','北方','越南北部']],
 ['Central',['mien trung','khu vuc mien trung','trung bo','central vietnam','central','the centre','the center','中部','越南中部']],
 ['South',['mien nam','phia nam','khu vuc phia nam','khu vuc mien nam','nam bo','southern vietnam','the south','south','southern','南部','南方','越南南部']],
];
const BARE_REGION:Record<string,string>={bac:'North',trung:'Central',nam:'South'};
const NEGATORS=['not','not in','khong phai','chu khong phai','khong phai la','ko phai','khong o','rather than','instead of','except','ngoai tru','不是','不要','而不是','除了','不在'];
export type LocationResult={value?:string;unknown?:boolean;ambiguous?:boolean;spans:Span[]};
export function parseLocation(text:string,provinces:string[]):LocationResult|null{
 const ff=fold(text).replace(/-/g,' ');const spans:Span[]=[];const found:{value:string;span:Span}[]=[];
 const known=new Set(provinces);const aliases:[string,string][]=[];
 for(const p of known){const fp=fold(p).replace(/-/g,' ');aliases.push([fp,p],[fp.replace(/\s/g,''),p])}
 for(const [a,p] of [['hanoi','Hà Nội'],['ha noi','Hà Nội'],['vung tau','Bà Rịa–Vũng Tàu'],['danang','Đà Nẵng'],['haiphong','Hải Phòng'],...Object.entries(ZH_PROVINCES)])if(known.has(p))aliases.push([a,p]);
 for(const [alias,p] of aliases.sort((a,b)=>b[0].length-a[0].length))for(const s of findPhrases(ff,[alias]))if(!found.some(x=>s[0]<x.span[1]&&s[1]>x.span[0]))found.push({value:p,span:s});
 let masked=ff;for(const x of found)masked=masked.slice(0,x.span[0])+' '.repeat(x.span[1]-x.span[0])+masked.slice(x.span[1]);
 for(const [region,phr] of REGIONS)for(const s of findPhrases(masked,phr))if(!found.some(x=>s[0]<x.span[1]&&s[1]>x.span[0]))found.push({value:region,span:s});
 if(!found.length){const r=residual(masked,[],FIELD_FILLER.location);if(BARE_REGION[r])found.push({value:BARE_REGION[r],span:[0,ff.length]})}
 const positive=found.filter(x=>{
  spans.push(x.span);const start=Math.max(0,x.span[0]-18);const before=ff.slice(start,x.span[0]);
  const neg=findPhrases(before,NEGATORS).filter(s=>!before.slice(s[1]).replace(/^\s*(the|in|o|tai|la|在)?\s*$/,''));
  if(neg.length){spans.push([start+neg[neg.length-1][0],x.span[0]]);return false}
  return true;
 });
 const unk=findPhrases(ff,[...UNKNOWN_GENERIC,...UNKNOWN_BY_FIELD.location]);spans.push(...unk);
 const values=[...new Set(positive.map(x=>x.value))];
 if(values.length>1)return {ambiguous:true,spans};
 if(values.length===1)return {value:values[0],spans};
 if(unk.length)return {unknown:true,spans};
 if(found.length)return {spans};
 return null;
}

// ---------- closed answers ----------
export function unknownFor(field:string,text:string):{spans:Span[]}|null{
 const f=fold(text);const s=findPhrases(f,[...UNKNOWN_GENERIC,...(UNKNOWN_BY_FIELD[field]||[])]);return s.length?{spans:s}:null;
}
const ASSET_TYPES:[string,string[]][]=[
 ['build_to_suit',['build to suit','build-to-suit','bts','xay dung theo yeu cau','xay theo yeu cau','nha xuong xay theo yeu cau','定制厂房','定制建设','定制']],
 ['ready_built_factory',['ready built factory','ready-built factory','ready built','ready-built','factory','factories','nha xuong','xuong','nha xuong xay san','xuong xay san','标准厂房','厂房']],
 ['warehouse',['warehouse','warehouses','kho','kho bai','nha kho','仓库','库房']],
 ['industrial_land',['industrial land','land','dat','dat cong nghiep','dat trong','工业用地','土地','用地']],
];
export function parseAssetType(text:string):{value?:string;spans:Span[]}|null{
 const f=fold(text);const found:{v:string;s:Span}[]=[];
 for(const [v,phr] of ASSET_TYPES)for(const s of findPhrases(f,phr))if(!found.some(x=>s[0]<x.s[1]&&s[1]>x.s[0]))found.push({v,s});
 if(!found.length)return null;const vals=[...new Set(found.map(x=>x.v))];
 return vals.length===1?{value:vals[0],spans:found.map(x=>x.s)}:{spans:found.map(x=>x.s)};
}
export function parseIndustry(text:string,categories:string[]):{value?:string;spans:Span[]}|null{
 const f=fold(text);for(const c of [...new Set(categories)].sort((a,b)=>b.length-a.length)){const s=findPhrases(f,[fold(c)]);if(s.length)return {value:c,spans:s}}return null;
}

// ---------- budget ----------
export type Budget={mode?:'specific'|'negotiable'|'not_available';amount?:number|null;currency?:'VND'|'USD';areaBasis?:'m²'|'ha';period?:'month'|'year'|'term'};
const CURRENCY:[string,string[]][]=[['USD',['usd','us$','$','do','do la','dollar','dollars','美元','美金']],['VND',['vnd','dong','vn dong','越南盾','越盾']]];
const MAGNITUDE:[number,string[]][]=[[1e9,['ty','ti','billion','十亿']],[1e8,['亿']],[1e6,['trieu','million','百万']],[1e4,['万']],[1e3,['nghin','ngan','thousand','千']]];
const BASIS:[string,string[]][]=[['m²',['m2','m²','㎡','sqm','met vuong','m vuong','平方米','平米','square meter','square metre']],['ha',['ha','hecta','hectare','公顷']]];
const PERIOD:[string,string[]][]=[['term',['ky thue','ca ky','tron ky','toan bo thoi gian thue','lease term','whole term','entire term','the term','per term','租期','整个租期']],['month',['thang','monthly','month','mo','每月','月','个月']],['year',['nam','yearly','annual','annually','year','yr','每年','年']]];
export function parseBudget(text:string,lang:Lang):{budget:Budget;spans:Span[];issue?:'ambiguous_number'}|null{
 const f=fold(text).replace(/(\d)\s*d(?![a-z])/g,'$1 dong');
 const unk=findPhrases(f,[...UNKNOWN_GENERIC,...UNKNOWN_BY_FIELD.budget]);
 const neg=findPhrases(f,NEGOTIABLE);
 NUM_RE.lastIndex=0;const nums=[...f.matchAll(NUM_RE)];
 if(neg.length&&!nums.length)return {budget:{mode:'negotiable',amount:null},spans:neg};
 if(unk.length&&!nums.length)return {budget:{mode:'not_available',amount:null},spans:unk};
 const cur=CURRENCY.flatMap(([v,p])=>findPhrases(f,p).map(s=>({v,s})));
 const f2=blank(f,cur.map(c=>c.s));
 const basis=BASIS.flatMap(([v,p])=>findPhrases(f2,p).map(s=>({v,s})));
 const per=PERIOD.flatMap(([v,p])=>findPhrases(blank(f2,basis.map(x=>x.s)),p).map(s=>({v,s})));
 if(!nums.length&&!cur.length&&!basis.length&&!per.length)return null;
 if(nums.length>1)return null;
 const spans:Span[]=[];const b:Budget={};let issue:'ambiguous_number'|undefined;
 if(nums.length===1){
  const at=nums[0].index!,len=nums[0][0].length;spans.push([at,at+len]);
  const n=parseNumber(nums[0][0],lang);
  if(n==='ambiguous'||n===null)issue='ambiguous_number';
  else{let amount=n;const after=f.slice(at+len);const lead=after.length-after.trimStart().length;const t=after.trimStart();
   for(const [mul,p] of MAGNITUDE){const s=findPhrases(t,p).filter(x=>x[0]===0);if(s.length){amount*=mul;spans.push([at+len,at+len+lead+s[0][1]]);break}}
   if(/^k(?![a-z])/.test(t)){amount*=1e3;spans.push([at+len,at+len+lead+1])}
   b.amount=amount}
 }
 const one=<T,>(xs:{v:string}[])=>{const v=[...new Set(xs.map(x=>x.v))];return v.length===1?v[0] as T:v.length>1?null:undefined};
 const c=one<Budget['currency']>(cur),ba=one<Budget['areaBasis']>(basis),pe=one<Budget['period']>(per);
 if(c===null||ba===null||pe===null)return null;
 if(c)b.currency=c;if(ba)b.areaBasis=ba;if(pe)b.period=pe;
 b.mode='specific';
 spans.push(...cur.map(x=>x.s),...basis.map(x=>x.s),...per.map(x=>x.s),...findPhrases(f,['per','moi','tren','mot','each','a','an','/','每','limit','max','maximum','toi da','khong qua','under','up to','below','duoi']));
 return {budget:b,spans,issue};
}
/** Merge a (possibly partial) budget into the prior one, keeping known components. */
export function mergeBudget(prior:any,next:Budget):Budget{
 if(next.mode==='negotiable'||next.mode==='not_available')return {mode:next.mode,amount:null};
 const base:any=prior&&typeof prior==='object'&&(prior.mode==='specific'||prior.mode===undefined)?{...prior}:{};
 for(const k of ['amount','currency','areaBasis','period'] as const)if(next[k]!==undefined&&next[k]!==null)base[k]=next[k];
 base.mode='specific';if(base.amount===undefined)base.amount=null;return base;
}
export function missingBudgetParts(b:any):('amount'|'currency'|'areaBasis'|'period')[]{
 if(!b||b.mode!=='specific')return [];
 return (['amount','currency','areaBasis','period'] as const).filter(k=>k==='amount'?!(Number.isFinite(b.amount)&&b.amount>0):!b[k]);
}

// ---------- date ----------
export type DateResult={date?:string;unknown?:boolean;approx?:string;issue?:'calendar'|'past'|'ambiguous_date';spans:Span[]};
const pad=(n:number)=>String(n).padStart(2,'0');
export const todayVN=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});
export function parseDate(text:string,lang:Lang,today:string):DateResult|null{
 const f=fold(text);
 let y=0,mo=0,d=0,span:Span|null=null,m:RegExpExecArray|null;
 if((m=/(\d{4})-(\d{1,2})-(\d{1,2})/.exec(f))||(m=/(\d{4})[/.](\d{1,2})[/.](\d{1,2})/.exec(f))){y=+m[1];mo=+m[2];d=+m[3];span=[m.index,m.index+m[0].length]}
 else if((m=/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/.exec(f))){y=+m[1];mo=+m[2];d=+m[3];span=[m.index,m.index+m[0].length]}
 else if((m=/ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})/.exec(f))){d=+m[1];mo=+m[2];y=+m[3];span=[m.index,m.index+m[0].length]}
 else if((m=/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(f))){const a=+m[1],b=+m[2];y=+m[3];span=[m.index,m.index+m[0].length];
  if(lang==='en'&&a<=12&&b<=12&&a!==b)return {issue:'ambiguous_date',spans:[span]};
  if(lang==='en'&&a<=12&&b>12){mo=a;d=b}else{d=a;mo=b}}
 if(span){const iso=`${y}-${pad(mo)}-${pad(d)}`;const dt=new Date(iso+'T00:00:00Z');if(!Number.isFinite(dt.getTime())||dt.toISOString().slice(0,10)!==iso)return {issue:'calendar',spans:[span]};if(iso<today)return {issue:'past',spans:[span]};return {date:iso,spans:[span]}}
 const approx=[...findPhrases(f,['next year','this year','early next year','late next year','end of next year','end of the year','end of this year','mid next year','nam sau','nam toi','nam nay','dau nam','cuoi nam','giua nam','dau nam sau','cuoi nam sau','quy 1','quy 2','quy 3','quy 4','quy i','quy ii','quy iii','quy iv','q1','q2','q3','q4','first quarter','second quarter','third quarter','fourth quarter','明年','今年','年初','年底','年中','明年年初','明年年底','第一季度','第二季度','第三季度','第四季度','一季度','二季度','三季度','四季度','january','february','march','april','june','july','august','september','october','november','december']),
  ...[...f.matchAll(/thang\s*\d{1,2}(\s*\/\s*\d{4}|\s*nam\s*\d{4})?|\d{4}\s*年\s*\d{1,2}\s*月|\d{1,2}\s*月份?|\d{1,2}\/\d{4}/g)].map(x=>[x.index!,x.index!+x[0].length] as Span)];
 if(approx.length)return {approx:text.trim().slice(0,80),spans:approx};
 const unk=findPhrases(f,[...UNKNOWN_GENERIC,...UNKNOWN_BY_FIELD.availabilityDate]);
 if(unk.length)return {unknown:true,spans:unk};
 return null;
}

// ---------- contacts ----------
const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ORG_LABEL=/(?:company name|company|organi[sz]ation|business name|tên công ty|ten cong ty|công ty (?:tôi|mình|chúng tôi|của tôi)|cong ty (?:toi|minh|chung toi|cua toi)|tên doanh nghiệp|ten doanh nghiep|doanh nghiệp|doanh nghiep|公司名称|企业名称|公司|企业)\s*(?:is|là|la|:|：|是|为)\s*([^,;\n，；。]{2,120})/i;
const CONTACT_LABEL=/(?:(?:contact person|contact name|contact|người liên hệ|nguoi lien he|联系人)\s*(?:is|là|la|:|：|是)|my name is|tên tôi là|ten toi la|tên mình là|ten minh la|我叫|我的名字是)\s*([^,;\n，；。@\d]{2,80})/i;
const VALUE_STOP=/\s+(?:and|và|va|but|nhưng|we|i|chúng tôi|tôi|cần|need|needs|looking|want|wants|和|我们|需要)\b.*$/i;
const NOT_A_NAME=/^(looking|searching|seeking|planning|interested|đang|dang|cần|can|muốn|muon|在|想|需要|not|chưa|chua|không|khong)\b/i;
export function validName(v:string){
 const t=v.trim();if(t.length<2||t.length>120||/@/.test(t)||(t.match(/\d/g)||[]).length>6||NOT_A_NAME.test(t))return false;
 if(classifyTurn(t).kind!=='answer')return false;
 const f=fold(t);if(findPhrases(f,[...UNKNOWN_GENERIC,'khong chac','unsure']).length)return false;
 return t.split(/\s+/).length<=14;
}
export function extractContacts(text:string){
 const r:{email?:string;phone?:string;organization?:string;contactName?:string;spans:Span[]}={spans:[]};
 const emails=[...text.matchAll(EMAIL_RE)];if(emails.length===1){r.email=emails[0][0];r.spans.push([emails[0].index!,emails[0].index!+emails[0][0].length])}
 const phones=findPhones(text).filter(p=>p.strong);if(phones.length===1){r.phone=phones[0].value;r.spans.push([phones[0].start,phones[0].end])}
 const org=ORG_LABEL.exec(text);if(org){const v=org[1].replace(VALUE_STOP,'').trim().replace(/[.!]+$/,'');if(validName(v)){r.organization=v;r.spans.push([org.index,org.index+org[0].length])}}
 const c=CONTACT_LABEL.exec(text);if(c){const v=c[1].replace(VALUE_STOP,'').trim().replace(/[.!]+$/,'');if(validName(v)&&v.split(/\s+/).length<=8){r.contactName=v;r.spans.push([c.index,c.index+c[0].length])}}
 return r;
}
/** Redact contacts before any text reaches the model. Unlabelled person names cannot be detected reliably. */
export function maskForModel(text:string){
 let out=text;const c=extractContacts(text);
 if(c.organization)out=out.split(c.organization).join('[company omitted]');
 if(c.contactName)out=out.split(c.contactName).join('[contact name omitted]');
 out=out.replace(EMAIL_RE,'[email omitted]');
 for(const p of findPhones(out).sort((a,b)=>b.start-a.start))out=out.slice(0,p.start)+'[contact number omitted]'+out.slice(p.end);
 return out;
}
export const removeSpans=(text:string,spans:Span[])=>{let r=text;for(const [a,b] of [...spans].sort((x,y)=>y[0]-x[0]))r=r.slice(0,a)+' '+r.slice(b);return r.replace(/\s+/g,' ').trim()};

// ---------- discovery helpers ----------
const ORDINALS:[number,string[]][]=[[1,['first','1st','dau tien','thu nhat','so 1','第一','第1']],[2,['second','2nd','thu hai','thu 2','so 2','第二','第2']],[3,['third','3rd','thu ba','thu 3','so 3','第三','第3']],[4,['fourth','4th','thu tu','thu 4','so 4','第四','第4']],[5,['fifth','5th','thu nam','thu 5','so 5','第五','第5']],[6,['sixth','6th','thu sau','thu 6','第六','第6']],[7,['seventh','7th','thu bay','thu 7','第七','第7']],[8,['eighth','8th','thu tam','thu 8','第八','第8']],[-1,['last','last one','cuoi cung','cai cuoi','最后一个','最后']]];
const ORDINAL_FILLER=['one','option','park','property','item','result','cai','phuong','an','lua','chon','khu','cong','nghiep','kcn','mat','bang','个','选项','园区','物业','那','这','that','about','tell','more','show','details','detail','xem','chi','tiet','ve','详情','看看','介绍','这个','那个','please','nhe','give','cho','thong','tin','information','info','me'];
/** 1-based index (-1 = last) only when the reply is purely an ordinal reference. */
export function parseOrdinal(text:string):number|null{
 const f=fold(text);if(f.length>60)return null;
 for(const [n,p] of ORDINALS){const s=findPhrases(f,p);if(s.length&&!residual(f,s,ORDINAL_FILLER))return n}
 return null;
}
const ASK_KEYWORDS:[Field,string[]][]=[
 ['location',['tinh','khu vuc','dia diem','vi tri','mien nao','o dau','province','region','location','where','省','区域','地区','哪里','地点','位置']],
 ['areaMin',['dien tich','area','size','how large','how big','m²','m2','面积','多大']],
 ['assetType',['nha xuong','dat cong nghiep','kho','loai hinh','factory','warehouse','land','build-to-suit','type of property','厂房','仓库','用地','类型']],
 ['industry',['nganh','linh vuc','industry','sector','行业','产业']],
 ['budget',['ngan sach','muc gia','budget','price range','预算','价格']],
 ['availabilityDate',['khi nao','ban giao','thoi diem','when','handover','move in','move-in','何时','什么时候','交付']],
];
/** Which criterion the assistant's last message asked about; null when absent or ambiguous. */
export function inferAskedField(assistantText:string):Field|null{
 if(!assistantText)return null;
 const sentences=assistantText.split(/(?<=[.!?。！？\n])/).map(s=>s.trim()).filter(Boolean);
 const q=[...sentences].reverse().find(s=>/[?？]/.test(s));if(!q)return null;
 const f=fold(q);const hits=ASK_KEYWORDS.filter(([,k])=>findPhrases(f,k).length).map(([field])=>field);
 return hits.length===1?hits[0]:null;
}

// ---------- conversation meta (unsigned, authority-free) ----------
export type Conversation={askedField:string|null;attempts:Record<string,number>;declined:string[];pendingArea:{min:string;max:string}|null;approxDate:string|null;paused:boolean};
const FIELD_NAMES=['assetType','location','areaMin','industry','budget','availabilityDate','organization','contactName','email','phone','parkId','assetId','requirements','review'];
export function sanitizeConversation(v:any):Conversation{
 const c:Conversation={askedField:null,attempts:{},declined:[],pendingArea:null,approxDate:null,paused:false};
 if(!v||typeof v!=='object')return c;
 if(FIELD_NAMES.includes(v.askedField))c.askedField=v.askedField;
 if(v.attempts&&typeof v.attempts==='object')for(const k of FIELD_NAMES)if(Number.isInteger(v.attempts[k])&&v.attempts[k]>0&&v.attempts[k]<50)c.attempts[k]=v.attempts[k];
 if(Array.isArray(v.declined))c.declined=[...new Set(v.declined.filter((x:any)=>FIELD_NAMES.includes(x)) as string[])].slice(0,12);
 const num=/^\d[\d.,\s]{0,19}$/;
 if(v.pendingArea&&typeof v.pendingArea==='object'&&num.test(v.pendingArea.min)&&num.test(v.pendingArea.max))c.pendingArea={min:v.pendingArea.min,max:v.pendingArea.max};
 if(typeof v.approxDate==='string'&&v.approxDate.trim())c.approxDate=v.approxDate.slice(0,80);
 c.paused=v.paused===true;
 return c;
}

// ---------- reply parsing (single or multi-field) ----------
const FIELD_KEYWORDS:[Field,string[]][]=[
 ['location',['location','province','region','dia diem','vi tri','khu vuc','tinh','位置','地点','省份','区域','地区']],
 ['areaMin',['area','size','dien tich','quy mo','面积','规模']],
 ['industry',['industry','sector','nganh','linh vuc','行业','产业']],
 ['budget',['budget','price','rent','ngan sach','gia thue','预算','价格','租金']],
 ['availabilityDate',['handover date','handover','move-in date','move in','date','timing','ngay ban giao','ban giao','thoi diem','thoi gian','交付日期','交付','日期','入驻时间','时间']],
 ['assetType',['property type','type','loai hinh','loai mat bang','类型','物业类型']],
];
export type FieldUpdate={field:Field;value?:any;unknown?:boolean;issue?:string;pending?:any;approx?:string};
export type ParseCtx={lang:Lang;provinces:string[];categories:string[];today:string;asked:Field|null;conv:Conversation};
// Edit wording carries no data: "change the date to X" / "把日期改为X" / "sửa ngày thành X".
const EDIT_FILLER=['change','update','edit','set','make','into','sua','doi','thanh','thay','cap','nhat','lai','sang','把','改为','改成','更改','修改','请','换成'];
export function parseFieldSegment(field:Field,seg:string,ctx:ParseCtx):{update:FieldUpdate|null;consumed:boolean}{
 const f=fold(seg);const filler=[...(FIELD_FILLER[field]||[]),...EDIT_FILLER];
 const done=(update:FieldUpdate|null,spans:Span[])=>({update,consumed:!residual(f,spans,filler)});
 const none={update:null,consumed:false};
 switch(field){
  case 'location':{const r=parseLocation(seg,ctx.provinces);if(!r||r.ambiguous)return none;return done(r.value?{field,value:r.value}:r.unknown?{field,unknown:true}:null,r.spans)}
  case 'areaMin':{const r=parseArea(seg,ctx.lang,ctx.conv.pendingArea);if(r)return done(r.issue?{field,issue:r.issue,pending:r.pending}:{field,value:{areaMin:r.areaMin,areaMax:r.areaMax}},r.spans);const u=unknownFor(field,seg);return u?done({field,unknown:true},u.spans):none}
  case 'budget':{const r=parseBudget(seg,ctx.lang);if(!r)return none;return done(r.issue?{field,issue:r.issue,value:r.budget}:{field,value:r.budget},r.spans)}
  case 'availabilityDate':{const r=parseDate(seg,ctx.lang,ctx.today);if(!r)return none;return done(r.issue?{field,issue:r.issue}:r.approx?{field,approx:r.approx}:r.unknown?{field,unknown:true}:{field,value:r.date},r.spans)}
  case 'industry':{const r=parseIndustry(seg,ctx.categories);if(r)return done({field,value:r.value},r.spans);const u=unknownFor(field,seg);return u?done({field,unknown:true},u.spans):none}
  case 'assetType':{const r=parseAssetType(seg);if(r?.value)return done({field,value:r.value},r.spans);const u=unknownFor(field,seg);return u?done({field,unknown:true},u.spans):none}
 }
 return none;
}
const SEGMENT_SPLIT=/(?<!\d)[,，](?!\d)|[,，](?=\s)|[;；\n]|\s+(?:but|nhưng|nhung)\s+|但是/i;
/** Parse a reply segment-by-segment against labelled fields (or the asked field).
 * complete=true only when every segment was understood; otherwise the caller may consult the model. */
export function parseReply(text:string,ctx:ParseCtx):{updates:FieldUpdate[];complete:boolean}{
 if(!fold(text))return {updates:[],complete:true};
 if(/["“”「」]/.test(text))return {updates:[],complete:false};
 const segs=text.split(SEGMENT_SPLIT).map(s=>(s||'').trim()).filter(Boolean);
 const updates:FieldUpdate[]=[];let complete=true;
 for(const seg of segs){
  const fs=fold(seg).replace(/^(?:(?:please|vui long|xin)\s+)?(?:change|update|edit|set|correct|make|sua|doi|thay doi|cap nhat|chinh|把|请把|修改|更改)\s*(?:the|my|lai|cua toi)?\s*/,'');let field:Field|null=null;
  for(const [fd,kw] of FIELD_KEYWORDS){const s=findPhrases(fs,kw);if(s.length&&s[0][0]<=5){field=fd;break}}
  field=field||ctx.asked;
  if(!field){complete=false;continue}
  const r=parseFieldSegment(field,seg,ctx);
  if(r.consumed&&r.update){updates.push(r.update);continue}
  if(r.consumed&&field==='location')continue; // purely negated mention, e.g. "not the North"
  complete=false;
 }
 const byField=new Map<Field,FieldUpdate>();
 for(const u of updates){const prev=byField.get(u.field);if(prev&&u.unknown&&!prev.unknown)continue;byField.set(u.field,u)}
 return {updates:[...byField.values()],complete};
}

// ---------- glossary & purpose (generic factual wording, no VSIP-specific claims) ----------
export const GLOSSARY:Record<string,[string,string,string]>={
 industrial_land:['Đất công nghiệp là lô đất trong khu công nghiệp được thuê để doanh nghiệp tự xây dựng nhà xưởng, theo quy định của khu và giấy phép liên quan.','Industrial land is a plot inside an industrial park that a business leases and builds its own facility on, subject to park rules and permits.','工业用地是指工业园区内的地块，企业租用后自行建设厂房，并须符合园区规定和相关许可。'],
 ready_built_factory:['Nhà xưởng xây sẵn là nhà xưởng đã được xây dựng và cho thuê, nên thường có thể đưa vào vận hành sớm hơn.','A ready-built factory is an existing factory building that is already constructed and offered for lease, so operations can usually start sooner.','标准厂房是指已建成并对外出租的厂房，通常可更快投入运营。'],
 warehouse:['Kho bãi là công trình để lưu trữ và phân phối hàng hóa; các khả năng cụ thể như kho lạnh hay dock xếp dỡ khác nhau theo từng mặt bằng và cần được xác nhận.','A warehouse is a building for storing and distributing goods; specific capabilities such as cold storage or loading docks vary by property and need confirmation.','仓库是用于储存和分拨货物的建筑；冷库、装卸平台等具体能力因物业而异，需另行确认。'],
 build_to_suit:['Xây dựng theo yêu cầu (build-to-suit) là chủ đầu tư xây công trình theo thông số của khách thuê rồi cho chính khách thuê đó thuê lại, thường cần thời gian chuẩn bị dài hơn.','Build-to-suit means the developer constructs a facility to the tenant\'s specifications and then leases it to that tenant, usually with a longer lead time.','定制厂房（build-to-suit）是指开发商按租户的规格建设设施后再租给该租户，通常准备周期较长。'],
};
export function glossaryLookup(text:string,lang:Lang):string|null{
 const f=fold(text);if(!findPhrases(f,['la gi','nghia la','what is','what are','what does','mean','meaning','difference','khac nhau','khac gi','是什么','什么是','什么意思','区别','意思']).length)return null;
 const types=ASSET_TYPES.filter(([v,p])=>findPhrases(f,v==='industrial_land'?p.filter(x=>x!=='land'&&x!=='dat'):p).length).map(([v])=>v);
 if(!types.length)return null;const i=lang==='vi'?0:lang==='en'?1:2;
 return types.map(t=>GLOSSARY[t][i]).join(' ');
}
// ---------- quoted creation wording (reported speech is not a request) ----------
const CREATE_WORDS=['create','make','start','open','prepare','submit','send','tao','lap','gui','创建','提交','发起','开始','建立'];
export function quotedOnlyCreation(text:string){
 const f=fold(text);if(!/["「]/.test(f))return false;
 const inside=[...f.matchAll(/"([^"]*)"|「([^」]*)」/g)].map(m=>m[1]||m[2]||'').join(' ');
 return findPhrases(inside,CREATE_WORDS).length>0&&!findPhrases(stripQuoted(f),CREATE_WORDS).length;
}

// ---------- actor helpers (S18, S20) ----------
const REPRESENTATIVE=["i am a broker","i'm a broker","im a broker","i am an agent","i'm an agent","i am a consultant","i'm a consultant",'i represent','we represent','representing','on behalf of','for my client','for a client','for our client','my client','our client',
 'toi la moi gioi','minh la moi gioi','ben moi gioi','ben minh la moi gioi','dai dien cho','thay mat','cho khach hang','khach hang cua toi','khach hang cua minh','我是中介','我是代理','我们是中介','代表客户','代表我的客户','代表我们的客户','替客户','为客户','我的客户','我们的客户'];
/** The visitor says they act for someone else. Representation is never verified; this only changes wording. */
export const isRepresentativeStatement=(text:string)=>findPhrases(fold(text),REPRESENTATIVE).length>0;
const EXPANSION=['another','additional','more space','extra space','expand','expansion','extra','new warehouse','new factory','second site','them','mo rong','them mot','them dien tich','另一个','另外一个','再租','扩建','扩大','扩张','更多','新的','增加'];
const PREMISES=['warehouse','factory','land','space','premises','site','plot','kho','xuong','nha xuong','dat','mat bang','dien tich','仓库','厂房','用地','空间','面积','场地'];
const SUPPORT=['leak','leaks','leaking','repair','broken','maintenance','roof','fault','outage','dot','hong','sua chua','bao tri','mat dien','漏水','维修','坏了','故障','停电','报修'];
/** Existing tenant asking for more premises (not support for current premises). */
export function isExpansionRequest(text:string){const f=fold(text);return findPhrases(f,EXPANSION).length>0&&findPhrases(f,PREMISES).length>0&&!findPhrases(f,SUPPORT).length}

// ---------- incompatible price bases (S28) ----------
export type Price={amount:number;currency:'VND'|'USD';areaBasis?:'m²'|'ha';period?:'month'|'year'|'term'};
const PRICE_SPLIT=/(?<![a-z])(?:vs\.?|versus|compared (?:with|to)|with|against|than|and|or|so voi|voi|va|hay|hoac|hon)(?![a-z])|与|和|跟|对比|比较|还是|或者|比/;
const COMPARE=['compare','vs','versus','cheaper','more expensive','better value','better deal','which is','so sanh','so voi','re hon','dat hon','loi hon','比较','对比','便宜','贵','哪个','划算'];
/** Two or more explicit prices whose currency, area basis or period differ, in a comparison request. */
export function incompatiblePrices(text:string,lang:Lang):{prices:Price[];differs:('currency'|'areaBasis'|'period')[]}|null{
 const f=fold(text);if(!findPhrases(f,COMPARE).length&&!/[?]\s*$/.test(f))return null;
 const prices:Price[]=[];
 for(const part of f.split(PRICE_SPLIT)){if(!part||!/\d/.test(part))continue;const r=parseBudget(part,lang);const b=r?.budget;if(b&&!r!.issue&&typeof b.amount==='number'&&b.amount>0&&b.currency)prices.push({amount:b.amount,currency:b.currency,areaBasis:b.areaBasis,period:b.period})}
 if(prices.length<2)return null;
 const differs:('currency'|'areaBasis'|'period')[]=[];
 for(const k of ['currency','areaBasis','period'] as const){const vals=new Set(prices.map(p=>p[k]).filter(Boolean));if(vals.size>1)differs.push(k)}
 return differs.length?{prices,differs}:null;
}
export const isPurposeQuestion=(text:string)=>findPhrases(fold(text),['why','what for','why do you need','why need','tai sao','vi sao','sao phai','de lam gi','can lam gi','为什么','为何','用来做什么','有什么用']).length>0;
