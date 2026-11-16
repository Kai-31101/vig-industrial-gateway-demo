export function completionEndpoint(base:string){
 const url=new URL(base);if(url.protocol!=='https:')throw new Error('HTTPS is required');
 const path=url.pathname.replace(/\/+$/,'');url.pathname=path+(/\/(v1|v1beta\/openai)$/.test(path)?'/chat/completions':'/v1/chat/completions');return url.toString();
}
export async function requestModel(messages:unknown[],json:boolean,config:{base:string;key:string;model:string}){
 const response=await fetch(completionEndpoint(config.base),{method:'POST',headers:{Authorization:'Bearer '+config.key,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,messages,temperature:0.1,max_tokens:6000,reasoning_effort:'low',...(json?{response_format:{type:'json_object'}}:{})}),signal:AbortSignal.timeout(45000)});
 if(!response.ok){const e=new Error(response.status===429?'limited':'ai_unavailable');Object.assign(e,{upstreamStatus:response.status});throw e}
 const data=await response.json(),choice=data.choices?.[0];if(typeof choice?.message?.content!=='string'||!choice.message.content.trim()||choice.finish_reason==='length')throw new Error('ai_unavailable');return {text:choice.message.content as string,usage:data.usage||{}};
}
