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
