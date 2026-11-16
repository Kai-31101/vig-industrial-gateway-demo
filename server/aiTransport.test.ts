// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest';
import {completionEndpoint,requestModel} from './aiTransport';
afterEach(()=>vi.unstubAllGlobals());
describe('Gemini transport',()=>{
 it('supports direct Google and gateway endpoints without duplicate v1',()=>{expect(completionEndpoint('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');expect(completionEndpoint('https://ai-gateway.arobid.site')).toBe('https://ai-gateway.arobid.site/v1/chat/completions');expect(completionEndpoint('https://example.com/v1')).toBe('https://example.com/v1/chat/completions');expect(()=>completionEndpoint('http://example.com')).toThrow()});
 it('maps quota errors and never exposes response bodies',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private upstream details',{status:429})));await expect(requestModel([],false,{base:'https://example.com',key:'test',model:'test'})).rejects.toThrow('limited')});
 it('rejects truncated responses',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:'length',message:{content:'Incomplete'}}]})));await expect(requestModel([],true,{base:'https://example.com',key:'test',model:'test'})).rejects.toThrow('ai_unavailable')});
 it('returns complete text and requests JSON only when required',async()=>{const f=vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:'stop',message:{content:'{"allowed":true}'}}],usage:{total_tokens:5}}));vi.stubGlobal('fetch',f);expect((await requestModel([],true,{base:'https://example.com',key:'test',model:'test'})).text).toBe('{"allowed":true}');expect(JSON.parse(f.mock.calls[0][1].body).response_format.type).toBe('json_object')});
});
