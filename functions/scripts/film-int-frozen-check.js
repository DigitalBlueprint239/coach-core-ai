#!/usr/bin/env node
"use strict";
/**
 * FILM-INT-A D9 owner-map / frozen check (r3 section 2, CT-1, CT-7).
 *
 * Authoritative SHA per path (computed from the accepted SHAs, printed):
 *   changed by A4 relative to A3 -> A4; changed by A5 relative to A3 -> A5;
 *   every other path -> A7.
 * Every path present in HEAD or in its authoritative SHA must be BYTE-EQUAL
 * to that SHA, except the exact allowlist D1-D9 (+ r3.2 / r3.3). New paths
 * must be allowlisted. For the allowlisted ACCEPTED test files (D3 + r3.3)
 * every assertion line and every test name must be identical to the
 * authoritative SHA (wiring / fixture-only change). A4, A5 and A7 must be
 * ancestors of HEAD. Exit 1 on any violation. Read-only (git only).
 * Usage: node functions/scripts/film-int-frozen-check.js [repo root]
 */
const {execFileSync} = require("node:child_process");
const path = require("node:path");

const A3 = "6764af9edd7ab258f55c4eeb19e80a4649b8c86b";
const A4 = "19cca9848a2ace52f4f56153f6585259b4a76f90";
const A5 = "da13f834676d778953a403dfad75a7f1cc955ffc";
const A7 = "638631b939d60f22030291897d517f607404442d";

const D3 = [
  "functions/test/film-worker-doubles.js",
  "functions/test/film-worker.test.js",
  "functions/test/emulator/film-s2b.emulator.test.js",
  "functions/test/worker-pinned/film-worker-pinned.test.js",
  "functions/test/film-worker-review-r1r4.test.js",
  "functions/test/film-worker-review-r2b.test.js",
  "functions/test/film-worker-review-history.test.js",
  "functions/test/film-worker-wiring.test.js", // r3.2
];
const R33 = ["functions/test/lfs-reconcile.test.js"];
const ALLOW_EXACT = new Set([
  "functions/scripts/film-terms-guard.js", // D1
  "docs/COACH_CORE_SHARED_CONTEXT.md", // D2
  ...D3, ...R33,
  "functions/src/film/reconcile.js", // D4 (filmProblem only; reviewed)
  "functions/scripts/film-cleanup-admin.js", // D5
  "docs/film/FILM_LFS_RECONCILE.md", "docs/film/FILM_INTEGRATION.md", // D6
  "functions/test/emulator/film-int.emulator.test.js", // D7
  "src/features/film-analyzer/__tests__/film-int-compat.test.ts", // D8
  ".github/workflows/film-integration.yml", // D9
  "functions/scripts/film-int-frozen-check.js", // D9
]);
const ALLOW_RE = [
  /^functions\/test\/film-int-[a-z0-9-]+\.test\.js$/, // D7
  /^functions\/test\/fixtures\/film-int-captured\/[A-Za-z0-9._-]+$/, // D7
];
const allowed = (p) => ALLOW_EXACT.has(p) || ALLOW_RE.some((re) => re.test(p));

const root = path.resolve(process.argv[2] || path.join(__dirname, "..", ".."));
const git = (...a) => execFileSync("git", a, {cwd: root, encoding: "utf8",
  maxBuffer: 1 << 28});
const lines = (s) => s.split("\n").filter(Boolean);
const blob = (sha, p) => {
  try {
    return execFileSync("git", ["rev-parse", `${sha}:${p}`], {cwd: root,
      encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
  } catch (_) {
    return null;
  }
};
const show = (sha, p) => git("show", `${sha}:${p}`);

const problems = [];
for (const [n, sha] of [["A4", A4], ["A5", A5], ["A7", A7]]) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, "HEAD"],
        {cwd: root});
  } catch (_) {
    problems.push(`${n} ${sha} is not an ancestor of HEAD`);
  }
}
const byA4 = new Set(lines(git("diff", "--name-only", A3, A4)));
const byA5 = new Set(lines(git("diff", "--name-only", A3, A5)));
const owner = (p) => (byA4.has(p) ? ["A4", A4] : byA5.has(p) ? ["A5", A5] :
  ["A7", A7]);
const overlap = [...byA4].filter((p) => byA5.has(p) ||
  lines(git("diff", "--name-only", A3, A7)).includes(p));
const a5a7 = [...byA5].filter((p) => lines(git("diff", "--name-only", A3,
    A7)).includes(p));
for (const p of [...overlap, ...a5a7]) {
  if (!allowed(p)) problems.push(`owner overlap outside D1/D2: ${p}`);
}

const head = new Set(lines(git("ls-tree", "-r", "--name-only", "HEAD")));
const universe = new Set([...head,
  ...lines(git("ls-tree", "-r", "--name-only", A7)),
  ...lines(git("ls-tree", "-r", "--name-only", A5)),
  ...lines(git("ls-tree", "-r", "--name-only", A4))]);
const counts = {A4: 0, A5: 0, A7: 0, allowlisted: 0};
const changedAllowed = [];
for (const p of [...universe].sort()) {
  const [n, sha] = owner(p);
  const want = blob(sha, p);
  const got = head.has(p) ? blob("HEAD", p) : null;
  if (allowed(p)) {
    counts.allowlisted += 1;
    if (want !== got) changedAllowed.push(`${p} (vs ${n})`);
    continue;
  }
  counts[n] += 1;
  if (want !== got) {
    problems.push(`${p}: differs from its authoritative ${n} ` +
      `(${want ? want.slice(0, 12) : "absent"} -> ${got ?
        got.slice(0, 12) : "absent"})`);
  }
}

// assertion + test-name preservation for the accepted test files
const keyLines = (src) => src.split(/\r?\n/).filter((l) =>
  /\bassert\b|\b(?:it|test|describe)\s*\(/.test(l)).map((l) => l.trim());
for (const p of [...D3, ...R33]) {
  const [n, sha] = owner(p);
  if (!head.has(p)) {
    problems.push(`${p}: missing`);
    continue;
  }
  const before = keyLines(show(sha, p));
  const after = keyLines(show("HEAD", p));
  const lost = before.filter((l) => !after.includes(l));
  const added = after.filter((l) => !before.includes(l));
  // the only permitted edits to such lines: an event gaining `bucket`
  const benign = (l) => /onQuarantineFinalized\(\{\s*bucket:/.test(l);
  const bad = added.filter((l) => !benign(l));
  const lostBad = lost.filter((l) => !after.some((a) => benign(a) &&
    a.replace(/bucket:\s*"[^"]*",\s*/, "") === l));
  if (bad.length || lostBad.length) {
    problems.push(`${p}: assertion/test-name lines changed vs ${n}: ` +
      JSON.stringify({added: bad, removed: lostBad}).slice(0, 600));
  }
}

const report = {authoritative: {A3, A4, A5, A7}, counts,
  changedAllowlisted: changedAllowed, problems};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exit(problems.length ? 1 : 0);
