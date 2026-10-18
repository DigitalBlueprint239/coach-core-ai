const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path');
const repo='/workspace/coach-core-review78-r2',out='/workspace/scratch/review78-r2';
const text=fs.readFileSync(repo+'/scripts/security/release-import-config.test.mjs','utf8');
const a=text.indexOf("const DIS = "),b=text.indexOf("test('scan: a shipped OFF");
const sandbox={mkdtempSync:fs.mkdtempSync,mkdirSync:fs.mkdirSync,writeFileSync:fs.writeFileSync,join:path.join,tmpdir:()=>out};
vm.runInNewContext(text.slice(a,b)+'\nglobalThis.fixtures={COMPONENT,OFF_ACCEPT,OFF_DECLINE,ON_ACCEPT,ON_DECLINE,OFF_BUNDLE,ON_BUNDLE,build};',sandbox);
const f=sandbox.fixtures;const DIS='Device-play import is disabled in this build. Originals preserved.';
const guard=code=>code.replace('async function Kv(e,t,n,r){','async function Kv(e,t,n,r){if(!cfg.enabled)throw new Error(zv);').replace('function Jv(e,t){','function Jv(e,t){if(!cfg.enabled)throw new Error(zv);');
const cases=[
 ['baseline on',f.ON_BUNDLE],['baseline off',f.OFF_BUNDLE],
 ['closure mutation ignored',guard(f.COMPONENT({accept:f.ON_ACCEPT,decline:f.ON_DECLINE,attr:'coachcore:import-config=false'})).replace('function Hv(', 'const cfg={enabled:false};cfg.enabled=true;function Hv(')],
 ['VM global state substituted',guard(f.COMPONENT({accept:f.ON_ACCEPT,decline:f.ON_DECLINE,attr:'coachcore:import-config=false'})).replaceAll('cfg.enabled','globalThis.proofEnabled').replace('function Hv(','globalThis.proofEnabled=true;function Hv(')],
 ['actual call arguments dropped',f.COMPONENT({accept:'Kv(localStorage,{uid:e,teamId:t,teamName:n},()=>true,i,true)',decline:'Jv(localStorage,{uid:e,teamId:t},true)',attr:'coachcore:import-config=false'}).replace('async function Kv(e,t,n,r){','async function Kv(e,t,n,r,on){if(!on)throw new Error(zv);').replace('function Jv(e,t){','function Jv(e,t,on){if(!on)throw new Error(zv);')],
 ['unresolved member await ignored',f.OFF_BUNDLE.replace('try{await async function','try{await i.copy({}, {id:"side-effect"});await async function')],
 ['ambiguous onClick chooses last handler',f.ON_BUNDLE.replace('const y=async()=>','const deadOff=async()=>{try{await async function(){throw new Error(zv)}(localStorage)}catch{}};const y=async()=>').replace('onClick:()=>{y()}','onClick:()=>{y();deadOff()}').replace('"data-import-config":"coachcore:import-config=true"','"data-import-config":"coachcore:import-config=false"').replace(f.ON_DECLINE,f.OFF_DECLINE)],
 ['backend read ignored',f.COMPONENT({accept:'ReadThenDisabled(localStorage,{uid:e,teamId:t},()=>true,i)',decline:f.OFF_DECLINE,attr:'coachcore:import-config=false'}).replace('function Hv(', 'async function ReadThenDisabled(e,t,n,r){await r.read(t,"id");throw new Error(zv)}function Hv(')],
 ['unknown closure fails closed',f.OFF_BUNDLE.replace('throw new Error(zv)','throw new Error(unknownBinding)')]
];
async function actual(code,buttonIndex=0){
 let copies=0,reads=0;const m=new Map([['smartPlaybook_plays',JSON.stringify([{id:'p',name:'Proof',phase:'offense',type:'pass',players:[],routes:[] }])]]);const writes=[];
 const storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>{writes.push(k);m.set(k,v)},removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size;}};
 const context={self:{},localStorage:storage,i:{copy:async()=>{copies++;return 'copy-id'},read:async()=>{reads++;return {}}}};vm.runInNewContext(code,context);const entry=context.self.webpackChunkfixture[0];const exp={};entry[1][4]({},exp,{});const ui=exp.default({uid:'u',teamId:'t',teamName:'T'});ui.b.children[buttonIndex].b.onClick();await new Promise(r=>setImmediate(r));return {copies,reads,writes:writes.length};
}
(async()=>{let reports=[];for(const[name,code]of cases){const dir=f.build({'main.abc.js':code});const p=cp.spawnSync(process.execPath,[repo+'/scripts/security/release-import-config.js','scan',dir],{encoding:'utf8',timeout:15000});let r;try{r=JSON.parse(p.stdout)}catch{r={error:p.stderr}};let real;try{real=await actual(code)}catch(e){real={error:e.message}};const decline=await actual(code,1);const row={name,dir,scanner_exit:p.status,report:r,actual_button:real,actual_decline:decline};reports.push(row);console.log(JSON.stringify({name,exit:p.status,verdict:r.verdict,actual:real,decline}));}fs.writeFileSync(out+'/probes.json',JSON.stringify(reports,null,2)+'\n');})();
