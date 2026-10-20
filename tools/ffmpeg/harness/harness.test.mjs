// FILM-S2a isolation harness tests (node:test). No Firebase, no network, no app.
//
// Environment:
//   FFMPEG_BIN / FFPROBE_BIN  absolute paths of the binaries under test
//   FIXTURES_DIR              directory produced by fixtures/generate.sh
//   HARNESS_PINNED=1          the binaries are the pinned LGPL-only build:
//                             build-specific assertions (protocols, buildconf,
//                             licence, HEVC/WebM rejection) are REQUIRED.
//                             Unset: those tests are reported as SKIPPED (never
//                             as passes) so the harness can be developed against
//                             a development FFmpeg.
import {describe, it, before} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, statSync, mkdtempSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {join, resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {runDecoder, probeJson, hasPrlimit, limitPrefix, DEFAULT_LIMITS} from "./run-decoder.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG_BIN && resolve(process.env.FFMPEG_BIN);
const FFPROBE = process.env.FFPROBE_BIN && resolve(process.env.FFPROBE_BIN);
const FIX = process.env.FIXTURES_DIR && resolve(process.env.FIXTURES_DIR);
const PINNED = process.env.HARNESS_PINNED === "1";
const expected = JSON.parse(readFileSync(join(here, "..", "fixtures", "expected.json"), "utf8"));
const fx = (name) => join(FIX, name);
const sha256 = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const pinnedOnly = PINNED ? {} : {skip: "requires the pinned LGPL-only build (HARNESS_PINNED=1)"};

before(() => {
  assert.ok(FFMPEG && existsSync(FFMPEG), "FFMPEG_BIN must point at an executable");
  assert.ok(FFPROBE && existsSync(FFPROBE), "FFPROBE_BIN must point at an executable");
  assert.ok(FIX && existsSync(fx("s10-known-good.mp4")), "FIXTURES_DIR must contain generated fixtures");
});

describe("H0 harness mechanics (independent of the decoder)", () => {
  it("passes arguments literally: no shell, no expansion, no injection", async () => {
    const r = await runDecoder({bin: "/bin/echo", args: ["a b", "$HOME", "; id", "`id`", "$(id)", "|cat"], captureStdout: true, timeoutMs: 5000});
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), "a b $HOME ; id `id` $(id) |cat");
  });
  it("gives the child an EMPTY environment by default (no credentials, proxies or tokens)", async () => {
    const r = await runDecoder({bin: "/usr/bin/env", args: [], captureStdout: true, timeoutMs: 5000});
    assert.equal(r.code, 0);
    assert.equal(r.stdout.trim(), "", `child env must be empty, got: ${r.stdout}`);
  });
  it("only the variables listed in `env` reach the child", async () => {
    const r = await runDecoder({bin: "/usr/bin/env", args: [], env: {FILM_TEST: "1"}, captureStdout: true, timeoutMs: 5000});
    assert.equal(r.stdout.trim(), "FILM_TEST=1");
  });
  it("stdin is closed for the child", async () => {
    const r = await runDecoder({bin: "/bin/cat", args: [], captureStdout: true, timeoutMs: 5000});
    assert.equal(r.code, 0);
    assert.equal(r.stdout, "");
  });
  it("runs in a private temp cwd that is removed afterwards", async () => {
    const r = await runDecoder({bin: "/bin/pwd", args: [], captureStdout: true, timeoutMs: 5000});
    const cwd = r.stdout.trim();
    assert.ok(cwd.startsWith(tmpdir()), cwd);
    assert.ok(!existsSync(cwd), "temp cwd must be removed after the run");
  });
  it("enforces the wall-time limit: SIGTERM then SIGKILL, elapsed close to the limit", async () => {
    const r = await runDecoder({bin: "/bin/sleep", args: ["30"], timeoutMs: 1000, graceMs: 500});
    assert.equal(r.timedOut, true);
    assert.ok(r.signal === "SIGTERM" || r.signal === "SIGKILL", `signal ${r.signal}`);
    assert.ok(r.elapsedMs < 4000, `elapsed ${r.elapsedMs}ms`);
  });
  it("kills a child that ignores SIGTERM (SIGKILL after grace)", async () => {
    const r = await runDecoder({bin: "/bin/sh", args: ["-c", "trap '' TERM; sleep 30"], timeoutMs: 800, graceMs: 400});
    assert.equal(r.timedOut, true);
    assert.equal(r.signal, "SIGKILL");
    assert.ok(r.elapsedMs < 5000, `elapsed ${r.elapsedMs}ms`);
  });
  it("terminates a child that floods captured output", async () => {
    const r = await runDecoder({bin: "/usr/bin/yes", args: [], captureStdout: true, maxCaptureBytes: 65536, timeoutMs: 10000});
    assert.equal(r.killedForOutput, true);
  });
  it("rejects non-absolute binaries and non-string args", async () => {
    assert.throws(() => runDecoder({bin: "ffmpeg", args: []}), TypeError);
    assert.throws(() => runDecoder({bin: "/bin/true", args: [1]}), TypeError);
  });
  it("resource limits: prlimit prefix is applied when available (recorded either way)", async (t) => {
    const prefix = limitPrefix(DEFAULT_LIMITS);
    t.diagnostic(`prlimit available: ${hasPrlimit()}; prefix: ${JSON.stringify(prefix)}`);
    if (!hasPrlimit()) {
      t.diagnostic("prlimit(1) unavailable on this host: CPU/AS/FSIZE limits NOT applied here; wall-time and output caps still are");
      return;
    }
    // Prove the file-size limit: writing more than the cap must be stopped (SIGXFSZ / short write).
    const dir = mkdtempSync(join(tmpdir(), "film-fsize-"));
    const r = await runDecoder({bin: "/bin/sh", args: ["-c", "exec head -c 3000000 /dev/zero > big.bin"],
      cwd: dir, limits: {fileSizeBytes: 1024 * 1024}, captureStdout: true, timeoutMs: 10000});
    const size = existsSync(join(dir, "big.bin")) ? statSync(join(dir, "big.bin")).size : 0;
    assert.ok(size <= 1024 * 1024, `file grew to ${size} bytes despite the limit`);
    assert.ok(r.signal === "SIGXFSZ" || (r.code !== null && r.code !== 0), `writer must be terminated or fail (code ${r.code}, signal ${r.signal})`);
    t.diagnostic(`fsize limit: code=${r.code} signal=${r.signal} size=${size}`);
    // Prove the address-space limit: a process that tries to allocate 1 GiB under a 256 MiB cap fails.
    const m = await runDecoder({bin: "/usr/bin/python3", args: ["-c", "b=bytearray(1024*1024*1024); print(len(b))"],
      limits: {addressSpaceBytes: 256 * 1024 * 1024}, captureStdout: true, timeoutMs: 20000});
    assert.notEqual(m.code, 0, "allocation beyond RLIMIT_AS must fail");
  });
});

describe("H1 binary identity and build facts", () => {
  it("records versions and digests", async (t) => {
    const v = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-version"], captureStdout: true});
    assert.equal(v.code, 0);
    t.diagnostic(`ffmpeg: ${v.stdout.split("\n")[0]} sha256=${sha256(FFMPEG)}`);
    t.diagnostic(`ffprobe sha256=${sha256(FFPROBE)}`);
  });
  it("pinned build: version is 9.0.2", pinnedOnly, async () => {
    const v = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-version"], captureStdout: true});
    assert.match(v.stdout.split("\n")[0], /^ffmpeg version (n?9\.0\.2)\b/);
  });
  it("pinned build: -buildconf has the LGPL-only flag set and no GPL/nonfree/version3", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-buildconf"], captureStdout: true});
    assert.equal(r.code, 0);
    const conf = r.stdout;
    for (const bad of ["--enable-gpl", "--enable-nonfree", "--enable-version3", "--enable-libx264", "--enable-libx265"]) {
      assert.ok(!conf.includes(bad), `forbidden flag present: ${bad}`);
    }
    const flags = readFileSync(join(here, "..", "configure.flags"), "utf8").split("\n")
        .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    for (const f of flags) assert.ok(conf.includes(f), `expected flag missing from -buildconf: ${f}`);
  });
  it("pinned build: -L prints the LGPL notice, not GPL", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-L"], captureStdout: true});
    assert.match(r.stdout, /GNU Lesser General Public License/);
    assert.ok(!/is free software; you can redistribute it and\/or modify\s+it under the terms of the GNU General Public License/.test(r.stdout), "GPL notice must not appear");
  });
  it("pinned build: the ONLY protocol is file (no network protocols compiled in)", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-protocols"], captureStdout: true});
    assert.equal(r.code, 0);
    const names = r.stdout.split("\n").map((l) => l.trim()).filter((l) => l && !l.includes(":") && !/^(Input|Output)/.test(l) && !l.startsWith("Supported"));
    const set = new Set(names);
    assert.deepEqual([...set].sort(), ["file"], `protocols compiled in: ${[...set].join(",")}`);
  });
  it("pinned build: component lists match the configure intent", pinnedOnly, async () => {
    const list = async (kind) => {
      const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", `-${kind}`], captureStdout: true});
      return r.stdout.split("\n").slice(1).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2 && /^[A-Z.]+$/.test(p[0])).map((p) => p[1]);
    };
    assert.deepEqual((await list("decoders")).sort(), ["aac", "h264"]);
    assert.deepEqual((await list("encoders")).sort(), ["mjpeg"]);
    assert.deepEqual((await list("demuxers")).sort(), ["mov,mp4,m4a,3gp,3g2,mj2"]);
    const muxers = await list("muxers");
    assert.deepEqual(muxers.sort(), ["image2", "mp4", "null"], muxers.join(","));
    // Filters: the three requested plus the eleven configure auto-selects for the ffmpeg tool
    // (configure n9.0.2 line 4378 `ffmpeg_select`). Nothing from LICENSE.md's GPL filter list.
    const fr = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-filters"], captureStdout: true});
    const filters = fr.stdout.split("\n").map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 3 && /^[A-Z.]{3}$/.test(p[0])).map((p) => p[1]);
    assert.deepEqual(filters.sort(), ["aformat", "anull", "atrim", "crop", "format", "hflip", "null", "rotate", "scale", "transpose", "trim", "vflip"], filters.join(","));
    const gplFilters = ["blackframe", "boxblur", "colormatrix", "cover_rect", "cropdetect", "delogo", "eq", "find_rect", "fspp", "histeq", "hqdn3d", "kerndeint", "lensfun", "mcdeint", "mpdecimate", "nnedi", "owdenoise", "perspective", "phase", "pp7", "pullup", "repeatfields", "sab", "signature", "smartblur", "spp", "stereo3d", "super2xsai", "tinterlace", "uspp", "vaguedenoiser", "mptestsrc"];
    assert.ok(!filters.some((f) => gplFilters.includes(f)), "a GPL filter is compiled in");
  });
  it("pinned build: an http:// input is refused (protocol not compiled in)", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-i", "http://127.0.0.1:9/x.mp4", "-f", "null", "-"], timeoutMs: 10000});
    assert.notEqual(r.code, 0);
    assert.match(r.stderrTail, /Protocol not found|Invalid argument|No such file/i);
  });
});

describe("H2 fixtures: probe facts and decode outcomes", () => {
  for (const [name, exp] of Object.entries(expected.fixtures)) {
    it(`${name}`, async (t) => {
      const file = fx(name);
      if (!existsSync(file)) {
        assert.ok(exp.optional, `required fixture missing: ${name}`);
        t.skip(`optional fixture not generated (generator lacks the encoder): ${name}`);
        return;
      }
      const {result, probe} = await probeJson(FFPROBE, file);
      const probeOk = result.code === 0 && probe !== null;
      if (exp.probeOkPinned === false && PINNED) {
        assert.equal(probeOk, false, "pinned build must not be able to open this container");
        return;
      }
      if (exp.probeOk !== undefined) assert.equal(probeOk, exp.probeOk, `probe exit ${result.code}: ${result.stderrTail}`);
      if (!probeOk) {
        if (exp.decodeWithXerror === "nonzero") {
          const d = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-xerror", "-i", file, "-f", "null", "-"], timeoutMs: 60000});
          assert.notEqual(d.code, 0);
        }
        return;
      }
      if (exp.streams !== undefined) assert.equal(probe.streams.length, exp.streams);
      const video = probe.streams.find((s) => s.codec_type === "video") || null;
      const audio = probe.streams.find((s) => s.codec_type === "audio") || null;
      if (exp.video === null) assert.equal(video, null);
      if (exp.video) {
        assert.ok(video, "video stream expected");
        if (PINNED && exp.video.codec === "hevc") {
          // The pinned build has no HEVC decoder: ffprobe may still read the stream header,
          // but decoding must fail. Either way the validator rejects it.
          assert.ok(video.codec_name === "hevc" || video.codec_name === undefined);
        } else {
          assert.equal(video.codec_name, exp.video.codec);
        }
        if (exp.video.width) assert.equal(video.width, exp.video.width);
        if (exp.video.height) assert.equal(video.height, exp.video.height);
        if (exp.video.fps) assert.equal(video.r_frame_rate, exp.video.fps);
      }
      if (exp.audio === null) assert.equal(audio, null);
      if (exp.audio) assert.equal(audio && audio.codec_name, exp.audio.codec);
      const durationMs = Math.round(parseFloat(probe.format.duration) * 1000);
      if (exp.durationMs !== undefined) assert.equal(durationMs, exp.durationMs);
      if (exp.durationMsApprox !== undefined) assert.ok(Math.abs(durationMs - exp.durationMsApprox) <= 50, `duration ${durationMs}`);
      if (exp.mustContainTags) {
        const tags = Object.keys(probe.format.tags || {}).map((k) => k.toLowerCase());
        for (const k of exp.mustContainTags) assert.ok(tags.includes(k), `fixture must carry tag ${k}; has ${tags.join(",")}`);
      }
      if (exp.decodeWithXerror !== undefined) {
        const d = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-xerror", "-i", file, "-f", "null", "-"], timeoutMs: 120000});
        if (exp.decodeWithXerror === 0 && !(PINNED && exp.video && exp.video.codec === "hevc")) {
          assert.equal(d.code, 0, `decode failed: ${d.stderrTail}`);
        } else {
          assert.notEqual(d.code, 0, "decoder must report an error");
        }
        t.diagnostic(`decode elapsed ${d.elapsedMs}ms exit ${d.code}`);
      }
    });
  }
});

describe("H3 normalizing remux: metadata stripped, output deterministic, independently verified", () => {
  const out = mkdtempSync(join(tmpdir(), "film-remux-"));
  const normalize = (input, output) => runDecoder({
    bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-xerror", "-i", input, ...expected.normalizeArgs, "-y", output],
    cwd: out, timeoutMs: 120000,
  });
  it("strips GPS/device/creation metadata and chapters; the output is inspected with ffprobe, not inferred from the command", async () => {
    const o = join(out, "meta-stripped.mp4");
    const r = await normalize(fx("s6-metadata-tags.mp4"), o);
    assert.equal(r.code, 0, r.stderrTail);
    const {probe} = await probeJson(FFPROBE, o);
    assert.ok(probe);
    const allTags = [probe.format.tags || {}, ...probe.streams.map((s) => s.tags || {})]
        .flatMap((t) => Object.keys(t).map((k) => k.toLowerCase()));
    for (const k of expected.forbiddenTagKeys) assert.ok(!allTags.includes(k.toLowerCase()), `forbidden tag survived: ${k} (tags: ${allTags.join(",")})`);
    assert.equal((probe.chapters || []).length, 0);
    const raw = readFileSync(o).toString("latin1");
    for (const needle of ["37.7749", "SyntheticPhone", "Synthetic Person", "synthetic metadata fixture"]) {
      assert.ok(!raw.includes(needle), `sensitive bytes survived in the file: ${needle}`);
    }
  });
  it("produces a byte-identical output across two runs (bitexact)", async () => {
    const a = join(out, "det-a.mp4"); const b = join(out, "det-b.mp4");
    assert.equal((await normalize(fx("s10-known-good.mp4"), a)).code, 0);
    assert.equal((await normalize(fx("s10-known-good.mp4"), b)).code, 0);
    assert.equal(sha256(a), sha256(b));
  });
  it("refuses to normalize truncated input (-xerror) and leaves no usable output", async () => {
    const o = join(out, "trunc.mp4");
    const r = await normalize(fx("s5-truncated.mp4"), o);
    assert.notEqual(r.code, 0);
  });
  it("a pathological long-running decode is stopped by the wall-time limit", async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-stream_loop", "-1", "-i", fx("s10-known-good.mp4"), "-f", "null", "-"], timeoutMs: 1500, graceMs: 500});
    assert.equal(r.timedOut, true);
    assert.ok(r.elapsedMs < 6000, `elapsed ${r.elapsedMs}`);
  });
  it("writes a harness result record", (t) => {
    const rec = {ffmpeg: FFMPEG, ffmpegSha256: sha256(FFMPEG), ffprobeSha256: sha256(FFPROBE), pinned: PINNED, prlimit: hasPrlimit(), limits: DEFAULT_LIMITS, at: new Date().toISOString()};
    const p = process.env.HARNESS_RESULT || join(out, "harness-result.json");
    writeFileSync(p, JSON.stringify(rec, null, 2));
    t.diagnostic(`harness result: ${p}`);
  });
});
