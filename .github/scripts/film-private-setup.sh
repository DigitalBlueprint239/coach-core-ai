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
printf '%s\n' 'COMPONENT_ACCEPTANCE=retained-independent-PASS' 'INTEGRATED_JOURNEY=UNRUN' 'CT5=UNTOUCHED' 'EXCLUDED_112=UNRUN' > "$E/status.txt"
run source-check node ../verify-package.mjs "$PWD"
run rules-overlay node - "$PWD" "$P/rules-overlay" "$E" <<'NODE'
// Public transport code only: private bytes and detailed results stay private.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const [source,payload,evidence]=process.argv.slice(2);
const candidate='c1f02559efae8e318893f7b98250aca9be1dd15f',manifestSha='2cabbc18d0fcc50e02bccbafb3593ecae52033fc56875ae1382511dea171d973';
const base='c8526787ad5b465fc941b2e575e01d4f4ac2af4b';
const names={
 'firestore.rules':'firestore.rules',
 'tests/rules/film-link-budget.rules.test.mjs':'film-link-budget.rules.test.mjs',
 'tests/rules/fixtures/film-link-runtime.json':'film-link-runtime.json'
};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const bytes=fs.readFileSync(path.join(payload,'MANIFEST.json'));
assert.equal(hash(bytes),manifestSha,'Frozen overlay manifest');
const m=JSON.parse(bytes),original=JSON.parse(fs.readFileSync(path.join(source,'../SOURCE-MANIFEST.json')));
assert.equal(m.baseApplication,base);assert.equal(original.commit,base);
assert.equal(m.candidate,candidate);assert.equal(m.parent,'b6f3aff70194f7e138612198a15a5c2220502108');
assert.equal(m.files.length,3);assert.equal(original.files.length,334);
assert.deepEqual(m.files.map(f=>f.path).sort(),Object.keys(names).sort());
assert.deepEqual(fs.readdirSync(payload).sort(),['MANIFEST.json',...Object.values(names)].sort());
const fileAt=p=>{
 const target=path.resolve(source,p);assert(target.startsWith(path.resolve(source)+path.sep));return target;
};
// Recheck all original source identities BEFORE changing the disposable replica.
for(const f of original.files){const b=fs.readFileSync(fileAt(f.path));assert.equal(hash(b),f.sha256);assert.equal(blob(b),f.gitBlob);assert.equal(b.length,f.bytes);}
for(const f of m.files){
 assert.equal(f.name,names[f.path]);assert.equal(f.mode,'100644');
 const sourceFile=fileAt(f.path),raw=fs.readFileSync(path.join(payload,f.name));
 assert.equal(raw.length,f.bytes);assert.equal(hash(raw),f.sha256);assert.equal(blob(raw),f.gitBlob);
 if(f.path==='firestore.rules'){
  assert.equal(f.baseSha256,'965655ebf5e10d1ce96c0dbd7b5340eef3111470a1ceb9a4b71fe1ae3bd1eb1e');
  assert.equal(hash(fs.readFileSync(sourceFile)),f.baseSha256);
 }else{assert.equal(f.baseSha256,null);assert(!fs.existsSync(sourceFile),'New test path must be absent');}
}
const out=path.join(evidence,'rules-overlay');fs.mkdirSync(out);
fs.writeFileSync(path.join(out,'MANIFEST.json'),bytes);
for(const f of m.files){
 const dest=fileAt(f.path),raw=fs.readFileSync(path.join(payload,f.name));
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,raw);
 fs.writeFileSync(path.join(out,f.name),raw);
}
// Recheck the effective candidate: every unchanged base file and every overlay.
for(const f of original.files){
 const expected=m.files.find(x=>x.path===f.path)||f,b=fs.readFileSync(fileAt(f.path));
 assert.equal(hash(b),expected.sha256);assert.equal(blob(b),expected.gitBlob);assert.equal(b.length,expected.bytes);
}
for(const f of m.files){const b=fs.readFileSync(fileAt(f.path));assert.equal(hash(b),f.sha256);assert.equal(blob(b),f.gitBlob);}
fs.writeFileSync(path.join(out,'EFFECTIVE-SOURCE.json'),JSON.stringify({baseApplication:base,effectiveCandidate:candidate,baseFilesVerified:334,newFiles:2,selectedSourceFilesVerified:336,clientAndWorkerUnchanged:true,manifestSha256:manifestSha},null,2)+'\n');
console.log('Frozen rules overlay applied; 336 selected source identities verified.');

NODE
echo 'effective_rules_candidate=c1f02559efae8e318893f7b98250aca9be1dd15f' >> "$E/source.txt"
echo 'rules_overlay_sha256=11dd05f85802f905ccb2311eb4c38303c0351a95e5432559c1bbb4549b98191c' >> "$E/source.txt"
run os uname -a
run node node --version
run npm npm --version
run java java -version
run prlimit prlimit --version
[[ "$(uname -sm)" == 'Linux x86_64' ]]
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 22 ]]
[[ "$(npm --version | cut -d. -f1)" == 10 ]]
for tool in python3 gcc make nasm strip ld curl gpg tar xz; do command -v "$tool" >/dev/null; done
# All installs are confined to this disposable hosted job. No production index
# or emulator is started. No deploy/AI scripts are invoked.
run npm-client npm ci --legacy-peer-deps --no-audit --no-fund
run npm-functions npm ci --prefix functions --no-audit --no-fund
run npm-browser npm ci --prefix e2e --no-audit --no-fund
run npm-rules npm ci --prefix tests/rules --no-audit --no-fund
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
run decoder-source bash tools/ffmpeg/verify-source.sh "$W"
run decoder-build bash tools/ffmpeg/build.sh "$W"
run decoder-provenance node tools/ffmpeg/provenance.mjs validate "$W"
export FFMPEG_BIN="$W/out/bin/ffmpeg" FFPROBE_BIN="$W/out/bin/ffprobe"
run runtime-admission node ../runtime-check.cjs "$PWD"
# Reuse run40563783313 calibration /39 runtime checks; no broad accepted-test rerun.
export PINNED=1
printf '%s\n' 'BASE_QUALIFICATION=40563783313:PASS' 'BASE_EVIDENCE_SHA256=ad7a07827de80d58342a64ae5d988ff5539a47a420b2ccf8c868e2b8b4f923bc' >> "$E/status.txt"
run harness-files node - "$P/journey-driver" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto');const root=process.argv[2];
const m=JSON.parse(fs.readFileSync(path.join(root,'MANIFEST.json')));
if(m.application!=='c8526787ad5b465fc941b2e575e01d4f4ac2af4b'||m.commit!=='dc5e616f316b2e2e40a4528b1050d8e3e31b7114'||m.files.length!==8)throw Error('Harness identity');
const names=['README.md','bootstrap-probe.cjs','browser-host.cjs','build.cjs','client.jsx','guard.cjs','guard.test.cjs','run.cjs'];
if(JSON.stringify(m.files.map(f=>f.name).sort())!==JSON.stringify(names))throw Error('Harness file allowlist');
for(const f of m.files){const b=fs.readFileSync(path.join(root,f.name));if(b.length!==f.bytes||crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Harness file digest');}
if(JSON.stringify(fs.readdirSync(root).sort())!==JSON.stringify([...names,'MANIFEST.json'].sort()))throw Error('Unexpected harness file');
NODE
run journey-build node "$P/journey-driver/build.cjs" "$PWD" "$P/journey-web"
# Exact raw browser assets/manifest retained privately before any browser assertion.
run host-assets node - "$P/journey-web" "$E/test-host-build" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto');const [web,out]=process.argv.slice(2);
const identity=JSON.parse(fs.readFileSync(path.join(web,'BUILD-IDENTITY.json')));
fs.mkdirSync(out);
for(const [name,fact] of Object.entries(identity.assets)){
 if(!/^(?:index\.html|[A-Za-z0-9_.-]+\.js)$/.test(name))throw Error('Asset name');
 const bytes=fs.readFileSync(path.join(web,name));if(crypto.createHash('sha256').update(bytes).digest('hex')!==fact.sha256||bytes.length!==fact.bytes)throw Error('Built asset changed');
 fs.writeFileSync(path.join(out,name),bytes);
}
fs.copyFileSync(path.join(web,'BUILD-IDENTITY.json'),path.join(out,'BUILD-IDENTITY.json'));
NODE
export GCLOUD_PROJECT=demo-coach-core-film-fresh
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.31:9099
export FIRESTORE_EMULATOR_HOST=127.0.0.31:8080
export STORAGE_EMULATOR_HOST=http://127.0.0.31:9199
node - "$P/firebase.fresh.json" "$PWD" <<'NODE'
const fs=require('fs'),path=require('path');
const [config,root]=process.argv.slice(2);
fs.writeFileSync(config,JSON.stringify({
 firestore:{rules:path.join(root,'firestore.rules'),indexes:path.join(root,'firestore.indexes.json')},
 storage:{rules:path.join(root,'storage.rules')},
 emulators:{auth:{host:'127.0.0.31',port:9099},firestore:{host:'127.0.0.31',port:8080},
 storage:{host:'127.0.0.31',port:9199},hub:{host:'127.0.0.31',port:4400},
 logging:{host:'127.0.0.31',port:4500},ui:{enabled:false},singleProjectMode:true}
},null,2));
NODE
run loopback-unused node - <<'NODE'
const net=require('net');
(async()=>{
 for(const port of [9099,8080,9199,4400,4500,3000,5002])await new Promise((resolve,reject)=>{
  const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.31',()=>s.close(resolve));
 });
})().catch(e=>{console.error('Required fresh loopback port unavailable');process.exitCode=1;});
NODE
run isolated-emulators node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec \
 --project demo-coach-core-film-fresh --config "$P/firebase.fresh.json" \
 --only auth,firestore,storage "node $P/journey-driver/run.cjs $PWD $E/journey $P/journey-web"
printf '%s\n' 'SETUP=PASS' 'BOUNDED_RUNTIME=PASS' 'INTEGRATED_JOURNEY=PASS: actual synthetic emulator composition; not production acceptance' >> "$E/status.txt"
printf 'Synthetic journey driver completed; detailed verdict retained privately.\n'
