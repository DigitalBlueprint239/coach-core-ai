const fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const repo='/workspace/coach-core-review78-r2', mod=require(repo+'/scripts/security/release-import-config.js'), out='/workspace/scratch/review78-r2';
const flag=mod.FLAG;const env={...process.env};delete env[flag];
const fixture=files=>{const root=fs.mkdtempSync(out+'/fixture-');fs.writeFileSync(root+'/package.json','{}');for(const[f,c]of Object.entries(files))fs.writeFileSync(root+'/'+f,c);return root;};
let reports=[];const pin=flag+'=false\n';
for(const [name,files,extra] of [
 ['local expansion enables',{'.env.production':pin,'.env.local':'CHOICE=true\n'+flag+'=${CHOICE}\n'},{}],
 ['shell expansion in nominal committed value',{'.env.production':pin+flag+'=${CHOICE}\n'},{CHOICE:'true'}],
 ['safe expansion refuses closed',{'.env.production':pin+flag+'=${CHOICE}\n'},{CHOICE:'false'}],
 ['quoted CRLF exact pin',{'.env.production':pin.replace(/\n/g,'\r\n')+flag+'="false"\r\n'},{}],
 ['escaped dollar local',{'.env.production':pin,'.env.local':flag+'=\\$CHOICE\n'},{CHOICE:'true'}],
 ['local false overrides committed',{'.env.production':pin,'.env.local':flag+'=false\n'},{}],
 ['untracked allowed basename',{'.env.production':pin},{}],
 ['shell true dominates local false',{'.env.production':pin,'.env.local':flag+'=false\n'},{[flag]:'true'}],
 ]){const root=fixture(files);const e={...env,...extra};const a=mod.resolveIndependently(root,'production',e);const b=mod.resolveWithCra(root,'production',e);const p=cp.spawnSync(process.execPath,[repo+'/scripts/security/release-import-config.js','resolve','--root',root],{env:e,encoding:'utf8'});reports.push({name,root,independent:a.effective,cra:b,exit:p.status,report:JSON.parse(p.stdout)});}
const vm=require('vm');
for(const[name,files] of [
 ['only comments; enabled executable',{'main.js':'/* coachcore:import-config=false Device-play import is disabled in this build */\nglobalThis.importEnabled=()=>true;'}],
 ['unreferenced stale file; enabled executable',{'main.js':'globalThis.importEnabled=()=>true;','orphan.js':'"coachcore:import-config=false";"Device-play import is disabled in this build";'}],
 ['contradictory executable; off strings retained',{'main.js':'globalThis.importEnabled=()=>"true" === "true";globalThis.copy="Device-play import is disabled in this build";globalThis.marker="coachcore:import-config=false";'}],
 ['missing marker',{'main.js':'globalThis.importEnabled=()=>false;'}],
 ['on and off marker',{'main.js':'"coachcore:import-config=false";"coachcore:import-config=true";"Device-play import is disabled in this build";'}],
 ]){const root=fixture(files);const p=cp.spawnSync(process.execPath,[repo+'/scripts/security/release-import-config.js','scan',root],{env,encoding:'utf8'});let sandbox={};vm.runInNewContext(files['main.js'],sandbox);reports.push({name,root,exit:p.status,report:JSON.parse(p.stdout),executableImportEnabled:sandbox.importEnabled?.()});}
fs.writeFileSync(out+'/independent-probes.json',JSON.stringify(reports,null,2)+'\n');for(const r of reports)console.log(JSON.stringify({name:r.name,exit:r.exit,independent:r.independent,cra:r.cra,executableImportEnabled:r.executableImportEnabled,ok:r.report.ok}));
