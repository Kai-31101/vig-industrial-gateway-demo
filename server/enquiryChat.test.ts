import {beforeEach,describe,it,expect,vi} from 'vitest';
import {signEnquiry,readEnquiry,confirmsEnquiry} from './enquiryConfirmation';
const mocks=vi.hoisted(()=>({model:vi.fn(),submit:vi.fn(),query:vi.fn()}));
vi.mock('./ai',()=>({model:mocks.model}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:mocks.submit})}));
import {enquiryChat} from './enquiryChat';
const draft={kind:'find_supply',transaction:'lease',service:'Find Supply',organization:'QA Company',contactName:'QA Contact',email:'qa@example.com',phone:'+84900000000',assetType:'ready_built_factory',location:'North',areaMin:10000,areaMax:20000,industry:'Electronics',budget:{mode:'negotiable',amount:null},dateUnknown:true,availabilityDate:'',requirements:'',idempotencyKey:'qa-enquiry-123456789'};
const session={tokenHash:'session-one'};
beforeEach(()=>{vi.clearAllMocks();process.env.SESSION_SECRET='local-test-secret';mocks.query.mockResolvedValue({rows:[{kind:'park',payload:{id:'p1',province:'Hải Phòng',suitableIndustries:['Electronics'],name:{en:'QA park'}}}]});mocks.model.mockResolvedValue({text:'{"patch":{}}'});mocks.submit.mockResolvedValue({rows:[{request:{id:'QA-ONE'}}]});});
describe('chat enquiry confirmation boundary',()=>{
 it('binds reviews to the session, content and expiry',()=>{const token=signEnquiry(draft,'one','secret',100);expect(readEnquiry(token,'one','secret',101)).toEqual(draft);expect(readEnquiry(token,'two','secret',101)).toBeNull();expect(readEnquiry(token+'x','one','secret',101)).toBeNull();expect(readEnquiry(token,'one','secret',1800101)).toBeNull()});
 it.each(['yes but change the area','do not confirm','không xác nhận','"confirm"','不要确认','confirm and change phone','ok'])('does not treat %s as approval',text=>expect(confirmsEnquiry(text)).toBe(false));
 it.each([['vi','xác nhận'],['en','confirm'],['zh','确认']])('requires a review before submitting in %s',async(language,message)=>{
  const first=await enquiryChat(session,{draft,message,language});expect(first.reviewToken).toBeTruthy();expect(mocks.submit).not.toHaveBeenCalled();
  const result=await enquiryChat(session,{draft:first.draft,reviewToken:first.reviewToken,message,language});expect(result.request?.id).toBe('QA-ONE');expect(mocks.model).not.toHaveBeenCalled();expect(mocks.submit).toHaveBeenCalledWith(expect.stringContaining('submit_enquiry'),[session.tokenHash,draft.idempotencyKey,expect.any(String)]);
 });
 it('cannot submit incomplete details even if asked to confirm',async()=>{const result=await enquiryChat(session,{draft:{...draft,email:''},message:'confirm',language:'en'});expect(result.reviewToken).toBeNull();expect(result.text).toContain('email');expect(mocks.submit).not.toHaveBeenCalled()});
 it('rejects a changed payload with an old review token',async()=>{const review=await enquiryChat(session,{draft,message:'',language:'en'});await expect(enquiryChat(session,{draft:{...review.draft,areaMax:30000},reviewToken:review.reviewToken,message:'confirm',language:'en'})).rejects.toThrow('review_changed');expect(mocks.submit).not.toHaveBeenCalled()});
 it('edits and negative confirmations never submit',async()=>{const review=await enquiryChat(session,{draft,message:'',language:'en'});mocks.model.mockResolvedValue({text:'{"patch":{"areaMax":30000}}'});const edited=await enquiryChat(session,{draft:review.draft,reviewToken:review.reviewToken,message:'Do not confirm, change the maximum to 30000 m2',language:'en'});expect(edited.draft.areaMax).toBe(30000);expect(edited.reviewToken).not.toBe(review.reviewToken);expect(mocks.submit).not.toHaveBeenCalled()});
 it('cancels without calling AI or creating a request',async()=>{expect((await enquiryChat(session,{draft,message:'hủy',language:'vi'})).cancelled).toBe(true);expect(mocks.submit).not.toHaveBeenCalled();expect(mocks.model).not.toHaveBeenCalled()});
 it('keeps one idempotency key on repeated confirmation',async()=>{const review=await enquiryChat(session,{draft,message:'',language:'en'});for(let i=0;i<2;i++)await enquiryChat(session,{draft:review.draft,reviewToken:review.reviewToken,message:'confirm',language:'en'});expect(mocks.submit.mock.calls.map(c=>c[1][1])).toEqual([draft.idempotencyKey,draft.idempotencyKey])});
 it('keeps a direct contact reply out of the AI provider',async()=>{const result=await enquiryChat(session,{draft:{...draft,email:''},message:'new@example.com',language:'en'});expect(result.draft.email).toBe('new@example.com');expect(mocks.model).not.toHaveBeenCalled()});
});
