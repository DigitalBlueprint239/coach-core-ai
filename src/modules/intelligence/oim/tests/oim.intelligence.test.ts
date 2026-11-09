import { analyzePlay } from '../../core/analyze';
import { getAssistModeView } from '../../core/renderingPolicy';
import { smartPlaybookStateToCanonicalPlay } from '../adapters/smartPlaybookAdapter';
import type { CanonicalPlay } from '../../domains/canonicalPlay';

const mesh = require('./fixtures/mesh.json') as CanonicalPlay;
const smash = require('./fixtures/smash.json') as CanonicalPlay;
const flood = require('./fixtures/flood.json') as CanonicalPlay;
const verts = require('./fixtures/verts.json') as CanonicalPlay;
const stick = require('./fixtures/stick.json') as CanonicalPlay;

describe('OIM intelligence', () => {
  it('detects canonical concepts from golden fixtures', () => {
    expect(analyzePlay(mesh).detectedPatterns).toContain('mesh');
    expect(analyzePlay(smash).detectedPatterns).toContain('smash');
    expect(analyzePlay(flood).detectedPatterns).toContain('flood');
    expect(analyzePlay(verts).detectedPatterns).toContain('verts');
    expect(analyzePlay(stick).detectedPatterns).toContain('stick');
  });

  it('prevents spacing false positives when splits are valid', () => {
    const noCompression = smartPlaybookStateToCanonicalPlay({
      phase: 'offense',
      players: [
        { id: 'X', role: 'WR', x: 5, y: 0, routeType: 'go' },
        { id: 'Z', role: 'WR', x: 12, y: 0, routeType: 'go' },
      ],
    });

    const issues = analyzePlay(noCompression).issues.filter((issue) => issue.type === 'spacing-compression');
    expect(issues).toHaveLength(0);
  });

  it('ranks smart routing recommendations by priority and confidence', () => {
    const analysis = analyzePlay(mesh);
    expect(analysis.recommendations.length).toBeGreaterThan(0);
    expect(analysis.recommendations[0].confidence).toBeGreaterThanOrEqual(0.65);
  });

  it('applies assist-mode gating rules', () => {
    const assist = getAssistModeView(analyzePlay(mesh));
    expect(assist.surfacedRecommendations.every((r) => r.confidence >= 0.65)).toBe(true);
    expect(
      assist.surfacedIssues.every((issue) => issue.severity === 'critical' || issue.confidence >= 0.85),
    ).toBe(true);
  });

  it('maps smart playbook state into canonical play contract', () => {
    const play = smartPlaybookStateToCanonicalPlay({
      id: 'adapter-check',
      players: [{ id: 'Y', role: 'TE', x: 10, y: 0, routeType: 'stick', breakDepth: 5 }],
    });

    expect(play.id).toBe('adapter-check');
    expect(play.routeDefinitions[0].routeType).toBe('stick');
  });
});
