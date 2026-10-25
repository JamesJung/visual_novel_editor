import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';

export function createApp({apiKey=process.env.OPENAI_API_KEY,model=process.env.OPENAI_IMAGE_MODEL||'gpt-image-1.5',fetchImpl=fetch}={}) {
 let active=false;
 const jobs=new Map();
 const send=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
 return http.createServer(async(req,res)=>{
  try {
   const origin=req.headers.origin;
   if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)return send(res,403,{error:'다른 사이트의 생성 요청은 허용하지 않습니다.'});
   if(req.method==='GET'&&req.url==='/api/config')return send(res,200,{configured:!!apiKey,model});
   if(req.method==='POST'&&['/api/generate-master','/api/generate-variation'].includes(req.url)){
    if(!apiKey)return send(res,503,{error:'서버 .env에 OPENAI_API_KEY를 설정하고 다시 시작하세요.'});
    if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON 요청만 지원합니다.'});
    const variation=req.url==='/api/generate-variation';
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>(variation?8000000:16000))return send(res,413,{error:'요청 크기가 허용 한도를 초과했습니다.'});}
    let input;try{input=JSON.parse(body)}catch{return send(res,400,{error:'잘못된 JSON입니다.'});}
    if(!input||typeof input!=='object')return send(res,400,{error:'잘못된 입력입니다.'});
    let masterBytes,masterHash;
    if(variation){
     if(!['neutral','smile','frown','angry','crying','surprised'].includes(input.expression)||typeof input.masterVersion!=='string'&&typeof input.masterVersion!=='number')return send(res,400,{error:'표정 또는 마스터 버전이 잘못됐습니다.'});
     if(typeof input.masterSrc!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(input.masterSrc))return send(res,400,{error:'마스터 PNG 원본이 필요합니다.'});
     masterBytes=Buffer.from(input.masterSrc.split(',')[1],'base64');
     if(masterBytes.length<24||masterBytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return send(res,400,{error:'마스터 PNG가 유효하지 않습니다.'});
     const width=masterBytes.readUInt32BE(16),height=masterBytes.readUInt32BE(20);
     if(!['1024x1536','1536x1024','1024x1024'].includes(`${width}x${height}`))return send(res,400,{error:'표정 생성은 1024×1536, 1536×1024, 1024×1024 마스터를 지원합니다. 원본 크기를 자동 변경하지 않습니다.'});
     input.size=`${width}x${height}`;masterHash=createHash('sha256').update(masterBytes).digest('hex');
    }
    if(!variation&&(typeof input.description!=='string'||(input.description||'').trim().length<5||input.description.length>4000))return send(res,400,{error:'캐릭터 설명을 5~4000자로 입력하세요.'});
    if(typeof input.requestId!=='string'||! /^[a-zA-Z0-9_-]{8,80}$/.test(input.requestId))return send(res,400,{error:'잘못된 요청 ID입니다.'});
    const fingerprint=JSON.stringify([variation,input.description,input.style,input.expression,input.masterVersion,masterHash]);
    const prior=jobs.get(input.requestId);
    if(prior){if(prior.fingerprint!==fingerprint)return send(res,409,{error:'요청 ID가 다른 내용에 사용됐습니다.'});if(prior.result)return send(res,200,prior.result);return send(res,409,{error:'이미 처리 중인 요청입니다. 자동 재시도하지 않습니다.'});}
    if(active)return send(res,429,{error:'다른 이미지가 생성 중입니다. 완료 후 다시 시도하세요.'});
    // Never automatically retry a potentially billable request.
    if(jobs.size>=100)jobs.delete(jobs.keys().next().value);
    jobs.set(input.requestId,{fingerprint});active=true;
    const started=Date.now();
    try{
     const style=typeof input.style==='string'?input.style.slice(0,300):'2D visual novel illustration';
     let prompt=`Create one original character master reference for a visual novel. Single character, front view, neutral expression, consistent full body, head and feet inside canvas, centered, plain neutral background, no text or watermark. Style: ${style}. Character description: ${(input.description||'').trim()}`;
     let endpoint='https://api.openai.com/v1/images/generations';
     let headers={Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'};
     let payload=JSON.stringify({model,prompt,n:1,size:'1024x1536',quality:'medium',output_format:'png'});
     if(variation){
      const emotions={neutral:'neutral relaxed face',smile:'warm happy smile',frown:'worried frown',angry:'angry facial expression',crying:'sad crying face with tears',surprised:'surprised expression'};
      prompt=`Edit the supplied ORIGINAL MASTER image. Change ONLY the facial expression to ${emotions[input.expression]}. Preserve the same person's identity, age, hairstyle, face size, outfit, body pose, camera, framing, lighting, background, canvas size and exact character position. No text, extra people, cropping, zooming or stretching. All non-face regions must remain unchanged. This is an expression derivative directly from the original master, never from another expression.`;
      const form=new FormData();for(const [k,v] of Object.entries({model,prompt,n:'1',size:input.size,quality:'medium',output_format:'png'}))form.set(k,v);
      if(model==='gpt-image-1.5')form.set('input_fidelity','high');
      else if(model==='gpt-image-1-mini')form.set('input_fidelity','low');
      form.set('image',new Blob([masterBytes],{type:'image/png'}),'master.png');
      endpoint='https://api.openai.com/v1/images/edits';headers={Authorization:`Bearer ${apiKey}`};payload=form;
     }
     const response=await fetchImpl(endpoint,{method:'POST',headers,body:payload,signal:AbortSignal.timeout(180000)});
     if(!response.ok){await response.text();return send(res,502,{error:`이미지 공급자 요청 실패 (${response.status}). 권한·잔액·모델 설정을 확인하세요. 자동 재시도하지 않았습니다.`,requestId:input.requestId});}
     const result=await response.json();const b64=result.data?.[0]?.b64_json;
     if(typeof b64!=='string'||b64.length>20000000||!b64.startsWith('iVBOR'))return send(res,502,{error:'공급자가 유효한 PNG를 반환하지 않았습니다.',requestId:input.requestId});
     const output={src:`data:image/png;base64,${b64}`,status:'review_required',generation:{id:randomUUID(),requestId:input.requestId,provider:'openai',model,prompt,...(variation?{masterVersion:input.masterVersion,masterHash,expression:input.expression,viewId:'front',outfitId:'master'}:{}),createdAt:new Date().toISOString(),durationMs:Date.now()-started,usage:result.usage||null,cost:null}};
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
