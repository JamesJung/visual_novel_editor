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
