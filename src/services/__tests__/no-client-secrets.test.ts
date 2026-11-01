/**
 * Guard: front-end code must never read an AI provider key or a shared proxy token from REACT_APP_*
 * env vars — Vite (like CRA before it) inlines every REACT_APP_* value into the public JavaScript bundle,
 * whether it is read as import.meta.env.REACT_APP_* or process.env.REACT_APP_*.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..');
const FORBIDDEN = /REACT_APP_[A-Z0-9_]*(OPENAI|ANTHROPIC|CLAUDE|GEMINI|PROXY_TOKEN|SECRET|PRIVATE)[A-Z0-9_]*/g;
// Any provider API key. The Firebase web API key is public by design and the only allowed *_API_KEY.
const FORBIDDEN_API_KEY = /REACT_APP_(?!FIREBASE_API_KEY\b)[A-Z0-9_]*API_KEY[A-Z0-9_]*/g;
const findForbidden = (text: string) => [...(text.match(FORBIDDEN) ?? []), ...(text.match(FORBIDDEN_API_KEY) ?? [])];
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
      findForbidden(fs.readFileSync(f, 'utf8')).map(m => `${path.relative(SRC, f)}: ${m}`),
    );
    expect(hits).toEqual([]);
  });

  it('the patterns catch provider keys however they are read', () => {
    expect(findForbidden('import.meta.env.REACT_APP_OPENAI_API_KEY')).not.toEqual([]);
    expect(findForbidden('process.env.REACT_APP_OPENAI_KEY')).not.toEqual([]);
    expect(findForbidden('import.meta.env.REACT_APP_ANTHROPIC_KEY')).not.toEqual([]);
    expect(findForbidden('import.meta.env.REACT_APP_MISTRAL_API_KEY')).not.toEqual([]);
    expect(findForbidden('import.meta.env.REACT_APP_AI_PROXY_TOKEN')).not.toEqual([]);
    expect(findForbidden('import.meta.env.REACT_APP_FIREBASE_API_KEY')).toEqual([]);
  });

  it('only REACT_APP_* variables reach the bundle (Vite envPrefix is unchanged)', () => {
    const config = fs.readFileSync(path.resolve(SRC, '..', 'vite.config.ts'), 'utf8');
    expect(config).toMatch(/envPrefix:\s*'REACT_APP_'/);
  });
});
