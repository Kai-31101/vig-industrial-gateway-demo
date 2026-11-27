// @vitest-environment node
// model(): config is resolved before the DB budget or any API call; only OpenAI is contacted; the configured model is reported.
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./db',()=>({ApiError:class extends Error{constructor(public status:number,public code:string){super(code)}},pool:{query:mocks.query},tx:async(fn:any)=>fn({query:mocks.query})}));
vi.mock('./repository',()=>({state:vi.fn()}));
import {model} from './ai';

const saved={...process.env};
beforeEach(()=>{mocks.query.mockReset();mocks.query.mockResolvedValue({rows:[{allowed:true}]});for(const k of ['OPENAI_API_KEY','OPENAI_MODEL','AI_GATEWAY_API_KEY','AI_GATEWAY_BASE_URL','AI_GATEWAY_MODEL'])delete process.env[k];vi.spyOn(console,'error').mockImplementation(()=>{});});
afterEach(()=>{process.env={...saved};vi.unstubAllGlobals();vi.restoreAllMocks();});
const completed=(text:string)=>Response.json({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text}]}],usage:{input_tokens:7,output_tokens:3,total_tokens:10}});

describe('model() configuration',()=>{
 it('fails safely before budget or API when OPENAI_API_KEY is missing (even if a Gemini key exists)',async()=>{
  process.env.AI_GATEWAY_API_KEY='gemini-secret';process.env.AI_GATEWAY_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai';
  const f=vi.fn();vi.stubGlobal('fetch',f);
  await expect(model([{role:'user',content:'hi'}])).rejects.toMatchObject({status:503,code:'ai_unavailable'});
  expect(f).not.toHaveBeenCalled();expect(mocks.query).not.toHaveBeenCalled();
 });
 it('calls only OpenAI with the OpenAI key, defaults to gpt-6.1-sol and returns that model with normalized usage',async()=>{
  process.env.OPENAI_API_KEY='sk-openai-test';process.env.AI_GATEWAY_API_KEY='gemini-secret';
  const f=vi.fn().mockResolvedValue(completed('Xin chào'));vi.stubGlobal('fetch',f);
  const r=await model([{role:'user',content:'hi'}]);
  expect(r).toMatchObject({text:'Xin chào',model:'gpt-6.1-sol',usage:{prompt_tokens:7,completion_tokens:3}});
  expect(f).toHaveBeenCalledTimes(1);expect(f.mock.calls[0][0]).toBe('https://api.openai.com/v1/responses');
  expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-openai-test');
  expect(JSON.stringify(f.mock.calls[0][1])).not.toContain('gemini-secret');
  expect(JSON.parse(f.mock.calls[0][1].body).model).toBe('gpt-6.1-sol');
 });
 it('honours OPENAI_MODEL consistently in the request and the returned model',async()=>{
  process.env.OPENAI_API_KEY='sk-openai-test';process.env.OPENAI_MODEL='gpt-6.1-sol-2026-11-01';
  const f=vi.fn().mockResolvedValue(completed('ok'));vi.stubGlobal('fetch',f);
  const r=await model([{role:'user',content:'hi'}],true);
  expect(r.model).toBe('gpt-6.1-sol-2026-11-01');expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({model:'gpt-6.1-sol-2026-11-01',text:{format:{type:'json_object'}}});
 });
 it('maps upstream quota to 429 limited and other failures to 503 ai_unavailable',async()=>{
  process.env.OPENAI_API_KEY='sk-openai-test';
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('x',{status:429})));
  await expect(model([{role:'user',content:'hi'}])).rejects.toMatchObject({status:429,code:'limited'});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({status:'incomplete',output:[]})));
  await expect(model([{role:'user',content:'hi'}])).rejects.toMatchObject({status:503,code:'ai_unavailable'});
 });
});
