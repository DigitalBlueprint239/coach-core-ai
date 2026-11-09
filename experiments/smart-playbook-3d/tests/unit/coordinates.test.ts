import { describe, expect, it } from 'vitest';
import { PROFILES, pxToYards, yardsToPx } from '../../src/model/profiles';
import { projectPlays } from '../../src/model/adapter';
import { worldToYards, yardsToWorld, RULESETS, FIELD_WIDTH_YD, fieldLayout } from '../../src/model/field';
import { LEGACY_AMBIGUOUS, LEGACY_CLASSIFIED, MODERN_DEFENSE, MODERN_OFFENSE, referenceFormation } from '../../src/fixtures/plays';
import type { CanonicalScene } from '../../src/model/types';

const TOL = 0.01;
const modern = PROFILES['cc-halffield-px-v1'];

describe('coordinate profiles', () => {
  it('maps the PR #91 contract anchors exactly', () => {
    expect(pxToYards(modern, { x: 300, y: 190 })).toEqual({ xYd: 0, yYd: 0 });
    expect(pxToYards(modern, { x: 120, y: 190 })).toEqual({ xYd: -18, yYd: 0 });
    expect(pxToYards(modern, { x: 300, y: 245 })).toEqual({ xYd: 0, yYd: -5.5 });
    expect(pxToYards(modern, { x: 300, y: 40 })).toEqual({ xYd: 0, yYd: 15 });
  });

  it('round-trips px → yd → px and yd → px → yd within 0.01 yd in every quadrant', () => {
    const samples: [number, number][] = [];
    for (let x = -30; x <= 30; x += 2.5) for (let y = -12; y <= 20; y += 1.75) samples.push([x, y]);
    samples.push([-26.6667, 0], [26.6667, 0], [0.0001, -0.0001], [-17.2, 17], [13.333, -7.777]);
    let worst = 0;
    for (const profile of Object.values(PROFILES)) {
      for (const [xYd, yYd] of samples) {
        const back = pxToYards(profile, yardsToPx(profile, { xYd, yYd }));
        worst = Math.max(worst, Math.abs(back.xYd - xYd), Math.abs(back.yYd - yYd));
        const px = yardsToPx(profile, { xYd, yYd });
        const again = yardsToPx(profile, pxToYards(profile, px));
        expect(Math.abs(again.x - px.x) / profile.pxPerYard).toBeLessThanOrEqual(TOL);
        expect(Math.abs(again.y - px.y) / profile.pxPerYard).toBeLessThanOrEqual(TOL);
      }
    }
    expect(worst).toBeLessThanOrEqual(TOL);
  });

  it('round-trips canonical yards ↔ Three.js world, with offense attacking −Z', () => {
    for (const [x, y] of [[-20, 15], [20, -10], [0, 0], [-5.5, -7.25], [26.67, 19]]) {
      const [wx, wy, wz] = yardsToWorld(x, y);
      expect(wy).toBe(0);
      expect(Math.sign(wz) || 0).toBe(y === 0 ? 0 : -Math.sign(y));
      const back = worldToYards(wx, wz);
      expect(Math.abs(back.xYd - x)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(back.yYd - y)).toBeLessThanOrEqual(TOL);
    }
  });

  it('does not clamp off-field coordinates', () => {
    expect(pxToYards(modern, { x: -500, y: 900 })).toEqual({ xYd: -80, yYd: -71 });
  });
});

describe('adapter: known modern fixtures', () => {
  const scene = projectPlays([MODERN_OFFENSE, MODERN_DEFENSE]) as CanonicalScene;

  it('is verified and flagged as a prototype composition of 22 players', () => {
    expect(scene.status).toBe('verified');
    expect(scene.players).toHaveLength(22);
    expect(scene.prototypeComposition).toBe(true);
    expect(scene.warnings.some(w => w.startsWith('Preview composition'))).toBe(true);
  });

  it('recovers the reference-yard anchors from stored pixels (cross-checks fixture JSON)', () => {
    // Roles repeat on defense (two DE, two CB), so match on the stable reference id.
    for (const [envelope, formationId, prefix] of [[MODERN_OFFENSE, 'shotgun-doubles', 'off'], [MODERN_DEFENSE, '4-3-over', 'def']] as const) {
      for (const ref of referenceFormation(formationId).players) {
        const p = scene.players.find(sp => sp.playKey === envelope.key && sp.id === `${prefix}-${ref.id}`)!;
        expect(p.label).toBe(ref.role);
        expect(Math.abs(p.xYd - ref.x_yards)).toBeLessThanOrEqual(TOL);
        expect(Math.abs(p.yYd - ref.y_yards)).toBeLessThanOrEqual(TOL);
      }
    }
  });

  it('keeps stored player ids unchanged and puts the offensive line on the LOS', () => {
    const ids = scene.players.filter(p => p.playKey === 'offense').map(p => p.id);
    expect(ids).toEqual(MODERN_OFFENSE.play.players.map(p => p.id));
    for (const label of ['LT', 'LG', 'C', 'RG', 'RT']) {
      expect(scene.players.find(p => p.playKey === 'offense' && p.label === label)!.yYd).toBe(0);
    }
    expect(scene.players.filter(p => p.side === 'defense').every(p => p.yYd > 0)).toBe(true);
  });

  it('starts every route at its player and reads `path` routes without converting storage', () => {
    for (const r of scene.routes) {
      const owner = scene.players.find(p => p.uid === r.playerId)!;
      expect(Math.abs(r.points[0].xYd - owner.xYd)).toBeLessThanOrEqual(TOL);
      expect(Math.abs(r.points[0].yYd - owner.yYd)).toBeLessThanOrEqual(TOL);
      expect(r.illustrative).toBe(true);
    }
    expect(scene.routes.find(r => r.id === 'r-rb-swing')!.sourceKey).toBe('path');
    expect(scene.routes.find(r => r.id === 'r-x-go')!.sourceKey).toBe('points');
    const stored = MODERN_OFFENSE.play.routes.find(r => r.id === 'r-rb-swing')!;
    expect(stored.points).toBeUndefined();
    expect(stored.path).toHaveLength(4);
  });

  it('warns about (but keeps) players placed outside the sideline', () => {
    const wide = { ...MODERN_OFFENSE, play: { ...MODERN_OFFENSE.play, players: [{ id: 'w', x: 590, y: 190, position: 'Z' }], routes: [] } };
    const s = projectPlays([wide]) as CanonicalScene;
    expect(s.players[0].xYd).toBe(29);
    expect(s.warnings.some(w => w.includes('outside the sideline'))).toBe(true);
  });
});

describe('adapter: legacy safety', () => {
  it('withholds geometry entirely when no profile is supplied', () => {
    const result = projectPlays([LEGACY_AMBIGUOUS]);
    expect(result.status).toBe('unverified');
    expect('players' in result).toBe(false);
    expect(result.warnings[0]).toMatch(/unverified/);
  });

  it('never upgrades a classified legacy play to verified', () => {
    const result = projectPlays([LEGACY_CLASSIFIED]) as CanonicalScene;
    expect(result.status).toBe('classified');
    expect(result.warnings.some(w => w.includes('CLASSIFIED'))).toBe(true);
    // Mixed with verified plays, the weakest certification wins.
    expect((projectPlays([MODERN_DEFENSE, LEGACY_CLASSIFIED]) as CanonicalScene).status).toBe('classified');
  });

  it('makes the whole composition unverified if any part is unverified', () => {
    expect(projectPlays([MODERN_OFFENSE, LEGACY_AMBIGUOUS]).status).toBe('unverified');
  });

  it('does not infer a profile from pixel rows: identical pixels, different provenance, different results', () => {
    expect(LEGACY_AMBIGUOUS.play).toEqual(LEGACY_CLASSIFIED.play);
    expect(projectPlays([LEGACY_AMBIGUOUS]).status).toBe('unverified');
    expect(projectPlays([LEGACY_CLASSIFIED]).status).toBe('classified');
  });
});

describe('field geometry', () => {
  it('uses rule-book hash spacing per ruleset', () => {
    const feet = (yd: number) => yd * 3;
    expect(feet(FIELD_WIDTH_YD)).toBeCloseTo(160, 9);
    expect(feet(RULESETS.NFL.hashFromCenterYd * 2)).toBeCloseTo(18.5, 9);
    expect(feet(RULESETS.NCAA.hashFromCenterYd * 2)).toBeCloseTo(40, 9);
    expect(feet(FIELD_WIDTH_YD / 2 - RULESETS.HS.hashFromCenterYd)).toBeCloseTo(53 + 4 / 12, 9);
  });

  it('places goal lines and numbers relative to the view-only ball spot', () => {
    const layout = fieldLayout(35);
    expect(layout.ownGoalYd).toBe(-35);
    expect(layout.oppGoalYd).toBe(65);
    expect(layout.fiveYardLines).toHaveLength(21);
    expect(layout.fiveYardLines.find(l => l.yYd === 15)!.number).toBe(50);
    expect(layout.fiveYardLines.find(l => l.yYd === -5)!.number).toBe(30);
    expect(layout.tickLines).toHaveLength(80);
  });
});
