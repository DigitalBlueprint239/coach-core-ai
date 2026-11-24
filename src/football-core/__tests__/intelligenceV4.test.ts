// Package 4 and 5 foundations: deterministic checks, shared timeline, and the advisory boundary.
import { createDisabledAdvisor, requestAdvice } from '../advisory';
import { authorizePlayAdvice, buildPlayAdviceRequest, toAdvisoryPlay } from '../advisoryV4';
import { checkPlayV4 } from '../checksV4';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { INTERPRETATION_V1, knownRouteV1 } from '../interpretations/v1';
import { createPlayDocV4, resolveGeometry, validatePlayDocV4, type PlayDocV4 } from '../playDocumentV4';
import { assignRoute, movePlayer, setBlock, setDefense, setLabel, setMotion, setNotes, setOnLine, setRole, setRoutePoints, templatePoints } from '../playEditsV4';
import { ROUTES } from '../routes';
import { NOMINAL_SPEED_YD_PER_S, buildTimeline, positionsAt } from '../timelineV4';

const fresh = (): PlayDocV4 => createPlayDocV4('team-secret', structuredClone(SPREAD_FORMATIONS[0]), 'Play');
const id = (play: PlayDocV4, role: string) => play.players.find(p => p.role === role)!.id;
const SKILL = ['X', 'Z', 'H', 'Y', 'F', 'TE', 'RB'];
const skill = (play: PlayDocV4) => play.players.filter(p => SKILL.includes(p.role));
const codes = (play: PlayDocV4) => checkPlayV4(play).map(f => f.code);

describe('route library additions', () => {
  it('adds slant, post, wheel and comeback with the expected shapes', () => {
    const end = (route: 'slant' | 'post' | 'wheel' | 'comeback') => { const p = templatePoints(route, 'right'); return p[p.length - 1]; };
    expect(end('slant').x).toBeLessThan(0);
    expect(end('post').x).toBeLessThan(0);
    expect(end('post').y).toBeGreaterThan(end('slant').y);
    expect(end('wheel').x).toBeGreaterThan(0);
    expect(end('wheel').y).toBeGreaterThan(10);
    const comeback = templatePoints('comeback', 'right');
    expect(comeback[1].y).toBeLessThan(comeback[0].y);
    expect(comeback[1].x).toBeGreaterThan(0);
    for (const route of ['slant', 'post', 'wheel', 'comeback'] as const) {
      expect(templatePoints(route, 'left').map(p => p.x)).toEqual(templatePoints(route, 'right').map(p => -p.x + 0));
    }
  });

  it('does not change the frozen interpretation of old plays', () => {
    expect(INTERPRETATION_V1).toBe('cc-interp@1');
    for (const route of ['slant', 'post', 'wheel', 'comeback']) expect(knownRouteV1(route)).toBe(false);
    for (const route of Object.keys(ROUTES)) expect(validatePlayDocV4(assignRoute(fresh(), skill(fresh())[0].id, route as keyof typeof ROUTES))).toEqual([]);
  });
});

describe('checkPlayV4', () => {
  it('a legal alignment with nothing assigned has no findings, and checking never changes the play', () => {
    const play = fresh();
    const before = JSON.stringify(play);
    expect(checkPlayV4(play)).toEqual([]);
    expect(JSON.stringify(play)).toBe(before);
  });

  it('reports an illegal formation with the rule profile it rests on, and that profile’s status', () => {
    const play = setOnLine(fresh(), id(fresh(), 'LT'), false);
    const finding = checkPlayV4(play).find(f => f.code === 'formation.illegal')!;
    expect(finding.severity).toBe('error');
    expect(finding.basis).toMatchObject({ profileId: 'eleven-player@1', authority: 'draft' });
    expect(finding.provisional).toBeUndefined();
  });

  it('reports an ineligible receiver by player id, and says so when it cannot decide', () => {
    const play = fresh();
    const guard = id(play, 'LG');
    const finding = checkPlayV4(assignRoute(play, guard, 'go')).find(f => f.code === 'eligibility.ineligible-receiver')!;
    expect(finding.playerIds).toEqual([guard]);
    const [a, b] = skill(play);
    const shared = assignRoute(setRole(play, b.id, a.role), guard, 'go');
    expect(codes(shared)).toContain('eligibility.undetermined');
    expect(codes(shared)).not.toContain('eligibility.ineligible-receiver');
  });

  it('uses the ball spot when deciding what is out of bounds', () => {
    const play = fresh();
    const p = skill(play)[0];
    const wide = movePlayer(play, p.id, { x: 22, y: -1 });
    const out = (hash: 'left' | 'middle' | 'right') =>
      checkPlayV4({ ...wide, ball: { hash } }).filter(f => f.code === 'field.player-out-of-bounds').flatMap(f => f.playerIds);
    expect(out('middle')).toEqual([]);
    expect(out('right')).toContain(p.id);
    expect(out('left')).not.toContain(p.id);
    // From the left hash a receiver split 19 yards to the left really is off the field.
    expect(out('left')).toEqual(wide.players.filter(pl => pl.at.x < -(53.33 / 2 - 8.89)).map(pl => pl.id));
    expect(codes(setRoutePoints(wide, p.id, [{ x: 10, y: 5 }]))).toContain('field.route-out-of-bounds');
  });

  it('marks coaching conventions as provisional and never as a rule', () => {
    const play = fresh();
    const [a, b] = skill(play);
    const at = (p: typeof a) => [{ x: 0 - p.at.x, y: 10 - p.at.y }];
    const crowded = setRoutePoints(setRoutePoints(play, a.id, at(a)), b.id, at(b));
    const finding = checkPlayV4(crowded).find(f => f.code === 'spacing.crowded-finish')!;
    expect(finding).toMatchObject({ severity: 'info', provisional: true, playerIds: [a.id, b.id] });
    expect(finding.basis).toBeUndefined();
  });

  it('lists unassigned skill players once assigning has started', () => {
    const play = fresh();
    const [a, ...rest] = skill(play);
    const finding = checkPlayV4(assignRoute(play, a.id, 'go')).find(f => f.code === 'assignment.missing')!;
    expect(finding.playerIds).toEqual(rest.map(p => p.id));
  });
});

describe('shared timeline', () => {
  const play = () => setRoutePoints(fresh(), skill(fresh())[0].id, [{ x: 0, y: 6 }, { x: 6, y: 6 }]);

  it('starts every player where he lines up and ends him at the end of the stored path', () => {
    const p = play();
    const timeline = buildTimeline(p);
    const path = resolveGeometry(p).routes[0].path;
    const mover = timeline.tracks[0].playerId;
    expect(timeline.duration).toBeCloseTo(12 / NOMINAL_SPEED_YD_PER_S, 9);
    expect(positionsAt(timeline, 0)[mover]).toEqual(path[0]);
    expect(positionsAt(timeline, -5)[mover]).toEqual(path[0]);
    expect(positionsAt(timeline, timeline.duration)[mover]).toEqual(path[2]);
    expect(positionsAt(timeline, 999)[mover]).toEqual(path[2]);
    const half = positionsAt(timeline, timeline.duration / 2)[mover];
    expect(half.x).toBeCloseTo(path[1].x, 9);
    expect(half.y).toBeCloseTo(path[1].y, 9);
  });

  it('is nominal, deterministic, and does not depend on the route library', () => {
    const p = assignRoute(fresh(), skill(fresh())[0].id, 'corner');
    const timeline = buildTimeline(p);
    expect(timeline.nominal).toBe(true);
    expect(buildTimeline(p)).toEqual(timeline);
    const live = ROUTES as Record<string, unknown>;
    const original = live.corner;
    try {
      delete live.corner;
      expect(buildTimeline(p)).toEqual(timeline);
    } finally {
      live.corner = original;
    }
  });

  it('never invents movement for assignments without geometry', () => {
    const [a, b] = skill(fresh());
    const timeline = buildTimeline(setMotion(setBlock(fresh(), a.id, 'down'), b.id, 'jet'));
    expect(timeline).toMatchObject({ duration: 0, tracks: [] });
    expect(timeline.notAnimated).toEqual([{ playerId: a.id, kind: 'block' }, { playerId: b.id, kind: 'motion' }]);
    expect(positionsAt(timeline, 1)).toEqual({});
  });

  it('tolerates a zero-length segment', () => {
    const p = setRoutePoints(fresh(), skill(fresh())[0].id, [{ x: 0, y: 0 }, { x: 0, y: 6 }]);
    const pos = Object.values(positionsAt(buildTimeline(p), 0.5))[0];
    expect(Number.isFinite(pos.x) && Number.isFinite(pos.y)).toBe(true);
  });
});

describe('advisory boundary', () => {
  const private_ = (): PlayDocV4 => {
    const base = fresh();
    const p = skill(base)[0];
    const play = setNotes(setLabel(assignRoute(setDefense(base, 'cover-3'), p.id, 'corner'), p.id, 'Jaylen'), 'Jaylen has a sore ankle');
    return {
      ...play, name: 'Jaylen special', tags: ['jaylen'], createdBy: 'uid-secret', read: [{ focus: 'corner', text: 'Find Jaylen' }],
      formation: { ...play.formation, sourceId: 'team:1', name: 'Jaylen set' },
      players: play.players.map(pl => (pl.id === p.id ? { ...pl, rosterRef: 'roster-secret' } : pl)),
      assignments: [...play.assignments, { kind: 'read', playerId: id(base, 'QB'), key: 'Jaylen', rule: 'throw to Jaylen' }],
    };
  };

  it('sends football only: no names, notes, labels, tags, roster links or identities', () => {
    const request = buildPlayAdviceRequest(private_(), { action: 'explain' });
    expect(JSON.stringify(request.context)).not.toMatch(/jaylen|ankle|secret/i);
    expect(toAdvisoryPlay(private_()).players).toHaveLength(11);
    expect(toAdvisoryPlay(private_()).routes).toHaveLength(1);
  });

  it('bounds the question and works through the existing disabled advisor without changing the play', async () => {
    const play = private_();
    const before = JSON.stringify(play);
    const request = buildPlayAdviceRequest(play, { action: 'explain', question: `  ${'q'.repeat(900)} ` });
    expect(request.context.question).toHaveLength(500);
    const response = await requestAdvice(createDisabledAdvisor(), request);
    expect(response.status).toBe('disabled');
    expect(JSON.stringify(play)).toBe(before);
  });

  it('only the team’s verified owner may ask, about that team’s v4 play', () => {
    const ok = { verifiedUid: 'owner', isAnonymous: false, team: { id: 't1', ownerId: 'owner' }, play: { teamId: 't1', schemaVersion: 4 } };
    expect(() => authorizePlayAdvice(ok)).not.toThrow();
    for (const bad of [
      { verifiedUid: null }, { verifiedUid: '' }, { isAnonymous: true }, { verifiedUid: 'member' }, { team: null }, { play: null },
      { play: { teamId: 't2', schemaVersion: 4 } }, { play: { teamId: 't1', schemaVersion: 3 } },
    ]) {
      expect(() => authorizePlayAdvice({ ...ok, ...bad }), JSON.stringify(bad)).toThrow();
    }
  });
});
