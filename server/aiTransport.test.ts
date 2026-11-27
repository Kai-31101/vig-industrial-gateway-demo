// @vitest-environment node
// Gemini transport (OpenAI-compatible Chat Completions). Mocked fetch only; no live call.
import {afterEach,describe,it,expect,vi} from 'vitest';
import {requestModel,outputText,normalizeUsage,modelConfig,completionEndpoint,DEFAULT_AI_BASE_URL,DEFAULT_AI_MODEL} from './aiTransport';
afterEach(()=>vi.unstubAllGlobals());
const cfg={base:DEFAULT_AI_BASE_URL,key:'gemini-test',model:'gemini-3.5-flash-lite'};
const msgs=[{role:'system',content:'Return JSON only.'},{role:'user',content:'Hello'}];
const ok=(text:string,extra:any={})=>Response.json({choices:[{index:0,finish_reason:'stop',message:{role:'assistant',content:text}}],usage:{prompt_tokens:120,completion_tokens:30,total_tokens:150},...extra});
const body=(f:any,i=0)=>JSON.parse(f.mock.calls[i][1].body);

describe('Gemini chat-completions transport',()=>{
 it('posts to the Gemini OpenAI-compatible endpoint with the configured model, low reasoning and bounded output',async()=>{
  const f=vi.fn().mockResolvedValue(ok('Grounded answer.'));vi.stubGlobal('fetch',f);
  const r=await requestModel(msgs,false,cfg);
  expect(r.text).toBe('Grounded answer.');
  expect(f.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer gemini-test');
  expect(body(f)).toMatchObject({model:'gemini-3.5-flash-lite',messages:msgs,reasoning_effort:'low',max_tokens:6000,temperature:0.1});
  expect(body(f)).not.toHaveProperty('response_format');
 });
 it('requests JSON mode only when required',async()=>{
  const f=vi.fn().mockResolvedValue(ok('{"allowed":true}'));vi.stubGlobal('fetch',f);
  expect((await requestModel(msgs,true,cfg)).text).toBe('{"allowed":true}');
  expect(body(f).response_format).toEqual({type:'json_object'});
 });
 it('builds endpoints from OpenAI-compatible bases and requires HTTPS',()=>{
  expect(completionEndpoint('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
  expect(completionEndpoint('https://gateway.example/v1')).toBe('https://gateway.example/v1/chat/completions');
  expect(completionEndpoint('https://gateway.example')).toBe('https://gateway.example/v1/chat/completions');
  expect(()=>completionEndpoint('http://gateway.example/v1')).toThrow('HTTPS is required');
 });
 it('returns usage in the ledger shape',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(ok('ok')));
  expect((await requestModel(msgs,false,cfg)).usage).toEqual({prompt_tokens:120,completion_tokens:30,total_tokens:150});
  expect(normalizeUsage(undefined)).toEqual({prompt_tokens:0,completion_tokens:0,total_tokens:0});
 });
 it('rejects truncated, filtered, errored or empty responses',async()=>{
  const bad=[
   {choices:[{finish_reason:'length',message:{content:'Partial'}}]},
   {choices:[{finish_reason:'content_filter',message:{content:'x'}}]},
   {error:{message:'x'}},
   {choices:[{finish_reason:'stop',message:{content:'   '}}]},
   {choices:[]},
   {},
  ];
  for(const d of bad){vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(d)));await expect(requestModel(msgs,true,cfg)).rejects.toThrow('ai_unavailable');}
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('not json',{status:200})));await expect(requestModel(msgs,false,cfg)).rejects.toThrow('ai_unavailable');
  expect(outputText({choices:[{finish_reason:'stop',message:{content:'Hi'}}]})).toBe('Hi');
 });
 it('maps quota and client errors to safe categories and never exposes response bodies',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private upstream details',{status:429})));
  const e:any=await requestModel(msgs,false,cfg).catch(x=>x);expect(e.message).toBe('limited');expect(e.upstreamStatus).toBe(429);expect(String(e.message)).not.toContain('private');
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{"error":{"message":"bad"}}',{status:400})));
  await expect(requestModel(msgs,false,cfg)).rejects.toThrow('ai_unavailable');
 });
 it('retries once on a transient 5xx, never on 429 or 4xx',async()=>{
  let f=vi.fn().mockResolvedValueOnce(new Response('x',{status:503})).mockResolvedValueOnce(ok('ok'));vi.stubGlobal('fetch',f);
  expect((await requestModel(msgs,false,cfg)).text).toBe('ok');expect(f).toHaveBeenCalledTimes(2);
  f=vi.fn().mockResolvedValue(new Response('x',{status:502}));vi.stubGlobal('fetch',f);
  await expect(requestModel(msgs,false,cfg)).rejects.toThrow('ai_unavailable');expect(f).toHaveBeenCalledTimes(2);
  f=vi.fn().mockResolvedValue(new Response('x',{status:429}));vi.stubGlobal('fetch',f);
  await expect(requestModel(msgs,false,cfg)).rejects.toThrow('limited');expect(f).toHaveBeenCalledTimes(1);
  f=vi.fn().mockResolvedValue(new Response('x',{status:401}));vi.stubGlobal('fetch',f);
  await expect(requestModel(msgs,false,cfg)).rejects.toThrow('ai_unavailable');expect(f).toHaveBeenCalledTimes(1);
 });
 it('uses a 45s abort signal',async()=>{
  const spy=vi.spyOn(AbortSignal,'timeout');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(ok('ok')));
  await requestModel(msgs,false,cfg);expect(spy).toHaveBeenCalledWith(45000);spy.mockRestore();
 });
 it('reads AI_GATEWAY_* config with Gemini defaults; no key => null; OpenAI vars ignored',()=>{
  expect(DEFAULT_AI_MODEL).toBe('gemini-3.5-flash-lite');
  expect(modelConfig({AI_GATEWAY_API_KEY:'g-a'})).toEqual({key:'g-a',base:DEFAULT_AI_BASE_URL,model:'gemini-3.5-flash-lite'});
  expect(modelConfig({AI_GATEWAY_API_KEY:'g-a',AI_GATEWAY_MODEL:'gemini-3.5-flash',AI_GATEWAY_BASE_URL:'https://gw.example/v1'})).toEqual({key:'g-a',base:'https://gw.example/v1',model:'gemini-3.5-flash'});
  expect(modelConfig({AI_GATEWAY_API_KEY:'  '})).toBeNull();
  expect(modelConfig({OPENAI_API_KEY:'sk-a',OPENAI_MODEL:'gpt-6.1-sol'})).toBeNull();
 });
});
