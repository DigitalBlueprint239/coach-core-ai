'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),https=require('node:https'),tls=require('node:tls'),{execFileSync}=require('node:child_process');
const transport=require('/workspace/coach-core-lfs-review/functions/src/film/lfs-transport.js');
const Agent=require('internal/deps/undici/undici').getGlobalDispatcher().constructor;
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'lfs-https-independent-'));
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',temp+'/key.pem','-out',temp+'/cert.pem','-days','1','-subj','/CN=storage.googleapis.com','-addext','subjectAltName=DNS:storage.googleapis.com'],{stdio:'ignore'});
const cert=fs.readFileSync(temp+'/cert.pem'),key=fs.readFileSync(temp+'/key.pem');
const NAME='quarantine/team-a/00000000-0000-4000-8000-000000000001/source.mp4',GEN='17609000000000000001',D=300,SLACK=500;
const output=[];
async function probe(kind){
 const reqs=[],connections=[],sockets=new Set(),urls=[];
 const server=https.createServer({key,cert},(req,res)=>{
  const rec={method:req.method,url:req.url,host:req.headers.host,auth:req.headers.authorization,range:req.headers.range,at:performance.now(),closedAt:null};reqs.push(rec);req.socket.once('close',()=>rec.closedAt=performance.now());
  if(kind==='trickle'){res.writeHead(206);const iv=setInterval(()=>res.write('x'),30);res.once('close',()=>clearInterval(iv));}
  if(kind==='oversize'){res.writeHead(206);res.write(Buffer.alloc(4096));}
 });
 server.on('connection',s=>{sockets.add(s);s.once('close',()=>sockets.delete(s));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const agent=new Agent({connect(opts,cb){
  assert.equal(opts.hostname,'storage.googleapis.com');assert.ok(opts.port==='' || String(opts.port)==='443');assert.equal(opts.protocol,'https:');connections.push({hostname:opts.hostname,port:opts.port,protocol:opts.protocol});
  const sock=tls.connect({host:'127.0.0.1',port,servername:'storage.googleapis.com',ca:cert,rejectUnauthorized:true},()=>{assert.equal(sock.authorized,true);cb(null,sock);});sock.once('error',e=>cb(e,null));return sock;
 }});
 const fetchImpl=(url,opts)=>{assert.equal(new URL(url).origin,'https://storage.googleapis.com');urls.push(url);return fetch(url,{...opts,dispatcher:agent}).catch(e=>{console.error('native-fetch cause',e.cause);throw e;});};
 const bucket=transport.createBoundedStorage({bucketName:'demo-lfs-gate.appspot.com',tokenProvider:{token:async()=> 'public-synthetic-test-token'},fetchImpl,limits:{...transport.LFS_TRANSPORT_LIMITS,storageRequestMs:D}});
 const start=performance.now();let err;
 try{if(kind==='list')await bucket.listObjects({prefix:'quarantine/',maxResults:5});else if(kind==='delete')await bucket.file(NAME).delete({ifGenerationMatch:GEN});else await bucket.file(NAME,{generation:GEN}).download({start:0,end:1023});}catch(e){err=e;}
 assert.equal(err?.code,kind==='oversize'?'body-over-cap':'deadline');
 const elapsed=performance.now()-start;assert.ok(elapsed<D+SLACK,`${kind}: elapsed${elapsed}`);
 const waitUntil=Date.now()+2000;while(reqs.some(r=>r.closedAt===null)&&Date.now()<waitUntil)await new Promise(r=>setTimeout(r,10));
 assert.equal(reqs.length,1);assert.equal(urls.length,1);const r=reqs[0];assert.ok(r.closedAt!==null);assert.ok(r.closedAt-r.at<D+SLACK);assert.equal(r.host,'storage.googleapis.com');assert.equal(r.auth,'Bearer public-synthetic-test-token');
 const u=new URL(r.url,'https://storage.googleapis.com');if(kind==='delete'){assert.equal(r.method,'DELETE');assert.equal(u.searchParams.get('ifGenerationMatch'),GEN);}else if(kind!=='list'){assert.equal(r.range,'bytes=0-1023');assert.equal(u.searchParams.get('generation'),GEN);assert.equal(u.searchParams.get('alt'),'media');}else{assert.equal(u.searchParams.get('maxResults'),'5');assert.equal(u.searchParams.get('prefix'),'quarantine/');}
 output.push({kind,code:err.code,elapsedMs:Math.round(elapsed),serverCloseMs:Math.round(r.closedAt-r.at),requests:reqs.length,originalURL:urls[0],host:r.host,range:r.range,requestedConnections:connections,TLSAuthorized:true});
 for(const s of sockets)s.destroy();await agent.destroy();await new Promise(r=>server.close(r));
}
(async()=>{try{for(const k of ['list','head','delete','trickle','oversize'])await probe(k);fs.writeFileSync('/workspace/scratch/lfs-transport-independent/https-default-origin.json',JSON.stringify({node:process.version,source:'0c93b63ca47d9cdcd23e7e712714047193f73557',endpointOverride:false,globalDispatcherChanged:false,results:output},null,2));console.log(JSON.stringify(output,null,2));console.log('PASS 5/5 default-origin native-fetch controlled TLS probes');}finally{fs.rmSync(temp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
