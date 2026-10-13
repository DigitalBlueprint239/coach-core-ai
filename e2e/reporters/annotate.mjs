// Playwright reporter: GitHub Actions annotations per browser project, so the
// PASS/FAIL/BLOCKED evidence is readable from the Checks API. A test marked
// test.fixme / test.skip is reported as BLOCKED (its reason annotation is the
// dependency) and is NEVER counted as passed.
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
      ? String(result.error?.message || result.status).replace(/\x1b\[[0-9;]*m/g, '').split('\n')[0].slice(0, 300)
      : (status === 'BLOCKED' || status === 'SKIPPED') ? (blocked?.description || status.toLowerCase()) : '';
    this.rows.push({ project, title: test.title, status, msg, ms: result.duration });
  }

  onEnd() {
    if (!process.env.GITHUB_ACTIONS) return;
    const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    const projects = [...new Set(this.rows.map((r) => r.project))];
    for (const p of projects) {
      const rows = this.rows.filter((r) => r.project === p);
      const n = (s) => rows.filter((r) => r.status === s).length;
      const level = n('FAIL') > 0 ? 'error' : 'notice';
      const body = rows.map((r) => `${r.status} ${r.title}${r.msg ? ` -- ${r.msg}` : ''}`).join('\n');
      // Commas separate annotation properties, so the title must not contain one.
      process.stdout.write(`::${level} title=${esc(`E2E ${p}: ${n('PASS')} passed / ${n('FAIL')} failed / ${n('BLOCKED')} blocked / ${n('SKIPPED')} skipped`)}::${esc(body)}\n`);
    }
  }
}
