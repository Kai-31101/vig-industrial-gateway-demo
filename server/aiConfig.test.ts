// @vitest-environment node
// model(): config is resolved before the DB budget or any API call; only Gemini is contacted; the configured model is reported.
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:mocks.query})}));
vi.mock('./repository',()=>({state:vi.fn()}));
import {model} from './ai';

const saved={...process.env};
beforeEach(()=>{mocks.query.mockReset();mocks.query.mockResolvedValue({rows:[{allowed:true}]});for(const k of ['OPENAI_API_KEY','OPENAI_MODEL','AI_GATEWAY_API_KEY','AI_GATEWAY_BASE_URL','AI_GATEWAY_MODEL'])delete process.env[k];vi.spyOn(console,'error').mockImplementation(()=>{});});
afterEach(()=>{process.env={...saved};vi.unstubAllGlobals();vi.restoreAllMocks();});
const completed=(text:string)=>Response.json({choices:[{finish_reason:'stop',message:{role:'assistant',content:text}}],usage:{prompt_tokens:7,completion_tokens:3,total_tokens:10}});

describe('model() configuration',()=>{
 it('fails safely before budget or API when AI_GATEWAY_API_KEY is missing (even if an OpenAI key exists)',async()=>{
  process.env.OPENAI_API_KEY='sk-openai-secret';
  const f=vi.fn();vi.stubGlobal('fetch',f);
  await expect(model([{role:'user',content:'hi'}])).rejects.toMatchObject({status:503,code:'ai_unavailable'});
  expect(f).not.toHaveBeenCalled();expect(mocks.query).not.toHaveBeenCalled();
 });
 it('calls only Gemini with the Gemini key, defaults to gemini-3.5-flash-lite and returns that model with usage',async()=>{
  process.env.AI_GATEWAY_API_KEY='gemini-test';process.env.OPENAI_API_KEY='sk-openai-secret';
  const f=vi.fn().mockResolvedValue(completed('Xin chào'));vi.stubGlobal('fetch',f);
  const r=await model([{role:'user',content:'hi'}]);
  expect(r).toMatchObject({text:'Xin chào',model:'gemini-3.5-flash-lite',usage:{prompt_tokens:7,completion_tokens:3}});
  expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer gemini-test');
  expect(JSON.stringify(f.mock.calls[0][1])).not.toContain('sk-openai-secret');
 });
 it('honours AI_GATEWAY_MODEL consistently in the request and the returned model',async()=>{
  process.env.AI_GATEWAY_API_KEY='gemini-test';process.env.AI_GATEWAY_MODEL='gemini-3.5-flash';
  const f=vi.fn().mockResolvedValue(completed('ok'));vi.stubGlobal('fetch',f);
  const r=await model([{role:'user',content:'hi'}],true);
  expect(r.model).toBe('gemini-3.5-flash');expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({model:'gemini-3.5-flash',response_format:{type:'json_object'}});
 });
 it('maps upstream quota to 429 limited and other failures to 503 ai_unavailable',async()=>{
  process.env.AI_GATEWAY_API_KEY='gemini-test';
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('x',{status:429})));
  await expect(model([{role:'user',content:'hi'}])).rejects.toMatchObject({status:429,code:'limited'});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:'length',message:{content:'x'}}]})));
  await expect(model([{role:'user',content:'hi'}])).rejects.toMatchObject({status:503,code:'ai_unavailable'});
 });
});
