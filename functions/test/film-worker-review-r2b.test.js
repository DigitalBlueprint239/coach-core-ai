/* eslint-disable */
// Retained VERBATIM regression: Codex's PR85 re-review probes (#39
// c-6298453552; review c-6298450957), sha256 of the original script
// 1ec9740bdb488b4473e0b270c3824a77f536c2fc0eb7901f744c053b683c6be4.
// Only change: the repository root is resolved from this file's location
// instead of process.cwd(). At ff09834: 1 pass / 2 fail (R2b). Must stay
// 3/3. The "S1 observation" case documents the SEPARATE, frozen S1
// abandon-source deletion concern (tracked as a release gate; not an S2b
// repair): it passes because it asserts the current S1 behaviour.
// Independent review probes. Run from exact PR85 checkout. No candidate edits.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const crypto=require('node:crypto');
const r=path.join(__dirname,"..","..");
const get=f=>require(path.join(r,f));
const v1=get('functions/src/film/contract');
const c2=get('functions/src/film/contract-v2');
const {createFilmHandlers}=get('functions/src/film/handlers');
const {createFilmWorker,jobIdFor}=get('functions/src/film/worker/worker');
const {leaseTtlMs}=get('functions/src/film/worker/limits');
const {FakeTimestamp,FakeFirestore,FakeObjects,fakeDecoder,scriptedPipeline}=get('functions/test/film-worker-doubles');
const TEAM='demo-review-team',OWNER='demo-review-owner';
const auth={uid:OWNER,token:{email_verified:true,firebase:{sign_in_provider:'google.com'}}};
const BODY=Buffer.concat([Buffer.from([0,0,0,16]),Buffer.from('ftypisom'),Buffer.from([0,0,2,0]),Buffer.alloc(16)]);
async function world(script=[],enabled=true){
 const db=new FakeFirestore(),objects=new FakeObjects(),decoder=fakeDecoder(),pipeline=scriptedPipeline(script);
 const clock={t:new Date('2026-10-19T21:00:00.000Z')},logger={info(){},warn(){},error(){}};
 db.write(`teams/${TEAM}`,{ownerId:OWNER});
 const s1=createFilmHandlers({db,Timestamp:FakeTimestamp,getUser:async()=>({disabled:false,customClaims:{beta:true}}),...objects.s1(),now:()=>clock.t,logger});
 const reserve=await s1.reserveFilmUpload({auth,data:{schemaVersion:'coach-film.v1',operationId:crypto.randomUUID(),action:'reserveFilmUpload',payload:{teamId:TEAM,declaredBytes:BODY.length,declaredContentType:'video/mp4',fileName:'synthetic.mp4',rightsAcknowledged:true,rightsWordingVersion:'rights-v1'}}});
 assert.equal(reserve.ok,true);
 const filmId=reserve.data.filmId,name=v1.uploadPathFor(TEAM,filmId),generation=objects.put(name,BODY);
 assert.equal(await s1.onQuarantineFinalized({bucket:"demo-s2b.appspot.com",name,generation,size:BODY.length,contentType:'video/mp4'}),'validating');
 const filmPath=`teams/${TEAM}/films/${filmId}`,jobId=jobIdFor(TEAM,filmId,generation),jobPath=`${filmPath}/workerJobs/${jobId}`;
 const worker=createFilmWorker({db,Timestamp:FakeTimestamp,objects,decoder,runPipeline:pipeline,isEnabled:()=>enabled,now:()=>clock.t,logger});
 return {db,objects,decoder,pipeline,clock,s1,worker,filmId,filmPath,jobId,jobPath,args:{teamId:TEAM,filmId},job:()=>db.read(jobPath)};
}
async function loseAcknowledgement(w){
 w.objects.fault('createOnly','ack-lost');
 const original=w.objects.stat.bind(w.objects);
 w.objects.stat=async()=>{throw Error('synthetic instance loss after upload before ACK reconciliation');};
 await assert.rejects(w.worker.processFilm(w.args));
 w.objects.stat=original;
 assert.ok(w.job().intent && w.job().validated && !w.job().output);
 w.clock.t=new Date(w.clock.t.getTime()+leaseTtlMs()+1);
}
test('binding: validation must belong to an admitted attempt and its fence',async()=>{
 const w=await world();await loseAcknowledgement(w);
 const j=w.job();assert.equal(j.admitted,1);j.validated.attemptN=3;
 w.db.write(w.jobPath,j);
 const out=await w.worker.reconcileFilm(w.args);
 console.log('binding observed',JSON.stringify({out,status:w.db.read(w.filmPath).status,admitted:w.job().admitted,validationAttempt:w.job().validated.attemptN}));
 assert.notEqual(w.db.read(w.filmPath).status,'ready','unadmitted validation attempt must fail closed');
});
test('S1 observation: failed abandon-source deletion is not retried on receipt replay',async()=>{
 const w=await world();const del=w.objects.deleteGeneration.bind(w.objects);
 w.objects.deleteGeneration=async()=>{throw Error('synthetic outage');};
 const req={auth,data:{schemaVersion:'coach-film.v1',operationId:crypto.randomUUID(),action:'abandonFilmUpload',payload:{teamId:TEAM,filmId:w.filmId}}};
 const first=await w.s1.abandonFilmUpload(req);assert.equal(first.ok,true);
 w.objects.deleteGeneration=del;const replay=await w.s1.abandonFilmUpload(req);
 assert.deepEqual(replay,first);assert.equal(w.objects.objects.size,1);
 console.log('S1 observed',JSON.stringify({status:w.db.read(w.filmPath).status,sourceObjects:w.objects.objects.size,workerJob:w.job()||null}));
});
test('binding: validation and intent fence must match a historical admission',async()=>{
 const w=await world();await loseAcknowledgement(w);
 const j=w.job();j.validated.fence=99;j.intent.fence=99;w.db.write(w.jobPath,j);
 const out=await w.worker.reconcileFilm(w.args);
 console.log('fence observed',JSON.stringify({out,status:w.db.read(w.filmPath).status,attemptFences:w.job().attempts.map(a=>a.fence),validationFence:w.job().validated.fence}));
 assert.notEqual(w.db.read(w.filmPath).status,'ready','fabricated validation fence must fail closed');
});


