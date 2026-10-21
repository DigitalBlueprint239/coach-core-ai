"use strict";
/* global BigInt */
// FILM-S2b pipeline + limits against the PINNED decoder (CI: FFmpeg 9.0.2
// rebuilt by the S2a recipe; digests enforced from tools/ffmpeg/SOURCE.json).
// Run: PINNED=1 FFMPEG_BIN=... FFPROBE_BIN=... node --test <this file>
// DEV_DECODER=1 runs against any local decoder (digests taken from the
// binaries) for development only; its results are never acceptance evidence.
// Neither set -> the suite REFUSES to run (no silent skips).
const {describe, it, before, after} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {spawnSync, execFileSync} = require("child_process");
const v1 = require("../../src/film/contract");
const c2 = require("../../src/film/contract-v2");
const {createDecoder, pinnedDigests, fileSha256, HARNESS} =
  require("../../src/film/worker/decoder");
const {WORKER_LIMITS, leaseTtlMs, longestStepMs} =
  require("../../src/film/worker/limits");
const {runPipeline, intervalHistogram, ARGS} =
  require("../../src/film/worker/media");
const {createFilmHandlers} = require("../../src/film/handlers");
const {createFilmWorker} = require("../../src/film/worker/worker");
const {FakeTimestamp, FakeFirestore, FakeObjects} =
  require("../film-worker-doubles");

const PINNED = process.env.PINNED === "1";
const DEV = process.env.DEV_DECODER === "1";
if (!PINNED && !DEV) {
  throw new Error("pinned suite needs PINNED=1 (or DEV_DECODER=1) and " +
    "FFMPEG_BIN/FFPROBE_BIN; refusing to skip");
}
const BIN = {ffmpeg: process.env.FFMPEG_BIN, ffprobe: process.env.FFPROBE_BIN};
const ROOT = path.join(__dirname, "..", "..", "..");
const FROZEN = path.join(ROOT, "tools", "ffmpeg", "fixtures", "frozen");
const S2B = path.join(ROOT, "functions", "test", "fixtures", "s2b-media");
const expected = PINNED ? pinnedDigests() :
  {ffmpeg: fileSha256(BIN.ffmpeg), ffprobe: fileSha256(BIN.ffprobe)};
const limits = PINNED ? WORKER_LIMITS : {...WORKER_LIMITS,
  status: "MEASURED"};
const decoder = createDecoder({...BIN, expectedSha256: expected, limits});
const fixture = (f) => path.join(fs.existsSync(path.join(FROZEN, f)) ?
  FROZEN : S2B, f);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "pinned-"));
const run = async (file, dec = decoder) => {
  const work = tmp();
  try {
    return await runPipeline({inputPath: file, workDir: work, decoder: dec,
      checkpoint: async () => true});
  } finally {
    fs.rmSync(work, {recursive: true, force: true});
  }
};

// Worker verdict for every frozen S2a fixture and every S2b fixture.
const VERDICTS = {
  "s1-30fps-counter.mp4": {ready: {durationMs: 4000, width: 320, height: 180,
    audioCodec: "aac", frameRateMode: "cfr"}},
  "s2-60fps.mp4": {ready: {durationMs: 4000, width: 320, height: 180,
    audioCodec: null, frameRateMode: "cfr"}},
  "s3-vfr.mp4": {ready: {width: 320, height: 180, audioCodec: null,
    frameRateMode: "vfr"}},
  "s4-hevc.mp4": {reason: "video-codec-not-allowed"},
  "s5-empty.mp4": {reason: "container-invalid"},
  "s5-spoofed.mp4": {reason: "container-invalid"},
  "s5-truncated.mp4": {reason: "container-invalid"},
  "s6-duration-at-limit-300000ms.mp4": {ready: {durationMs: 300000,
    width: 64, height: 64, audioCodec: null, frameRateMode: "cfr"}},
  "s6-duration-over-limit-300500ms.mp4": {reason: "duration-over-limit"},
  "s6-metadata-tags.mp4": {ready: {durationMs: 2000, width: 320, height: 180,
    audioCodec: null, frameRateMode: "cfr"}},
  "s6-res-at-limit-1920x1080.mp4": {ready: {durationMs: 1000, width: 1920,
    height: 1080, audioCodec: null, frameRateMode: "cfr"}},
  "s6-res-over-limit-1922x1080.mp4": {reason: "resolution-over-limit"},
  "s7-excess-streams.mp4": {reason: "stream-count-exceeded"},
  "s8-audio-only.mp4": {reason: "video-stream-missing"},
  "s9-wrong-container.webm": {reason: "container-invalid"},
  "s10-known-good.mp4": {ready: {durationMs: 2000, width: 160, height: 90,
    audioCodec: "aac", frameRateMode: "cfr"}},
  "s11a-oversized-moov-size.mp4": {reason: "container-invalid"},
  "s11b-oversized-largesize-header-only.mp4": {reason: "container-invalid"},
  "s11c-oversized-ftyp-size.mp4": {reason: "container-invalid"},
  "s12-height-over-1920x1082.mp4": {reason: "resolution-over-limit"},
  "s13-audio-codec-alac.mp4": {reason: "audio-codec-not-allowed"},
  "s14-two-video-streams.mp4": {reason: "stream-count-exceeded"},
  "s16-corrupt-bitstream.mp4": {reason: "media-corrupt",
    step: "decode-input"},
};

before(async () => {
  const pf = await decoder.preflight();
  assert.deepEqual(pf, {ok: true, reason: null}, JSON.stringify(pf));
});

describe(`pipeline verdicts (${PINNED ? "PINNED 9.0.2" : "DEV decoder"})`,
    () => {
      it("fixtures on disk match their committed digests", () => {
        for (const dir of [FROZEN, S2B]) {
          const r = spawnSync("sha256sum", ["-c", "--quiet",
            "SHA256SUMS.txt"], {cwd: dir, encoding: "utf8"});
          assert.equal(r.status, 0, r.stdout + r.stderr);
        }
      });
      for (const [f, want] of Object.entries(VERDICTS)) {
        it(`${f} -> ${want.reason || "ready"}`, async () => {
          const r = await run(fixture(f));
          if (want.reason) {
            assert.equal(r.outcome, "verdict", JSON.stringify(r));
            assert.equal(r.reason, want.reason, JSON.stringify(r));
            if (want.step) assert.equal(r.step, want.step);
            return;
          }
          assert.equal(r.outcome, "ok", JSON.stringify(r));
          for (const [k, v] of Object.entries(want.ready)) {
            assert.equal(r.media[k], v, k);
          }
          assert.ok(c2.schemas.media.safeParse(r.media).success);
        });
      }
      it("s11a: the pinned decoder ACCEPTS it; the structural check rejects",
          async () => {
            const p = spawnSync(BIN.ffprobe, ARGS.probe(
                fixture("s11a-oversized-moov-size.mp4")), {encoding: "utf8"});
            if (PINNED) assert.equal(p.status, 0, "pinned probe exit 0 (S2a)");
            const r = await run(fixture("s11a-oversized-moov-size.mp4"));
            assert.deepEqual([r.reason, r.step],
                ["container-invalid", "structural"]);
          });
    });

describe("output validation facts", () => {
  /** Normalize once and keep the output for inspection. */
  const normalizeKeep = async (f) => {
    const work = tmp();
    const r = await runPipeline({inputPath: fixture(f), workDir: work,
      decoder, checkpoint: async () => true});
    return {r, work, bytes: fs.readFileSync(path.join(work,
        "normalized.mp4"))};
  };
  it("metadata fixture: no forbidden tag survives (probe AND bytes)",
      async () => {
        const {r, work, bytes} = await normalizeKeep("s6-metadata-tags.mp4");
        assert.equal(r.outcome, "ok");
        for (const s of ["SyntheticPhone", "SP-1", "synthetic metadata",
          "37.7749", "2026-01-02T03:04:05", "Lavf60"]) {
          assert.equal(bytes.includes(Buffer.from(s)), false, s);
        }
        const p = JSON.parse(execFileSync(BIN.ffprobe, ARGS.probe(
            path.join(work, "normalized.mp4")), {encoding: "utf8"}));
        assert.deepEqual(Object.keys(p.format.tags || {}).sort(),
            ["compatible_brands", "major_brand", "minor_version"]);
        assert.equal((p.chapters || []).length, 0);
        fs.rmSync(work, {recursive: true, force: true});
      });
  it("VFR: the output's frame-interval histogram equals the input's " +
      "(33/67/100 ms: 48/60/11)", async () => {
    const {r, work} = await normalizeKeep("s3-vfr.mp4");
    assert.equal(r.media.frameRateMode, "vfr");
    const pk = (file) => {
      const j = JSON.parse(execFileSync(BIN.ffprobe, ARGS.packets(file),
          {encoding: "utf8"}));
      const pts = j.packets.map((x) => BigInt(x.pts)).sort((a, b) =>
        (a < b ? -1 : a > b ? 1 : 0));
      const d = pts.slice(1).map((x, i) => x - pts[i]);
      const tb = j.streams[0].time_base.split("/").map(BigInt);
      return intervalHistogram(d, tb);
    };
    const hin = pk(fixture("s3-vfr.mp4"));
    const hout = pk(path.join(work, "normalized.mp4"));
    assert.deepEqual([...hout].sort(), [...hin].sort());
    assert.deepEqual([...hin.values()].sort((a, b) => a - b), [11, 48, 60]);
    fs.rmSync(work, {recursive: true, force: true});
  });
  it("normalization is deterministic (bitexact): same bytes twice",
      async () => {
        const a = await normalizeKeep("s10-known-good.mp4");
        const b = await normalizeKeep("s10-known-good.mp4");
        assert.equal(a.r.media.sha256, b.r.media.sha256);
        fs.rmSync(a.work, {recursive: true, force: true});
        fs.rmSync(b.work, {recursive: true, force: true});
      });
});

describe("external data references (dref) are never followed", () => {
  it("s15: with a FIFO canary next to the input, the run completes " +
      "promptly; a control run WITH drefs enabled blocks on it", async () => {
    const dir = tmp();
    const input = path.join(dir, "s15-dref-external.mp4");
    fs.copyFileSync(fixture("s15-dref-external.mp4"), input);
    execFileSync("mkfifo", [path.join(dir, "s15-dref-canary")]);
    const t0 = Date.now();
    const r = await run(input);
    assert.notEqual(r.outcome, "limit-kill", JSON.stringify(r));
    assert.ok(Date.now() - t0 < 20000, "did not block on the canary");
    // control: the same probe with drefs ENABLED must block (wall-time)
    const ctl = createDecoder({...BIN, expectedSha256: expected, limits: {
      ...limits, steps: {...limits.steps, "probe-input": {
        ...limits.steps["probe-input"], wallMs: 3000}}}});
    assert.equal((await ctl.preflight()).ok, true);
    const args = ARGS.probe(input).map((a, i, all) =>
      (all[i - 1] === "-enable_drefs" ? "1" : a));
    const c = await ctl.run("probe-input", "ffprobe", args,
        {captureStdout: true});
    assert.equal(c.status, "limit-kill");
    assert.equal(c.kill, "wall-time");
    fs.rmSync(dir, {recursive: true, force: true});
  });
});

describe("resource limits stop synthetic offenders (classified)", () => {
  let dir;
  let offenders;
  before(() => {
    dir = tmp();
    const script = (name, body) => {
      const p = path.join(dir, name);
      fs.writeFileSync(p, `#!/bin/sh\n${body}\n`, {mode: 0o755});
      return p;
    };
    offenders = {
      cpu: script("cpu.sh", "while :; do :; done"),
      wall: script("wall.sh", "exec sleep 600"),
      fsize: script("fsize.sh", "exec head -c 8388608 /dev/zero > big.bin"),
      flood: script("flood.sh", "exec yes"),
      tree: script("tree.sh",
          `sleep 600 & echo $! > "${dir}/grandchild.pid"; wait`),
    };
  });
  after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const small = (o = {}) => ({...limits, steps: Object.fromEntries(
      Object.entries(limits.steps).map(([k, v]) => [k, {...v, wallMs: 2000,
        cpuSoftSeconds: 1, fileSizeBytes: 1024 * 1024,
        maxCaptureBytes: 64 * 1024, ...o}]))});
  /** A decoder whose "ffmpeg" is an offender (the mechanism under test). */
  const offender = async (bin, lim) => {
    const d = createDecoder({ffmpeg: bin, ffprobe: BIN.ffprobe,
      expectedSha256: {ffmpeg: fileSha256(bin), ffprobe: expected.ffprobe},
      limits: lim});
    assert.equal((await d.preflight()).ok, true);
    return d;
  };
  it("CPU limit -> SIGXCPU (classified)", async () => {
    const d = await offender(offenders.cpu, small({wallMs: 20000}));
    const r = await d.run("decode-input", "ffmpeg", []);
    assert.deepEqual([r.status, r.kill], ["limit-kill", "SIGXCPU"]);
  });
  it("wall-time limit -> wall-time (classified)", async () => {
    const d = await offender(offenders.wall, small());
    const r = await d.run("decode-input", "ffmpeg", []);
    assert.deepEqual([r.status, r.kill], ["limit-kill", "wall-time"]);
  });
  it("file-size limit -> SIGXFSZ (classified)", async () => {
    const d = await offender(offenders.fsize, small());
    const r = await d.run("normalize", "ffmpeg", [], {cwd: dir});
    assert.deepEqual([r.status, r.kill], ["limit-kill", "SIGXFSZ"]);
  });
  it("output flood -> killed, recorded as unclassified SIGKILL", async () => {
    const d = await offender(offenders.flood, small({wallMs: 20000}));
    const r = await d.run("probe-input", "ffmpeg", [], {captureStdout: true});
    assert.deepEqual([r.status, r.kill], ["limit-kill", "SIGKILL"]);
  });
  it("address-space limit: the pinned decoder reports an allocation " +
      "failure -> allocation-failure (classified)", async () => {
    const d = createDecoder({...BIN, expectedSha256: expected,
      limits: small({wallMs: 20000, addressSpaceBytes: 24 * 1024 * 1024})});
    assert.equal((await d.preflight()).ok, true);
    const r = await d.run("decode-input", "ffmpeg",
        ARGS.decode(fixture("s6-res-at-limit-1920x1080.mp4")));
    assert.deepEqual([r.status, r.kill], ["limit-kill", "allocation-failure"],
        `code=${r.code} signal=${r.signal} ${r.stderrTail.slice(-1200)}`);
  });
  it("process-group kill reaches grandchildren", async () => {
    const d = await offender(offenders.tree, small());
    const r = await d.run("decode-input", "ffmpeg", []);
    assert.equal(r.kill, "wall-time");
    const pid = Number(fs.readFileSync(path.join(dir, "grandchild.pid"),
        "utf8"));
    await new Promise((res) => setTimeout(res, 300));
    // gone, or a zombie (killed; only waiting for a reaper): not running
    let state = "gone";
    try {
      state = fs.readFileSync(`/proc/${pid}/stat`, "utf8")
          .replace(/^.*\) /, "")[0];
    } catch (_) {
      state = "gone";
    }
    assert.ok(state === "gone" || state === "Z", `grandchild state ${state}`);
  });
  it("no prlimit -> preflight refuses and nothing runs", async () => {
    const h = await import(require("url").pathToFileURL(HARNESS).href);
    h.setPrlimitAvailableForTest(false);
    try {
      const d = createDecoder({...BIN, expectedSha256: expected, limits});
      assert.deepEqual(await d.preflight(),
          {ok: false, reason: "prlimit-unavailable"});
      const r = await d.run("decode-input", "ffmpeg", []);
      assert.equal(r.status, "configuration");
    } finally {
      h.setPrlimitAvailableForTest(null);
    }
  });
  it("digest mismatch -> preflight refuses (configuration, no verdict)",
      async () => {
        const d = createDecoder({...BIN, expectedSha256: {ffmpeg:
          "0".repeat(64), ffprobe: expected.ffprobe}, limits});
        assert.deepEqual(await d.preflight(),
            {ok: false, reason: "ffmpeg-digest-mismatch"});
      });
});

describe("measured limits are committed and consistent", () => {
  it("limits are MEASURED, labelled TEST_MEASURED, from a pinned run",
      () => {
        assert.equal(WORKER_LIMITS.status, "MEASURED");
        assert.equal(WORKER_LIMITS.label, "TEST_MEASURED");
        assert.ok(WORKER_LIMITS.calibration.run, "calibration run recorded");
        assert.deepEqual(WORKER_LIMITS.calibration.decoder, pinnedDigests());
      });
  it("longest step + grace + margin fits inside the lease TTL", () => {
    assert.ok(longestStepMs() + WORKER_LIMITS.leaseMarginMs <= leaseTtlMs());
  });
});

describe("end to end through S1 + worker with the real pipeline", () => {
  const OWNER = "uid-owner";
  const TEAM = "team-e2e";
  const auth = {uid: OWNER, token: {email_verified: true,
    firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000}};
  const flow = async (f) => {
    const db = new FakeFirestore();
    const objects = new FakeObjects();
    db.write(`teams/${TEAM}`, {ownerId: OWNER});
    const now = () => new Date("2026-10-19T21:00:00.000Z");
    const logger = {info() {}, warn() {}, error() {}};
    const s1 = createFilmHandlers({db, Timestamp: FakeTimestamp,
      getUser: async () => ({uid: OWNER, disabled: false,
        customClaims: {beta: true}}), ...objects.s1(), logger, now});
    const bytes = fs.readFileSync(fixture(f));
    const r = await s1.reserveFilmUpload({auth, data: {
      schemaVersion: v1.CONTRACT_VERSION, operationId: crypto.randomUUID(),
      action: "reserveFilmUpload", payload: {teamId: TEAM,
        declaredBytes: bytes.length, declaredContentType: "video/mp4",
        fileName: "clip.mp4", rightsAcknowledged: true,
        rightsWordingVersion: "rights-v1"}}});
    const name = v1.uploadPathFor(TEAM, r.data.filmId);
    const generation = objects.put(name, bytes);
    await s1.onQuarantineFinalized({bucket: "demo-s2b.appspot.com", name, size: bytes.length,
      contentType: "video/mp4", generation});
    const w = createFilmWorker({db, Timestamp: FakeTimestamp, objects,
      decoder, isEnabled: () => true, now, logger, limits});
    const out = await w.processFilm({teamId: TEAM, filmId: r.data.filmId});
    return {out, film: db.read(`teams/${TEAM}/films/${r.data.filmId}`),
      ledger: db.read(`teams/${TEAM}/filmLedger/cap`).slots, objects};
  };
  it("s10 -> ready with media facts; slot kept as ready", async () => {
    const {out, film, ledger} = await flow("s10-known-good.mp4");
    assert.equal(out.outcome, "ready", JSON.stringify(out));
    assert.equal(film.status, "ready");
    assert.equal(film.media.width, 160);
    assert.equal(Object.values(ledger)[0].status, "ready");
  });
  it("s11a -> rejected container-invalid; slot released", async () => {
    const {out, film, ledger} = await flow("s11a-oversized-moov-size.mp4");
    assert.equal(out.outcome, "rejected");
    assert.equal(film.rejectionReason, "container-invalid");
    assert.deepEqual(ledger, {});
  });
});
