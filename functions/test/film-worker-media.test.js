"use strict";
/* global BigInt */
// FILM-S2b pure pipeline rules (no decoder): placeholder policy at the
// exact unit boundaries (package §5 D15: +1 ms, +1 px width, +1 px height),
// probe-fact reasons, exact timestamp fidelity across time bases, the
// forbidden-metadata scan set, and decoder result classification.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {LIMITS} = require("../src/film/limits");
const {probeFacts, policyReason, intervalHistogram, forbiddenValues} =
  require("../src/film/worker/media");
const {classify} = require("../src/film/worker/decoder");
const c2 = require("../src/film/contract-v2");

const facts = (o = {}) => ({width: 1920, height: 1080, durationMs: 300000,
  ...o});
const probe = (streams, format = {duration: "2.000000"}) => ({streams,
  format, chapters: []});
const v = (o = {}) => ({codec_type: "video", codec_name: "h264", width: 160,
  height: 90, duration: "2.000000", ...o});
const a = (o = {}) => ({codec_type: "audio", codec_name: "aac", ...o});
const pk = (pts, tb = "1/10240") => ({packets: pts.map((p) => ({pts: p})),
  streams: [{time_base: tb}]});
const PTS = [0, 1024, 2048, 3072];

describe("placeholder policy at exact unit boundaries (PENDING_D3)", () => {
  it("at every limit: accepted", () => {
    assert.equal(LIMITS.maxDurationMs, 300000);
    assert.equal(policyReason(facts()), null);
  });
  it("+1 ms duration -> duration-over-limit", () => {
    assert.equal(policyReason(facts({durationMs: 300001})),
        "duration-over-limit");
  });
  it("+1 px width -> resolution-over-limit", () => {
    assert.equal(policyReason(facts({width: 1921})), "resolution-over-limit");
  });
  it("+1 px height (width at limit) -> resolution-over-limit", () => {
    assert.equal(policyReason(facts({height: 1081})),
        "resolution-over-limit");
  });
  it("duration = round(max(format, video) x 1000) (A.5)", () => {
    const f = probeFacts(probe([v({duration: "299.9994"})],
        {duration: "300.0004"}), pk(PTS)).facts;
    assert.equal(f.durationMs, 300000);
    assert.equal(policyReason(f), null);
    const g = probeFacts(probe([v({duration: "300.0005"})],
        {duration: "1"}), pk(PTS)).facts;
    assert.equal(g.durationMs, 300001);
  });
});

describe("probe facts -> closed worker reasons", () => {
  const cases = {
    "no video stream": [probe([a()]), "video-stream-missing"],
    "two video streams": [probe([v(), v()]), "stream-count-exceeded"],
    "two audio streams": [probe([v(), a(), a()]), "stream-count-exceeded"],
    "three streams (video, audio, data)": [probe([v(), a(),
      {codec_type: "data"}]), "stream-count-exceeded"],
    "hevc video": [probe([v({codec_name: "hevc"})]),
      "video-codec-not-allowed"],
    "mp3 audio": [probe([v(), a({codec_name: "mp3"})]),
      "audio-codec-not-allowed"],
    "missing width": [probe([v({width: undefined})]), "metadata-invalid"],
    "zero height": [probe([v({height: 0})]), "metadata-invalid"],
    "NaN durations": [probe([v({duration: "N/A"})], {duration: "nan"}),
      "metadata-invalid"],
    "no format": [{streams: [v()]}, "metadata-invalid"],
  };
  for (const [name, [p, reason]] of Object.entries(cases)) {
    it(`${name} -> ${reason}`, () => {
      assert.equal(probeFacts(p, pk(PTS)).reason, reason);
      assert.ok(c2.WORKER_REJECTION_REASONS.includes(reason));
    });
  }
  it("packets: missing, duplicate pts, bad time base -> metadata-invalid",
      () => {
        assert.equal(probeFacts(probe([v()]), pk([])).reason,
            "metadata-invalid");
        assert.equal(probeFacts(probe([v()]), pk([0, 1024, 1024])).reason,
            "metadata-invalid");
        assert.equal(probeFacts(probe([v()]), pk(PTS, "0/1")).reason,
            "metadata-invalid");
        assert.equal(probeFacts(probe([v()]), pk(["1e3"])).reason,
            "metadata-invalid");
      });
  it("valid: h264 + optional aac; B-frame order is sorted first", () => {
    const f = probeFacts(probe([v(), a()]), pk([0, 2048, 1024, 3072])).facts;
    assert.deepEqual([f.videoCodec, f.audioCodec, f.streams],
        ["h264", "aac", 2]);
    assert.deepEqual(f.deltas, [1024n, 1024n, 1024n]);
  });
});

describe("timestamp fidelity is exact across time bases", () => {
  it("the same intervals in different time bases are equal", () => {
    const a1 = intervalHistogram([512n, 1024n, 1536n],
        [BigInt(1), BigInt(15360)]);
    const b1 = intervalHistogram([1n, 2n, 3n], [BigInt(1), BigInt(30)]);
    assert.deepEqual([...a1].sort(), [...b1].sort());
  });
  it("33333 us vs 1/30 s are different intervals (no rounding)", () => {
    const x = intervalHistogram([33333n], [1n, 1000000n]);
    const y = intervalHistogram([1n], [1n, 30n]);
    assert.notDeepEqual([...x], [...y]);
  });
});

describe("forbidden metadata scan set", () => {
  it("collects every non-structural tag value of length >= 4", () => {
    const vals = forbiddenValues({formatTags: {major_brand: "isom",
      minor_version: "512", compatible_brands: "isomiso2", artist: "Some One",
      make: "Ph1", location: "+37.7749-122.4194/"},
    streamTags: [{language: "und", handler_name: "VideoHandler",
      vendor_id: "[0][0][0][0]", encoder: "Lavc60 libx264"}]});
    assert.deepEqual(vals.sort(), ["+37.7749-122.4194/", "Lavc60 libx264",
      "Some One"]);
  });
});

describe("decoder result classification (r4 LIMIT_KILL_SIGNALS)", () => {
  const base = {code: null, signal: null, timedOut: false,
    killedForOutput: false, spawnError: null, stderrTail: ""};
  const cases = [
    [{timedOut: true, signal: "SIGKILL"}, "limit-kill", "wall-time"],
    [{signal: "SIGXCPU"}, "limit-kill", "SIGXCPU"],
    [{signal: "SIGXFSZ"}, "limit-kill", "SIGXFSZ"],
    [{code: 1, stderrTail: "Error: Cannot allocate memory"}, "limit-kill",
      "allocation-failure"],
    // pinned 9.0.2 under RLIMIT_AS (run 39453385545), verbatim
    [{code: 245, stderrTail: "[vost#0:0/wrapped_avframe @ 0x31d01f00] " +
      "pthread_create() failed: Resource temporarily unavailable\n"},
    "limit-kill", "allocation-failure"],
    // the cascade without the root cause is NOT media evidence
    [{code: 245, stderrTail: "[enc:pcm_s16le @ 0x1] Could not open encoder " +
      "before EOF\nTask finished with error code: -22 (Invalid argument)\n"},
    "ambiguous", undefined],
    [{killedForOutput: true, signal: "SIGKILL"}, "limit-kill", "SIGKILL"],
    [{signal: "SIGKILL"}, "limit-kill", "SIGKILL"],
    [{signal: "SIGSEGV"}, "crash", undefined],
    [{code: 1, stderrTail: "Error submitting packet to decoder: Invalid " +
      "data found when processing input"}, "error", undefined],
    [{code: 1, stderrTail: "unexplained failure"}, "ambiguous", undefined],
    [{code: 0}, "ok", undefined],
    [{spawnError: "ENOENT"}, "infrastructure", undefined],
    [{spawnError: "limits-unavailable"}, "configuration", undefined],
  ];
  for (const [r, status, kill] of cases) {
    it(`${JSON.stringify(r)} -> ${status}${kill ? "/" + kill : ""}`, () => {
      const out = classify({...base, ...r});
      assert.equal(out.status, status);
      assert.equal(out.kill, kill);
      if (kill) assert.ok(c2.LIMIT_KILL_SIGNALS.includes(kill));
    });
  }
  it("strict steps: exit 0 with error-level output is a failure", () => {
    const noisy = {...base, code: 0, stderrTail: "[vist#0:0/h264 @ 0x1] " +
      "corrupt decoded frame\n"};
    assert.equal(classify(noisy, true).status, "error");
    assert.equal(classify(noisy, false).status, "ok");
    assert.equal(classify({...base, code: 0, stderrTail: "odd\n"}, true)
        .status, "ambiguous");
    assert.equal(classify({...base, code: 0, stderrTail: ""}, true).status,
        "ok");
  });
  it("only the four own-limit kills are classified", () => {
    assert.deepEqual([...c2.CLASSIFIED_LIMIT_KILLS].sort(),
        ["SIGXCPU", "SIGXFSZ", "allocation-failure", "wall-time"]);
  });
});
