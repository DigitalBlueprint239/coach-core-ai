// FILM-S2a provenance writer + validator (replaces shell heredocs).
//
//   node provenance.mjs write-source <work> <fields.json>   source.json from a JSON object
//   node provenance.mjs write-build  <work>                 build.json (toolchain from TC_* env)
//   node provenance.mjs validate     <work>                 parse + assert; exit 1 on any defect
//
// Every JSON file is produced with JSON.stringify (never by string
// substitution), then re-read and validated before CI may succeed or upload.
// Background: at c45319d build.sh wrote "configureFlags": , because
// `node -e ... "${FLAGS[@]}"` lacked `--` and node consumed the configure
// flags as its own options (exit 9) inside a heredoc that could not fail.
import {createHash} from "node:crypto";
import {existsSync, readFileSync, statSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SOURCE = JSON.parse(readFileSync(join(HERE, "SOURCE.json"), "utf8"));
const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const HEX64 = /^[0-9a-f]{64}$/;
const FPR = /^[0-9A-F]{40}$/;

/** @return {string[]} configure flags, one per non-comment line */
export function configureFlags() {
  return readFileSync(join(HERE, "configure.flags"), "utf8").split("\n")
      .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

/**
 * IJG (libjpeg-derived) files compiled into this configuration, from config.mak.
 * libavcodec/Makefile @ n9.0.2: CONFIG_FDCTDSP -> jfdctfst.o jfdctint.o;
 * CONFIG_IDCTDSP -> jrevdct.o (LICENSE.md "other licensing terms").
 * @param {string} configMak
 * @return {{idctdsp: boolean, fdctdsp: boolean, files: string[]}}
 */
export function ijgFiles(configMak) {
  const on = (name) => new RegExp(`^${name}=yes$`, "m").test(configMak);
  const idctdsp = on("CONFIG_IDCTDSP"); const fdctdsp = on("CONFIG_FDCTDSP");
  const files = [];
  if (fdctdsp) files.push("libavcodec/jfdctfst.c", "libavcodec/jfdctint_template.c");
  if (idctdsp) files.push("libavcodec/jrevdct.c");
  return {idctdsp, fdctdsp, files};
}

function writeSource(work, fieldsPath) {
  const f = JSON.parse(readFileSync(fieldsPath, "utf8"));
  writeFileSync(join(work, "provenance", "source.json"), JSON.stringify(f, null, 2) + "\n");
}

function writeBuild(work) {
  const prov = join(work, "provenance"); const bin = join(work, "out", "bin");
  const configMak = readFileSync(join(prov, "config.mak"), "utf8");
  const binaries = {};
  for (const n of ["ffmpeg", "ffprobe"]) {
    binaries[n] = {sha256: sha256(join(bin, n)), bytes: statSync(join(bin, n)).size};
  }
  const env = process.env;
  const need = (k) => { if (!env[k]) throw new Error(`missing ${k}`); return env[k]; };
  const build = {
    version: SOURCE.version,
    sourceDateEpoch: Number(need("SOURCE_DATE_EPOCH")),
    configureFlags: configureFlags(),
    extraCflags: need("TC_EXTRA_CFLAGS"),
    licenceGuards: {
      CONFIG_GPL: /^CONFIG_GPL=yes$/m.test(configMak),
      CONFIG_VERSION3: /^CONFIG_VERSION3=yes$/m.test(configMak),
      CONFIG_NONFREE: /^CONFIG_NONFREE=yes$/m.test(configMak),
    },
    ijg: ijgFiles(configMak),
    toolchain: {
      gcc: need("TC_GCC"), make: need("TC_MAKE"), nasm: need("TC_NASM"), binutils: need("TC_BINUTILS"),
      os: need("TC_OS"), kernel: need("TC_KERNEL"), runnerImage: need("TC_RUNNER_IMAGE"),
    },
    binaries,
    builtAt: new Date().toISOString(),
  };
  writeFileSync(join(prov, "build.json"), JSON.stringify(build, null, 2) + "\n");
}

/**
 * Validate a build's provenance. Returns a list of defects (empty = valid).
 * @param {string} work
 * @return {{defects: string[], summary: object}}
 */
export function validate(work) {
  const prov = join(work, "provenance"); const bin = join(work, "out", "bin");
  const defects = []; const bad = (m) => defects.push(m);
  const readJson = (name) => {
    const p = join(prov, name);
    if (!existsSync(p)) { bad(`${name}: missing`); return null; }
    try { return JSON.parse(readFileSync(p, "utf8")); } catch (e) { bad(`${name}: invalid JSON (${e.message})`); return null; }
  };
  const source = readJson("source.json"); const build = readJson("build.json");
  if (source) {
    if (source.version !== SOURCE.version) bad(`source.version ${source.version}`);
    if (source.signatureValid !== true) bad("source.signatureValid !== true");
    if (!FPR.test(source.signingKeyPrimaryFingerprint || "")) bad("source.signingKeyPrimaryFingerprint malformed");
    if (source.signingKeyPrimaryFingerprint !== SOURCE.signingKey.pinnedFingerprint) bad("signing key != pinned fingerprint");
    if (!HEX64.test(source.tarballSha256 || "")) bad("source.tarballSha256 malformed");
    if (source.tarballSha256 !== SOURCE.tarballSha256) bad("tarball sha256 != pinned");
    if (!(Number.isInteger(source.tarballBytes) && source.tarballBytes > 0)) bad("source.tarballBytes");
  }
  if (build) {
    if (build.version !== SOURCE.version) bad(`build.version ${build.version}`);
    if (build.sourceDateEpoch !== SOURCE.sourceDateEpoch) bad(`build.sourceDateEpoch ${build.sourceDateEpoch} != SOURCE.json ${SOURCE.sourceDateEpoch}`);
    const flags = configureFlags();
    if (!Array.isArray(build.configureFlags) || JSON.stringify(build.configureFlags) !== JSON.stringify(flags)) {
      bad(`build.configureFlags (${JSON.stringify(build.configureFlags)}) != configure.flags (${flags.length} flags)`);
    }
    for (const [k, v] of Object.entries(build.licenceGuards || {})) if (v !== false) bad(`licence guard ${k} is ${v}`);
    if (!build.licenceGuards) bad("build.licenceGuards missing");
    for (const k of ["gcc", "make", "nasm", "binutils", "os", "kernel", "runnerImage"]) {
      if (!build.toolchain || typeof build.toolchain[k] !== "string" || !build.toolchain[k]) bad(`build.toolchain.${k} missing`);
    }
    // IJG files actually compiled must be named in the licence inventory.
    const inv = readFileSync(join(REPO, "docs", "film", "DECODER_LICENCE_INVENTORY.md"), "utf8");
    for (const f of (build.ijg && build.ijg.files) || []) if (!inv.includes(f)) bad(`IJG file compiled but not in licence inventory: ${f}`);
    if (!build.ijg) bad("build.ijg missing");
    const sums = existsSync(join(prov, "BINARY_SHA256SUMS.txt")) ?
      Object.fromEntries(readFileSync(join(prov, "BINARY_SHA256SUMS.txt"), "utf8").trim().split("\n").map((l) => l.trim().split(/\s+/).reverse())) : {};
    for (const n of ["ffmpeg", "ffprobe"]) {
      const p = join(bin, n);
      if (!existsSync(p)) { bad(`out/bin/${n} missing`); continue; }
      const h = sha256(p);
      if (!build.binaries || !build.binaries[n] || build.binaries[n].sha256 !== h) bad(`build.binaries.${n}.sha256 != file`);
      if (sums[n] !== h) bad(`BINARY_SHA256SUMS ${n} != file`);
      const pin = SOURCE.expectedBinarySha256 && SOURCE.expectedBinarySha256[n];
      if (pin && h !== pin) bad(`${n} sha256 ${h} != SOURCE.json expectedBinarySha256 (review event: toolchain or recipe drift)`);
    }
  }
  const summary = build ? {
    ffmpeg: build.binaries && build.binaries.ffmpeg && build.binaries.ffmpeg.sha256,
    ffprobe: build.binaries && build.binaries.ffprobe && build.binaries.ffprobe.sha256,
    flags: Array.isArray(build.configureFlags) ? build.configureFlags.length : null,
    sourceDateEpoch: build.sourceDateEpoch, ijg: build.ijg && build.ijg.files,
    runnerImage: build.toolchain && build.toolchain.runnerImage, os: build.toolchain && build.toolchain.os,
  } : {};
  return {defects, summary};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, work, extra] = process.argv.slice(2);
  if (cmd === "write-source") writeSource(work, extra);
  else if (cmd === "write-build") writeBuild(work);
  else if (cmd === "validate") {
    const {defects, summary} = validate(work);
    if (defects.length) {
      for (const d of defects) console.log(`::error title=Provenance invalid::${d}`);
      process.exit(1);
    }
    console.log(`::notice title=Provenance valid (${process.env.GITHUB_SHA || "local"})::${JSON.stringify(summary)}`);
  } else {
    console.error("usage: provenance.mjs write-source|write-build|validate <work> [fields.json]");
    process.exit(2);
  }
}
