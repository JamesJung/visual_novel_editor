import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server.mjs';
const description='북미에서 게임 개발자로 일하다가 이번에 회사를 차리려는 30대 개발자';
async function withApp(options,fn){const app=createApp(options);await new Promise(r=>app.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${app.address().port}`)}finally{await new Promise(r=>app.close(r))}}
const post=(url,body,headers={})=>fetch(url+'/api/generate-master',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('missing key returns actionable error without calling provider',async()=>withApp({apiKey:'',fetchImpl:()=>assert.fail()},async url=>{assert.equal((await post(url,{description})).status,503)}));
test('generation request contract, review status, idempotency, key privacy',async()=>{
 let calls=0;
 await withApp({apiKey:'test-secret',fetchImpl:async(url,opts)=>{calls++;assert.equal(url,'https://api.openai.com/v1/images/generations');const body=JSON.parse(opts.body);assert.ok(body.prompt.includes(description));assert.equal(body.n,1);assert.equal(body.size,'1024x1536');return new Response(JSON.stringify({data:[{b64_json:'iVBORw0KGgo='}],usage:{total_tokens:10}}))}},async url=>{
 const body={description,requestId:'test-request-123'};
 const a=await (await post(url,body)).json();assert.equal(a.status,'review_required');assert.equal(a.generation.cost,null);assert.ok(!JSON.stringify(a).includes('test-secret'));
 assert.equal((await post(url,body)).status,200);assert.equal(calls,1);
 assert.equal((await post(url,{...body,description:'다른 캐릭터 설명입니다'})).status,409);
 assert.equal((await post(url,{...body,requestId:'new-request-123'},{Origin:'https://evil.example'})).status,403);
 assert.equal((await post(url,{description:'x',requestId:'invalid-short'})).status,400);
 const config=await(await fetch(url+'/api/config')).text();assert.ok(!config.includes('test-secret'));
 });
});
test('provider failures are not retried or leaked',async()=>{
 let calls=0;await withApp({apiKey:'key',fetchImpl:async()=>{calls++;return new Response('secret upstream details',{status:429})}},async url=>{const body={description,requestId:'failure-12345'};const r=await post(url,body);assert.equal(r.status,502);assert.ok(!(await r.text()).includes('secret upstream'));assert.equal((await post(url,body)).status,409);assert.equal(calls,1)});
});
const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(1024,16);png.writeUInt32BE(1536,20);
const masterSrc='data:image/png;base64,'+png.toString('base64');
const variation=(url,body)=>fetch(url+'/api/generate-variation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
test('all six expressions send original master bytes via image edits and stay unapproved',async()=>{
 let calls=0;await withApp({apiKey:'test-only',fetchImpl:async(url,opts)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.ok(opts.body instanceof FormData);assert.equal(opts.headers['Content-Type'],undefined);
  assert.equal(opts.body.get('input_fidelity'),'high');assert.equal(opts.body.get('size'),'1024x1536');assert.deepEqual(Buffer.from(await opts.body.get('image').arrayBuffer()),png);
  assert.ok(opts.body.get('prompt').includes('ORIGINAL MASTER'));
  return new Response(JSON.stringify({data:[{b64_json:png.toString('base64')}]}));
 }},async url=>{
  for(const expression of ['neutral','smile','frown','angry','crying','surprised']){
   const r=await variation(url,{masterSrc,masterVersion:'v1',expression,requestId:'expression-'+expression});assert.equal(r.status,200);const out=await r.json();assert.equal(out.status,'review_required');assert.equal(out.generation.masterVersion,'v1');assert.equal(out.generation.expression,expression);assert.equal(out.generation.masterHash.length,64);
  }
  assert.equal(calls,6);
  assert.equal((await variation(url,{masterSrc,masterVersion:'v2',expression:'smile',requestId:'expression-smile'})).status,409);
 });
});
test('invalid reference, expression and canvas never call provider',async()=>withApp({apiKey:'test-only',fetchImpl:()=>assert.fail()},async url=>{
 for(const body of [null,{}, {masterSrc:'https://example.com/master.png',masterVersion:1,expression:'smile'}, {masterSrc,masterVersion:1,expression:'evil'}, {masterSrc:'data:image/png;base64,aGVsbG8=',masterVersion:1,expression:'smile'}])assert.equal((await variation(url,{...body,requestId:'invalid-reference'})).status,400);
 const small=Buffer.from(png);small.writeUInt32BE(100,16);assert.equal((await variation(url,{masterSrc:'data:image/png;base64,'+small.toString('base64'),masterVersion:1,expression:'smile',requestId:'small-canvas'})).status,400);
}));
