#!/usr/bin/env node
// Coach Core merge eligibility — the aggregate release check (2026-10-17).
//
// One check that is SUCCESSFUL only when the complete required acceptance validation
// finished successfully on the exact candidate commit. It never widens, filters or
// re-runs anything: it reads what the 12 E2E jobs produced and decides.
//
//   evaluate(input) -> { eligible, reasons, rows }        (pure; unit-tested with fixtures)
//   CLI: node merge-eligibility.mjs --sha <sha> --head-sha <sha> --event <name> --run-id <id>
//        --attempt <n> --artifacts <dir> --e2e <dir> --out <dir> [--expected-repeat 1]
//
// Rules (fail closed — any reason makes the verdict INELIGIBLE):
//   R1  event must be pull_request or merge_group; workflow_dispatch / push can never satisfy the gate
//   R2  every expected job (4 projects x 3 buckets) must exist exactly once with conclusion "success"
//       for the ACCEPTANCE bucket; diagnostic/obsolete-fault-model jobs must have COMPLETED
//       (not cancelled / skipped / missing / in progress) — their test failures stay visible but
//       do not block, because they are classified out of acceptance (B11, approved)
//   R3  every expected job's evidence artifact must exist, carry UPLOAD_OK, and its INVENTORY.sha256
//       must verify against the retained bytes (B15, fail-closed finalize)
//   R4  each artifact's run.context must bind to THIS sha, THIS run id and THIS attempt, the right
//       project/bucket, an empty dispatch grep and the expected repeat count
//   R5  selection completeness: the identities executed in results.json must equal the
//       source-derived membership of that project+bucket (playwright --list on the candidate);
//       a narrowed selection (grep/project/bucket) can never pass; zero executions are accepted
//       ONLY when the membership is itself empty (phone diagnostic/obsolete) and results.json shows
//       zero tests — zero never masquerades as executed passing tests
//   R6  acceptance results: every test status "expected", results.length == repeat, every result
//       "passed"; no skipped/interrupted/timedOut/failed; results.json errors[] empty
//   R7  the aggregate itself refuses to conclude on a cancelled run (workflow if: !cancelled())
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const PROJECTS = ['chromium', 'firefox', 'phone-chromium', 'phone-firefox'];
export const BUCKETS = ['acceptance', 'diagnostic', 'obsolete-fault-model'];
export const TRUSTED_EVENTS = ['pull_request', 'merge_group'];
export const CHECK_NAME = 'Coach Core merge eligibility';
export const jobName = (bucket, project) => `E2E ${bucket} (${project})`;
export const artifactName = (bucket, project, sha) => `e2e-results-${bucket}-${project}-${sha}`;

// Identity of a test, shared by `--list` output and results.json: file:line:column + title, per project.
export const specIdentity = (spec) => `${spec.file}:${spec.line}:${spec.column} ${spec.title}`;
export function walkSpecs(report, project) {
  const out = [];
  const walk = (s) => {
    for (const sp of s.specs || []) for (const t of sp.tests || []) if (!project || t.projectName === project) out.push({ id: specIdentity(sp), test: t });
    for (const c of s.suites || []) walk(c);
  };
  for (const s of report.suites || []) walk(s);
  return out;
}

export const parseContext = (text) => Object.fromEntries(
  String(text).split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }),
);

// Pure decision. `input`:
//   sha, headSha, event, runId, attempt, expectedRepeat (default 1)
//   jobs: [{ name, status, conclusion }]           (GitHub Actions jobs of THIS run attempt)
//   membership: { [project]: { [bucket]: [identity...] } }   (source-derived, from --list)
//   artifacts: { [artifactName]: { uploadOk: bool, inventoryOk: bool|string, context: {...}|null,
//                                  results: <results.json object>|null, lastRun: {...}|null } }
export function evaluate(input) {
  const reasons = [];
  const rows = [];
  const repeat = Number(input.expectedRepeat ?? 1);
  const fail = (r) => reasons.push(r);

  if (!TRUSTED_EVENTS.includes(input.event)) fail(`R1 event "${input.event}" is not a trusted merge event (${TRUSTED_EVENTS.join('/')}); bounded or manual runs cannot satisfy the release gate`);
  if (!/^[0-9a-f]{40}$/.test(input.sha || '')) fail(`R4 candidate sha is not a full 40-hex commit: "${input.sha}"`);
  if (!Number.isInteger(repeat) || repeat < 1) fail(`R4 expected repeat must be a positive integer, got "${input.expectedRepeat}"`);

  for (const project of PROJECTS) {
    for (const bucket of BUCKETS) {
      const required = bucket === 'acceptance';
      const name = jobName(bucket, project);
      const row = { job: name, project, bucket, required, job_conclusion: 'missing', artifact: 'missing', selected: null, executed: null, passed: null, failed: null, verdict: 'FAIL' };
      rows.push(row);
      const expected = (((input.membership || {})[project] || {})[bucket]);
      if (Array.isArray(expected)) row.selected = expected.length;
      const matches = (input.jobs || []).filter((j) => j.name === name);
      if (matches.length === 0) { fail(`R2 ${name}: job missing from this run`); continue; }
      if (matches.length > 1) { fail(`R2 ${name}: ${matches.length} jobs with this name (duplicate/ambiguous)`); continue; }
      const job = matches[0];
      row.job_conclusion = job.conclusion || job.status || 'unknown';
      if (job.status !== 'completed') { fail(`R2 ${name}: job not completed (status ${job.status})`); continue; }
      if (required && job.conclusion !== 'success') { fail(`R2 ${name}: required acceptance job concluded "${job.conclusion}"`); continue; }
      if (!required && !['success', 'failure'].includes(job.conclusion)) { fail(`R2 ${name}: job concluded "${job.conclusion}" (cancelled/skipped/timed out jobs leave coverage unproven)`); continue; }

      const aName = artifactName(bucket, project, input.sha);
      const art = (input.artifacts || {})[aName];
      if (!art) { fail(`R3 ${name}: evidence artifact ${aName} missing`); continue; }
      row.artifact = 'present';
      if (!art.uploadOk) fail(`R3 ${name}: UPLOAD_OK marker absent in ${aName} (finalize did not succeed)`);
      if (art.inventoryOk !== true) fail(`R3 ${name}: INVENTORY.sha256 did not verify in ${aName}${typeof art.inventoryOk === 'string' ? ` (${art.inventoryOk})` : ''}`);
      const ctx = art.context;
      if (!ctx) fail(`R4 ${name}: run.context missing in ${aName}`);
      else {
        if (ctx.sha !== input.sha) fail(`R4 ${name}: artifact sha ${ctx.sha} != candidate ${input.sha}`);
        if (input.headSha && ctx.head_sha !== input.headSha) fail(`R4 ${name}: artifact head_sha ${ctx.head_sha} != ${input.headSha}`);
        if (String(ctx.run_id) !== String(input.runId)) fail(`R4 ${name}: artifact run_id ${ctx.run_id} != ${input.runId}`);
        if (String(ctx.run_attempt) !== String(input.attempt)) fail(`R4 ${name}: artifact run_attempt ${ctx.run_attempt} != ${input.attempt} (stale artifact from another attempt)`);
        if (ctx.event !== input.event) fail(`R4 ${name}: artifact event ${ctx.event} != ${input.event}`);
        if (ctx.project !== project || ctx.bucket !== bucket) fail(`R4 ${name}: artifact context project/bucket ${ctx.project}/${ctx.bucket} mismatch`);
        if ((ctx.grep || '') !== '') fail(`R5 ${name}: a dispatch grep "${ctx.grep}" narrowed the selection`);
        if (String(ctx.repeat) !== String(repeat)) fail(`R4 ${name}: repeat ${ctx.repeat} != expected ${repeat}`);
      }
      if (!Array.isArray(expected)) { fail(`R5 ${name}: no source-derived membership available`); continue; }
      if (!art.results) { fail(`R5 ${name}: results.json missing/unparseable in ${aName}`); continue; }
      const got = walkSpecs(art.results, project);
      const gotIds = got.map((g) => g.id).sort();
      const expIds = [...expected].sort();
      row.executed = got.reduce((n, g) => n + (g.test.results || []).length, 0);
      const missing = expIds.filter((x) => !gotIds.includes(x));
      const extra = gotIds.filter((x) => !expIds.includes(x));
      if (missing.length || extra.length) fail(`R5 ${name}: executed identities != membership (missing ${missing.length}, extra ${extra.length}); selection was narrowed or membership drifted`);
      if (expIds.length === 0) {
        if (got.length !== 0 || row.executed !== 0) fail(`R5 ${name}: membership is empty but results contain tests`);
        row.passed = 0; row.failed = 0;
        if (art.lastRun && art.lastRun.status && art.lastRun.status !== 'passed') fail(`R5 ${name}: empty selection but .last-run.json status ${art.lastRun.status}`);
        if ((art.results.errors || []).length) fail(`R6 ${name}: results.json reports ${art.results.errors.length} run-level error(s)`);
        row.verdict = reasons.some((r) => r.includes(`${name}:`)) ? 'FAIL' : 'OK (legitimately empty: 0 selected, 0 executed, 0 passed)';
        continue;
      }
      let passed = 0, failed = 0;
      for (const { id, test } of got) {
        const results = test.results || [];
        const allPassed = results.length === repeat && results.every((r) => r.status === 'passed');
        if (allPassed && test.status === 'expected') passed += 1; else failed += 1;
        if (required) {
          if (results.length !== repeat) fail(`R6 ${name}: "${id}" has ${results.length} result(s), expected ${repeat}`);
          for (const r of results) if (r.status !== 'passed') fail(`R6 ${name}: "${id}" result status ${r.status}`);
          if (test.status !== 'expected') fail(`R6 ${name}: "${id}" test status ${test.status}`);
        }
      }
      row.passed = passed; row.failed = failed;
      if ((art.results.errors || []).length) fail(`R6 ${name}: results.json reports ${art.results.errors.length} run-level error(s)`);
      if (required && art.lastRun && art.lastRun.status !== 'passed') fail(`R6 ${name}: .last-run.json status ${art.lastRun.status}`);
      if (required && art.results.stats && (art.results.stats.unexpected || art.results.stats.skipped || art.results.stats.flaky)) fail(`R6 ${name}: stats unexpected=${art.results.stats.unexpected} skipped=${art.results.stats.skipped} flaky=${art.results.stats.flaky}`);
      row.verdict = reasons.some((r) => r.includes(`${name}:`)) ? 'FAIL' : (required ? 'OK' : `OK (coverage complete; ${failed} failing ${bucket} test(s) visible, not blocking)`);
    }
  }
  return { eligible: reasons.length === 0, reasons, rows, sha: input.sha, headSha: input.headSha, event: input.event, runId: input.runId, attempt: input.attempt, repeat };
}

// ---- input gathering (CLI) --------------------------------------------------------------
export function readArtifactDir(dir, { stripPrefix = 'e2e/' } = {}) {
  const ev = join(dir, 'ci-evidence');
  const res = join(dir, 'test-results');
  const out = { uploadOk: false, inventoryOk: 'no inventory', context: null, results: null, lastRun: null };
  out.uploadOk = existsSync(join(ev, 'UPLOAD_OK')) && statSync(join(ev, 'UPLOAD_OK')).size > 0;
  const inv = join(ev, 'INVENTORY.sha256');
  if (existsSync(inv)) {
    const lines = readFileSync(inv, 'utf8').split('\n').filter((l) => /^[0-9a-f]{64}  /.test(l));
    if (!lines.length) out.inventoryOk = 'inventory has no digest lines';
    else {
      let bad = 0, n = 0;
      for (const l of lines) {
        const digest = l.slice(0, 64); let p = l.slice(66);
        if (p.startsWith(stripPrefix)) p = p.slice(stripPrefix.length);
        const f = join(dir, p);
        n += 1;
        if (!existsSync(f) || createHash('sha256').update(readFileSync(f)).digest('hex') !== digest) bad += 1;
      }
      out.inventoryOk = bad === 0 ? true : `${bad} of ${n} listed digests do not match retained bytes`;
    }
  }
  if (existsSync(join(ev, 'run.context'))) out.context = parseContext(readFileSync(join(ev, 'run.context'), 'utf8'));
  try { if (existsSync(join(res, 'results.json'))) out.results = JSON.parse(readFileSync(join(res, 'results.json'), 'utf8')); } catch { out.results = null; }
  try { if (existsSync(join(res, '.last-run.json'))) out.lastRun = JSON.parse(readFileSync(join(res, '.last-run.json'), 'utf8')); } catch { out.lastRun = null; }
  return out;
}

export function listMembership(e2eDir) {
  const membership = {};
  for (const project of PROJECTS) {
    membership[project] = {};
    for (const bucket of BUCKETS) {
      const r = spawnSync('npx', ['playwright', 'test', '--list', '--reporter=json', `--project=${project}`], { cwd: e2eDir, encoding: 'utf8', env: { ...process.env, E2E_BUCKET: bucket, E2E_GREP: '' }, maxBuffer: 64 * 1024 * 1024 });
      if (r.status !== 0 && !r.stdout.trim().startsWith('{')) throw new Error(`playwright --list failed for ${project}/${bucket}: ${r.stderr.slice(0, 400)}`);
      membership[project][bucket] = walkSpecs(JSON.parse(r.stdout), project).map((g) => g.id);
    }
  }
  return membership;
}

export async function fetchJobs(repo, runId, attempt, token) {
  const jobs = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/repos/${repo}/actions/runs/${runId}/attempts/${attempt}/jobs?per_page=100&page=${page}`;
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!resp.ok) throw new Error(`jobs API ${resp.status} for run ${runId} attempt ${attempt}`);
    const body = await resp.json();
    for (const j of body.jobs || []) jobs.push({ name: j.name, status: j.status, conclusion: j.conclusion });
    if ((body.jobs || []).length < 100) break;
  }
  return jobs;
}

const argv = (flag, dflt) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : dflt; };
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  (async () => {
    const sha = argv('--sha'); const headSha = argv('--head-sha', ''); const event = argv('--event'); const runId = argv('--run-id'); const attempt = argv('--attempt', '1');
    const artifactsDir = argv('--artifacts'); const e2eDir = argv('--e2e', 'e2e'); const outDir = argv('--out', 'gate'); const expectedRepeat = Number(argv('--expected-repeat', '1'));
    const repo = process.env.GITHUB_REPOSITORY; const token = process.env.GITHUB_TOKEN;
    mkdirSync(outDir, { recursive: true });
    const artifacts = {};
    if (artifactsDir && existsSync(artifactsDir)) for (const d of readdirSync(artifactsDir)) if (statSync(join(artifactsDir, d)).isDirectory()) artifacts[d] = readArtifactDir(join(artifactsDir, d));
    let jobs = [];
    let gatherError = null;
    try { jobs = await fetchJobs(repo, runId, attempt, token); } catch (e) { gatherError = `jobs API: ${e.message}`; }
    let membership = {};
    try { membership = listMembership(e2eDir); } catch (e) { gatherError = (gatherError ? gatherError + '; ' : '') + e.message; }
    const verdict = evaluate({ sha, headSha, event, runId, attempt, expectedRepeat, jobs, membership, artifacts });
    if (gatherError) { verdict.eligible = false; verdict.reasons.unshift(`R7 could not gather inputs (fail closed): ${gatherError}`); }
    writeFileSync(join(outDir, 'merge-eligibility.json'), JSON.stringify({ ...verdict, artifactsSeen: Object.keys(artifacts), jobsSeen: jobs }, null, 2));
    const table = ['| job | conclusion | artifact | selected | executed | passed | failed | verdict |', '|---|---|---|---:|---:|---:|---:|---|',
      ...verdict.rows.map((r) => `| ${r.job} | ${r.job_conclusion} | ${r.artifact} | ${r.selected ?? '-'} | ${r.executed ?? '-'} | ${r.passed ?? '-'} | ${r.failed ?? '-'} | ${r.verdict} |`)];
    const head = `## ${CHECK_NAME}: ${verdict.eligible ? 'ELIGIBLE' : 'INELIGIBLE'}\n\ncandidate ${sha} (head ${headSha || 'n/a'}), event ${event}, run ${runId} attempt ${attempt}, expected repeat ${expectedRepeat}\n\n`;
    const reasonsMd = verdict.reasons.length ? `\n\n### Reasons\n${verdict.reasons.map((r) => `- ${r}`).join('\n')}\n` : '\n\nAll required acceptance jobs completed successfully with complete, source-verified selections on this exact commit; every evidence artifact finalized and verified.\n';
    const md = head + table.join('\n') + reasonsMd;
    writeFileSync(join(outDir, 'merge-eligibility.md'), md);
    if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, md, { flag: 'a' });
    const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    if (verdict.eligible) console.log(`::notice title=${CHECK_NAME}::ELIGIBLE — ${sha} (${event}, run ${runId}/${attempt}): all 12 jobs completed, 4 acceptance jobs green with complete selections, 12 evidence artifacts verified`);
    else console.log(`::error title=${CHECK_NAME}::INELIGIBLE — ${sha} (${event}, run ${runId}/${attempt}): ${esc(verdict.reasons.slice(0, 8).join(' | '))}${verdict.reasons.length > 8 ? ` | +${verdict.reasons.length - 8} more` : ''}`);
    process.exit(verdict.eligible ? 0 : 1);
  })().catch((e) => { console.log(`::error title=${CHECK_NAME}::INELIGIBLE — gate crashed (fail closed): ${String(e.message).slice(0, 300)}`); process.exit(1); });
}
