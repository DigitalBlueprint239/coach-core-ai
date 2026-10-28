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
run full-app-overlay node - "$PWD" "$P/full-app-overlay" "$E" <<'NODE'
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const [source,payload,evidence]=process.argv.slice(2),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),blob=b=>crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
const raw=fs.readFileSync(path.join(payload,'MANIFEST.json'));assert.equal(hash(raw),'eee6579fc0f25263d602693943444212e883a843c183f8af963c661bc539a576');
const m=JSON.parse(raw),original=JSON.parse(fs.readFileSync(path.join(source,'../SOURCE-MANIFEST.json')));
assert.equal(m.originalSource,'c8526787ad5b465fc941b2e575e01d4f4ac2af4b');assert.equal(original.commit,m.originalSource);assert.equal(original.files.length,334);assert.equal(m.candidate,'e29416076bfd44b1d863fb29e8071ef4822ab167');assert.equal(m.application,'ced12df168cbe35ed5eb5e92efbaf8f2e0dab937');assert.equal(m.baseline,'7eb226b096d60a489e34ddeb7d35a96d5f4ebf18');assert.equal(m.acceptedRules,'c1f02559efae8e318893f7b98250aca9be1dd15f');assert.deepEqual(m.applicationCommits,["ced12df168cbe35ed5eb5e92efbaf8f2e0dab937"]);assert.deepEqual(m.harnessCommits,["e29416076bfd44b1d863fb29e8071ef4822ab167"]);assert.equal(m.files.length,38);
const at=(root,p)=>{assert(typeof p==='string'&&!p.includes('\\')&&!p.split('/').includes('..')&&!path.isAbsolute(p));const dest=path.resolve(root,p);assert(dest.startsWith(path.resolve(root)+path.sep));return dest;};
function regularFiles(dir,rel=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());const p=rel+e.name;if(e.isDirectory())return regularFiles(path.join(dir,e.name),p+'/');assert(e.isFile());return[p];});}
assert.deepEqual(regularFiles(payload).sort(),['MANIFEST.json',...m.files.map(f=>f.path)].sort());
function verify(root,f){const b=fs.readFileSync(at(root,f.path));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);assert.equal(blob(b),f.gitBlob);}
for(const f of original.files)verify(source,f);
for(const f of m.files){verify(payload,f);const dest=at(source,f.path);if(f.baseSha256){const base=original.files.find(x=>x.path===f.path);assert(base);assert.equal(base.sha256,f.baseSha256);assert.equal(hash(fs.readFileSync(dest)),f.baseSha256);}else assert(!fs.existsSync(dest));}
for(const f of m.files){const dest=at(source,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(at(payload,f.path),dest);}
const effective=[...original.files.filter(f=>!m.files.some(x=>x.path===f.path)),...m.files];assert.equal(effective.length,366);for(const f of effective)verify(source,f);
fs.mkdirSync(path.join(evidence,'full-app-source'));fs.writeFileSync(path.join(evidence,'full-app-source/MANIFEST.json'),raw);fs.writeFileSync(path.join(evidence,'full-app-source/EFFECTIVE-SOURCE.json'),JSON.stringify({original:m.originalSource,rules:m.acceptedRules,applicationCommits:m.applicationCommits,harnessCommits:m.harnessCommits,candidate:m.candidate,verifiedFiles:366},null,2)+'\n');
console.log('Exact full-app selected source verified.');

NODE
printf '%s\n' 'integrated_candidate=e29416076bfd44b1d863fb29e8071ef4822ab167' 'application_commit=ced12df168cbe35ed5eb5e92efbaf8f2e0dab937' 'harness_commit=e29416076bfd44b1d863fb29e8071ef4822ab167' >> "$E/source.txt"
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
export FILM_FRAME_STRESS=true FILM_FRAME_MOCK=true REACT_APP_FILM_FRAME_MOCK=true
export REACT_APP_FILM_PREVIEW=true REACT_APP_USE_FIREBASE_EMULATORS=true REACT_APP_ENABLE_LEGACY_IMPORT=false
export REACT_APP_FIREBASE_EMULATOR_HOST=127.0.0.33 REACT_APP_FIREBASE_PROJECT_ID=demo-coach-core-full-app
export REACT_APP_FIREBASE_API_KEY=demo-full-app-web-key REACT_APP_FIREBASE_AUTH_DOMAIN=demo-coach-core-full-app.firebaseapp.com
export REACT_APP_FIREBASE_STORAGE_BUCKET=demo-coach-core-full-app.appspot.com REACT_APP_FIREBASE_APP_ID=1:000000000000:web:fullapp
export REACT_APP_FIREBASE_MESSAGING_SENDER_ID=0 REACT_APP_FIREBASE_MEASUREMENT_ID=''
export GENERATE_SOURCEMAP=false BUILD_PATH="$P/full-app-web" CI=false
run client-env node scripts/security/check-client-env.js
run full-app-build node node_modules/react-scripts/scripts/build.js
mkdir "$P/full-app-web/film-preview"
cp src/features/film-analyzer/review/samples/out-route.{mp4,webm} "$P/full-app-web/film-preview/"
# Retain the exact served full app privately, before browser readiness assertions.
cp -a "$P/full-app-web" "$E/full-app-web"
export GCLOUD_PROJECT=demo-coach-core-full-app FIREBASE_AUTH_EMULATOR_HOST=127.0.0.33:9099
export FIRESTORE_EMULATOR_HOST=127.0.0.33:8080 STORAGE_EMULATOR_HOST=http://127.0.0.33:9199
export CI=true FIREBASE_CLI_DISABLE_UPDATE_CHECK=true
node - "$P/firebase.full-app.json" "$PWD" <<'NODE'
const fs=require('fs'),path=require('path');const [config,root]=process.argv.slice(2);
fs.writeFileSync(config,JSON.stringify({firestore:{rules:path.join(root,'firestore.rules'),indexes:path.join(root,'firestore.indexes.json')},storage:{rules:path.join(root,'storage.rules')},emulators:{auth:{host:'127.0.0.33',port:9099},firestore:{host:'127.0.0.33',port:8080},storage:{host:'127.0.0.33',port:9199},hub:{host:'127.0.0.33',port:4400},logging:{host:'127.0.0.33',port:4500},ui:{enabled:false},singleProjectMode:true}},null,2));
NODE
run loopback-unused node - <<'NODE'
const net=require('net');(async()=>{for(const port of [9099,8080,9199,4400,4500,3000,5001,5002])await new Promise((r,j)=>{const s=net.createServer();s.once('error',j);s.listen(port,'127.0.0.33',()=>s.close(r));});})().catch(()=>{console.error('Fresh isolated port unavailable');process.exitCode=1;});
NODE
run full-app-emulators node e2e/node_modules/firebase-tools/lib/bin/firebase.js emulators:exec --project demo-coach-core-full-app --config "$P/firebase.full-app.json" --only auth,firestore,storage "node tests/film-frame/stress.cjs $PWD $P/full-app-web $E/full-app"
printf '%s\n' 'SETUP=PASS' 'SELECTED_FRAME_STRESS=PASS: synthetic emulator composition only; independent review pending' >> "$E/status.txt"
