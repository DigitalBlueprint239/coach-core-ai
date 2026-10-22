// A0-2 regression. Inspect a fresh NORMAL CRA build, never the demo output.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),build=path.join(root,'build');
const sample=require('../../src/features/film-analyzer/demo/sample.json');
assert.ok(fs.existsSync(path.join(build,'index.html')),'First create a fresh ordinary build with CI=false npm run build.');
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p);}}walk(build);
const forbidden=files.filter(p=>p.split(path.sep).includes('film-a0')||['out-route.mp4','out-route.webm','sample.json','a0-build.json'].includes(path.basename(p))||sample.files.some(f=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')===f.sha256));
assert.deepEqual(forbidden,[],'A0 assets must never ship in the ordinary application build.');
console.log(JSON.stringify({status:'PASS',ordinaryBuildFiles:files.length,a0Paths:0,a0MediaDigests:0,sourceSha:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}));
