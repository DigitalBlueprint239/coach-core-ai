#!/usr/bin/env bash
# Prepared CI-only qualification; never a complete-journey acceptance driver.
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
printf '%s\n' 'candidate=c8526787ad5b465fc941b2e575e01d4f4ac2af4b' > "$E/source.txt"
printf '%s\n' 'package_sha256=bd9c0404ab0d9dfd7cbfbb2b5f49d7744c74fa28445cf90bf4cb970deca4a1b7' >> "$E/source.txt"
printf '%s\n' 'COMPONENT_ACCEPTANCE=retained-independent-PASS' 'INTEGRATED_JOURNEY=UNRUN' 'CT5=UNTOUCHED' 'EXCLUDED_112=UNRUN' > "$E/status.txt"
run source-check node ../verify-package.mjs "$PWD"
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
W="$P/decoder"
mkdir -m 700 "$W"
run decoder-source bash tools/ffmpeg/verify-source.sh "$W"
run decoder-build bash tools/ffmpeg/build.sh "$W"
run decoder-provenance node tools/ffmpeg/provenance.mjs validate "$W"
export FFMPEG_BIN="$W/out/bin/ffmpeg" FFPROBE_BIN="$W/out/bin/ffprobe"
run runtime-admission node ../runtime-check.cjs "$PWD"
# This is qualification on THIS new runner. It is not a repeat of Film v1/v2/v3
# component acceptance and does not establish a fresh reservation-to-mark chain.
export PINNED=1 CHECK_COMMITTED=1
run calibration node functions/scripts/film-worker-calibrate.js "$E/calibration.json"
run bounded-runtime node --test --test-concurrency=1 \
 --test-name-pattern='^(pipeline verdicts|output validation facts|external data references|resource limits stop synthetic offenders|measured limits are committed and consistent)( |$)' \
 functions/test/worker-pinned/film-worker-pinned.test.js
# The suite's separate two S1/worker cases use FakeFirestore/FakeObjects.
# They are deliberately UNRUN here; neither can establish this real journey.
# Fresh demo-only emulator setup smoke. No ready film, processed media or mark
# is seeded. This proves startup on this runner, not the integrated journey.
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
node - "$P/emulator-smoke.cjs" <<'NODE'
const fs=require('fs');
fs.writeFileSync(process.argv[2],String.raw`
const assert=require('node:assert/strict');
(async()=>{
 assert.equal(process.env.GCLOUD_PROJECT,'demo-coach-core-film-fresh');
 for(const [variable,expected] of Object.entries({FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.31:9099',FIRESTORE_EMULATOR_HOST:'127.0.0.31:8080',STORAGE_EMULATOR_HOST:'http://127.0.0.31:9199'}))assert.equal(process.env[variable],expected);
 const r=await fetch('http://127.0.0.31:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-only-key',{
 method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'fresh.setup@synthetic.invalid',password:'demo-only-synthetic-setup',returnSecureToken:true})});
 assert.equal(r.status,200);const identity=await r.json();assert(identity.localId);
 // Emulator hub confirms both actual database/storage instances are present.
 const hub=await fetch('http://127.0.0.31:4400/emulators');assert.equal(hub.status,200);
 const services=await hub.json();assert(services.auth&&services.firestore&&services.storage);
 console.log(JSON.stringify({setupSmoke:'PASS',project:process.env.GCLOUD_PROJECT,syntheticAuth:true,filmRecordsCreated:0,processing:'UNRUN',journey:'UNRUN'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
`);
NODE
run loopback-unused node - <<'NODE'
const net=require('net');
(async()=>{
 for(const port of [9099,8080,9199,4400,4500])await new Promise((resolve,reject)=>{
  const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.31',()=>s.close(resolve));
 });
})().catch(e=>{console.error('Required fresh loopback port unavailable');process.exitCode=1;});
NODE
run isolated-emulators node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec \
 --project demo-coach-core-film-fresh --config "$P/firebase.fresh.json" \
 --only auth,firestore,storage "node $P/emulator-smoke.cjs"
printf '%s\n' 'SETUP=PASS' 'BOUNDED_RUNTIME=PASS' 'INTEGRATED_JOURNEY=UNRUN: composition driver absent' >> "$E/status.txt"
printf 'Pinned setup/qualification complete; integrated journey UNRUN.\n'
