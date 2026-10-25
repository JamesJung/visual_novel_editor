import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export function createApp({apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_IMAGE_MODEL||'gpt-image-1.5',fetchImpl=fetch}={}) {
 let active=false;
 const jobs=new Map();
 const send=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
 return http.createServer(async(req,res)=>{
  try {
   const origin=req.headers.origin;
   if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)return send(res,403,{error:'다른 사이트의 생성 요청은 허용하지 않습니다.'});
   if(req.method==='GET'&&req.url==='/api/config')return send(res,200,{configured:!!apiKey,model});
   if(req.method==='POST'&&req.url==='/api/generate-master'){
    if(!apiKey)return send(res,503,{error:'서버 .env에 OPENAI_API_KEY를 설정하고 다시 시작하세요.'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON 요청만 지원합니다.'});
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000)return send(res,413,{error:'설명이 너무 깁니다.'});}
    let input;try{input=JSON.parse(body)}catch{return send(res,400,{error:'잘못된 JSON입니다.'});}
    if(typeof input.description!=='string'||input.description.trim().length<5||input.description.length>4000)return send(res,400,{error:'캐릭터 설명을 5~4000자로 입력하세요.'});
    if(typeof input.requestId!=='string'||! /^[a-zA-Z0-9_-]{8,80}$/.test(input.requestId))return send(res,400,{error:'잘못된 요청 ID입니다.'});
    const fingerprint=JSON.stringify([input.description,input.style]);
    const prior=jobs.get(input.requestId);
    if(prior){if(prior.fingerprint!==fingerprint)return send(res,409,{error:'요청 ID가 다른 내용에 사용됐습니다.'});if(prior.result)return send(res,200,prior.result);return send(res,409,{error:'이미 처리 중인 요청입니다. 자동 재시도하지 않습니다.'});}
    if(active)return send(res,429,{error:'다른 이미지가 생성 중입니다. 완료 후 다시 시도하세요.'});
    // Never automatically retry a potentially billable request.
    if(jobs.size>=100)jobs.delete(jobs.keys().next().value);
    jobs.set(input.requestId,{fingerprint});active=true;
    const started=Date.now();
    try{
     const style=typeof input.style==='string'?input.style.slice(0,300):'2D visual novel illustration';
     const prompt=`Create one original character master reference for a visual novel. Single character, front view, neutral expression, consistent full body, head and feet inside canvas, centered, plain neutral background, no text or watermark. Style: ${style}. Character description: ${input.description.trim()}`;
     const response=await fetchImpl('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model,prompt,n:1,size:'1024x1536',quality:'medium',output_format:'png'}),signal:AbortSignal.timeout(180000)});
     if(!response.ok){await response.text();return send(res,502,{error:`이미지 공급자 요청 실패 (${response.status}). 권한·잔액·모델 설정을 확인하세요. 자동 재시도하지 않았습니다.`,requestId:input.requestId});}
     const result=await response.json();const b64=result.data?.[0]?.b64_json;
     if(typeof b64!=='string'||b64.length>20000000||!b64.startsWith('iVBOR'))return send(res,502,{error:'공급자가 유효한 PNG를 반환하지 않았습니다.',requestId:input.requestId});
     const output={src:`data:image/png;base64,${b64}`,status:'review_required',generation:{id:randomUUID(),requestId:input.requestId,provider:'openai',model,prompt,createdAt:new Date().toISOString(),durationMs:Date.now()-started,usage:result.usage||null,cost:null}};
     jobs.get(input.requestId).result=output;send(res,200,output);
    }catch{return send(res,502,{error:'생성 응답을 받지 못했습니다. 과금 여부는 공급자 사용 내역에서 확인하세요. 자동 재시도하지 않았습니다.',requestId:input.requestId});}finally{active=false;}
    return;
   }
   if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(await readFile(new URL('./index.html',import.meta.url)));}
   send(res,404,{error:'경로를 찾을 수 없습니다.'});
  }catch{if(!res.headersSent)send(res,500,{error:'서버 처리 오류'});else res.end();}
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const arg=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1]};createApp().listen(Number(arg('--port')||process.env.PORT)||8080,arg('--host')||process.env.HOST||'127.0.0.1',()=>console.log('StorySim Studio ready'));}
