// Server-only model transport: OpenAI Responses API (https://api.openai.com/v1/responses).
// No other provider and no fallback. Errors are mapped to safe categories; upstream bodies are never surfaced.
export const OPENAI_RESPONSES_URL='https://api.openai.com/v1/responses';
export const DEFAULT_OPENAI_MODEL='gpt-6.1-sol';
export type ModelConfig={key:string;model:string};
export type ModelUsage={prompt_tokens:number;completion_tokens:number;total_tokens:number};

/** Reads server-only config. Returns null when the key is missing (callers fail before any API call). */
export function openAIConfig(env:Record<string,string|undefined>=process.env):ModelConfig|null{
 const key=env.OPENAI_API_KEY?.trim();if(!key)return null;
 return {key,model:env.OPENAI_MODEL?.trim()||DEFAULT_OPENAI_MODEL};
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
 const body={model:config.model,input:messages.map(m=>({role:m.role,content:m.content})),reasoning:{effort:'low'},store:false,max_output_tokens:6000,...(json?{text:{format:{type:'json_object'}}}:{})};
 const response=await fetch(OPENAI_RESPONSES_URL,{method:'POST',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
 if(!response.ok){const e=new Error(response.status===429?'limited':'ai_unavailable');Object.assign(e,{upstreamStatus:response.status});throw e}
 const data=await response.json().catch(()=>null);
 return {text:outputText(data),usage:normalizeUsage(data?.usage)};
}

/** Concatenates output_text blocks of completed assistant message items. Rejects error/incomplete/refusal/empty output. */
export function outputText(data:any):string{
 if(!data||data.error||data.status!=='completed'||!Array.isArray(data.output))throw new Error('ai_unavailable');
 const parts:string[]=[];
 for(const item of data.output){
  if(item?.type!=='message'||item.role!=='assistant')continue; // reasoning and other items carry no answer text
  if(item.status&&item.status!=='completed')throw new Error('ai_unavailable');
  for(const block of item.content||[]){
   if(block?.type==='refusal')throw new Error('ai_unavailable');
   if(block?.type==='output_text'&&typeof block.text==='string')parts.push(block.text);
  }
 }
 const text=parts.join('');
 if(!text.trim())throw new Error('ai_unavailable');
 return text;
}

/** Responses usage (input_tokens/output_tokens) mapped to the existing ledger shape (prompt_tokens/completion_tokens). */
export function normalizeUsage(usage:any):ModelUsage{
 const prompt=Number(usage?.input_tokens)||0,completion=Number(usage?.output_tokens)||0;
 return {prompt_tokens:prompt,completion_tokens:completion,total_tokens:Number(usage?.total_tokens)||prompt+completion};
}
