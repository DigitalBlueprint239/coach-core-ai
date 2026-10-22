const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const {spawnSync} = require('node:child_process');
const root = require('node:path').resolve(__dirname,'../..');
function request(path,method='GET',host='localhost:4210') {return new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:4210,path,method,headers:{Host:host}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,headers:res.headers}));});req.on('error',reject);req.end();});}
(async()=>{
 const home=await request('/');assert.equal(home.status,200);assert.match(home.headers['content-security-policy'],/connect-src 'self'/);assert.match(home.headers['content-security-policy'],/frame-src 'none'/);assert.equal(home.headers['cache-control'],'no-store');
 assert.equal((await request('/','POST')).status,405);
 assert.equal((await request('/','GET','foreign.example:4210')).status,403);
 assert.equal((await request('/.env')).status,404);
 assert.equal((await request('/api/upload')).status,404);
 assert.equal((await request('/film-a0/../../package.json')).status,404);
 const p=spawnSync(process.execPath,['scripts/film-a0.cjs','--build-only'],{cwd:root,env:{...process.env,REACT_APP_FIREBASE_PROJECT_ID:'not-a-demo-project'},encoding:'utf8'});
 assert.notEqual(p.status,0);assert.match(p.stderr,/refuses non-demo project configuration in REACT_APP_FIREBASE_PROJECT_ID/);assert.ok(!p.stderr.includes('not-a-demo-project'));
 const provenance=JSON.parse(fs.readFileSync(root+'/film-a0-build/a0-build.json'));assert.equal(provenance.firebaseOrAiModules,false);
 console.log('PASS isolation: 8 groups; loopback/host/method/path/CSP/cache/project-refusal/module exclusion. No skipped checks.');
})().catch(e=>{console.error(e);process.exitCode=1;});
