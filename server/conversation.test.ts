import {describe,it,expect} from 'vitest';
import {classifyTurn,parseArea,parseNumber,parseLocation,parseBudget,mergeBudget,missingBudgetParts,parseDate,parseReply,extractContacts,maskForModel,parseOrdinal,inferAskedField,sanitizeConversation,glossaryLookup,isBareAffirmation,hasEditVerb,type ParseCtx} from './conversation';
import {maskContact,findPhones} from '../src/requestSchema';

const provinces=['Hải Phòng','Bắc Ninh','Hà Nội','Bình Dương','Bà Rịa–Vũng Tàu','Đà Nẵng','Hưng Yên'];
const categories=['Electronics','Food processing','Logistics','Cold storage'];
const ctx=(asked:any,lang:'vi'|'en'|'zh'='en'):ParseCtx=>({lang,provinces,categories,today:'2026-11-17',asked,conv:sanitizeConversation(null)});

describe('turn classification',()=>{
 it.each(['Pause this; show warehouses instead','tạm dừng','tam dung nhe','暂停'])('%s is a pause',t=>expect(classifyTurn(t).kind).toBe('pause'));
 it('pause with a follow-up request is flagged',()=>{expect(classifyTurn('Pause this; show warehouses instead').followUp).toBe(true);expect(classifyTurn('pause').followUp).toBe(false)});
 it.each(['resume','Resume my enquiry','tiếp tục','继续'])('%s is a resume',t=>expect(classifyTurn(t).kind).toBe('resume'));
 it.each(['Why do you need my company name?','What is build-to-suit?','Xây dựng theo yêu cầu là gì','为什么需要公司名称','有冷库吗'])('%s is a question',t=>expect(classifyTurn(t).kind).toBe('question'));
 it.each(['If I said "not specified", would you still search?','Giả sử tôi nói chưa xác định thì sao','如果我说待定，还会搜索吗'])('%s is hypothetical',t=>expect(classifyTurn(t).kind).toBe('hypothetical'));
 it.each(['I would rather not share my phone','Tôi không muốn cung cấp số điện thoại','我不想提供电话'])('%s is a refusal',t=>expect(classifyTurn(t).kind).toBe('refusal'));
 it.each(['Do not know yet','chưa xác định','I have not decided yet','Q3 later this year','ABC Manufacturing Co., Ltd'])('%s is an answer',t=>expect(classifyTurn(t).kind).toBe('answer'));
 it('edit verbs inside quotes do not count',()=>{expect(hasEditVerb('Change the area to 3 ha')).toBe(true);expect(hasEditVerb('He said "change everything" yesterday')).toBe(false)});
 it.each(['yes','ok','vâng','好的'.slice(0,1)])('bare affirmation %s',t=>expect(isBareAffirmation(t)).toBe(true));
 it('affirmation with content is not bare',()=>expect(isBareAffirmation('yes, warehouses in the North')).toBe(false));
});

describe('locale-aware numbers',()=>{
 it('uses unit plausibility before locale',()=>{
  expect(parseNumber('10.000','en',1)).toBe(10000);expect(parseNumber('10.000','vi',1)).toBe(10000);
  expect(parseNumber('2.500','en',10000)).toBe(2.5);expect(parseNumber('2,500','en',1)).toBe(2500);
  expect(parseNumber('1,5','vi',10000)).toBe(1.5);expect(parseNumber('10 000','en',1)).toBe(10000);
 });
 it('asks when both readings are plausible and the separator is the locale decimal',()=>{
  expect(parseNumber('300.000','en',1)).toBe('ambiguous');expect(parseNumber('300.000','vi',1)).toBe(300000);
  expect(parseNumber('300,000','vi',1)).toBe('ambiguous');expect(parseNumber('300,000','en',1)).toBe(300000);
  expect(parseNumber('2.500','en')).toBe('ambiguous');expect(parseNumber('2.500','vi')).toBe(2500);
 });
});

describe('area parsing',()=>{
 it.each([
  ['Between 1 and 2 ha','en',10000,20000],['từ 1 đến 2 ha','vi',10000,20000],['1到2公顷','zh',10000,20000],
  ['10.000–20.000 m2','vi',10000,20000],['10,000-20,000 m²','en',10000,20000],['2 ha','en',20000,20000],['5000平方米','zh',5000,5000],['1,5 ha','vi',15000,15000],
 ])('%s',(t,lang,min,max)=>expect(parseArea(t,lang as any)).toMatchObject({areaMin:min,areaMax:max}));
 it('needs a unit for a bare number and never assumes m²',()=>expect(parseArea('5,000','en')).toMatchObject({issue:'needs_unit',pending:{min:'5,000',max:'5,000'}}));
 it('resolves a pending number when the unit arrives',()=>expect(parseArea('m2','en',{min:'5,000',max:'5,000'})).toMatchObject({areaMin:5000,areaMax:5000}));
 it('reports a reversed range instead of silently swapping',()=>expect(parseArea('Between 10,000 and 5,000 m²','en')).toMatchObject({issue:'reversed'}));
 it('rejects unsupported units',()=>expect(parseArea('3 mẫu','vi')).toMatchObject({issue:'unit_unsupported'}));
});

describe('location parsing',()=>{
 it.each([['chưa xác định'],['chua xac dinh'],['Not specified'],['Anywhere suitable'],['待定'],['都可以'],['đâu cũng được']])('%s is explicit unknown',t=>expect(parseLocation(t,provinces)).toMatchObject({unknown:true}));
 it('specific region beats unknown province (S03)',()=>expect(parseLocation('No province yet, but only the North',provinces)).toMatchObject({value:'North'}));
 it('latest correction with negation (S05)',()=>{expect(parseLocation('Actually the South, not the North',provinces)).toMatchObject({value:'South'});expect(parseLocation('miền Nam, không phải miền Bắc',provinces)).toMatchObject({value:'South'})});
 it('provinces containing region words are not regions (N5)',()=>{expect(parseLocation('Bắc Ninh',provinces)).toMatchObject({value:'Bắc Ninh'});expect(parseLocation('bac ninh',provinces)).toMatchObject({value:'Bắc Ninh'})});
 it.each([['Hải Phòng','Hải Phòng'],['Hai Phong','Hải Phòng'],['海防','Hải Phòng'],['Vung Tau','Bà Rịa–Vũng Tàu'],['miền Bắc','North'],['北部','North'],['Nam','South']])('%s → %s',(t,v)=>expect(parseLocation(t,provinces)).toMatchObject({value:v}));
 it('two non-negated places are ambiguous',()=>expect(parseLocation('Hải Phòng or Bình Dương',provinces)).toMatchObject({ambiguous:true}));
});

describe('budget',()=>{
 it.each([['Not specified','not_available'],['chưa xác định','not_available'],['待定','not_available'],['Negotiable','negotiable'],['thương lượng','negotiable'],['面议','negotiable']])('%s → %s',(t,mode)=>expect(parseBudget(t,'en')!.budget.mode).toBe(mode));
 it('keeps partial components and lists only what is missing (S27)',()=>{const r=parseBudget('5 USD/m²','en')!;expect(r.budget).toMatchObject({mode:'specific',amount:5,currency:'USD',areaBasis:'m²'});expect(missingBudgetParts(mergeBudget(undefined,r.budget))).toEqual(['period'])});
 it('merges a later component without losing earlier ones (F09)',()=>expect(mergeBudget({mode:'specific',amount:5,currency:'USD',areaBasis:'m²'},parseBudget('per month','en')!.budget)).toEqual({mode:'specific',amount:5,currency:'USD',areaBasis:'m²',period:'month'}));
 it.each([['5 USD/m2/tháng','vi',{amount:5,currency:'USD',areaBasis:'m²',period:'month'}],['120 triệu đồng/ha/năm','vi',{amount:120e6,currency:'VND',areaBasis:'ha',period:'year'}],['每月每平方米5美元','zh',{amount:5,currency:'USD',areaBasis:'m²',period:'month'}]])('%s',(t,lang,exp)=>expect(parseBudget(t,lang as any)!.budget).toMatchObject(exp));
 it('never assumes a currency',()=>expect(parseBudget('50 triệu/ha/năm','vi')!.budget.currency).toBeUndefined());
});

describe('dates',()=>{
 it.each(['Not decided','chưa xác định','待定','flexible'])('%s → unknown',t=>expect(parseDate(t,'en','2026-11-17')).toMatchObject({unknown:true}));
 it('valid dates',()=>{expect(parseDate('2027-06-01','en','2026-11-17')).toMatchObject({date:'2027-06-01'});expect(parseDate('01/06/2027','vi','2026-11-17')).toMatchObject({date:'2027-06-01'});expect(parseDate('2027年6月1日','zh','2026-11-17')).toMatchObject({date:'2027-06-01'})});
 it('invalid calendar and past dates (S31)',()=>{expect(parseDate('2027-02-30','en','2026-11-17')).toMatchObject({issue:'calendar'});expect(parseDate('2025-01-01','en','2026-11-17')).toMatchObject({issue:'past'})});
 it('ambiguous English day/month',()=>expect(parseDate('03/04/2027','en','2026-11-17')).toMatchObject({issue:'ambiguous_date'}));
 it.each(['In the second quarter next year','quý 2 năm sau','明年第二季度'])('approximate %s (S30)',t=>expect(parseDate(t,'en','2026-11-17')?.approx).toBeTruthy());
});

describe('multi-field replies',()=>{
 it('cross-field unknown only applies to its own field (S52)',()=>{const r=parseReply('Budget unknown, location Hai Phong',ctx('budget'));expect(r.complete).toBe(true);expect(r.updates).toEqual(expect.arrayContaining([{field:'budget',value:{mode:'not_available',amount:null}},{field:'location',value:'Hải Phòng'}]))});
 it('known region survives the unknown province phrase (S03)',()=>{const r=parseReply('No province yet, but only the North',ctx('location'));expect(r.updates).toEqual([{field:'location',value:'North'}])});
 it('comma thousands are not split into segments',()=>expect(parseReply('10,000-20,000 m²',ctx('areaMin')).updates).toEqual([{field:'areaMin',value:{areaMin:10000,areaMax:20000}}]));
 it('unrelated content is left to the model',()=>expect(parseReply('We need a cold storage warehouse near the port',ctx('location')).complete).toBe(false));
 it('quoted text is never parsed deterministically (S53)',()=>expect(parseReply('If I said "not specified"',ctx('location'))).toEqual({updates:[],complete:false}));
});

describe('contacts and masking (S35, F11)',()=>{
 it('keeps area/price numbers and masks phones',()=>{
  expect(maskContact('Factory 10000-20000 m2')).toBe('Factory 10000-20000 m2');
  expect(maskContact('budget 500000000 VND per year')).toBe('budget 500000000 VND per year');
  expect(maskContact('call 0912 345 678 about 20000 m2')).toBe('call [contact number omitted] about 20000 m2');
  expect(maskContact('phone: 20000000')).toBe('phone: [contact number omitted]');
  expect(maskContact('+84 900 000 000 ha')).toContain('[contact number omitted]');
  expect(maskContact('test@example.com +84 900 000 000')).not.toMatch(/example\.com|900/);
 });
 it('phone-shaped numbers are masked even next to a unit (privacy wins)',()=>{expect(findPhones('0912345678 m2 please').length).toBe(1);expect(findPhones('area 1500000 m2').length).toBe(0)});
 it('extracts labelled contacts locally and redacts them for the model',()=>{
  const t='Company: QA Synthetic Ltd, contact person: Test User, email qa@example.test, phone +84 900 000 000, area is 2 ha';
  expect(extractContacts(t)).toMatchObject({organization:'QA Synthetic Ltd',contactName:'Test User',email:'qa@example.test',phone:'+84 900 000 000'});
  const masked=maskForModel(t);
  expect(masked).not.toMatch(/QA Synthetic|Test User|example\.test|900 000/);expect(masked).toContain('2 ha');
 });
 it('does not treat a request as a company name',()=>expect(extractContacts('Our company is looking for a factory').organization).toBeUndefined());
 it('bare "contact me" is not a name label',()=>expect(extractContacts('contact me at qa@example.test').contactName).toBeUndefined());
});

describe('discovery helpers',()=>{
 it.each([['the second one',2],['cái thứ hai',2],['第二个',2],['the last one',-1],['first',1]])('%s',(t,n)=>expect(parseOrdinal(t)).toBe(n));
 it('ordinal inside a longer request is not a reference',()=>expect(parseOrdinal('second quarter of next year')).toBeNull());
 it('infers what the assistant asked',()=>{
  expect(inferAskedField('I found 3 parks. Which province or region do you prefer?')).toBe('location');
  expect(inferAskedField('Bạn ưu tiên tỉnh hoặc khu vực nào?')).toBe('location');
  expect(inferAskedField('您需要多大面积？')).toBe('areaMin');
  expect(inferAskedField('Here are the results.')).toBeNull();
 });
 it('glossary answers only for property-type definitions (S11)',()=>{expect(glossaryLookup('What is build-to-suit?','en')).toMatch(/specifications/);expect(glossaryLookup('Xây dựng theo yêu cầu là gì?','vi')).toMatch(/thông số/);expect(glossaryLookup('What is the price?','en')).toBeNull()});
 it('conversation object is sanitized and carries no authority',()=>{const c=sanitizeConversation({askedField:'consent',attempts:{location:2,x:5},paused:'yes',pendingArea:{min:'<script>',max:'1'},reviewToken:'x',consent:true});expect(c).toEqual({askedField:null,attempts:{location:2},declined:[],pendingArea:null,approxDate:null,paused:false})});
});

// ---- Targeted completion pass: S18, S20, S28 rules ----
import {incompatiblePrices,isRepresentativeStatement,isExpansionRequest,quotedOnlyCreation} from './conversation';
describe('S28 incompatible price bases (rules)',()=>{
 it.each([
  ['en','Compare 5 USD/m²/month with 2 billion VND/ha/year',['currency','areaBasis','period']],
  ['vi','So sánh 5 USD/m2/tháng với 2 tỷ đồng/ha/năm',['currency','areaBasis','period']],
  ['zh','每平方米每月5美元和每公顷每年20亿越南盾比较哪个便宜',['currency','areaBasis','period']],
  ['en','Is 4 dollars per square metre a month cheaper than 1.5 billion dong per hectare per year?',['currency','areaBasis','period']],
  ['vi','4 USD/m2/tháng có rẻ hơn 50 USD/m2/năm không?',['period']],
 ])('%s: %s',(lang,text,dims)=>{const r=incompatiblePrices(text,lang as any);expect(r?.prices.length).toBe(2);expect(r?.differs).toEqual(dims)});
 it('the same basis is not flagged (comparison is legitimate)',()=>expect(incompatiblePrices('Compare 5 USD/m²/month with 6 USD/m²/month','en')).toBeNull());
 it('a single price or no comparison is not flagged',()=>{expect(incompatiblePrices('My budget is 5 USD/m²/month','en')).toBeNull();expect(incompatiblePrices('5 USD/m2/month and 2 billion VND/ha/year are my two quotes','en')).toBeNull()});
 it('converted amounts are parsed, never computed against each other',()=>expect(incompatiblePrices('So sánh 5 USD/m2/tháng với 2 tỷ đồng/ha/năm','vi')!.prices.map(p=>p.amount)).toEqual([5,2e9]));
});
describe('S18 representative / S20 expansion (rules)',()=>{
 it.each(['I represent a tenant looking for a factory','We are acting on behalf of our client','Tôi là môi giới, tìm xưởng cho khách hàng','Tôi đại diện cho một doanh nghiệp','我是中介，替客户找厂房','我代表客户咨询'])('representative: %s',t=>expect(isRepresentativeStatement(t)).toBe(true));
 it.each(['ABC Brokerage Co','QA Synthetic Ltd','Công ty TNHH Đại Phát','中介服务有限公司'])('a company name is not a representative statement: %s',t=>expect(isRepresentativeStatement(t)).toBe(false));
 it.each(['We are already a tenant and need another warehouse','Chúng tôi đang thuê và cần thêm một nhà xưởng','我们是现有租户，需要再租一个仓库'])('expansion: %s',t=>expect(isExpansionRequest(t)).toBe(true));
 it.each(['The roof of our rented factory leaks','Mái nhà xưởng đang thuê bị dột','我们租的厂房屋顶漏水','We need another repair crew for the factory roof'])('support, not expansion: %s',t=>expect(isExpansionRequest(t)).toBe(false));
});
describe('edit-verb idioms (found by the completion pass)',()=>{
 it.each(['làm thay mặt khách hàng','bạn bỏ qua nhé','Do not remove the location','不要删除地点'])('%s is not an edit request',t=>expect(hasEditVerb(t)).toBe(false));
 it.each(['thay địa điểm thành miền Nam','bỏ ngân sách','Remove the location','删除地点'])('%s is still an edit request',t=>expect(hasEditVerb(t)).toBe(true));
});
describe('quoted-only creation wording',()=>{
 it.each(['My colleague typed "create a leasing enquiry" yesterday','Đồng nghiệp tôi gõ “tạo yêu cầu thuê” hôm qua','同事昨天输入了“创建租赁需求”'])('%s is reported speech',t=>expect(quotedOnlyCreation(t)).toBe(true));
 it.each(['Create a leasing enquiry for "Factory 13-2"','Tạo yêu cầu thuê cho “Kho 03-2”','Create leasing enquiry'])('%s is a real request',t=>expect(quotedOnlyCreation(t)).toBe(false));
});
