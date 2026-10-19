import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const repo='/workspace/coach-core-review77-r3',base='/workspace/scratch/review77-r3';const {readArtifactDir}=await import(pathToFileURL(repo+'/e2e/scripts/merge-eligibility.mjs'));const rows=[];
for(const kind of ['artifact','ci-evidence','test-results','subdir']){
 const p=fs.mkdtempSync(base+'/no-read-'),d=p+'/artifact',o=p+'/outside';fs.mkdirSync(o);fs.writeFileSync(o+'/sentinel','PUBLIC_OUTSIDE_SENTINEL');execFileSync('mkfifo',[o+'/blocked']);
 if(kind==='artifact')fs.symlinkSync(o,d);else{fs.mkdirSync(d);for(const r of ['ci-evidence','test-results'])fs.mkdirSync(d+'/'+r);if(kind==='subdir')fs.symlinkSync(o,d+'/test-results/sub');else{fs.rmdirSync(d+'/'+kind);fs.symlinkSync(o,d+'/'+kind);}}
 const forbidden=kind==='artifact'?d:kind==='subdir'?d+'/test-results/sub':d+'/'+kind;const orig={},seen=[];
 for(const k of ['readFileSync','openSync','readdirSync','statSync','realpathSync','existsSync','accessSync']){orig[k]=fs[k];fs[k]=function(f,...args){if(typeof f==='string'){seen.push([k,f]);if(f===o||f.startsWith(o+'/')||f.startsWith(forbidden+'/')||f===forbidden&&k!=='existsSync')throw Error('FORBIDDEN_READ');}return orig[k].call(this,f,...args)}}
 syncBuiltinESMExports();let a;try{a=readArtifactDir(d)}finally{for(const[k,v]of Object.entries(orig))fs[k]=v;syncBuiltinESMExports()}
 assert.notEqual(a.inventoryOk,true);assert.equal(a.context,null);assert.equal(a.results,null);assert.equal(a.lastRun,null);assert(!JSON.stringify(a).includes('PUBLIC_OUTSIDE'));rows.push({kind,rejected:true,forbidden_calls:0,accesses:seen});
}
fs.writeFileSync(base+'/independent-no-read.json',JSON.stringify(rows,null,2)+'\n');console.log('4 independent guarded cases pass; FIFO targets never opened; outside sentinel absent');
