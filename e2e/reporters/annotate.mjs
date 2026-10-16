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
  constructor() { this.rows = []; }

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

  onEnd() {
    if (!process.env.GITHUB_ACTIONS) return;
    const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    // Commas separate annotation properties, so titles must not contain one.
    const emit = (level, title, body) => process.stdout.write(`::${level} title=${esc(title)}::${esc(body.slice(0, LIMIT))}\n`);
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
      emit(level, `E2E ${p}: ${n('PASS')} passed / ${n('FAIL')} failed / ${n('BLOCKED')} blocked / ${n('SKIPPED')} skipped`, lines.join('\n'));

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
