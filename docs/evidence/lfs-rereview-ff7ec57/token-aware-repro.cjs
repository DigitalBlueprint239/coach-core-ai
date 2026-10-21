const path=require('path');const root=process.argv[2];
const r=require(path.join(root,'functions/src/film/reconcile'));
const c=require(path.join(root,'functions/src/film/contract'));
const {FakeFirestore,FakeTimestamp,LfsBucket}=require(path.join(root,'functions/test/lfs-doubles'));
const logger={info(){},warn(){},error(){}};
(async()=>{
 const now=new Date('2026-10-21T00:20:00Z');
 const items=[1,2,3].map(n=>({name:c.uploadPathFor('team',`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`),generation:String(n),size:'32',contentType:'video/mp4',timeCreated:'2026-10-21T00:00:00Z'}));
 const db=new FakeFirestore();
 const storage={name:'demo-pages.appspot.com',async listObjects(q){const tail=items.filter(x=>(!q.startOffset||x.name>=q.startOffset)&&(!q.pageToken||x.name>q.pageToken));const page=tail.slice(0,2);return{items:page,nextPageToken:tail.length>2?page.at(-1).name:null}},file(){return{async download(){throw Object.assign(new Error('temporary'),{code:503})}}}};
 const rc=r.createQuarantineReconciler({db,Timestamp:FakeTimestamp,storage,bucketName:()=>storage.name,project:'demo-pages',now:()=>now,logger});
 const passes=[];for(let i=0;i<4;i++)passes.push(await rc.reconcileQuarantine({limit:10}));
 console.log(JSON.stringify({shortPage:{passes:passes.map(x=>({processed:x.processed,passEnded:x.passEnded})),evidenceNames:db.paths(r.EVIDENCE_COLLECTION+'/').map(p=>db.read(p).name),third:items[2].name}},null,2));
 const db2=new FakeFirestore();const actual=new LfsBucket('demo-actual.appspot.com',()=>new Date('2026-10-21T00:00:00Z'));
 const e=actual.put(items[0].name,Buffer.alloc(32),'video/mp4','17609000000000000001');
 const wrong=r.createQuarantineReconciler({db:db2,Timestamp:FakeTimestamp,storage:actual,bucketName:()=> 'demo-other.appspot.com',project:'demo-pages',now:()=>now,logger});
 const result=await wrong.reconcileQuarantine({limit:1});
 console.log(JSON.stringify({bindingMismatch:{result,actualBucket:actual.name,configuredBucket:'demo-other.appspot.com',actualObjectStillPresent:actual.objects.has(e.name),records:db2.paths('filmCleanup/').map(p=>db2.read(p))}},null,2));
})();
