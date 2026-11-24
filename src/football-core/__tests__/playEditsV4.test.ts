// Edit operations on v4 plays: every one is pure, addressed by player id, and leaves other players alone.
import {
  addRoutePoint, assignRoute, clearPlayer, describeAssignment, flipPlay, jobOf, motionOf, movePlayer, moveRoutePoint,
  outsideOf, playFromConceptV4, removeJob, removeRoutePoint, renamePlay, routeOf, setBlock, setDefense, setLabel, setMotion,
  setNotes, setOnLine, setProtect, setRole, setRouteDepth, setRoutePoints, setTags, templatePoints, ROUTE_LIBRARY_VERSION,
} from '../playEditsV4';
import { LIMITS, createPlayDocV4, resolveGeometry, validatePlayDocV4, type PlayDocV4 } from '../playDocumentV4';
import { applyConcept } from '../concepts';
import { PASS_CONCEPTS } from '../content/concepts.pass';
import { SPREAD_FORMATIONS } from '../content/formations.spread';

const doubles = () => structuredClone(SPREAD_FORMATIONS.find(f => f.id === 'doubles')!);
const fresh = (): PlayDocV4 => createPlayDocV4('t1', doubles(), 'Test');
const idOf = (play: PlayDocV4, role: string) => play.players.find(p => p.role === role)!.id;
const frozen = (play: PlayDocV4) => JSON.stringify(play);
const valid = (play: PlayDocV4) => expect(validatePlayDocV4(play)).toEqual([]);

describe('purity', () => {
  it('no operation modifies the play it is given', () => {
    const play = assignRoute(fresh(), 'p8', 'corner');
    const before = frozen(play);
    const ops: Array<(p: PlayDocV4) => PlayDocV4> = [
      p => movePlayer(p, 'p8', { x: 3, y: -2 }), p => setOnLine(p, 'p8', false), p => setRole(p, 'p8', 'Z'), p => setLabel(p, 'p8', 'Jet'),
      p => assignRoute(p, 'p9', 'dig', 14), p => setRouteDepth(p, 'p8', 15), p => setRoutePoints(p, 'p8', [{ x: 1, y: 1 }]),
      p => moveRoutePoint(p, 'p8', 0, { x: 2, y: 9 }), p => addRoutePoint(p, 'p8'), p => removeRoutePoint(p, 'p8', 0),
      p => setBlock(p, 'p1', 'down'), p => setProtect(p, 'p7', 'slide'), p => setMotion(p, 'p8', 'jet'), p => removeJob(p, 'p8'),
      p => clearPlayer(p, 'p8'), p => renamePlay(p, 'X'), p => setNotes(p, 'n'), p => setTags(p, ['a']), flipPlay, p => setDefense(p, 'cover-3'),
    ];
    for (const op of ops) {
      const result = op(play);
      expect(frozen(play)).toBe(before);
      valid(result);
    }
  });

  it('an unknown player id changes nothing', () => {
    const play = fresh();
    for (const result of [movePlayer(play, 'p99', { x: 1, y: 1 }), assignRoute(play, 'X', 'go'), setBlock(play, 'strong-1', 'down'), setMotion(play, 'nope', 'jet'), setRoutePoints(play, 'p99', [{ x: 1, y: 1 }])]) {
      expect(result).toBe(play);
    }
  });
});

describe('assignments belong to a player id', () => {
  it('a player has one job at a time; setting a new one replaces it in place and touches nobody else', () => {
    let play = assignRoute(assignRoute(fresh(), 'p8', 'corner'), 'p9', 'hitch');
    const others = JSON.stringify(play.assignments.filter(a => a.playerId !== 'p8'));
    play = setBlock(play, 'p8', 'down');
    expect(jobOf(play, 'p8')).toEqual({ kind: 'block', playerId: 'p8', rule: 'down' });
    expect(play.assignments.map(a => a.playerId)).toEqual(['p8', 'p9']);
    play = setProtect(play, 'p8', 'man');
    play = assignRoute(play, 'p8', 'go');
    expect(play.assignments.filter(a => a.playerId === 'p8')).toHaveLength(1);
    expect(JSON.stringify(play.assignments.filter(a => a.playerId !== 'p8'))).toBe(others);
    valid(play);
  });

  it('motion sits beside the job; removing the job keeps the motion; clearing removes both', () => {
    let play = setMotion(assignRoute(fresh(), 'p8', 'drag'), 'p8', 'jet');
    expect(motionOf(play, 'p8')?.motion).toBe('jet');
    play = setMotion(play, 'p8', 'orbit');
    expect(play.assignments.filter(a => a.kind === 'motion')).toHaveLength(1);
    expect(jobOf(removeJob(play, 'p8'), 'p8')).toBeUndefined();
    expect(motionOf(removeJob(play, 'p8'), 'p8')?.motion).toBe('orbit');
    expect(clearPlayer(play, 'p8').assignments).toEqual([]);
    expect(motionOf(setMotion(play, 'p8', null), 'p8')).toBeUndefined();
  });

  it('changing role, label or position never re-targets an assignment', () => {
    const start = assignRoute(assignRoute(fresh(), 'p8', 'corner'), 'p9', 'hitch');
    const edited = setLabel(setRole(movePlayer(start, 'p9', { x: -24, y: -1 }), 'p8', 'Z'), 'p8', 'Jet');
    expect(edited.assignments).toEqual(start.assignments);
    expect(resolveGeometry(edited).routes.find(r => r.playerId === 'p8')!.path).toEqual(resolveGeometry(start).routes.find(r => r.playerId === 'p8')!.path);
    expect(setLabel(edited, 'p8', '   ').players.find(p => p.id === 'p8')).not.toHaveProperty('label');
  });
});

describe('routes', () => {
  it('a library route stores its resolved shape and the template it came from', () => {
    const play = assignRoute(fresh(), 'p8', 'corner', 14);
    const route = routeOf(play, 'p8')!;
    const side = outsideOf(play, 'p8');
    expect(route.template).toEqual({ routeId: 'corner', side, depth: 14, interpretation: ROUTE_LIBRARY_VERSION });
    expect(route.points).toEqual(templatePoints('corner', side, 14));
    expect(routeOf(assignRoute(play, 'p8', 'corner'), 'p8')!.template).not.toHaveProperty('depth');
  });

  it('outside is the player’s own side of the ball; on the ball it is the formation’s strength', () => {
    const play = fresh();
    const left = play.players.find(p => p.at.x < 0 && p.role !== 'LT' && p.role !== 'LG')!;
    const right = play.players.find(p => p.at.x > 0 && p.role !== 'RT' && p.role !== 'RG')!;
    expect(outsideOf(play, left.id)).toBe('left');
    expect(outsideOf(play, right.id)).toBe('right');
    expect(outsideOf(play, idOf(play, 'QB'))).toBe(play.formation.strength);
    expect(routeOf(assignRoute(play, left.id, 'out'), left.id)!.points[1].x).toBeLessThan(0);
    expect(routeOf(assignRoute(play, right.id, 'out'), right.id)!.points[1].x).toBeGreaterThan(0);
  });

  it('changing depth re-applies the same template; an unusable depth is refused', () => {
    const play = assignRoute(fresh(), 'p8', 'dig');
    const deeper = setRouteDepth(play, 'p8', 15);
    expect(routeOf(deeper, 'p8')!.template).toMatchObject({ routeId: 'dig', depth: 15 });
    expect(routeOf(deeper, 'p8')!.points[0].y).toBe(15);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, 400, -50]) expect(setRouteDepth(play, 'p8', bad)).toBe(play);
  });

  it('hand-editing the shape drops the template, snaps to half yards and respects limits', () => {
    const play = assignRoute(fresh(), 'p8', 'corner');
    const edited = moveRoutePoint(play, 'p8', 1, { x: 5.26, y: 11.9 });
    expect(routeOf(edited, 'p8')!.template).toBeUndefined();
    expect(routeOf(edited, 'p8')!.points[1]).toEqual({ x: 5.5, y: 12 });
    expect(routeOf(edited, 'p8')!.points[0]).toEqual(routeOf(play, 'p8')!.points[0]);
    expect(setRouteDepth(edited, 'p8', 20)).toBe(edited); // a custom route has no depth to change
    expect(moveRoutePoint(play, 'p8', 9, { x: 0, y: 0 })).toBe(play);
    expect(routeOf(moveRoutePoint(play, 'p8', 0, { x: 999, y: -999 }), 'p8')!.points[0]).toEqual({ x: LIMITS.coordinateYd, y: -LIMITS.coordinateYd });

    let long = play;
    for (let i = 0; i < 20; i++) long = addRoutePoint(long, 'p8');
    expect(routeOf(long, 'p8')!.points).toHaveLength(LIMITS.routePoints);
    valid(long);
    let short = play;
    for (let i = 0; i < 5; i++) short = removeRoutePoint(short, 'p8', 0);
    expect(routeOf(short, 'p8')!.points).toHaveLength(1);
  });

  it('adding a point continues the last segment; on a player with no route it starts one', () => {
    const play = setRoutePoints(fresh(), 'p8', [{ x: 0, y: 6 }]);
    expect(routeOf(addRoutePoint(play, 'p8'), 'p8')!.points).toEqual([{ x: 0, y: 6 }, { x: 0, y: 9 }]);
    expect(routeOf(addRoutePoint(fresh(), 'p9'), 'p9')!.points).toEqual([{ x: 0, y: 5 }]);
  });
});

describe('play-level edits', () => {
  it('flip mirrors players, routes, templates, ball and defense, keeps ids, and twice is the original', () => {
    const play = setDefense(assignRoute(assignRoute(fresh(), 'p8', 'corner'), 'p9', 'out'), 'cover-3');
    const flipped = flipPlay(play);
    expect(flipped.players.map(p => p.id)).toEqual(play.players.map(p => p.id));
    expect(flipped.formation.strength).not.toBe(play.formation.strength);
    expect(flipped.assignments.map(a => a.playerId)).toEqual(play.assignments.map(a => a.playerId));
    const before = resolveGeometry(play);
    const after = resolveGeometry(flipped);
    before.routes.forEach((r, i) => expect(after.routes[i].path).toEqual(r.path.map(pt => ({ x: -pt.x + 0, y: pt.y }))));
    before.defenders.forEach((d, i) => expect(after.defenders[i].at).toEqual({ x: -d.at.x + 0, y: d.at.y }));
    expect(routeOf(flipped, 'p8')!.template!.side).not.toBe(routeOf(play, 'p8')!.template!.side);
    expect(flipPlay(flipped)).toEqual(play);
    expect(flipPlay({ ...play, ball: { hash: 'left' } }).ball).toEqual({ hash: 'right' });
    valid(flipped);
  });

  it('the defensive look is resolved once and stored; clearing removes it', () => {
    const play = setDefense(fresh(), 'cover-2');
    expect(play.defense).toMatchObject({ coverageId: 'cover-2', alignedBy: 'cc-align@1' });
    expect(play.defense!.defenders).toHaveLength(11);
    expect(new Set(play.defense!.defenders.map(d => d.id)).size).toBe(11);
    const moved = movePlayer(play, 'p8', { x: 2, y: -3 });
    expect(moved.defense).toEqual(play.defense);
    expect(setDefense(play, null)).not.toHaveProperty('defense');
    valid(setDefense(play, null));
  });

  it('tags are cleaned, names and notes are bounded', () => {
    expect(setTags(fresh(), [' Red Zone ', 'red zone', '', 'Shot']).tags).toEqual(['red zone', 'shot']);
    expect(setTags(fresh(), Array.from({ length: 40 }, (_, i) => `t${i}`)).tags).toHaveLength(LIMITS.tags);
    expect(renamePlay(fresh(), 'x'.repeat(500)).name).toHaveLength(LIMITS.nameChars);
    expect(setNotes(fresh(), 'y'.repeat(9000)).notes).toHaveLength(LIMITS.notesChars);
  });

  it('describes assignments in plain words', () => {
    const play = setMotion(assignRoute(fresh(), 'p8', 'corner', 14), 'p8', 'jet');
    expect(play.assignments.map(describeAssignment)).toEqual(['Corner at 14 yd', 'Jet motion']);
    expect(describeAssignment(routeOf(moveRoutePoint(play, 'p8', 0, { x: 1, y: 1 }), 'p8')!)).toBe('Custom route');
    expect(describeAssignment({ kind: 'block', playerId: 'p1', rule: 'zone-playside' })).toBe('Block: zone playside');
    expect(describeAssignment({ kind: 'protect', playerId: 'p1', rule: 'unspecified' })).toBe('Pass protect');
  });
});

describe('creating a play from a library concept', () => {
  it('draws exactly what the concept engine draws, with every route stored on a player', () => {
    let compared = 0;
    for (const formation of SPREAD_FORMATIONS) {
      for (const concept of PASS_CONCEPTS) {
        const applied = applyConcept(concept, formation);
        const { play, missing } = playFromConceptV4('t1', concept, formation);
        valid(play);
        expect(play.concept).toEqual({ id: concept.id, family: 'pass' });
        if (!applied.ok) {
          expect(missing).toEqual(expect.arrayContaining(applied.missing));
          continue;
        }
        const drawn = resolveGeometry(play).routes;
        expect(drawn).toHaveLength(applied.routes.length);
        for (const expected of applied.routes) {
          const index = formation.players.findIndex(p => p.role === expected.role && p.at.x === expected.points[0].x && p.at.y === expected.points[0].y);
          const mine = drawn.find(r => r.playerId === play.players[index].id)!;
          mine.path.forEach((pt, i) => {
            expect(pt.x).toBeCloseTo(expected.points[i].x, 9);
            expect(pt.y).toBeCloseTo(expected.points[i].y, 9);
          });
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(20);
  });

  it('once created, the play no longer depends on slots: moving a receiver keeps every route with its player', () => {
    const { play } = playFromConceptV4('t1', PASS_CONCEPTS.find(c => c.id === 'smash')!, doubles());
    const routed = play.assignments.filter(a => a.kind === 'route').map(a => a.playerId);
    const moved = movePlayer(play, routed[0], { x: play.players.find(p => p.id === routed[0])!.at.x * 1.5, y: -1 });
    expect(moved.assignments).toEqual(play.assignments);
  });
});
