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
import {runDecoder, probeJson, hasPrlimit, limitPrefix, DEFAULT_LIMITS, setPrlimitAvailableForTest} from "./run-decoder.mjs";
import {checkBoxes} from "./mp4-boxes.mjs";

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
      // Pinned runs are evidence for the retained artifact: limits are REQUIRED there.
      assert.ok(!PINNED, "pinned run requires prlimit(1): resource limits could not be applied");
      t.diagnostic("prlimit(1) unavailable on this host: decoder runs are REFUSED (fail-closed) unless allowNoLimits is passed");
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
  it("fails closed: refuses to run when resource limits cannot be applied", async () => {
    setPrlimitAvailableForTest(false);
    try {
      const r = await runDecoder({bin: "/bin/true", args: []});
      assert.equal(r.spawnError, "limits-unavailable");
      assert.equal(r.code, null);
      assert.equal(r.limitsApplied, null);
      const dev = await runDecoder({bin: "/bin/true", args: [], allowNoLimits: true});
      assert.equal(dev.code, 0);
      assert.equal(dev.unlimitedByRequest, true, "an explicit development opt-out must be recorded");
    } finally {
      setPrlimitAvailableForTest(null);
    }
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
    // configure quotes values with shell-special characters (e.g. --enable-muxer='mp4,image2,null'); compare unquoted.
    const conf = r.stdout.replace(/'/g, "");
    for (const bad of ["--enable-gpl", "--enable-nonfree", "--enable-version3", "--enable-libx264", "--enable-libx265"]) {
      assert.ok(!conf.includes(bad), `forbidden flag present: ${bad}`);
    }
    const flags = readFileSync(join(here, "..", "configure.flags"), "utf8").split("\n")
        .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    for (const f of flags) assert.ok(conf.includes(f), `expected flag missing from -buildconf: ${f}`);
  });
  it("pinned build: -L prints the LGPL notice, not GPL", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-L"], captureStdout: true});
    assert.match(r.stdout.replace(/\s+/g, " "), /GNU Lesser General Public License/);
    assert.ok(!/under the terms of the GNU General Public License/.test(r.stdout.replace(/\s+/g, " ")), "GPL notice must not appear");
  });
  it("pinned build: the ONLY protocol is file (no network protocols compiled in)", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-protocols"], captureStdout: true});
    assert.equal(r.code, 0);
    const names = r.stdout.split("\n").map((l) => l.trim()).filter((l) => l && !l.includes(":") && !/^(Input|Output)/.test(l) && !l.startsWith("Supported"));
    const set = new Set(names);
    assert.deepEqual([...set].sort(), ["file"], `protocols compiled in: ${[...set].join(",")}`);
  });
  it("pinned build: component lists match the configure intent", pinnedOnly, async (t) => {
    const raw = async (kind) => (await runDecoder({bin: FFMPEG, args: ["-hide_banner", `-${kind}`], captureStdout: true})).stdout;
    // Rows look like " V....D h264  H.264 ..." / " E mp4 ..."; legend rows (" V..... = Video") are dropped by the name pattern.
    const list = (out) => out.split("\n").map((l) => l.trim().split(/\s+/))
        .filter((p) => p.length >= 2 && /^[A-Z.]+$/.test(p[0]) && /^[a-z0-9_,.+-]+$/.test(p[1])).map((p) => p[1]);
    const lists = {};
    for (const kind of ["decoders", "encoders", "demuxers", "muxers", "filters"]) {
      const out = await raw(kind);
      lists[kind] = kind === "filters" ?
        // filter rows carry an I/O column such as "V->V", "A->A", "N->V" (distinctive; legend rows have none)
        out.split("\n").map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 3 && /^[A-Z.]+$/.test(p[0]) && /^[a-z0-9_]+$/.test(p[1]) && /^[AVN|]+->[AVN|]+$/.test(p[2])).map((p) => p[1]) :
        list(out);
      t.diagnostic(`${kind}: ${lists[kind].join(",")}`);
      if (lists[kind].length === 0) t.diagnostic(`${kind} raw head: ${JSON.stringify(out.slice(0, 400))}`);
    }
    assert.deepEqual(lists.decoders.sort(), ["aac", "h264"]);
    assert.deepEqual(lists.encoders.sort(), ["mjpeg", "pcm_s16le", "wrapped_avframe"]);
    assert.deepEqual(lists.demuxers.sort(), ["mov,mp4,m4a,3gp,3g2,mj2"]);
    // mp4 selects the mov muxer (same movenc.c); null is the full-decode sink.
    assert.deepEqual(lists.muxers.sort(), ["image2", "mov", "mp4", "null"]);
    // Filters: the four requested (scale, crop, format, aresample) plus the eleven configure auto-selects for the ffmpeg tool
    // (configure n9.0.2 line 4378 `ffmpeg_select`). Nothing from LICENSE.md's GPL filter list.
    // abuffer/buffer/abuffersink/buffersink are libavfilter's unconditional graph endpoints (buffersrc.c/buffersink.c, LGPL).
    assert.deepEqual(lists.filters.sort(), ["abuffer", "abuffersink", "aformat", "anull", "aresample", "atrim", "buffer", "buffersink", "crop", "format", "hflip", "null", "rotate", "scale", "transpose", "trim", "vflip"]);
    const gplFilters = ["blackframe", "boxblur", "colormatrix", "cover_rect", "cropdetect", "delogo", "eq", "find_rect", "fspp", "histeq", "hqdn3d", "kerndeint", "lensfun", "mcdeint", "mpdecimate", "nnedi", "owdenoise", "perspective", "phase", "pp7", "pullup", "repeatfields", "sab", "signature", "smartblur", "spp", "stereo3d", "super2xsai", "tinterlace", "uspp", "vaguedenoiser", "mptestsrc"];
    assert.ok(!lists.filters.some((f) => gplFilters.includes(f)), "a GPL filter is compiled in");
  });
  it("pinned build: an http:// input is refused (protocol not compiled in)", pinnedOnly, async () => {
    const r = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-i", "http://127.0.0.1:9/x.mp4", "-f", "null", "-"], timeoutMs: 10000});
    assert.notEqual(r.code, 0);
    assert.match(r.stderrTail, /Protocol not found|Invalid argument|No such file/i);
  });
});

/** A harness run must end on its own: no limits refusal, spawn error, timeout or signal. */
function assertBounded(r, what) {
  assert.equal(r.spawnError, null, `${what}: spawn error ${r.spawnError}`);
  assert.equal(r.timedOut, false, `${what}: hit the wall-time limit`);
  assert.equal(r.killedForOutput, false, `${what}: killed for output volume`);
  assert.equal(r.signal, null, `${what}: terminated by signal ${r.signal}`);
  assert.ok(Number.isInteger(r.code), `${what}: no exit code`);
}

const decodeArgs = (file) => ["-hide_banner", "-v", "error", "-xerror", "-i", file, "-f", "null", "-"];

/** Pinned build: a full decode must be REFUSED with a non-zero exit that is a decoder error, not a crash/timeout. */
async function assertDecoderRefusal(t, file, spec) {
  const d = await runDecoder({bin: FFMPEG, args: decodeArgs(file), timeoutMs: 60000});
  assertBounded(d, "pinned decode");
  assert.notEqual(d.code, 0, `pinned decode must fail: ${d.stderrTail}`);
  if (spec.stderrPattern) assert.match(d.stderrTail, new RegExp(spec.stderrPattern, "i"));
  t.diagnostic(`pinned decode refused: exit ${d.code} in ${d.elapsedMs}ms: ${d.stderrTail.trim().split("\n").pop()}`);
}

/** Per-frame presentation timestamps (seconds) from the binary under test (JSON, not CSV). */
async function frameTimestamps(file) {
  const r = await runDecoder({bin: FFPROBE, captureStdout: true, timeoutMs: 60000,
    args: ["-v", "error", "-select_streams", "v:0", "-show_entries", "frame=best_effort_timestamp_time", "-of", "json", "-i", file]});
  assertBounded(r, "frame timestamps");
  assert.equal(r.code, 0, r.stderrTail);
  return JSON.parse(r.stdout).frames.map((f) => Number(f.best_effort_timestamp_time));
}

/**
 * Oversized/malformed box-size header: the decoder must terminate inside the limits (exits recorded),
 * the structural check must reject, and the harness verdict must never be success.
 */
async function oversizedHeaderCase(t, name, file, exp, st) {
  const {result, probe} = await probeJson(FFPROBE, file);
  assertBounded(result, "probe");
  const streams = probe && Array.isArray(probe.streams) ? probe.streams.length : 0;
  const d = await runDecoder({bin: FFMPEG, args: decodeArgs(file), timeoutMs: 60000});
  assertBounded(d, "decode");
  t.diagnostic(`${name}: probe exit ${result.code} streams ${streams}; decode exit ${d.code} (${d.elapsedMs}ms)` +
    `${d.code !== 0 ? ": " + d.stderrTail.trim().split("\n").pop() : ""}`);
  const probeOk = result.code === 0 && probe !== null && streams > 0;
  if (exp.probeOk === false) assert.equal(probeOk, false, "probe must not succeed");
  if (PINNED && exp.pinnedDecode) assert.notEqual(d.code, 0, "pinned decode must fail");
  if (!exp.decoderMayAccept) assert.ok(!(probeOk && d.code === 0), "decoder must not accept this input");
  if (probeOk && d.code === 0) t.diagnostic(`${name}: DECODER ACCEPTED an oversized header; only the structural check rejects it`);
  const verdict = st.ok && probeOk && d.code === 0;
  assert.equal(verdict, false, "harness verdict must never be success for an oversized header");
}

describe("H2 fixtures: probe facts and decode outcomes", () => {
  for (const [name, exp] of Object.entries(expected.fixtures)) {
    it(`${name}`, async (t) => {
      const file = fx(name);
      if (!existsSync(file)) {
        // The frozen set is authoritative: in pinned mode nothing may be skipped.
        assert.ok(exp.optional && !PINNED, `required fixture missing: ${name}`);
        t.skip(`optional fixture not generated (generator lacks the encoder): ${name}`);
        return;
      }
      // Independent structural check (no decoder): declared box sizes must fit the bytes present.
      const st = checkBoxes(readFileSync(file));
      t.diagnostic(`structural: ${st.ok ? "ok" : "reject " + st.reason}`);
      if (exp.structural) assert.equal(st.ok ? "ok" : "reject", exp.structural, `structural verdict for ${name}: ${st.reason}`);
      if (exp.structuralReason) assert.ok(st.reason && st.reason.startsWith(exp.structuralReason), `structural reason ${st.reason}`);
      if (exp.oversizedHeader) {
        await oversizedHeaderCase(t, name, file, exp, st);
        return;
      }
      if (PINNED && exp.pinnedDecode) {
        await assertDecoderRefusal(t, file, exp.pinnedDecode);
      }
      const {result, probe} = await probeJson(FFPROBE, file);
      assertBounded(result, "probe");
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
      if (exp.vfr) {
        const ts = await frameTimestamps(file);
        assert.equal(ts.length, exp.vfr.frames, `frame count ${ts.length}`);
        const deltas = ts.slice(1).map((x, i) => x - ts[i]);
        assert.ok(deltas.every((d) => d > 0), "presentation timestamps must strictly increase");
        const hist = {};
        for (const d of deltas) { const k = String(Math.round(d * 1000)); hist[k] = (hist[k] || 0) + 1; }
        t.diagnostic(`frame intervals (ms -> count): ${JSON.stringify(hist)}`);
        assert.ok(Object.keys(hist).length >= exp.vfr.minDistinctIntervals, `only ${Object.keys(hist).length} distinct intervals: not variable`);
        assert.deepEqual(hist, exp.vfr.intervalsMs);
      }
      if (exp.mustContainTags) {
        const tags = Object.keys(probe.format.tags || {}).map((k) => k.toLowerCase());
        for (const k of exp.mustContainTags) assert.ok(tags.includes(k), `fixture must carry tag ${k}; has ${tags.join(",")}`);
      }
      if (exp.decodeWithXerror !== undefined) {
        const d = await runDecoder({bin: FFMPEG, args: ["-hide_banner", "-v", "error", "-xerror", "-i", file, "-f", "null", "-"], timeoutMs: 120000});
        assertBounded(d, "decode");
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

describe("H4 structural box-size check (independent of the decoder)", () => {
  const box = (type, payload, size) => {
    const b = Buffer.alloc(8 + payload.length);
    b.writeUInt32BE(size === undefined ? 8 + payload.length : size, 0);
    b.write(type, 4, "latin1"); payload.copy(b, 8); return b;
  };
  const ftyp = box("ftyp", Buffer.from("isom\0\0\x02\0isomiso2", "latin1"));
  const moov = box("moov", box("mvhd", Buffer.alloc(100)));
  it("accepts a minimal well-formed ftyp+moov+mdat file", () => {
    const r = checkBoxes(Buffer.concat([ftyp, moov, box("mdat", Buffer.alloc(16))]));
    assert.equal(r.ok, true, r.reason);
  });
  it("rejects a moov that declares more bytes than the file holds (32-bit size)", () => {
    const r = checkBoxes(Buffer.concat([ftyp, box("moov", Buffer.alloc(8), 0x7FFFFFF0)]));
    assert.equal(r.ok, false); assert.match(r.reason, /^oversized-box@\d+:moov/);
  });
  it("rejects a 64-bit largesize beyond the file and beyond 2^53", () => {
    const h = Buffer.alloc(16); h.writeUInt32BE(1, 0); h.write("moov", 4, "latin1"); h.writeBigUInt64BE(1n << 62n, 8);
    assert.equal(checkBoxes(Buffer.concat([ftyp, h])).ok, false);
    h.writeBigUInt64BE(64n, 8);
    assert.match(checkBoxes(Buffer.concat([ftyp, h])).reason, /^oversized-box/);
  });
  it("rejects undersized, nested size-0, non-ASCII types, missing ftyp, duplicate moov and trailing bytes", () => {
    assert.match(checkBoxes(Buffer.concat([ftyp, box("moov", Buffer.alloc(0), 4)])).reason, /^undersized-box/);
    assert.match(checkBoxes(Buffer.concat([ftyp, box("moov", box("trak", Buffer.alloc(4), 0))])).reason, /^size-zero-nested/);
    assert.match(checkBoxes(Buffer.concat([ftyp, box("m\x00ov", Buffer.alloc(4))])).reason, /^invalid-type/);
    assert.equal(checkBoxes(Buffer.concat([moov, ftyp])).reason, "first-box-not-ftyp");
    assert.equal(checkBoxes(Buffer.concat([ftyp, moov, moov])).reason, "moov-count-not-1");
    assert.match(checkBoxes(Buffer.concat([ftyp, moov, Buffer.alloc(3)])).reason, /^trailing-bytes/);
    assert.equal(checkBoxes(Buffer.alloc(4)).reason, "too-small");
  });
  it("allows size 0 (to end of file) only for the last top-level box", () => {
    assert.equal(checkBoxes(Buffer.concat([ftyp, moov, box("mdat", Buffer.alloc(32), 0)])).ok, true);
  });
});
