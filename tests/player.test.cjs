const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function app(){
 const nodes=new Map();
 const node=s=>{if(!nodes.has(s))nodes.set(s,{textContent:'',innerHTML:'',classList:{toggle(){}},addEventListener(type,fn){this[type]=fn;}});return nodes.get(s)};
 const ctx=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},alert(){},confirm:()=>true,console});
 vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8').split('<script>')[1].split('</script>')[0],ctx);
 return {run:s=>vm.runInContext(s,ctx),node};
}
test('a terminal first scene stays ended until explicit restart',()=>{
 const a=app();a.run('data.scenes[0].choices=[];nav("play")');a.node('[data-end]').click();
 assert.equal(a.run('playId'),'');a.run('render()');assert.equal(a.run('playId'),'');
 a.node('#playReset').onclick();assert.equal(a.run('playId'),'scene_1');
});
test('effects affect play state without changing project initial values',()=>{
 const a=app();a.run('nav("play");applyEffect(data.scenes[0].choices[0])');
 assert.equal(a.run('playVars["제품 완성도"]'),40);assert.equal(a.run('data.variables["제품 완성도"]'),20);
 a.node('#playReset').onclick();assert.equal(a.run('playVars["제품 완성도"]'),20);
});
test('adoption archives old assets and pins existing scenes; new scenes use new master',()=>{
 const a=app();a.run('ch().master={src:"old.png",version:1};ch().pendingMaster={src:"new.png",version:2,generation:{model:"test"}};adoptMaster()');
 assert.equal(a.run('ch().master.src'),'new.png');assert.equal(a.run('ch().masterVersions[0].master.src'),'old.png');assert.equal(a.run('data.scenes[0].masterVersion'),1);
 a.run('nav("play")');assert.ok(a.run('player().includes("old.png")'));
});
test('storage failure rolls adoption back including scene references',()=>{
 const a=app();a.run('ch().master={src:"old.png",version:1};ch().pendingMaster={src:"new.png",version:2};localStorage.setItem=()=>{throw Error("quota")};adoptMaster()');
 assert.equal(a.run('ch().master.src'),'old.png');assert.equal(a.run('ch().pendingMaster.src'),'new.png');assert.equal(a.run('data.scenes[0].masterVersion'),undefined);
});
test('expression candidate approval rejects wrong dimensions or stale master',()=>{
 const a=app();a.run('ch().master={src:"master",version:1,w:1024,h:1536};ch().variationCandidates={smile:{src:"candidate",version:2,masterVersion:1,w:1024,h:100}};approveVariation()');
 assert.equal(a.run('ch().expressions.smile'),undefined);
 a.run('ch().variationCandidates.smile.h=1536;ch().variationCandidates.smile.masterVersion=99;approveVariation()');assert.equal(a.run('ch().expressions.smile'),undefined);
});
test('approved replacement preserves previous expression for existing scenes',()=>{
 const a=app();a.run('ch().master={src:"master",version:1,w:1024,h:1536};ch().expressions.smile={src:"old-smile",version:10};ch().approved=["smile"];ch().variationCandidates={smile:{src:"new-smile",version:20,masterVersion:1,w:1024,h:1536}};approveVariation();playId="scene_2"');
 assert.equal(a.run('ch().expressions.smile.src'),'new-smile');assert.equal(a.run('data.scenes[1].expressionAssetVersion'),10);assert.ok(a.run('player().includes("old-smile")'));assert.equal(a.run('ch().variationCandidates.smile'),undefined);
});
test('failed expression save rolls candidate and approvals back',()=>{
 const a=app();a.run('ch().master={version:1,w:1024,h:1536};ch().variationCandidates={smile:{src:"candidate",version:2,masterVersion:1,w:1024,h:1536}};localStorage.setItem=()=>{throw Error("quota")};approveVariation()');assert.equal(a.run('ch().expressions.smile'),undefined);assert.equal(a.run('ch().approved.length'),0);assert.equal(a.run('ch().variationCandidates.smile.src'),'candidate');
});
test('unapproved candidate is absent from player; explicit field edits release old pins',()=>{
 const a=app();a.run('ch().master={src:"master-only",version:1};ch().variationCandidates={smile:{src:"unapproved"}};playId="scene_2"');assert.ok(!a.run('player().includes("unapproved")'));
 a.run('sceneId="scene_2";sc().expressionAssetVersion=123;editSceneField("expression","angry")');assert.equal(a.run('sc().expressionAssetVersion'),undefined);
 a.run('sc().masterVersion=1;editSceneField("character","another")');assert.equal(a.run('sc().masterVersion'),undefined);
});
test('unapproved old uploads are never pinned as approved expression history',()=>{
 const a=app();a.run('ch().master={src:"master",version:1,w:1024,h:1536};ch().expressions.smile={src:"unapproved-old",version:10};ch().variationCandidates={smile:{src:"approved-new",version:20,masterVersion:1,w:1024,h:1536}};approveVariation();playId="scene_2"');assert.equal(a.run('data.scenes[1].expressionAssetVersion'),undefined);assert.ok(!a.run('player().includes("unapproved-old")'));assert.ok(a.run('player().includes("approved-new")'));
});
