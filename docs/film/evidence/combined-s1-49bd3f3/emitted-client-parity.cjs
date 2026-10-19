// Verification-only preload. Real handler outputs are passed unchanged to the
// unmodified TypeScript client parser; dependencies/business logic are not replaced.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=process.env.FILM_PARITY_ROOT;if(!root)throw Error('FILM_PARITY_ROOT required');
const ts=require(path.join(root,'node_modules/typescript'));
const clientFile=path.join(root,'src/features/film-analyzer/contracts.ts');
const compiled=ts.transpileModule(fs.readFileSync(clientFile,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const cm=new Module(clientFile,module);cm.filename=clientFile;cm.paths=Module._nodeModulePaths(path.dirname(clientFile));cm._compile(compiled,clientFile);const client=cm.exports;
const target=path.join(root,'functions/src/film/handlers.js');const old=Module._load;const log=process.env.FILM_PARITY_LOG;
const record=x=>fs.appendFileSync(log,JSON.stringify(x)+'\n');
Module._load=function(request,parent,isMain){const value=old.apply(this,arguments);let filename;try{filename=Module._resolveFilename(request,parent)}catch{return value}if(filename!==target)return value;
 return {...value,createFilmHandlers(deps){const h=value.createFilmHandlers(deps);const out={...h};
  for(const action of ['reserveFilmUpload','abandonFilmUpload'])out[action]=async(...args)=>{const response=await h[action](...args);assert.deepEqual(client.parseFilmResponse(action,response),response);record({type:'response',action,ok:response.ok,status:response.data?.film?.status,previousStatus:response.data?.previousStatus});return response};
  out.onQuarantineFinalized=async(...args)=>{const result=await h.onQuarantineFinalized(...args);const m=/^quarantine\/([^/]+)\/([^/]+)\/source\.mp4$/.exec(args[0]?.name||'');if(m){const snap=await deps.db.doc(`teams/${m[1]}/films/${m[2]}`).get();if(snap.exists){const d=snap.data();const c=require(path.join(root,'functions/src/film/contract.js'));const wire={};for(const k of Object.keys(c.schemas.filmState.shape)){const v=d[k]===undefined?null:d[k];wire[k]=c.FILM_TIMESTAMP_FIELDS.includes(k)?c.toWireTimestamp(v):v}assert.deepEqual(client.parseFilmState(wire),wire);record({type:'finalized-state',outcome:result,status:wire.status})}}return result};return out}};
};
