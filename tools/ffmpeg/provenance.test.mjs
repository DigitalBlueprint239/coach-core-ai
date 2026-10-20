// FILM-S2a provenance writer/validator tests (no decoder, no network).
//   node --test tools/ffmpeg/provenance.test.mjs
import {describe, it, beforeEach} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {configureFlags, ijgFiles, validate} from "./provenance.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = JSON.parse(readFileSync(join(HERE, "SOURCE.json"), "utf8"));
const CLI = join(HERE, "provenance.mjs");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const ENV = {
  ...process.env, SOURCE_DATE_EPOCH: String(SOURCE.sourceDateEpoch), TC_EXTRA_CFLAGS: "-O2",
  TC_GCC: "gcc (test) 13.3.0", TC_MAKE: "GNU Make 4.3", TC_NASM: "NASM 2.16.01", TC_BINUTILS: "GNU ld 2.42",
  TC_OS: "Ubuntu 24.04.5 LTS", TC_KERNEL: "Linux 6 x86_64", TC_RUNNER_IMAGE: "ubuntu24/test",
};

let work;
/** A synthetic build directory with dummy binaries (not FFmpeg). */
function fakeBuild(configMak = "CONFIG_GPL=no\nCONFIG_NONFREE=no\nCONFIG_VERSION3=no\nCONFIG_FDCTDSP=yes\nCONFIG_IDCTDSP=yes\n") {
  work = mkdtempSync(join(tmpdir(), "prov-"));
  mkdirSync(join(work, "out", "bin"), {recursive: true}); mkdirSync(join(work, "provenance"));
  const bins = {ffmpeg: Buffer.from("fake ffmpeg"), ffprobe: Buffer.from("fake ffprobe")};
  for (const [n, b] of Object.entries(bins)) writeFileSync(join(work, "out", "bin", n), b);
  writeFileSync(join(work, "provenance", "BINARY_SHA256SUMS.txt"),
      Object.entries(bins).map(([n, b]) => `${sha(b)}  ${n}`).join("\n") + "\n");
  writeFileSync(join(work, "provenance", "config.mak"), configMak);
  writeFileSync(join(work, "provenance", "source.json"), JSON.stringify({
    version: SOURCE.version, tarballSha256: SOURCE.tarballSha256, tarballBytes: 1234, signatureValid: true,
    signingKeyPrimaryFingerprint: SOURCE.signingKey.pinnedFingerprint,
  }));
  const r = spawnSync(process.execPath, [CLI, "write-build", work], {env: ENV, encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
}
const defects = () => validate(work).defects;
/** Dummy binaries never match the pinned FFmpeg digests: that is the only expected defect. */
const onlyPinMismatch = (ds) => ds.every((d) => /expectedBinarySha256/.test(d));

describe("provenance writer/validator", () => {
  beforeEach(() => fakeBuild());

  it("writes valid JSON with the full configure flag array (regression: c45319d wrote \"configureFlags\": ,)", () => {
    const b = JSON.parse(readFileSync(join(work, "provenance", "build.json"), "utf8"));
    assert.deepEqual(b.configureFlags, configureFlags());
    assert.ok(b.configureFlags.includes("--disable-everything"));
    assert.equal(b.sourceDateEpoch, SOURCE.sourceDateEpoch);
    assert.deepEqual(b.ijg.files, ["libavcodec/jfdctfst.c", "libavcodec/jfdctint_template.c", "libavcodec/jrevdct.c"]);
  });
  it("accepts a consistent record except for the (expected) pinned-digest mismatch of dummy binaries", () => {
    const ds = defects();
    assert.equal(ds.length, 2, ds.join("; "));
    assert.ok(onlyPinMismatch(ds), ds.join("; "));
  });
  it("rejects the exact malformed build.json shape retained at c45319d", () => {
    const p = join(work, "provenance", "build.json");
    writeFileSync(p, readFileSync(p, "utf8").replace(/"configureFlags": \[[^\]]*\]/s, "\"configureFlags\": "));
    assert.ok(defects().some((d) => /build\.json: invalid JSON/.test(d)));
  });
  it("rejects a flag list that differs from configure.flags", () => {
    const p = join(work, "provenance", "build.json"); const b = JSON.parse(readFileSync(p, "utf8"));
    b.configureFlags = b.configureFlags.slice(1); writeFileSync(p, JSON.stringify(b));
    assert.ok(defects().some((d) => /configureFlags/.test(d)));
  });
  it("rejects a download-time SOURCE_DATE_EPOCH", () => {
    const p = join(work, "provenance", "build.json"); const b = JSON.parse(readFileSync(p, "utf8"));
    b.sourceDateEpoch = 1792441111; writeFileSync(p, JSON.stringify(b));
    assert.ok(defects().some((d) => /sourceDateEpoch/.test(d)));
  });
  it("rejects GPL/VERSION3/NONFREE in config.mak", () => {
    fakeBuild("CONFIG_GPL=yes\nCONFIG_FDCTDSP=yes\n");
    assert.ok(defects().some((d) => /licence guard CONFIG_GPL/.test(d)));
  });
  it("rejects a binary that no longer matches its recorded digest", () => {
    writeFileSync(join(work, "out", "bin", "ffmpeg"), "tampered");
    const ds = defects();
    assert.ok(ds.some((d) => /build\.binaries\.ffmpeg\.sha256 != file/.test(d)));
    assert.ok(ds.some((d) => /BINARY_SHA256SUMS ffmpeg != file/.test(d)));
  });
  it("rejects a source record whose key or tarball differs from the pins", () => {
    const p = join(work, "provenance", "source.json"); const s = JSON.parse(readFileSync(p, "utf8"));
    s.signingKeyPrimaryFingerprint = "0".repeat(40); s.tarballSha256 = "0".repeat(64); writeFileSync(p, JSON.stringify(s));
    const ds = defects();
    assert.ok(ds.some((d) => /signing key != pinned/.test(d)));
    assert.ok(ds.some((d) => /tarball sha256 != pinned/.test(d)));
  });
  it("CLI validate exits 1 and emits ::error annotations on defects", () => {
    const r = spawnSync(process.execPath, [CLI, "validate", work], {encoding: "utf8"});
    assert.equal(r.status, 1);
    assert.match(r.stdout, /::error title=Provenance invalid::/);
  });
});

describe("IJG files from config.mak", () => {
  it("maps FDCTDSP/IDCTDSP to the libjpeg-derived files named in LICENSE.md", () => {
    assert.deepEqual(ijgFiles("CONFIG_FDCTDSP=yes\nCONFIG_IDCTDSP=no\n").files, ["libavcodec/jfdctfst.c", "libavcodec/jfdctint_template.c"]);
    assert.deepEqual(ijgFiles("CONFIG_IDCTDSP=yes\n").files, ["libavcodec/jrevdct.c"]);
    assert.deepEqual(ijgFiles("").files, []);
  });
  it("every IJG file the validator can require is named in the licence inventory", () => {
    const inv = readFileSync(join(HERE, "..", "..", "docs", "film", "DECODER_LICENCE_INVENTORY.md"), "utf8");
    for (const f of ijgFiles("CONFIG_FDCTDSP=yes\nCONFIG_IDCTDSP=yes\n").files) assert.ok(inv.includes(f), f);
  });
});
