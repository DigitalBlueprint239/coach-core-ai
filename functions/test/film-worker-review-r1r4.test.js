/* eslint-disable */
// Retained VERBATIM regression: Codex's independent PR85 probes (#39
// c-6297822889; review c-6297820037), sha256 of the original script
// 6a4eb7773a0501f4b70bdf82253cae0690e326b6778831c5ac82876d47e6d730.
// Only change: the repository root is resolved from this file's location
// instead of process.cwd(), so it runs inside the Functions suite. Lint is
// disabled for this file only, to keep the reproduction byte-for-byte.
// At b94c35f: 1 pass / 4 fail (R1-R4). Must stay 5/5.
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
test('control: valid decoder-free reconciliation works after lost ACK',async()=>{
 const w=await world();await loseAcknowledgement(w);const before=w.pipeline.calls.length;
 const out=await w.worker.reconcileFilm(w.args);assert.equal(out.reconcile,'ready');assert.equal(w.pipeline.calls.length,before);
});
test('R1: budget refusal must not permanently block proven-output reconciliation',async()=>{
 const w=await world(['infrastructure','infrastructure','ok']);
 await w.worker.processFilm(w.args);await w.worker.redrive(w.args);await loseAcknowledgement(w);
 assert.equal(w.job().admitted,3);assert.equal(w.job().attempts.length,3);
 const refusal=await w.worker.redrive(w.args);assert.equal(refusal.outcome,'refused-exhausted');
 const out=await w.worker.reconcileFilm(w.args);
 console.log('R1 observed',JSON.stringify({refusal,reconcile:out,filmStatus:w.db.read(w.filmPath).status,jobRecovery:w.job().recovery?.reason,admitted:w.job().admitted,pipelineCalls:w.pipeline.calls.length}));
 assert.equal(out.reconcile,'ready','validated matching output must remain recoverable without attempt4');
});
test('R2: malformed persisted validated media must never be promoted',async()=>{
 const w=await world();await loseAcknowledgement(w);
 const j=w.job();j.validated.media.width=0;w.db.write(w.jobPath,j);
 const out=await w.worker.reconcileFilm(w.args),film=w.db.read(w.filmPath);
 const wire={...film};for(const k of c2.FILM_TIMESTAMP_FIELDS) if(wire[k]!==undefined) wire[k]=v1.toWireTimestamp(wire[k]);
 console.log('R2 observed',JSON.stringify({out,status:film.status,width:film.media?.width,wireValid:c2.schemas.filmState.safeParse(wire).success}));
 assert.notEqual(film.status,'ready','malformed validated record must fail closed, not create invalid FilmState');
});
test('R3: explicit redrive obeys OFF gate and does zero worker I/O',async()=>{
 const w=await world([],false);const before=w.objects.calls.length;
 const out=await w.worker.redrive(w.args);
 console.log('R3 observed',JSON.stringify({outcome:out.outcome,preflights:w.decoder.state.preflights,pipelineCalls:w.pipeline.calls.length,objectCalls:w.objects.calls.length-before}));
 assert.equal(w.pipeline.calls.length,0,'OFF cannot be bypassed by public explicit redrive');
 assert.equal(w.decoder.state.preflights,0);
});
test('R4: cancellation output cleanup must survive a failed generation delete',async()=>{
 const w=await world();
 const oldCreate=w.objects.createOnly.bind(w.objects),oldDelete=w.objects.deleteGeneration.bind(w.objects);
 w.objects.createOnly=async t=>{
  const out=await oldCreate(t);
  const cancelled=await w.s1.abandonFilmUpload({auth,data:{schemaVersion:'coach-film.v1',operationId:crypto.randomUUID(),action:'abandonFilmUpload',payload:{teamId:TEAM,filmId:w.filmId}}});
  assert.equal(cancelled.ok,true);assert.equal(w.db.read(w.filmPath).status,'abandoned');
  return out;
 };
 w.objects.deleteGeneration=async()=>{throw Error('synthetic cleanup outage');};
 await assert.rejects(w.worker.processFilm(w.args));
 assert.equal(w.job().cleanup.output.result,'pending');
 w.objects.deleteGeneration=oldDelete;
 const out=await w.worker.reconcileFilm(w.args);
 console.log('R4 observed',JSON.stringify({out,cleanup:w.job().cleanup.output,resultingObjectCount:w.objects.objects.size}));
 assert.equal(w.job().cleanup.output.result,'deleted','pending output cleanup must be retried by decoder-free reconciliation');
});


