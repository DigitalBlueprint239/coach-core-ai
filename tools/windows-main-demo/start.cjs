// Operator launcher for existing compiled app; never builds or deploys it.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),net=require('node:net'),crypto=require('node:crypto');
const {spawn,spawnSync}=require('node:child_process');
const root=__dirname,project='demo-coach-core-e2e',origin='http://localhost:3000';
process.chdir(root);
const env={...process.env,GCLOUD_PROJECT:project,GOOGLE_CLOUD_PROJECT:project,FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',CI:'true',XDG_CONFIG_HOME:path.join(root,'.cli-config'),NO_PROXY:'localhost,127.0.0.1,::1',no_proxy:'localhost,127.0.0.1,::1'};
for(const name of ['GOOGLE_APPLICATION_CREDENTIALS','FIREBASE_TOKEN','GOOGLE_OAUTH_ACCESS_TOKEN','FIREBASE_CONFIG','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'])delete env[name];
function fail(message){console.error('\nLOCAL SETUP STOPPED: '+message);process.exitCode=1;}
function runNpm(folder){return new Promise((resolve,reject)=>{console.log('Installing pinned local tools ('+folder+') — no Firebase login or deployment.');const win=process.platform==='win32';const child=spawn(win?'cmd.exe':'npm',win?['/d','/s','/c',`npm ci --include=dev --prefix ${folder} --no-audit --no-fund`]:['ci','--include=dev','--prefix',folder,'--no-audit','--no-fund'],{cwd:root,env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Dependency installation failed for '+folder+' (exit '+code+').')));});}
async function call(url,options={}){if(!url.startsWith('http://127.0.0.1:9099/'))throw new Error('Refusing nonlocal auth request.');const r=await fetch(url,{...options,headers:{'Content-Type':'application/json',Authorization:'Bearer owner',...options.headers}});const text=await r.text();if(!r.ok)throw new Error('Local auth returned HTTP'+r.status);return text?JSON.parse(text):{};}
const auth='http://127.0.0.1:9099';
const emails=['coach@demo.coachcore.test','coach.two@demo.coachcore.test'];
async function seed(email){
 const url=auth+'/identitytoolkit.googleapis.com/v1/projects/'+project+'/accounts:';
 let uid;
 try{const result=await call(url+'lookup',{method:'POST',body:JSON.stringify({email:[email]})});uid=result.users?.[0]?.localId;}catch{}
 if(!uid){const created=await call(auth+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-e2e-web-key',{method:'POST',body:JSON.stringify({email,password:'SyntheticLocalOnly2026!',returnSecureToken:false})});uid=created.localId;}
 await call(url+'update',{method:'POST',body:JSON.stringify({localId:uid,emailVerified:true,customAttributes:JSON.stringify({beta:true}),displayName:'Synthetic coach'})});
 // Seed the existing server-owned user document so the existing profile trigger
 // creates its normal profile before the coach starts saving plays/plans.
 const docs='http://127.0.0.1:8080/v1/projects/'+project+'/databases/(default)/documents/';
 const userUrl=docs+'users/'+encodeURIComponent(uid),headers={Authorization:'Bearer owner','Content-Type':'application/json'};
 const existing=await fetch(userUrl,{headers});
 if(existing.status===404){const created=await fetch(userUrl,{method:'PATCH',headers,body:JSON.stringify({fields:{email:{stringValue:email},displayName:{stringValue:'Synthetic coach'},photoURL:{stringValue:''}}})});if(!created.ok)throw new Error('Local user-profile setup failed.');}
 else if(!existing.ok)throw new Error('Local user-profile lookup failed.');
 const end=Date.now()+10000;let profileReady=false;
 while(Date.now()<end){const r=await fetch(docs+'userProfiles/'+encodeURIComponent(uid),{headers});if(r.ok){profileReady=true;break;}await new Promise(r=>setTimeout(r,100));}
 if(!profileReady)throw new Error('Existing local profile trigger did not complete.');
}
async function link(email){await seed(email);await call(auth+'/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=demo-e2e-web-key',{method:'POST',body:JSON.stringify({requestType:'EMAIL_SIGNIN',email,continueUrl:origin+'/',canHandleCodeInApp:true})});
 const codes=await call(auth+'/emulator/v1/projects/'+project+'/oobCodes');const matches=(codes.oobCodes||[]).filter(c=>c.email===email&&c.requestType==='EMAIL_SIGNIN');if(!matches.length)throw new Error('Local sign-in link missing.');
 const raw=new URL(matches.at(-1).oobLink),target=new URL(origin+'/');for(const k of ['mode','oobCode','apiKey','lang']){const v=raw.searchParams.get(k);if(v)target.searchParams.set(k,v);}return target.href;}
function free(port){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(new Error('Local port '+port+' is busy. Close the previous local emulator/app console; do not kill an unknown process.')));s.listen(port,'127.0.0.1',()=>s.close(resolve));});}
let emulator,server,stopping=false;
const cli=path.join(root,'emulator-tools/node_modules/firebase-tools/lib/bin/firebase.js');
async function stop(){if(stopping)return;stopping=true;console.log('\nStopping local app; waiting for the emulators to export synthetic data…');
 if(server)server.close();
 // Ctrl+C reaches the child console process too. Let firebase-tools handle its
 // own --export-on-exit; a second signal or force-kill can interrupt that export.
 if(emulator&&emulator.exitCode===null)await new Promise(resolve=>emulator.once('exit',resolve));
 const file=path.join(root,'.local-state/firebase-export-metadata.json');
 if(fs.existsSync(file))console.log('Local emulator export exists. Reopen START-COACH-CORE.cmd to resume.');
 else console.error('Export was not confirmed. Synthetic changes may not survive restart.');
 process.exit();}

async function start(){
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('Node.js22+ required. Install Node24 LTS from https://nodejs.org/en/download and reopen this console.');
 const java=spawnSync('java',['-version'],{encoding:'utf8'});const jtext=(java.stdout||'')+(java.stderr||''),version=/version\s+"?(\d+)/.exec(jtext);
 if(java.error||java.status!==0||!version||Number(version[1])<21)throw new Error('Java21+ is required for the Firestore/Storage emulators. Install Eclipse Temurin21 JDK for Windows from https://adoptium.net/temurin/releases/?version=21 then reopen this console. No app build is needed.');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'package-manifest.json')));
 if(manifest.applicationSource!=='0dc94c4c6121aa379fb3e612b7d738a140f56ec6')throw new Error('Unexpected app source.');
 for(const item of manifest.files){const data=fs.readFileSync(path.join(root,item.path));if(crypto.createHash('sha256').update(data).digest('hex')!==item.sha256)throw new Error('Package file hash mismatch: '+item.path);}
 for(const port of [3000,9099,8080,9199,5001,4000,4400,4500])await free(port);
 if(!fs.existsSync(cli))await runNpm('emulator-tools');
 if(!fs.existsSync(path.join(root,'functions/node_modules/firebase-admin')))await runNpm('functions');
 const args=[cli,'emulators:start','--project',project,'--config','firebase.local.json','--only','auth,firestore,functions,storage','--export-on-exit','.local-state'];
 if(fs.existsSync(path.join(root,'.local-state/firebase-export-metadata.json')))args.push('--import','.local-state');
 emulator=spawn(process.execPath,args,{cwd:root,env,stdio:['inherit','pipe','pipe']});
 const log=fs.createWriteStream(path.join(root,'local-emulators.log'),{flags:'a'});
 emulator.stdout.on('data',b=>{process.stdout.write(b);log.write(b);});emulator.stderr.on('data',b=>{process.stderr.write(b);log.write(b);});
 emulator.on('error',e=>fail('Could not start local emulators: '+e.message));emulator.on('exit',code=>{if(!stopping){if(server)server.close();fail('Local emulators exited ('+code+'). See local-emulators.log.');}});
 const deadline=Date.now()+180000;let live=false;
 while(Date.now()<deadline){if(emulator.exitCode!==null)break;try{const r=await fetch('http://127.0.0.1:4400/emulators');const o=await r.json();if(o.auth&&o.firestore&&o.functions&&o.storage){const health=await fetch('http://127.0.0.1:5001/'+project+'/us-central1/healthCheck');if(health.ok){await seed(emails[0]);live=true;break;}}}catch{}await new Promise(r=>setTimeout(r,500));}
 if(!live)throw new Error('Emulators did not become ready. Check local-emulators.log; no live Firebase fallback is allowed.');
 server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  const nonce=crypto.randomBytes(18).toString('base64');res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http://127.0.0.1:9199 http://localhost:9199; font-src 'self' data:; connect-src 'self' http://127.0.0.1:9099 http://127.0.0.1:8080 http://127.0.0.1:9199 http://127.0.0.1:5001 ws://127.0.0.1:8080; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`);
  if(!['localhost:3000','127.0.0.1:3000'].includes(req.headers.host)){res.writeHead(403).end();return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const u=new URL(req.url,origin);
  if(u.pathname==='/start'){
   try{const email=emails[u.searchParams.get('coach')==='2'?1:0],href=await link(email);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(`<!doctype html><title>Opening synthetic Coach Core session</title><p>Opening your local synthetic coach account…</p><script nonce="${nonce}">localStorage.setItem('coachcore.emailForSignIn',${JSON.stringify(email)});localStorage.setItem('onboardingComplete','true');localStorage.setItem('smartPlaybook_onboarding_complete','true');location.replace(${JSON.stringify(href)});</script>`);}catch{res.writeHead(503,{'Content-Type':'text/plain'}).end('Local synthetic sign-in failed. Check local-emulators.log. No live sign-in was attempted.');}return;
  }
  let decoded;try{decoded=decodeURIComponent(u.pathname);}catch{res.writeHead(400).end();return;}
  const app=path.join(root,'app');let file=path.resolve(app,'.'+decoded);if(!file.startsWith(app+path.sep)&&file!==app){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(app,'index.html');
  const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3000,'127.0.0.1',resolve);});
 console.log('\nMAIN COACH CORE READY: '+origin+'/start\nSynthetic accounts only. AI and Film backend OFF. Ctrl+C saves local emulator data and stops.');
 if(process.platform==='win32')spawn('cmd.exe',['/d','/s','/c','start "" "http://localhost:3000/start"'],{stdio:'ignore'});
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
start().catch(async e=>{fail(e.message);if(emulator&&!emulator.killed){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(emulator.pid),'/T','/F'],{stdio:'ignore'});else emulator.kill('SIGINT');}if(server)server.close();});
