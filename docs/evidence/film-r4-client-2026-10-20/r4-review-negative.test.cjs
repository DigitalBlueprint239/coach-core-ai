// Run from the exact r4 checkout; no backend or shared-fixture edits.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=process.cwd();
const c=require(path.join(root,'functions/src/film/contract-v2.js'));
const l=require(path.join(root,'functions/src/film/legacy-r3.js'));
const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/coach-film.v2/v2-replay-r3-reserve-receipt.json'),'utf8'));
for(const [name,change] of Object.entries({
  'missing replay expiry fails closed':q=>delete q.stored.replayableUntilMs,
  'unknown stored version fails closed':q=>q.stored.schemaVersion='coach-film.v999',
  'corrupt v1 receipt fails closed':q=>{q.requestSchemaVersion='coach-film.v1';q.stored.responseJson='{bad';},
})) test(name,()=>{const q=structuredClone(fixture.request);change(q);assert.equal(l.decideReplay(q).kind,'error');});
test('nonfinite attempt admission fails closed',()=>{
  assert.notEqual(c.admissionDecision({delivery:'process',configurationOk:true,admitted:NaN,jobCreatedAtMs:NaN,nowMs:NaN}).admit,true);
});
test('missing pipeline steps do not establish repeated same-step kills',()=>{
  assert.notEqual(c.exhaustionOutcome([{end:'limit-kill',kill:'SIGXCPU'},{end:'limit-kill',kill:'SIGXCPU'}]).outcome,'rejected');
});
test('unknown media reason cannot become a closed-set rejection',()=>{
  assert.notEqual(c.exhaustionOutcome([{end:'media-verdict',reason:'made-up'}]).outcome,'rejected');
});
