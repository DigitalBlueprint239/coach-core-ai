// Fails the build if Tailwind styles did not make it into the CSS bundle.
// Background: under Create React App the Tailwind 4 setup produced no utilities at all (every class was a
// no-op), and nothing noticed. This check runs after every `npm run build`, CI included.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join('build', 'assets');
let files;
try {
  files = readdirSync(assetsDir).filter((f) => f.endsWith('.css'));
} catch {
  console.error(`check-build: ${assetsDir} not found. Run the Vite build first.`);
  process.exit(1);
}
if (files.length === 0) {
  console.error('check-build: no CSS files in build/assets.');
  process.exit(1);
}

const css = files.map((f) => readFileSync(join(assetsDir, f), 'utf8')).join('\n');
// Both classes are used by the Dashboard's signed-out screen, so they must always be generated.
const required = ['.min-h-screen{', '.bg-gray-50{'];
const problems = required.filter((sel) => !css.includes(sel)).map((sel) => `missing ${sel.slice(0, -1)}`);
if (css.includes('@tailwind')) problems.push('raw @tailwind directive left in the CSS (PostCSS did not run)');

if (problems.length > 0) {
  console.error(`check-build: Tailwind styles are not in the build:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-build: Tailwind styles present in ${files.join(', ')}.`);
