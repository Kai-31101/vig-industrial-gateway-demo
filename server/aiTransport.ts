// Server-only model transport: Google Gemini through its OpenAI-compatible Chat Completions endpoint.
// Used by every assistant (public home chat, enquiry chat, admin assistant). Errors are mapped to safe categories;
// upstream bodies are never surfaced.
export const DEFAULT_AI_BASE_URL='https://generativelanguage.googleapis.com/v1beta/openai';
export const DEFAULT_AI_MODEL='gemini-3.5-flash-lite';
export type ModelConfig={base:string;key:string;model:string};
export type ModelUsage={prompt_tokens:number;completion_tokens:number;total_tokens:number};

/** Reads server-only config (AI_GATEWAY_API_KEY, optional AI_GATEWAY_BASE_URL / AI_GATEWAY_MODEL). Null when the key is missing. */
export function modelConfig(env:Record<string,string|undefined>=process.env):ModelConfig|null{
 const key=env.AI_GATEWAY_API_KEY?.trim();if(!key)return null;
 return {key,base:env.AI_GATEWAY_BASE_URL?.trim()||DEFAULT_AI_BASE_URL,model:env.AI_GATEWAY_MODEL?.trim()||DEFAULT_AI_MODEL};
}

/** Chat Completions URL for an OpenAI-compatible base (".../v1beta/openai" or ".../v1"); HTTPS only. */
export function completionEndpoint(base:string){
 const url=new URL(base);if(url.protocol!=='https:')throw new Error('HTTPS is required');
 const path=url.pathname.replace(/\/+$/,'');url.pathname=path+(/\/(v1|v1beta\/openai)$/.test(path)?'/chat/completions':'/v1/chat/completions');return url.toString();
}

export async function requestModel(messages:{role:string;content:string}[],json:boolean,config:ModelConfig,retries=1):Promise<{text:string;usage:ModelUsage}>{
 try{return await requestOnce(messages,json,config)}
 catch(e:any){
  // One short retry for transient upstream 5xx only; never for quota (429), client errors or invalid output.
  if(retries>0&&e?.upstreamStatus>=500){await new Promise(r=>setTimeout(r,800));return requestModel(messages,json,config,retries-1)}
  throw e;
 }
}

async function requestOnce(messages:{role:string;content:string}[],json:boolean,config:ModelConfig){
 const body={model:config.model,messages:messages.map(m=>({role:m.role,content:m.content})),temperature:0.1,max_tokens:6000,reasoning_effort:'low',...(json?{response_format:{type:'json_object'}}:{})};
 const response=await fetch(completionEndpoint(config.base),{method:'POST',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 if(!response.ok){const e=new Error(response.status===429?'limited':'ai_unavailable');Object.assign(e,{upstreamStatus:response.status});throw e}
 const data=await response.json().catch(()=>null);
 return {text:outputText(data),usage:normalizeUsage(data?.usage)};
}

/** The first choice's text. Rejects errors, truncated (finish_reason "length"), filtered or empty output. */
export function outputText(data:any):string{
 const choice=data?.choices?.[0];
 if(!data||data.error||!choice||choice.finish_reason==='length'||choice.finish_reason==='content_filter')throw new Error('ai_unavailable');
 const text=choice.message?.content;
 if(typeof text!=='string'||!text.trim())throw new Error('ai_unavailable');
 return text;
}

export function normalizeUsage(usage:any):ModelUsage{
 const prompt=Number(usage?.prompt_tokens)||0,completion=Number(usage?.completion_tokens)||0;
 return {prompt_tokens:prompt,completion_tokens:completion,total_tokens:Number(usage?.total_tokens)||prompt+completion};
}
