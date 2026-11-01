/**
 * App.tsx wraps the app in src/components/AuthProvider. Any component that reads auth from a different
 * provider (e.g. src/hooks/useAuth) finds no context and crashes the whole app on load.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const SKIP_DIRS = new Set(['_archived', 'node_modules', '__tests__']);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(e.name) ? [full] : [];
  });
}

describe('auth provider consistency', () => {
  it('no component reads useAuth from hooks/useAuth, which App.tsx does not provide', () => {
    const offenders = sourceFiles(SRC).filter(f =>
      /import\s*\{[^}]*\buseAuth\b[^}]*\}\s*from\s*['"][./]*hooks\/useAuth['"]/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(offenders.map(f => path.relative(SRC, f))).toEqual([]);
  });
});
