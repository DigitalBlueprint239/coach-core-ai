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
const raw=fs.readFileSync(path.join(payload,'MANIFEST.json'));assert.equal(hash(raw),'962531e2ee1802faa7a8fdf2522dfc66cd91f5ff86cf2ab48fad7b4b4ab19c95');
const m=JSON.parse(raw),original=JSON.parse(fs.readFileSync(path.join(source,'../SOURCE-MANIFEST.json')));
assert.equal(m.originalSource,'c8526787ad5b465fc941b2e575e01d4f4ac2af4b');assert.equal(original.commit,m.originalSource);assert.equal(original.files.length,334);assert.equal(m.candidate,'8dedc38bff04bbae3855ccb4a16af22fa4eb1e46');assert.equal(m.application,'52eef9404434277559fa3740e3e1ed5b3698ea20');assert.equal(m.baseline,'fdb88f2f23a61730cd84bc8e48e63c11953d7df5');assert.equal(m.historicalAcceptedLinkRules,'c1f02559efae8e318893f7b98250aca9be1dd15f');assert.deepEqual(m.applicationCommits,["52eef9404434277559fa3740e3e1ed5b3698ea20"]);assert.deepEqual(m.harnessCommits,["8dedc38bff04bbae3855ccb4a16af22fa4eb1e46"]);assert.equal(m.rulesSourceCommit,'52eef9404434277559fa3740e3e1ed5b3698ea20');assert.equal(m.files.length,140);
const at=(root,p)=>{assert(typeof p==='string'&&!p.includes('\\')&&!p.split('/').includes('..')&&!path.isAbsolute(p));const dest=path.resolve(root,p);assert(dest.startsWith(path.resolve(root)+path.sep));return dest;};
function regularFiles(dir,rel=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{assert(!e.isSymbolicLink());const p=rel+e.name;if(e.isDirectory())return regularFiles(path.join(dir,e.name),p+'/');assert(e.isFile());return[p];});}
assert.deepEqual(regularFiles(payload).sort(),['MANIFEST.json',...m.files.map(f=>f.path)].sort());
function verify(root,f){const b=fs.readFileSync(at(root,f.path));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);assert.equal(blob(b),f.gitBlob);}
for(const f of original.files)verify(source,f);
for(const f of m.files){verify(payload,f);const dest=at(source,f.path);if(f.baseSha256){const base=original.files.find(x=>x.path===f.path);assert(base);assert.equal(base.sha256,f.baseSha256);assert.equal(hash(fs.readFileSync(dest)),f.baseSha256);}else assert(!fs.existsSync(dest));}
for(const f of m.files){const dest=at(source,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(at(payload,f.path),dest);}
const effective=[...original.files.filter(f=>!m.files.some(x=>x.path===f.path)),...m.files];assert.equal(effective.length,454);for(const f of effective)verify(source,f);
fs.mkdirSync(path.join(evidence,'full-app-source'));fs.writeFileSync(path.join(evidence,'full-app-source/MANIFEST.json'),raw);fs.writeFileSync(path.join(evidence,'full-app-source/EFFECTIVE-SOURCE.json'),JSON.stringify({original:m.originalSource,historicalLinkRules:m.historicalAcceptedLinkRules,rulesSourceCommit:m.rulesSourceCommit,applicationCommits:m.applicationCommits,harnessCommits:m.harnessCommits,candidate:m.candidate,verifiedFiles:454},null,2)+'\n');
console.log('Exact full-app selected source verified.');

NODE
printf '%s\n' 'integrated_candidate=8dedc38bff04bbae3855ccb4a16af22fa4eb1e46' 'application_commit=52eef9404434277559fa3740e3e1ed5b3698ea20' 'harness_commit=8dedc38bff04bbae3855ccb4a16af22fa4eb1e46' >> "$E/source.txt"
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
export FILM_RETENTION_ENABLED=true FILM_DURABLE_MOCK=true FILM_FRAME_MOCK=true
run conditional-tooling node tests/film-retention/linux/prepare-emulator.cjs "$PWD" "$P"
export FILM_RETENTION_TOOLING_ROOT="$P/conditional-tooling/film-retention-emulator-15.33.0-r4"
cp "$FILM_RETENTION_TOOLING_ROOT/FILM-CONDITIONAL-MANIFEST.json" "$E/"
run retention-client-build bash -c 'set +e; timeout --signal=TERM --kill-after=5s 300s node --max-old-space-size=1024 tests/film-retention/linux/build.cjs "$1/retention-web"; code=$?; for f in "$1/BUILD-CONFIG.json" "$1/ASSETS.json"; do if [[ -f "$f" ]]; then cp "$f" "$2/" || { if [[ "$code" == 0 ]]; then code=1; fi; }; fi; done; exit "$code"' _ "$P" "$E"
cp -a "$P/retention-web" "$E/retention-web"
cp "$P/ASSETS.json" "$P/BUILD-CONFIG.json" "$E/"
run retention-full-qualification node tests/film-retention/linux/execute.cjs "$E"
printf '%s\n' 'SETUP=PASS' 'RETENTION_18_BUILDER=PASS: synthetic only; independent runtime review pending' >> "$E/status.txt"
