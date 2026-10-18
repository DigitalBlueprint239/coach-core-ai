const fs=require('fs'),vm=require('vm'),cp=require('child_process'),path=require('path');
const repo=process.env.REVIEW_REPO||'/workspace/coach-core-review78-r3',out=process.env.REVIEW_EVIDENCE_DIR||'/workspace/scratch/review78-r3';fs.mkdirSync(out,{recursive:true});
const text=fs.readFileSync(repo+'/scripts/security/release-import-config.test.mjs','utf8');
const a=text.indexOf("const DIS = "),b=text.indexOf("test('scan: a shipped OFF");
const sandbox={mkdtempSync:fs.mkdtempSync,mkdirSync:fs.mkdirSync,writeFileSync:fs.writeFileSync,join:path.join,tmpdir:()=>out};
vm.runInNewContext(text.slice(a,b)+'\nglobalThis.fixtures={COMPONENT,OFF_ACCEPT,OFF_DECLINE,ON_ACCEPT,ON_DECLINE,OFF_BUNDLE,ON_BUNDLE,build};',sandbox);
const f=sandbox.fixtures;const DIS='Device-play import is disabled in this build. Originals preserved.';
const guard=code=>code.replace('async function Kv(e,t,n,r){','async function Kv(e,t,n,r){if(!cfg.enabled)throw new Error(zv);').replace('function Jv(e,t){','function Jv(e,t){if(!cfg.enabled)throw new Error(zv);');
const getter='const argBox={get value(){i.copy({}, {id:"argument-getter"});return localStorage}};';
const addGetter=code=>code.replace('function Hv(',getter+'function Hv(');
const cases=[
 ['baseline on',f.ON_BUNDLE],['baseline off',f.OFF_BUNDLE],
 ['argument getter before throw',addGetter(f.COMPONENT({accept:'async function(){throw new Error(zv)}(argBox.value)',decline:'function(){throw new Error(zv)}(argBox.value)',attr:'coachcore:import-config=false'}))],
 ['default parameters before body',f.COMPONENT({accept:'async function(x=i.copy({}, {id:"default"})){throw new Error(zv)}()',decline:'function(x=i.copy({}, {id:"default"})){throw new Error(zv)}()',attr:'coachcore:import-config=false'})],
 ['handler wrapper default getter',addGetter(f.OFF_BUNDLE).replace('const y=async()=>','const y=async(x=argBox.value)=>')],
 ['onClick wrapper getter',addGetter(f.OFF_BUNDLE).replace('onClick:()=>{y()}','onClick:()=>{y();argBox.value}')],
 ['destructured local called as harmless setter',f.OFF_BUNDLE.replace('[h,f]=[!1,()=>{}]','[h,f]=[!1,()=>i.copy({}, {id:"local"})]')],
 ['computed Error replacement',f.OFF_BUNDLE.replace('function Hv(', 'globalThis["Error"]=function(msg){i.copy({}, {id:"constructor"});this.message=msg};function Hv(')],
 ['unresolved constructor trusted',f.COMPONENT({accept:'async function(){throw new CustomError(zv)}(localStorage)',decline:'function(){throw new CustomError(zv)}(localStorage)',attr:'coachcore:import-config=false'})],
 ['ON control drops explicit false arguments',f.COMPONENT({accept:'Kv(localStorage,{uid:e,teamId:t,teamName:n},()=>true,i,false)',decline:'Jv(localStorage,{uid:e,teamId:t},false)',attr:'coachcore:import-config=true'}).replace('async function Kv(e,t,n,r){','async function Kv(e,t,n,r,on=true){if(!on)throw new Error(zv);').replace('function Jv(e,t){','function Jv(e,t,on=true){if(!on)throw new Error(zv);')],
 ['direct argument backend call rejects',f.COMPONENT({accept:'async function(){throw new Error(zv)}(i.copy({}, {id:"direct"}))',decline:f.OFF_DECLINE,attr:'coachcore:import-config=false'})],
 ['dynamic eval documented limit',f.OFF_BUNDLE.replace('function Hv(', 'eval("globalThis.Error=function(msg){i.copy({}, {id:123});this.message=msg}");function Hv(')],
];
async function actual(code,buttonIndex=0){
 let copies=0,reads=0;const m=new Map([['smartPlaybook_plays',JSON.stringify([{id:'p',name:'Proof',phase:'offense',type:'pass',players:[],routes:[] }])]]);const writes=[];
 const storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>{writes.push(k);m.set(k,v)},removeItem:k=>m.delete(k),key:i=>[...m.keys()][i],get length(){return m.size;}};
 const context={self:{},localStorage:storage,i:{copy:async()=>{copies++;return 'copy-id'},read:async()=>{reads++;return {}}}};context.CustomError=function(msg){context.i.copy({}, {id:"external-constructor"});this.message=msg};vm.runInNewContext(code,context);const entry=context.self.webpackChunkfixture[0];const exp={};entry[1][4]({},exp,{});const ui=exp.default({uid:'u',teamId:'t',teamName:'T'});ui.b.children[buttonIndex].b.onClick();await new Promise(r=>setImmediate(r));return {copies,reads,writes:writes.length};
}
(async()=>{let reports=[];for(const[name,code]of cases){const dir=f.build({'main.abc.js':code});const p=cp.spawnSync(process.execPath,[repo+'/scripts/security/release-import-config.js','scan',dir],{encoding:'utf8',timeout:15000});let r;try{r=JSON.parse(p.stdout)}catch{r={error:p.stderr}};let real;try{real=await actual(code)}catch(e){real={error:e.message}};const decline=await actual(code,1);let negative=null;if(name.startsWith('ON control')){const q=cp.spawnSync(process.execPath,[repo+'/scripts/security/release-import-config.js','negative-control',dir],{encoding:'utf8'});negative={exit:q.status,report:JSON.parse(q.stdout)}}const row={name,dir,scanner_exit:p.status,report:r,actual_button:real,actual_decline:decline,negative_control:negative};reports.push(row);console.log(JSON.stringify({name,exit:p.status,verdict:r.verdict,actual:real,decline,negative_control_exit:negative?.exit}));}fs.writeFileSync(out+'/surrounding-probes.json',JSON.stringify(reports,null,2)+'\n');})();
