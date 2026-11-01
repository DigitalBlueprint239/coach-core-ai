#!/usr/bin/env bash
# Qualified runtime plus separately pinned private synthetic journey driver.
set -euo pipefail
umask 077
: "${RUNNER_TEMP:?}"
P="$RUNNER_TEMP/film-private-setup"
cd "$P/package/source"
E="$P/evidence"
mkdir -p "$E"
run() {
  local label="$1"; shift
  set +e
  "$@" >"$E/$label.log" 2>&1
  local code=$?
  set -e
  printf '%s exit=%s\n' "$label" "$code" >> "$E/exits.txt"
  if [[ "$code" != 0 ]]; then
    printf 'Setup step failed: %s (exit %s); private evidence retained.\n' "$label" "$code"
    return "$code"
  fi
}
printf '%s\n' 'application_client_base=c8526787ad5b465fc941b2e575e01d4f4ac2af4b' > "$E/source.txt"
printf '%s\n' 'package_sha256=7ae6153d24480a8be6c240f5bd9d90649b5a4434c3de18b03172b321642c3683' >> "$E/source.txt"
printf '%s\n' 'COMPONENT_ACCEPTANCE=retained-independent-PASS' 'INTEGRATED_JOURNEY=UNRUN' 'HISTORICAL_NATIVE_CT5=PRESERVED_NOT_RERUN' 'CURRENT_LINUX_COMPAT112=UNRUN' > "$E/status.txt"
run source-check node ../verify-package.mjs "$PWD"
run full-app-overlay node - "$PWD" "$P/full-app-overlay" "$E" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const [source,payload,evidence]=process.argv.slice(2),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),blob=b=>crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const raw=fs.readFileSync(path.join(payload,'MANIFEST.json'));assert.equal(hash(raw),'def01f92ee58f35aacacbe2fee13fbbbe34eb1554896c2e1cef43a940c0e2c96');
const m=JSON.parse(raw),original=JSON.parse(fs.readFileSync(path.join(source,'../SOURCE-MANIFEST.json')));
assert.equal(m.originalSource,'c8526787ad5b465fc941b2e575e01d4f4ac2af4b');assert.equal(original.commit,m.originalSource);assert.equal(original.files.length,334);assert.equal(m.candidate,'e40bdbf3c66a909b09c8bffb144641b4730ac670');assert.equal(m.application,'52eef9404434277559fa3740e3e1ed5b3698ea20');assert.equal(m.baseline,'fdb88f2f23a61730cd84bc8e48e63c11953d7df5');assert.equal(m.historicalAcceptedLinkRules,'c1f02559efae8e318893f7b98250aca9be1dd15f');assert.deepEqual(m.applicationCommits,["52eef9404434277559fa3740e3e1ed5b3698ea20"]);assert.deepEqual(m.harnessCommits,["8dedc38bff04bbae3855ccb4a16af22fa4eb1e46","b3b1e3c1b4b90567cd595635094f6601d76c5f78","d4c4452037b7d5b727ff154b43bf818a1f29ba12","e40bdbf3c66a909b09c8bffb144641b4730ac670"]);assert.equal(m.rulesSourceCommit,'eebc21ba74a4954b77e2611780585e98ff97f8f7');assert.equal(m.files.length,156);
const at=(root,p)=>{assert(typeof p==='string'&&!p.includes('\\')&&!p.split('/').includes('..')&&!path.isAbsolute(p));const dest=path.resolve(root,p);assert(dest.startsWith(path.resolve(root)+path.sep));return dest;};
function regularFiles(dir,rel=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());const p=rel+e.name;if(e.isDirectory())return regularFiles(path.join(dir,e.name),p+'/');assert(e.isFile());return[p];});}
assert.deepEqual(regularFiles(payload).sort(),['MANIFEST.json',...m.files.map(f=>f.path)].sort());
function verify(root,f){const b=fs.readFileSync(at(root,f.path));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);assert.equal(blob(b),f.gitBlob);}
for(const f of original.files)verify(source,f);
for(const f of m.files){verify(payload,f);const dest=at(source,f.path);if(f.baseSha256){const base=original.files.find(x=>x.path===f.path);assert(base);assert.equal(base.sha256,f.baseSha256);assert.equal(hash(fs.readFileSync(dest)),f.baseSha256);}else assert(!fs.existsSync(dest));}
for(const f of m.files){const dest=at(source,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(at(payload,f.path),dest);}
const effective=[...original.files.filter(f=>!m.files.some(x=>x.path===f.path)),...m.files];assert.equal(effective.length,470);for(const f of effective)verify(source,f);
fs.mkdirSync(path.join(evidence,'full-app-source'));fs.writeFileSync(path.join(evidence,'full-app-source/MANIFEST.json'),raw);fs.writeFileSync(path.join(evidence,'full-app-source/EFFECTIVE-SOURCE.json'),JSON.stringify({original:m.originalSource,historicalLinkRules:m.historicalAcceptedLinkRules,rulesSourceCommit:m.rulesSourceCommit,applicationCommits:m.applicationCommits,harnessCommits:m.harnessCommits,candidate:m.candidate,verifiedFiles:470},null,2)+'\n');
console.log('Exact full-app selected source verified.');

NODE
printf '%s\n' 'integrated_candidate=e40bdbf3c66a909b09c8bffb144641b4730ac670' 'application_commit=52eef9404434277559fa3740e3e1ed5b3698ea20' 'harness_commit=e40bdbf3c66a909b09c8bffb144641b4730ac670' >> "$E/source.txt"
run os uname -a
run node node --version
run npm npm --version
run java java -version
run prlimit prlimit --version
[[ "$(uname -sm)" == 'Linux x86_64' ]]
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 22 ]]
[[ "$(npm --version | cut -d. -f1)" == 10 ]]
for tool in python3 gcc make nasm strip ld curl gpg tar xz timeout; do command -v "$tool" >/dev/null; done
# All installs are confined to this disposable hosted job. No production index
# or emulator is started. No deploy/AI scripts are invoked.
run npm-client npm ci --legacy-peer-deps --no-audit --no-fund
run npm-functions npm ci --prefix functions --no-audit --no-fund
run npm-browser npm ci --prefix e2e --no-audit --no-fund
run npm-rules npm ci --prefix tests/rules --no-audit --no-fund
run playback-http timeout --signal=TERM --kill-after=5s 60s node tests/film-retention/linux/playback-http.test.cjs "$PWD" "$PWD/tests/film-retention/linux/runtime.cjs" "$E/PLAYBACK-HTTP-RESULT.json"
# Exact current-candidate Linux parser/schema compatibility; not native Windows CT-5.
run compatibility-112 node - "$PWD" "$E" <<'COMPATIBILITY'
const fs=require('node:fs'),p=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [root,evidence]=process.argv.slice(2),selected='src/features/film-analyzer/__tests__/film-int-compat.test.ts',capture=p.join(root,'functions/test/fixtures/film-int-captured'),report=p.join(evidence,'COMPATIBILITY-112-JEST.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const inventory=()=>Object.fromEntries(fs.readdirSync(capture).sort().map(n=>[n,hash(fs.readFileSync(p.join(capture,n)))]));
let before=null,after=null,child=null,data=null,failure=null;
try{
 before=inventory();assert.equal(Object.keys(before).length,9);
 for(const line of fs.readFileSync(p.join(capture,'SHA256SUMS.txt'),'utf8').trim().split('\n')){const match=/^([a-f0-9]{64})  ([a-z0-9-]+\.json)$/.exec(line);assert(match);assert.equal(before[match[2]],match[1]);}
 const env={...process.env,CI:'true',REACT_APP_FILM_PREVIEW:'false',REACT_APP_FILM_RETENTION_PREVIEW:'false'};delete env.FILM_INT_WRITE_CAPTURES;
 const args=['--max-old-space-size=512','node_modules/react-scripts/scripts/test.js','--watchAll=false','--runInBand','--runTestsByPath',selected,'--json','--outputFile',report];
 fs.writeFileSync(p.join(evidence,'COMPATIBILITY-112-COMMAND.json'),JSON.stringify({executable:process.execPath,args,cwd:root,platform:process.platform,node:process.version,CI:env.CI,captureWriteFlagAbsent:!Object.hasOwn(env,'FILM_INT_WRITE_CAPTURES'),reactScripts:require(p.join(root,'node_modules/react-scripts/package.json')).version,zod:require(p.join(root,'functions/node_modules/zod/package.json')).version,deadlineMs:300000},null,2));
 child=cp.spawnSync(process.execPath,args,{cwd:root,env,stdio:'inherit',timeout:300000,killSignal:'SIGKILL'});
 if(fs.existsSync(report))data=JSON.parse(fs.readFileSync(report));
 after=inventory();assert.deepEqual(after,before,'Frozen captures must not mutate');assert.equal(child.error,undefined);assert.equal(child.signal,null);assert.equal(child.status,0);
 assert(data);assert.equal(data.success,true);assert.equal(data.numTotalTestSuites,1);assert.equal(data.numPassedTestSuites,1);assert.equal(data.numFailedTestSuites,0);assert.equal(data.numTotalTests,112);assert.equal(data.numPassedTests,112);assert.equal(data.numFailedTests,0);assert.equal(data.numPendingTests,0);assert.equal(data.numTodoTests,0);assert.equal(data.testResults.length,1);
 assert.equal(p.resolve(data.testResults[0].name),p.resolve(root,selected));assert.equal(data.testResults[0].assertionResults.length,112);assert(data.testResults[0].assertionResults.every(x=>x.status==='passed'));
}catch(error){failure={category:error.code||error.name,message:error.message};}
finally{
 if(before&&!after){try{after=inventory();}catch{}}
 const checks=data?.testResults?.flatMap(s=>s.assertionResults.map(x=>({check:x.fullName,status:x.status==='passed'?'PASS':x.status==='failed'?'FAIL':'UNRUN',rawStatus:x.status})))||[];
 fs.appendFileSync(p.join(evidence,'status.txt'),'CURRENT_LINUX_COMPAT112='+(failure?'FAIL_OR_INCOMPLETE':'PASS')+'; consult COMPATIBILITY-112-RESULT.json\n');
 fs.writeFileSync(p.join(evidence,'COMPATIBILITY-112-RESULT.json'),JSON.stringify({verdict:failure?'FAIL':'PASS',scope:'Current Linux parser/schema only; historical native Windows CT-5 untouched',expected:112,actual:checks.length,checks,before,after,exit:child?.status??null,signal:child?.signal??null,failure},null,2));
 process.exitCode=failure?1:0;
}
COMPATIBILITY

run browsers bash -c 'cd e2e && npx --no-install playwright install --with-deps chromium firefox'
run firebase-version node e2e/node_modules/firebase-tools/lib/bin/firebase.js --version
W="$RUNNER_TEMP/ffwork"
# The accepted binary configuration embeds this exact prefix and prefix-map argv.
[[ "$W" == /home/runner/work/_temp/ffwork ]] || { echo 'Accepted decoder work root unavailable'; exit 2; }
[[ ! -e "$W" ]] || { echo 'Accepted decoder work root already occupied'; exit 2; }
mkdir -m 700 "$W"
: > "$P/decoder-workdir-owned"
printf '%s\n' "$W" > "$E/decoder-work-root.txt"
retain_decoder_provenance() {
  local code=$?
  trap - EXIT
  set +e
  mkdir -p "$E/decoder-provenance"
  local capture=$?
  if [[ "$capture" == 0 && -d "$W/provenance" ]]; then
    cp -a "$W/provenance/." "$E/decoder-provenance/"
    capture=$?
  elif [[ "$capture" == 0 ]]; then
    capture=1
  fi
  printf 'decoder-provenance-retention exit=%s\n' "$capture" >> "$E/exits.txt"
  if [[ "$code" == 0 && "$capture" != 0 ]]; then code=$capture; fi
  exit "$code"
}
trap retain_decoder_provenance EXIT
run toolchain bash -c 'set -euo pipefail; command -v gcc ld nasm make strip; gcc --version; ld --version; nasm -v; make --version; strip --version; printf "ImageOS=%s\nImageVersion=%s\nLANG=%s\nLC_ALL=%s\nTZ=%s\n" "${ImageOS:-unknown}" "${ImageVersion:-unknown}" "${LANG-}" "${LC_ALL-}" "${TZ-}"'
# Scope broader curl error retries to the official read-only source fetches only.
# Existing retry count, delay, per-request deadline, TLS and provenance checks stay intact.
run decoder-source bash -c '
set -euo pipefail
FILM_SOURCE_CURL="$(command -v curl)"
[[ "$FILM_SOURCE_CURL" == /* && -x "$FILM_SOURCE_CURL" ]] || exit 2
export FILM_SOURCE_CURL
curl() { "$FILM_SOURCE_CURL" --retry-all-errors "$@"; }
export -f curl
exec bash tools/ffmpeg/verify-source.sh "$1"
' _ "$W"
run decoder-build bash tools/ffmpeg/build.sh "$W"
run decoder-provenance node tools/ffmpeg/provenance.mjs validate "$W"
export FFMPEG_BIN="$W/out/bin/ffmpeg" FFPROBE_BIN="$W/out/bin/ffprobe"
run runtime-admission node ../runtime-check.cjs "$PWD"
# Reuse run40563783313 calibration /39 runtime checks; no broad accepted-test rerun.
export PINNED=1
printf '%s\n' 'BASE_QUALIFICATION=40563783313:PASS' 'BASE_EVIDENCE_SHA256=ad7a07827de80d58342a64ae5d988ff5539a47a420b2ccf8c868e2b8b4f923bc' >> "$E/status.txt"
export FILM_RETENTION_ENABLED=true FILM_DURABLE_MOCK=true FILM_FRAME_MOCK=true
run conditional-tooling node tests/film-retention/linux/prepare-emulator.cjs "$PWD" "$P"
export FILM_RETENTION_TOOLING_ROOT="$P/conditional-tooling/film-retention-emulator-15.33.0-r4"
cp "$FILM_RETENTION_TOOLING_ROOT/FILM-CONDITIONAL-MANIFEST.json" "$E/"
run retention-client-build bash -c 'set +e; timeout --signal=TERM --kill-after=5s 300s node --max-old-space-size=1024 tests/film-retention/linux/build.cjs "$1/retention-web"; code=$?; for f in "$1/BUILD-CONFIG.json" "$1/ASSETS.json"; do if [[ -f "$f" ]]; then cp "$f" "$2/" || { if [[ "$code" == 0 ]]; then code=1; fi; }; fi; done; exit "$code"' _ "$P" "$E"
cp -a "$P/retention-web" "$E/retention-web"
cp "$P/ASSETS.json" "$P/BUILD-CONFIG.json" "$E/"
run retention-full-qualification node tests/film-retention/linux/execute.cjs "$E"
printf '%s\n' 'SETUP=PASS' 'RETENTION_18_BUILDER=PASS: synthetic only; independent runtime review pending' >> "$E/status.txt"
