/**
 * Guard: front-end code must never read an AI provider key or a shared proxy token from REACT_APP_*
 * env vars — CRA inlines every REACT_APP_* value into the public JavaScript bundle.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const FORBIDDEN = /REACT_APP_[A-Z0-9_]*(OPENAI|ANTHROPIC|CLAUDE|GEMINI|PROXY_TOKEN|SECRET|PRIVATE)[A-Z0-9_]*/g;
const SKIP_DIRS = new Set(['_archived', 'node_modules', '__tests__']);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return SKIP_DIRS.has(e.name) ? [] : sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(e.name) ? [full] : [];
  });
}

describe('no client-side secrets', () => {
  it('no front-end file reads an AI provider key or proxy token from REACT_APP_* env vars', () => {
    const hits = sourceFiles(SRC).flatMap(f =>
      (fs.readFileSync(f, 'utf8').match(FORBIDDEN) ?? []).map(m => `${path.relative(SRC, f)}: ${m}`),
    );
    expect(hits).toEqual([]);
  });
});
