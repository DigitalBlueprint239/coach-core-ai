/**
 * App.tsx wraps the app in src/components/AuthProvider, the only auth system. The second one
 * (src/hooks/useAuth) was rendered nowhere; any component reading from it found no context and crashed the
 * whole app on load. It has been deleted and must not come back.
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

  it('the old second auth system (src/hooks/useAuth.tsx) is gone', () => {
    expect(fs.existsSync(path.join(SRC, 'hooks', 'useAuth.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(SRC, 'hooks', 'useAuth.ts'))).toBe(false);
  });

  it('no file imports anything from hooks/useAuth', () => {
    const offenders = sourceFiles(SRC).filter(f =>
      /from\s*['"][./]*hooks\/useAuth['"]/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(offenders.map(f => path.relative(SRC, f))).toEqual([]);
  });
});
