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
printf '%s\n' 'candidate=c8526787ad5b465fc941b2e575e01d4f4ac2af4b' > "$E/source.txt"
printf '%s\n' 'package_sha256=7ae6153d24480a8be6c240f5bd9d90649b5a4434c3de18b03172b321642c3683' >> "$E/source.txt"
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
if(m.application!=='c8526787ad5b465fc941b2e575e01d4f4ac2af4b'||m.commit!=='ded44a54e79c4a4b5eb788fa7c67c423fb3562f0'||m.files.length!==6)throw Error('Harness identity');
const names=['README.md','build.cjs','client.jsx','guard.cjs','guard.test.cjs','run.cjs'];
if(JSON.stringify(m.files.map(f=>f.name).sort())!==JSON.stringify(names))throw Error('Harness file allowlist');
for(const f of m.files){const b=fs.readFileSync(path.join(root,f.name));if(b.length!==f.bytes||crypto.createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('Harness file digest');}
if(JSON.stringify(fs.readdirSync(root).sort())!==JSON.stringify([...names,'MANIFEST.json'].sort()))throw Error('Unexpected harness file');
NODE
run journey-build node "$P/journey-driver/build.cjs" "$PWD" "$P/journey-web"
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
