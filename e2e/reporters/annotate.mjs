// Playwright reporter: GitHub Actions annotations per browser project, so the
// PASS/FAIL/BLOCKED evidence is readable from the Checks API. A test marked
// test.fixme / test.skip is reported as BLOCKED (its reason annotation is the
// dependency) and is NEVER counted as passed.
//
// Diagnostics (2026-10-14, H2/FX-02 investigation; observability only, no
// assertion or timeout changes):
//  - per-test duration min/median/max in the summary line;
//  - for every FAIL: duration, every error's first line, the step still open
//    when it ended and the slowest steps (one "diag" annotation per project);
//  - a census of every step >= SLOW_MS across ALL executions, pass or fail,
//    so a stall like FX-02 (48 s locator wait) is visible even when it passes.
import { appendFileSync } from 'node:fs';
const SLOW_MS = Number(process.env.E2E_SLOW_MS) || 10_000;
const LIMIT = 3900; // stay under the observed ~4 KB annotation message cut-off

const clean = (s) => String(s ?? '').replace(/\x1b\[[0-9;]*m/g, '');
const firstLine = (s) => clean(s).split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
const sec = (ms) => (ms < 0 ? 'still open at end' : `${(ms / 1000).toFixed(1)}s`);
const id = (title) => title.split(' ')[0];

/** Flatten the step tree: actions, expects and named test.steps, with their enclosing test.step path. */
function flatten(steps, parent = '') {
  const out = [];
  for (const s of steps || []) {
    // Fixture/hook steps (browser launch, context close) are setup/teardown, not the test's own work.
    if (s.category === 'hook' || s.category === 'fixture') continue;
    const path = parent ? `${parent} > ${s.title}` : s.title;
    if (['pw:api', 'expect', 'test.step'].includes(s.category)) {
      const at = s.location ? `@${s.location.file.split(/[\\/]/).pop()}:${s.location.line}` : '';
      out.push({ title: `${s.title}${at}`, path: `${path}${at}`, category: s.category, start: +s.startTime, duration: s.duration });
    }
    out.push(...flatten(s.steps, s.category === 'test.step' ? path : parent));
  }
  return out;
}

export default class AnnotateReporter {
  constructor() { this.rows = []; this.selected = new Map(); this.configuredProjects = []; }

  /** Record what was SELECTED per project so an empty job can say so explicitly (B11 review). */
  onBegin(config, suite) {
    this.configuredProjects = (config?.projects || []).map((p) => p.name);
    for (const t of suite?.allTests?.() || []) {
      const name = t.parent?.project()?.name || 'unknown';
      this.selected.set(name, (this.selected.get(name) || 0) + 1);
    }
  }

  onTestEnd(test, result) {
    const project = test.parent?.project()?.name || 'unknown';
    const blocked = test.annotations.find((a) => a.type === 'blocked')
      || test.annotations.find((a) => (a.type === 'fixme' || a.type === 'skip') && a.description)
      || [...test.annotations, ...result.annotations].find((a) => a.type === 'skip' && a.description);
    let status;
    if (result.status === 'skipped') {
      // Declared product dependency -> BLOCKED; anything else (e.g. local
      // auth-only run) -> SKIPPED. Neither ever counts as passed.
      status = test.annotations.some((a) => a.type === 'blocked') ? 'BLOCKED' : 'SKIPPED';
    }
    else if (result.status === 'passed' && test.outcome() === 'expected') status = 'PASS';
    else status = 'FAIL';
    const msg = status === 'FAIL'
      ? clean(result.error?.message || result.status)
        .split('\n').filter((l) => l.trim()).slice(0, 4).join(' | ').slice(0, 900)
      : (status === 'BLOCKED' || status === 'SKIPPED') ? (blocked?.description || status.toLowerCase()) : '';
    const steps = flatten(result.steps);
    const slow = steps.filter((s) => s.duration >= SLOW_MS && s.category !== 'test.step');
    let diag = '';
    if (status === 'FAIL') {
      const errs = (result.errors || []).map((e) => firstLine(e.message)).filter(Boolean);
      // The step that ended last; a step still open at the end (duration -1) wins.
      const end = (x) => (x.duration < 0 ? Infinity : x.start + x.duration);
      const last = [...steps].sort((a, b) => end(b) - end(a))[0];
      const top = steps.filter((s) => s.category !== 'test.step').sort((a, b) => b.duration - a.duration).slice(0, 3);
      diag = `${id(test.title)} #${test.repeatEachIndex} ${result.status} ${sec(result.duration)}`
        + ` | errors: ${errs.map((e) => e.slice(0, 140)).join(' || ')}`
        + ` | last step: ${last ? `${last.path.slice(0, 160)} (${sec(last.duration)})` : 'none'}`
        + ` | slowest: ${top.map((s) => `${s.title.slice(0, 90)} ${sec(s.duration)}`).join('; ')}`;
    }
    // Runtime diagnostic data (type 'diag-data'), e.g. the N2 network lifecycle.
    const seenData = new Set();
    const data = [...(result.annotations || []), ...test.annotations]
      .filter((a) => a.type === 'diag-data' && a.description && !seenData.has(a.description) && seenData.add(a.description))
      .map((a) => a.description);
    this.rows.push({
      project, title: test.title, status, msg, ms: result.duration, diag, rep: test.repeatEachIndex,
      slow: slow.map((s) => `${s.title.slice(0, 90)} ${sec(s.duration)}`), data,
    });
  }

  onEnd(result) {
    if (!process.env.GITHUB_ACTIONS) return;
    const summary = (line) => { if (process.env.GITHUB_STEP_SUMMARY) { try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, line); } catch { /* best-effort */ } } };
    summary('| project [bucket] | pass | fail | blocked | skipped | buckets (pass/fail) |\n|---|---|---|---|---|---|\n');
    const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    // Commas separate annotation properties, so titles must not contain one.
    const emit = (level, title, body) => process.stdout.write(`::${level} title=${esc(title)}::${esc(body.slice(0, LIMIT))}\n`);
    const bucketName = process.env.E2E_BUCKET && process.env.E2E_BUCKET !== 'all' ? process.env.E2E_BUCKET : '';
    const bucketTag = bucketName ? ` [${bucketName}]` : '';
    // Run-level outcome first, so a cancelled or interrupted job is never read as a quiet pass.
    const runStatus = result?.status || 'unknown';
    if (runStatus !== 'passed' && runStatus !== 'failed') {
      emit('error', `E2E run ${runStatus}${bucketTag}`, `The Playwright run ended with status "${runStatus}" (interrupted/cancelled/timed out). Per-test counts below are PARTIAL and must not be read as a complete result.`);
      summary(`| (run) ${bucketTag.trim() || 'all'} | — | — | — | — | **run ${runStatus}: partial results** |\n`);
    }
    // Projects with no completed results. Two different situations, never conflated
    // (Codex re-review of e5b33ef): (a) the selection was genuinely EMPTY (0 selected),
    // or (b) tests WERE selected but none completed (interrupted/timed out/setup error
    // before the first result). Zero tests are never reported as passed tests.
    const targeted = process.env.PROJECT ? [process.env.PROJECT] : this.configuredProjects;
    const grep = process.env.E2E_GREP ? ` and grep "${process.env.E2E_GREP}"` : '';
    for (const p of targeted) {
      if (this.rows.some((r) => r.project === p)) continue;
      const sel = this.selected.get(p) || 0;
      if (sel > 0) {
        emit('error', `E2E ${p}${bucketTag}: ${sel} tests selected but NONE completed (run ${runStatus})`,
          `Project "${p}"${bucketName ? `, bucket "${bucketName}"` : ''}: ${sel} tests selected, 0 completed, 0 passed, 0 failed. The run ended with status "${runStatus}" before the first result (interrupted, timed out, or a setup/global error). This is an INCOMPLETE run: tests were selected and did not finish. It is not a pass.`);
        summary(`| ${p}${bucketTag} | **${sel} selected, 0 completed** | — | — | — | **incomplete: run ${runStatus} before any result** |\n`);
        continue;
      }
      // Genuinely empty: explain it as the result of the CURRENT filters. Whether the bucket
      // has no tests at all for this project is established only when no grep narrows it.
      const why = grep ? `the current filters (project "${p}"${bucketName ? `, bucket "${bucketName}"` : ''}${grep}) selected no tests`
        : bucketName ? `no "${bucketName}" tests exist for project "${p}" under its own filter` : `project "${p}"'s own filter selected no tests`;
      emit('notice', `E2E ${p}${bucketTag}: 0 tests selected (empty selection; nothing ran)`,
        `Project "${p}"${bucketName ? `, bucket "${bucketName}"` : ''}: 0 tests selected, 0 executed, 0 passed, 0 failed; ${why}. The job succeeds only via --pass-with-no-tests; this is an empty selection, not a passing test result.`);
      summary(`| ${p}${bucketTag} | 0 tests selected | — | — | — | empty selection (${why}); nothing ran |\n`);
    }
    const projects = [...new Set(this.rows.map((r) => r.project))];
    for (const p of projects) {
      const rows = this.rows.filter((r) => r.project === p);
      const n = (s) => rows.filter((r) => r.status === s).length;
      const level = n('FAIL') > 0 ? 'error' : 'notice';
      // Aggregate per test title so repeated runs fit the annotation limit:
      // "PASS 10/10 X [min/med/max s]", "FAIL 3/10 X [...] -- first error", "BLOCKED".
      const byTitle = new Map();
      for (const r of rows) {
        const t = byTitle.get(r.title) || { pass: 0, fail: 0, blocked: 0, skipped: 0, msg: '', blockMsg: '', ms: [] };
        if (r.status === 'PASS') t.pass += 1;
        else if (r.status === 'FAIL') { t.fail += 1; if (!t.msg) t.msg = r.msg; }
        else if (r.status === 'BLOCKED') { t.blocked += 1; t.blockMsg = r.msg; }
        else t.skipped += 1;
        if (r.status === 'PASS' || r.status === 'FAIL') t.ms.push(r.ms);
        byTitle.set(r.title, t);
      }
      const stats = (ms) => {
        if (!ms.length) return '';
        const s = [...ms].sort((a, b) => a - b);
        const f = (v) => (v / 1000).toFixed(1);
        return ` [${f(s[0])}/${f(s[Math.floor(s.length / 2)])}/${f(s[s.length - 1])}s]`;
      };
      const lines = [...byTitle.entries()].map(([title, t]) => {
        const runs = t.pass + t.fail;
        if (t.fail) return `FAIL ${t.fail}/${runs} ${id(title)}${stats(t.ms)} -- ${t.msg.slice(0, 120)}`;
        if (t.pass) return `PASS ${t.pass}/${runs} ${id(title)}${stats(t.ms)}`;
        if (t.blocked) return `BLOCKED ${id(title)} -- ${t.blockMsg.slice(0, 90)}`;
        return `SKIPPED ${id(title)}`;
      });
      lines.sort((a, b) => (a.startsWith('FAIL') ? 0 : 1) - (b.startsWith('FAIL') ? 0 : 1));
      // Diagnostic tests ("[diagnostic]" in the title) are counted separately from acceptance.
      // Tests tagged "[obsolete-fault-model]" (Coach Drew, 2026-10-15: original N2-A2,
      // whose SDK-WebChannel fault no longer reaches the REST save path) still run
      // and are reported, but are counted apart from acceptance and diagnostics.
      const diagT = (r) => /\[diagnostic\]/.test(r.title);
      const obsT = (r) => /\[obsolete-fault-model\]/.test(r.title);
      const accT = (r) => !diagT(r) && !obsT(r);
      const cnt = (pred, st) => rows.filter((r) => pred(r) && r.status === st).length;
      const split = ` · acceptance ${cnt(accT, 'PASS')}/${cnt(accT, 'FAIL')} · diagnostic ${cnt(diagT, 'PASS')}/${cnt(diagT, 'FAIL')}`
        + ` · obsolete-fault-model ${cnt(obsT, 'PASS')}/${cnt(obsT, 'FAIL')} (pass/fail)`;
      const bucket = bucketTag;
      emit(level, `E2E ${p}${bucket}: ${n('PASS')} passed / ${n('FAIL')} failed / ${n('BLOCKED')} blocked / ${n('SKIPPED')} skipped${split}`, lines.join('\n'));
      // B11: one line per job in the GitHub job summary so the three bucket conclusions
      // can be read without opening annotations. Same numbers as the annotation title.
      summary(`| ${p}${bucket} | ${n('PASS')} | ${n('FAIL')} | ${n('BLOCKED')} | ${n('SKIPPED')} |${split.replace(/ · /g, ' ').trim()} |\n`);

      // Failure diagnostics: the first failure of each distinct test first, so a
      // test failing 10/10 cannot push a 1/10 intermittent out of the annotation.
      const fails = rows.filter((r) => r.diag);
      if (fails.length) {
        const firsts = []; const rest = []; const seen = new Set();
        for (const r of fails) {
          if (seen.has(r.title)) rest.push(r); else { seen.add(r.title); firsts.push(r); }
        }
        emit('warning', `E2E ${p} diag: ${fails.length} failed executions`, [...firsts, ...rest].map((r) => r.diag).join('\n'));
      }
      // Slow-step census across every execution, pass or fail.
      const slowRows = rows.filter((r) => r.slow.length);
      const body = slowRows.map((r) => `${r.status} ${id(r.title)} #${r.rep}: ${r.slow.join('; ')}`).join('\n');
      emit('notice', `E2E ${p} slow steps >= ${SLOW_MS / 1000}s: ${slowRows.length} of ${rows.length} executions`, body || 'none');
      // Diagnostic data, one annotation per project (failures first), capped by LIMIT.
      const dataRows = rows.filter((r) => r.data.length).sort((a, b) => (a.status === 'FAIL' ? 0 : 1) - (b.status === 'FAIL' ? 0 : 1));
      if (dataRows.length) {
        emit('notice', `E2E ${p} diag data: ${dataRows.length} executions`,
          dataRows.map((r) => `${r.status} ${id(r.title)} #${r.rep}: ${r.data.join(' ')}`).join('\n'));
      }
    }
  }
}
