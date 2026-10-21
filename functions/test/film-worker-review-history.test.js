/* eslint-disable */
// Retained VERBATIM regression: Codex's PR85 re-review history probe (#39
// c-6298813793; review c-6298813169), sha256 of the original script
// d4ed0049cf0b16c4f41979691115248c4b9f13a28f5e355bc55140861d349142.
// Only change: the repository root is resolved from this file's location
// instead of process.cwd(). At 52a6b74: 3 pass / 1 fail (another
// attempt's admission fence 99 above the job fence promoted). Must stay 4/4.
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
test('all admission fences must not exceed durable job fence',async()=>{
 const w=await world(['infrastructure','ok']);await w.worker.processFilm(w.args);await loseAcknowledgement(w);
 const j=w.job();assert.equal(j.admitted,2);assert.equal(j.validated.attemptN,2);j.attempts[0].fence=99;w.db.write(w.jobPath,j);
 const out=await w.worker.reconcileFilm(w.args);
 console.log('other-fence observed',JSON.stringify({out,status:w.db.read(w.filmPath).status,attemptFences:w.job().attempts.map(a=>a.fence),jobFence:w.job().fence}));
 assert.notEqual(w.db.read(w.filmPath).status,'ready');
});
for(const [name,change,reason] of [
 ['validation after recorded attempt end',j=>{j.attempts[0].endedAtMs=j.validated.atMs-1;j.attempts[0].end={end:'infrastructure'};},'validation-outside-attempt'],
 ['validation before admission',j=>{j.validated.atMs=j.attempts[0].admittedAtMs-1;},'validation-outside-attempt'],
 ['validation paired with media rejection',j=>{j.attempts[0].end={end:'media-verdict',reason:'media-corrupt'};j.attempts[0].endedAtMs=j.validated.atMs;},'validation-attempt-ended-before-validation']
]) test(name,async()=>{
 const w=await world();await loseAcknowledgement(w);const j=w.job();change(j);w.db.write(w.jobPath,j);const io=w.objects.calls.length;
 const out=await w.worker.reconcileFilm(w.args);assert.deepEqual(out,{reconcile:'recovery-needed',reason});assert.equal(w.objects.calls.length,io);assert.deepEqual(w.job().validated,j.validated);assert.notEqual(w.db.read(w.filmPath).status,'ready');
});


