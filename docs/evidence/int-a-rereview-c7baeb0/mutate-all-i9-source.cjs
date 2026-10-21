// Review-only fault injection; candidate files remain unchanged.
const Module=require('node:module');const original=Module._load;const stores=[];
Module._load=function(request,parent,isMain){const r=original.apply(this,arguments);
 if(/film-worker-doubles$/.test(request)&&r.FakeObjects){return {...r,FakeObjects:class extends r.FakeObjects{constructor(...a){super(...a);stores.push(this);}}};}
 if(/src\/film\/handlers\.js$/.test(Module._resolveFilename(request,parent))&&r.createFilmHandlers){return {...r,createFilmHandlers(deps){const h=r.createFilmHandlers(deps);return {...h,onQuarantineFinalized:async e=>{const out=await h.onQuarantineFinalized(e);if(out==='duplicate-event'){const [prefix,t,f]=e.name.split('/');const p=`teams/${t}/films/${f}`;const d=deps.db.read(p);const jobs=deps.db.paths(p+'/workerJobs/').map(j=>deps.db.read(j));if(['validating','ready','rejected'].includes(d?.status)){const store=[...stores].reverse().find(s=>s.objects.has(e.name));if(store){const o=store.objects.get(e.name);o.bytes=Buffer.from('FAULT-INJECTED SOURCE BYTES');process.stderr.write('REVIEW MUTATION: changed class(d) '+d.status+' source bytes\n');}}}return out;}};}};}
 return r;};
