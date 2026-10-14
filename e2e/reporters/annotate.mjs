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
      ? String(result.error?.message || result.status).replace(/\x1b\[[0-9;]*m/g, '')
        .split('\n').filter((l) => l.trim()).slice(0, 4).join(' | ').slice(0, 900)
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
      // Aggregate per test title so repeated runs fit the 4 KB annotation limit:
      // "PASS 10/10", "FAIL 3/10 (first error)", "BLOCKED".
      const byTitle = new Map();
      for (const r of rows) {
        const t = byTitle.get(r.title) || { pass: 0, fail: 0, blocked: 0, skipped: 0, msg: '', blockMsg: '' };
        if (r.status === 'PASS') t.pass += 1;
        else if (r.status === 'FAIL') { t.fail += 1; if (!t.msg) t.msg = r.msg; }
        else if (r.status === 'BLOCKED') { t.blocked += 1; t.blockMsg = r.msg; }
        else t.skipped += 1;
        byTitle.set(r.title, t);
      }
      const id = (title) => title.split(' ')[0];
      const lines = [...byTitle.entries()].map(([title, t]) => {
        const runs = t.pass + t.fail;
        if (t.fail) return `FAIL ${t.fail}/${runs} ${id(title)} -- ${t.msg.slice(0, 160)}`;
        if (t.pass) return `PASS ${t.pass}/${runs} ${id(title)}`;
        if (t.blocked) return `BLOCKED ${id(title)} -- ${t.blockMsg.slice(0, 90)}`;
        return `SKIPPED ${id(title)}`;
      });
      lines.sort((a, b) => (a.startsWith('FAIL') ? 0 : 1) - (b.startsWith('FAIL') ? 0 : 1));
      const body = lines.join('\n');
      // Commas separate annotation properties, so the title must not contain one.
      process.stdout.write(`::${level} title=${esc(`E2E ${p}: ${n('PASS')} passed / ${n('FAIL')} failed / ${n('BLOCKED')} blocked / ${n('SKIPPED')} skipped`)}::${esc(body)}\n`);
    }
  }
}
