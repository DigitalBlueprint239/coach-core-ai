// Proves an ordinary production build contains no Film review preview: no Film chunk, annotation
// collection path, sample paths or hashes, sample media files or Film navigation entry.
// Usage: node tests/film-f1/production-exclusion.cjs <buildDir>   (build with `npm run build`, flags unset)
const fs = require('fs'), path = require('path');
const dir = path.resolve(process.argv[2] || 'build');
if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`No build at ${dir}`); process.exit(2); }
const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } }; walk(dir);
const forbidden = ['filmAnnotations', 'coach-film-annotation', '/film-preview', 'Film Review', 'synthetic preview only', 'synthetic-out-route-v1',
  'a3b4285499e64d89f99b755cbf4d320ab60b3d142a53c115e4040e83f39404d2', 'a74f85cb02aaefb6eb42ed05d143c261e595903e4b5a75a49736e787e88da381'];
let failures = 0;
for (const needle of forbidden) {
  const hits = files.filter((f) => /\.(js|css|html|json|txt|map)$/.test(f) && fs.readFileSync(f, 'utf8').includes(needle));
  if (hits.length) { failures++; console.log(`FAIL "${needle}" found in ${hits.map((h) => path.relative(dir, h)).join(', ')}`); } else console.log(`PASS "${needle}" absent`);
}
const media = files.filter((f) => /\.(mp4|webm)$/i.test(f));
if (media.length) { failures++; console.log(`FAIL media files present: ${media.map((m) => path.relative(dir, m)).join(', ')}`); } else console.log('PASS no .mp4/.webm files');
console.log(`SUMMARY production exclusion: ${forbidden.length + 1 - failures} passed, ${failures} failed (${files.length} files scanned)`);
process.exit(failures ? 1 : 0);
