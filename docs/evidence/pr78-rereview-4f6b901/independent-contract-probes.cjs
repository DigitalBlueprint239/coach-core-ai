const fs=require('fs'),path=require('path'),cp=require('child_process');
const repo=process.env.REVIEW_REPO||process.cwd(),out=process.env.REVIEW_EVIDENCE_DIR||'/tmp/review78-r5';fs.mkdirSync(out,{recursive:true});
const script=path.join(repo,'scripts/security/release-import-config.js');
const run=args=>{const r=cp.spawnSync(process.execPath,[script,...args],{encoding:'utf8'});let report;try{report=JSON.parse(r.stdout)}catch{report={stderr:r.stderr}}return{exit:r.status,report}};
const old=JSON.parse(fs.readFileSync(process.env.PRIOR_FIXTURE_JSON||path.join(__dirname,'prior-fixtures.json')));
const probes=[];for(const x of old){const dir=fs.mkdtempSync(path.join(out,'fixture-'));fs.mkdirSync(path.join(dir,'static/js'),{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),'<script src="/static/js/main.js"></script>');fs.writeFileSync(path.join(dir,'static/js/main.js'),x.code);const c=run(['canary',dir]);if(!c.report.claim?.includes('NOT a behavioural claim'))throw new Error('Canary claims behaviour');const can=path.join(dir,'canary.json');fs.writeFileSync(can,JSON.stringify(c.report));const gate=run(['gate','--canary',can,'--off',path.join(dir,'missing.json'),'--on',path.join(dir,'missing.json')]);if(gate.exit===0||gate.report.verdict!=='inconclusive')throw new Error('Synthetic fixture obtained behavioural PASS');const removedScan=run(['scan',dir]),removedNC=run(['negative-control',dir]);if(removedScan.exit!==2||removedNC.exit!==2)throw new Error('Retired commands remain');probes.push({name:x.name,canary:c,gate,removed_scan_exit:removedScan.exit,removed_negative_control_exit:removedNC.exit});}
// Use actual retained Playwright results, not fabricated happy-path rows.
const input=process.env.L3_ARTIFACT_DIR||'/workspace/scratch/review78-r5/extracted-12149777500';const original=JSON.parse(fs.readFileSync(input+'/test-results/release-proof/results.json'));const canary=input+'/ci-evidence/release-canary.json';
const each=(s,fn)=>{for(const spec of s.specs||[])for(const test of spec.tests||[])fn(spec,test);for(const child of s.suites||[])each(child,fn)};
const mutations=[
 ['actual CI results (positive)',()=>{} ,0],
 ['OFF skipped',(s,t)=>{if(s.title.startsWith('RP-OFF-02 ')){t.status='skipped';t.results=[]}},1],
 ['OFF no completed result',(s,t)=>{if(s.title.startsWith('RP-OFF-02 ')){t.results=[]}},1],
 ['OFF interrupted',(s,t)=>{if(s.title.startsWith('RP-OFF-02 ')){t.status='unexpected';t.results[0].status='interrupted'}},1],
 ['OFF timed out',(s,t)=>{if(s.title.startsWith('RP-OFF-02 ')){t.status='unexpected';t.results[0].status='timedOut'}},1],
 ['ON control failed',(s,t)=>{if(s.title.startsWith('D10-01 ')){t.status='unexpected';t.results[0].status='failed'}},1],
 ['OFF flaky',(s,t)=>{if(s.title.startsWith('RP-OFF-01 ')){t.status='flaky';t.results=[{status:'failed'},{status:'passed'}]}},1],
 ['required OFF title absent',(s,t)=>{if(s.title.startsWith('RP-OFF-03 '))s.title='unrelated title'},1],
 ];
const gates=[];for(const[name,fn,expected]of mutations){const d=structuredClone(original);for(const s of d.suites)each(s,fn);const f=path.join(out,'results-'+gates.length+'.json');fs.writeFileSync(f,JSON.stringify(d));const r=run(['gate','--canary',canary,'--off',f,'--on',f]);if(r.exit!==expected)throw new Error(name+' expected exit '+expected+' got '+r.exit);gates.push({name,expected_exit:expected,...r});}
fs.writeFileSync(out+'/independent-contract-probes.json',JSON.stringify({synthetic_fixtures:probes,real_results_mutations:gates},null,2)+'\n');console.log('21 prior fixtures: canary makes no behaviour claim; gate without L3 inconclusive; retired commands exit2. Actual-CI positive gate + seven failure mutations behave as expected.');
