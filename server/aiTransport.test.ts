// @vitest-environment node
// OpenAI Responses API transport (gpt-6.1-sol). Mocked fetch only; no live call.
import {afterEach,describe,it,expect,vi} from 'vitest';
import {requestModel,outputText,normalizeUsage,openAIConfig,OPENAI_RESPONSES_URL,DEFAULT_OPENAI_MODEL} from './aiTransport';
afterEach(()=>vi.unstubAllGlobals());
const cfg={key:'sk-test',model:'gpt-6.1-sol'};
const msgs=[{role:'system',content:'Return JSON only.'},{role:'user',content:'Hello'}];
const ok=(text:string,extra:any={})=>Response.json({id:'resp_1',object:'response',status:'completed',output:[
 {type:'reasoning',id:'rs_1',summary:[]},
 {type:'message',id:'msg_1',role:'assistant',status:'completed',content:[{type:'output_text',text,annotations:[]}]}],
 usage:{input_tokens:120,output_tokens:30,total_tokens:150,output_tokens_details:{reasoning_tokens:10}},...extra});
const body=(f:any,i=0)=>JSON.parse(f.mock.calls[i][1].body);

describe('OpenAI Responses transport',()=>{
 it('posts to the Responses endpoint with the configured model, low reasoning, store:false and bounded output; no temperature',async()=>{
  const f=vi.fn().mockResolvedValue(ok('Grounded answer.'));vi.stubGlobal('fetch',f);
  const r=await requestModel(msgs,false,cfg);
  expect(r.text).toBe('Grounded answer.');
  expect(f.mock.calls[0][0]).toBe(OPENAI_RESPONSES_URL);
  expect(f.mock.calls[0][1].headers.Authorization).toBe('Bearer sk-test');
  const b=body(f);
  expect(b).toMatchObject({model:'gpt-6.1-sol',reasoning:{effort:'low'},store:false,max_output_tokens:6000,input:msgs});
  expect(b).not.toHaveProperty('temperature');expect(b).not.toHaveProperty('messages');expect(b).not.toHaveProperty('max_tokens');expect(b).not.toHaveProperty('text');
 });
 it('requests JSON mode only when required and returns the raw output_text JSON',async()=>{
  const f=vi.fn().mockResolvedValue(ok('{"allowed":true}'));vi.stubGlobal('fetch',f);
  expect((await requestModel(msgs,true,cfg)).text).toBe('{"allowed":true}');
  expect(body(f).text).toEqual({format:{type:'json_object'}});
 });
 it('normalizes Responses usage to the existing ledger fields',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(ok('ok')));
  expect((await requestModel(msgs,false,cfg)).usage).toEqual({prompt_tokens:120,completion_tokens:30,total_tokens:150});
  expect(normalizeUsage(undefined)).toEqual({prompt_tokens:0,completion_tokens:0,total_tokens:0});
 });
 it('joins multiple output_text blocks and ignores reasoning items',()=>{
  expect(outputText({status:'completed',output:[{type:'reasoning'},{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Hello '},{type:'output_text',text:'world'}]}]})).toBe('Hello world');
 });
 it('rejects incomplete, refused, failed, errored or empty responses',async()=>{
  const bad=[
   {status:'incomplete',incomplete_details:{reason:'max_output_tokens'},output:[{type:'message',role:'assistant',status:'incomplete',content:[{type:'output_text',text:'Partial'}]}]},
   {status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal',refusal:'I cannot help with that.'}]}]},
   {status:'failed',error:{code:'server_error',message:'x'},output:[]},
   {status:'completed',error:{code:'x'},output:[]},
   {status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'   '}]}]},
   {status:'completed',output:[{type:'reasoning'}]},
   {status:'completed'},
  ];
  for(const d of bad){vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(d)));await expect(requestModel(msgs,true,cfg)).rejects.toThrow('ai_unavailable');}
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('not json',{status:200})));await expect(requestModel(msgs,false,cfg)).rejects.toThrow('ai_unavailable');
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
 it('reads only OPENAI_* config: default model gpt-6.1-sol, override via OPENAI_MODEL, no key => null; Gemini vars ignored',()=>{
  expect(DEFAULT_OPENAI_MODEL).toBe('gpt-6.1-sol');
  expect(openAIConfig({OPENAI_API_KEY:'sk-a'})).toEqual({key:'sk-a',model:'gpt-6.1-sol'});
  expect(openAIConfig({OPENAI_API_KEY:'sk-a',OPENAI_MODEL:'gpt-6.1-sol-mini'})).toEqual({key:'sk-a',model:'gpt-6.1-sol-mini'});
  expect(openAIConfig({OPENAI_API_KEY:'  '})).toBeNull();
  expect(openAIConfig({AI_GATEWAY_API_KEY:'gemini-key',AI_GATEWAY_MODEL:'gemini-3.5-flash-lite',AI_GATEWAY_BASE_URL:'https://generativelanguage.googleapis.com/v1beta/openai'})).toBeNull();
 });
});
