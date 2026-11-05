// The AI boundary (owner decisions 2 and 3): advice only on explicit coach action, never a write.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createDisabledAdvisor, requestAdvice, type Advisor, type AdvisoryRequest } from '../advisory';
import { installConcept } from '../install';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { PASS_CONCEPTS } from '../content/concepts.pass';

const doublesWithCoveredY = () => {
  const f = structuredClone(SPREAD_FORMATIONS.find(x => x.id === 'doubles')!);
  f.players = f.players.map(p => (p.role === 'Y' ? { ...p, onLine: true } : p));
  return f;
};

const makeRequest = (): AdvisoryRequest => {
  const r = installConcept(structuredClone(PASS_CONCEPTS.find(c => c.id === 'smash')!), doublesWithCoveredY());
  if (r.status !== 'ok') throw new Error('expected ok');
  return {
    capability: 'explain-rule-conflict',
    trigger: { kind: 'coach-action', action: 'tapped "Explain this problem"' },
    teamId: 't1',
    context: { installation: r.value, findings: r.findings },
  };
};

describe('requestAdvice', () => {
  it('refuses any request that is not an explicit coach action', async () => {
    const bad = { ...makeRequest(), trigger: { kind: 'auto', action: 'edit' } } as unknown as AdvisoryRequest;
    await expect(requestAdvice(createDisabledAdvisor(), bad)).rejects.toThrow('only available when a coach asks');
  });

  it('with live AI off, still explains the engine findings, labelled as deterministic facts', async () => {
    const res = await requestAdvice(createDisabledAdvisor(), makeRequest());
    expect(res.status).toBe('disabled');
    const fact = res.statements.find(s => s.basis === 'deterministic-fact' && s.text.includes('not an eligible receiver'));
    expect(fact?.text).toContain('eleven-player@1');
    expect(res.suggestions.some(s => s.includes('off the line'))).toBe(true);
  });

  it('the advisor receives a frozen copy: it cannot change the coach play', async () => {
    const request = makeRequest();
    const before = JSON.stringify(request);
    const tamperer: Advisor = {
      async advise(req) {
        expect(Object.isFrozen(req.context.installation.assignments)).toBe(true);
        expect(() => {
          (req.context.installation.assignments as unknown as unknown[]).pop();
        }).toThrow();
        return { status: 'answered', statements: [], suggestions: [] };
      },
    };
    await requestAdvice(tamperer, request);
    expect(JSON.stringify(request)).toBe(before);
  });

  it('rejects an advisor response that tries to carry a play or patch', async () => {
    const sneaky = {
      async advise() {
        return { status: 'answered', statements: [], suggestions: [], patch: [{ op: 'replace' }] };
      },
    } as unknown as Advisor;
    await expect(requestAdvice(sneaky, makeRequest())).rejects.toThrow('may not contain: patch');
  });

  it('a provider failure returns "unavailable" and leaves the play alone', async () => {
    const broken: Advisor = { advise: () => Promise.reject(new Error('provider down')) };
    const res = await requestAdvice(broken, makeRequest());
    expect(res.status).toBe('unavailable');
    expect(res.statements[0].text).toContain('Your play is unchanged');
  });
});

describe('no automatic AI in the editor or engine', () => {
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
    });

  it('the playbook screen and football engine never import an AI provider or client', () => {
    const offenders = [...files('src/features/playbook2'), ...files('src/football-core')].filter(f =>
      /from ['"][^'"]*(ai-proxy|ai-service|AIContext|ai-brain|@anthropic-ai|openai|@google\/genai)['"]/.test(
        readFileSync(f, 'utf8'),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
