import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const repo=process.env.REVIEW_REPO||process.cwd(),out=process.env.REVIEW_EVIDENCE_DIR||'/tmp/pr77-root-review';fs.mkdirSync(out,{recursive:true});const {readArtifactDir}=await import(pathToFileURL(path.join(repo,'e2e/scripts/merge-eligibility.mjs')));
const results={suites:[],errors:[],stats:{expected:0,unexpected:0,skipped:0,flaky:0}};const rows=[];
for(const roots of [['ci-evidence'],['test-results'],['ci-evidence','test-results']]){
 const parent=fs.mkdtempSync(path.join(out,'root-link-case-')),d=path.join(parent,'artifact'),outside=path.join(parent,'outside');fs.mkdirSync(d);fs.mkdirSync(outside);
 for(const base of [d,outside]){
  fs.mkdirSync(path.join(base,'ci-evidence'));fs.mkdirSync(path.join(base,'test-results'));const isOutside=base===outside;
  fs.writeFileSync(path.join(base,'ci-evidence/UPLOAD_OK'),'public marker');fs.writeFileSync(path.join(base,'ci-evidence/run.context'),'sha='+(isOutside?'PUBLIC_OUTSIDE_CONTEXT_SENTINEL':'PUBLIC_INSIDE_CONTEXT')+'\n');fs.writeFileSync(path.join(base,'ci-evidence/INVENTORY.sha256'),'# public fixture inventory\n');
  fs.writeFileSync(path.join(base,'test-results/results.json'),JSON.stringify({...results,...(isOutside?{PUBLIC_OUTSIDE_JSON_SENTINEL:true}:{})}));fs.writeFileSync(path.join(base,'test-results/.last-run.json'),isOutside?'PUBLIC_OUTSIDE_PARSE_SENTINEL':JSON.stringify({status:'passed',failedTests:[]}));
 }
 for(const root of roots){fs.rmSync(path.join(d,root),{recursive:true});fs.symlinkSync(path.join(outside,root),path.join(d,root),'dir');}
 const read=readArtifactDir(d),row={symlinked_roots:roots,inventory_rejected:read.inventoryOk!==true,outside_context_parsed:read.context?.sha==='PUBLIC_OUTSIDE_CONTEXT_SENTINEL',outside_results_parsed:read.results?.PUBLIC_OUTSIDE_JSON_SENTINEL===true,last_run_problem:read.lastRunProblem,read};
 if(!row.inventory_rejected||(!row.outside_context_parsed&&!row.outside_results_parsed))throw Error('Expected containment defect did not reproduce');rows.push(row);console.log(JSON.stringify({roots,inventory_rejected:row.inventory_rejected,outside_context_parsed:row.outside_context_parsed,outside_results_parsed:row.outside_results_parsed,last_run_problem:row.last_run_problem}));
}
fs.writeFileSync(path.join(out,'root-containment.json'),JSON.stringify(rows,null,2)+'\n');
