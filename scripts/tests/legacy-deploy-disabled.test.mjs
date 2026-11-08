import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// These are intentionally safe, offline tests: each historical entry point
// must fail before doing any build, network access, or cloud mutation.
for (const path of [
  'scripts/deploy.sh',
  'scripts/rollback.sh',
  'src/components/SmartPlaybook/scripts/deploy.sh',
]) {
  test(`legacy deployment entry point ${path} cannot mutate cloud resources`, () => {
    const script = readFileSync(path, 'utf8');
    assert.ok(script.includes('SECURITY HOLD'), path);
    assert.ok(!/^[^#\n]*\b(firebase|vercel)\s+(deploy|hosting:|functions:|--prod)/m.test(script), path);
    const result = spawnSync('bash', [path, '--prod'], {
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 1, path + ': ' + result.stderr);
    assert.match(result.stderr, /BLOCKED/);
  });
}
