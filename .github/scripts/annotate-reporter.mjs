// node:test custom reporter that turns results into GitHub Actions annotations,
// so pass/fail evidence is readable from the Checks API (job logs are not
// always accessible to reviewers). Use alongside the spec reporter:
//   node --test --test-reporter=spec --test-reporter-destination=stdout \
//        --test-reporter=./.github/scripts/annotate-reporter.mjs \
//        --test-reporter-destination=stdout ...
// Set ANNOTATE_LABEL to name the suite in the annotation title.

const label = process.env.ANNOTATE_LABEL || 'node:test';

export default async function* annotateReporter(source) {
  const lines = [];
  let pass = 0;
  let fail = 0;
  const failures = [];
  for await (const event of source) {
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue;
    const d = event.data;
    // Only leaf tests (it blocks); suites report details.type === 'suite'.
    if (d.details?.type === 'suite') continue;
    if (event.type === 'test:pass') {
      pass += 1;
      lines.push(`PASS ${d.name}`);
    } else {
      fail += 1;
      const err = d.details?.error;
      const msg = String(err?.cause?.message || err?.message || err || 'failed').split('\n')[0].slice(0, 300);
      lines.push(`FAIL ${d.name} -- ${msg}`);
      failures.push({ name: d.name, msg, file: d.file, line: d.line });
    }
  }
  const esc = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  for (const f of failures.slice(0, 10)) {
    yield `::error title=${esc(`${label} FAIL: ${f.name}`.slice(0, 200))}::${esc(f.msg)}\n`;
  }
  const level = fail > 0 ? 'error' : 'notice';
  // Commas separate annotation properties, so the title must not contain one.
  yield `::${level} title=${esc(`${label}: ${pass} passed / ${fail} failed`)}::${esc(lines.join('\n'))}\n`;
}
