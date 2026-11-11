// The coach's journey through the v4 editor, end to end against an in-memory store that behaves like playStoreV4
// (revision numbers, conflicts, failures). The thread through every test: an assignment belongs to a player id and
// stays with that player through edits, saves, reopening, conversion and error recovery.
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayDocV4, migratePlayToV4, publishedLibrary, assignRoute, setTags, type PlayDocV4 } from '../../../../football-core';
import { PASS_CONCEPTS } from '../../../../football-core/content/concepts.pass';
import PlaybookV4Screen from '../PlaybookV4Screen';
import { deletePlayV4, loadPlayDocsV4, savePlayDocV4 } from '../../playStoreV4';
import { draftKey } from '../useDraftV4';

type Stored = { play: PlayDocV4; version: 2 | 3 | 4 };
const db = vi.hoisted(() => ({
  plays: new Map<string, { play: unknown; version: number }>(),
  next: 1,
  skipped: 0,
  fail: null as null | 'offline',
}));
const env = vi.hoisted(() => ({
  user: { uid: 'coach1', isAnonymous: false } as unknown,
  team: { id: 't1', name: 'Eagles', ownerId: 'coach1' } as unknown,
}));

vi.mock('../../../../components/AuthProvider', () => ({ useAuth: () => ({ user: env.user, loading: false }) }));
vi.mock('../../../../contexts/TeamContext', () => ({ useTeam: () => ({ currentTeam: env.team }) }));
vi.mock('../../playStoreV4', () => {
  const conflict = (storedRevision: number | null) => ({
    kind: 'conflict',
    storedRevision,
    message: "Couldn't save: this play was changed somewhere else since you opened it. Your changes are still here — reload to see the other version before saving again.",
  });
  return {
    isPlayConflict: (e: unknown) => typeof e === 'object' && e !== null && (e as { kind?: unknown }).kind === 'conflict',
    loadPlayDocsV4: vi.fn(async () => ({
      plays: [...db.plays].map(([id, v]) => ({ ...structuredClone(v.play as object), id, sourceSchemaVersion: v.version })),
      skipped: db.skipped,
    })),
    savePlayDocV4: vi.fn(async (play: { revision: number }, uid: string, target: { id?: string; expectedRevision?: number } = {}) => {
      if (db.fail === 'offline') throw new Error('unavailable');
      if (!target.id) {
        const id = `play-${db.next++}`;
        db.plays.set(id, { play: { ...structuredClone(play), revision: 1, createdBy: uid }, version: 4 });
        return { id, revision: 1 };
      }
      const stored = db.plays.get(target.id) as { play: { revision: number } } | undefined;
      if (!stored) throw conflict(null);
      if (stored.play.revision !== target.expectedRevision) throw conflict(stored.play.revision);
      const revision = (target.expectedRevision ?? 0) + 1;
      db.plays.set(target.id, { play: { ...structuredClone(play), revision }, version: 4 });
      return { id: target.id, revision };
    }),
    deletePlayV4: vi.fn(async (_teamId: string, id: string) => {
      db.plays.delete(id);
    }),
  };
});

const FORMATION = publishedLibrary().formations[0];
const LINE = ['LT', 'LG', 'C', 'RG', 'RT'];
const skill = FORMATION.players.map((p, i) => ({ role: p.role, id: `p${i + 1}` })).filter(p => !LINE.includes(p.role) && p.role !== 'QB');
const A = skill[0].id;
const B = skill[1].id;
const LINEMAN = `p${FORMATION.players.findIndex(p => p.role === 'LT') + 1}`;

const stored = (id: string) => db.plays.get(id) as Stored | undefined;
const seed = (id: string, play: PlayDocV4, version: 2 | 3 | 4 = 4) => db.plays.set(id, { play, version });
const basePlay = (name: string, tags: string[] = []) => setTags(assignRoute(createPlayDocV4('t1', FORMATION, name), A, 'corner'), tags);

const desk = () => document.querySelector('.pb2-desk') as HTMLElement;
const playerEl = (id: string) => desk().querySelector(`[data-testid="offense-player"][data-player="${id}"]`) as SVGGElement;
const routes = () => [...desk().querySelectorAll('[data-testid="route"]')] as SVGPathElement[];
const routeD = (id: string) => routes().find(r => r.getAttribute('data-player') === id)?.getAttribute('d') ?? null;
const handles = () => [...desk().querySelectorAll('[data-testid="route-handle"]')] as SVGGElement[];
const select = (label: string, value: string) => userEvent.selectOptions(screen.getByLabelText(label), value);
const button = (name: string | RegExp) => screen.getByRole('button', { name });

async function openLibrary() {
  const view = render(<PlaybookV4Screen />);
  await waitFor(() => expect(screen.queryByText('Loading your plays…')).not.toBeInTheDocument());
  return view;
}
async function newPlay() {
  const view = await openLibrary();
  await userEvent.click(button('New play'));
  await screen.findByRole('button', { name: 'Save play' });
  return view;
}
async function openStored(name: string) {
  const view = await openLibrary();
  await userEvent.click(await screen.findByRole('button', { name: `Open ${name}` }));
  await screen.findByRole('button', { name: 'Save play' });
  return view;
}
/** A pointer event with real coordinates (jsdom's PointerEvent support varies; React only needs the type). */
function pointer(el: Element, type: 'pointerdown' | 'pointermove' | 'pointerup', x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  fireEvent(el, event);
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  db.plays.clear();
  db.next = 1;
  db.skipped = 0;
  db.fail = null;
  env.user = { uid: 'coach1', isAnonymous: false };
  env.team = { id: 't1', name: 'Eagles', ownerId: 'coach1' };
});
afterEach(() => vi.restoreAllMocks());

describe('signed-out and team-less states', () => {
  it('asks a signed-out or anonymous visitor to sign in, and a coach without a team to pick one', () => {
    env.user = null;
    const first = render(<PlaybookV4Screen />);
    expect(screen.getByText('Sign in to build your playbook.')).toBeInTheDocument();
    first.unmount();
    env.user = { uid: 'anon', isAnonymous: true };
    const second = render(<PlaybookV4Screen />);
    expect(screen.getByText('Sign in to build your playbook.')).toBeInTheDocument();
    second.unmount();
    env.user = { uid: 'coach1', isAnonymous: false };
    env.team = null;
    render(<PlaybookV4Screen />);
    expect(screen.getByText('Pick a team to build its playbook.')).toBeInTheDocument();
  });
});

describe('building a play', () => {
  it('select a player, assign, change, set depth, reshape and remove a route', async () => {
    await newPlay();
    expect(screen.getByText('Tap a player on the field to give him an assignment.')).toBeInTheDocument();
    expect(routes()).toHaveLength(0);

    await userEvent.click(playerEl(A));
    expect(playerEl(A)).toHaveAttribute('aria-pressed', 'true');
    await select('Assignment', 'route');
    expect(screen.getByLabelText('Route')).toHaveValue('hitch');
    expect(routes()).toHaveLength(1);
    const hitch = routeD(A);
    expect(hitch).not.toBeNull();

    await select('Route', 'corner');
    expect(routes()).toHaveLength(1);
    const corner = routeD(A);
    expect(corner).not.toBe(hitch);

    fireEvent.change(screen.getByLabelText('Depth (yards)'), { target: { value: '16' } });
    const deeper = routeD(A);
    expect(deeper).not.toBe(corner);
    expect(screen.getByLabelText('Depth (yards)')).toHaveValue(16);

    // Reshape by hand: the route becomes a custom route and keeps belonging to the same player.
    const before = handles().length;
    await userEvent.click(button('Add route point'));
    expect(handles()).toHaveLength(before + 1);
    fireEvent.keyDown(handles()[0], { key: 'ArrowUp' });
    expect(routeD(A)).not.toBe(deeper);
    expect(screen.getByLabelText('Route')).toHaveValue('');
    expect(within(screen.getByLabelText('Route')).getByRole('option', { name: 'Custom route' })).toBeInTheDocument();
    await userEvent.click(button('Remove last point'));
    expect(handles()).toHaveLength(before);

    await userEvent.click(button('Remove assignment'));
    expect(routes()).toHaveLength(0);
    expect(screen.getByLabelText('Assignment')).toHaveValue('none');
  });

  it('blocking, protection and motion are assigned per player and never disturb another player', async () => {
    await newPlay();
    await userEvent.click(playerEl(A));
    await select('Assignment', 'route');
    await select('Route', 'dig');
    const digPath = routeD(A);

    await userEvent.click(playerEl(B));
    await select('Assignment', 'block');
    await select('Block type', 'down');
    await select('Pre-snap motion', 'jet');
    const list = within(screen.getByRole('region', { name: 'Assignments' }));
    expect(list.getByText(/Block: down; Jet motion/)).toBeInTheDocument();
    await select('Assignment', 'protect');
    await select('Protection', 'slide');
    expect(list.getByText(/Pass protect: slide; Jet motion/)).toBeInTheDocument();
    await select('Pre-snap motion', '');
    expect(list.queryByText(/motion/)).not.toBeInTheDocument();

    // A lineman can block; he is not offered motion.
    await userEvent.click(playerEl(LINEMAN));
    expect(screen.queryByLabelText('Pre-snap motion')).not.toBeInTheDocument();
    await select('Assignment', 'block');
    await select('Block type', 'zone-playside');

    expect(routeD(A)).toBe(digPath);
    expect(routes()).toHaveLength(1);
  });

  it("moving, relabelling or re-lining a player never hands his route to someone else", async () => {
    await newPlay();
    await userEvent.click(playerEl(A));
    await select('Assignment', 'route');
    await select('Route', 'corner');
    await userEvent.click(playerEl(B));
    await select('Assignment', 'route');
    await select('Route', 'hitch');
    const bPath = routeD(B);
    const aStart = routeD(A);

    // Walk B well past A (the move that made v2 swap their routes).
    for (let i = 0; i < 40; i++) fireEvent.keyDown(playerEl(B), { key: FORMATION.players[Number(A.slice(1)) - 1].at.x < 0 ? 'ArrowLeft' : 'ArrowRight' });
    await userEvent.type(screen.getByLabelText('Label'), 'Jet');
    await userEvent.click(screen.getByLabelText('On the line of scrimmage'));

    expect(routeD(A)).toBe(aStart);
    expect(routeD(B)).not.toBe(bPath); // it moved with him
    await userEvent.click(playerEl(A));
    expect(screen.getByLabelText('Route')).toHaveValue('corner');
    await userEvent.click(playerEl(B));
    expect(screen.getByLabelText('Route')).toHaveValue('hitch');
    expect(routes().map(r => r.getAttribute('data-player')).sort()).toEqual([A, B].sort());
  });

  it('undo and redo step through edits one at a time', async () => {
    await newPlay();
    expect(button('Undo')).toBeDisabled();
    await userEvent.click(playerEl(A));
    await select('Assignment', 'route');
    await select('Route', 'go');
    const go = routeD(A);
    await userEvent.click(button('Remove assignment'));
    expect(routes()).toHaveLength(0);

    await userEvent.click(button('Undo'));
    expect(routeD(A)).toBe(go);
    await userEvent.click(button('Undo'));
    expect(routeD(A)).not.toBe(go);
    expect(routes()).toHaveLength(1);
    await userEvent.click(button('Undo'));
    expect(routes()).toHaveLength(0);
    expect(button('Undo')).toBeDisabled();
    await userEvent.click(button('Redo'));
    await userEvent.click(button('Redo'));
    expect(routeD(A)).toBe(go);
    // A new edit clears the redo branch.
    await userEvent.click(button('Flip'));
    expect(button('Redo')).toBeDisabled();
    expect(routeD(A)).not.toBe(go);
  });

  it('starts from a library concept with every route attached to a player', async () => {
    await openLibrary();
    const concept = publishedLibrary().concepts[0];
    await select('Start from', concept.id);
    await userEvent.click(button('New play'));
    await screen.findByRole('button', { name: 'Save play' });
    expect(screen.getByLabelText('Play name')).toHaveValue(concept.name);
    expect(routes().length).toBeGreaterThan(0);
    await userEvent.click(button('Save play'));
    await waitFor(() => expect(savePlayDocV4).toHaveBeenCalled());
    const sent = vi.mocked(savePlayDocV4).mock.calls[0][0];
    const ids = new Set(sent.players.map(p => p.id));
    expect(sent.assignments.every(a => ids.has(a.playerId))).toBe(true);
  });

  it('shows a stored defensive look and keeps it where it was saved', async () => {
    await newPlay();
    const coverage = publishedLibrary().coverages[0];
    await select('Defense shown', coverage.id);
    const defenders = () => [...desk().querySelectorAll('[data-testid="defender"]')].map(d => d.getAttribute('transform'));
    expect(defenders()).toHaveLength(11);
    const look = defenders();
    for (let i = 0; i < 10; i++) fireEvent.keyDown(playerEl(A), { key: 'ArrowUp' });
    expect(defenders()).toEqual(look);
    await select('Defense shown', '');
    expect(defenders()).toHaveLength(0);
  });
});

describe('touch and pointer interaction', () => {
  const size = () => vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 480, right: 600, bottom: 480, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);

  it('a tap selects without moving; a real drag moves the player once', async () => {
    size();
    await newPlay();
    const start = playerEl(A).getAttribute('transform');
    pointer(playerEl(A), 'pointerdown', 100, 100);
    pointer(playerEl(A), 'pointermove', 102, 101); // finger wobble
    pointer(playerEl(A), 'pointerup', 102, 101);
    fireEvent.click(playerEl(A));
    expect(playerEl(A).getAttribute('transform')).toBe(start);
    expect(playerEl(A)).toHaveAttribute('aria-pressed', 'true');
    expect(button('Undo')).toBeDisabled();

    pointer(playerEl(A), 'pointerdown', 100, 100);
    pointer(playerEl(A), 'pointermove', 160, 140);
    pointer(playerEl(A), 'pointermove', 200, 200);
    pointer(playerEl(A), 'pointerup', 200, 200);
    expect(playerEl(A).getAttribute('transform')).toBe('translate(200 200)');
    // One drag is one undo step.
    await userEvent.click(button('Undo'));
    expect(playerEl(A).getAttribute('transform')).toBe(start);
    expect(button('Undo')).toBeDisabled();
  });

  it('dragging a route handle reshapes only that route', async () => {
    size();
    await newPlay();
    await userEvent.click(playerEl(A));
    await select('Assignment', 'route');
    await userEvent.click(playerEl(B));
    await select('Assignment', 'route');
    const other = routeD(A);
    const mine = routeD(B);
    const last = () => handles()[handles().length - 1];
    pointer(last(), 'pointerdown', 300, 200);
    pointer(last(), 'pointermove', 360, 120);
    pointer(last(), 'pointerup', 360, 120);
    expect(routeD(B)).not.toBe(mine);
    expect(routeD(A)).toBe(other);
    expect(routes()).toHaveLength(2);
    await userEvent.click(button('Undo'));
    expect(routeD(B)).toBe(mine);
  });
});

describe('saving and reopening', () => {
  it('saves a new play, lists it, reopens it unchanged, then updates the same play', async () => {
    await newPlay();
    await userEvent.clear(screen.getByLabelText('Play name'));
    await userEvent.type(screen.getByLabelText('Play name'), 'Smash Right');
    await userEvent.click(playerEl(A));
    await select('Assignment', 'route');
    await select('Route', 'corner');
    await userEvent.click(playerEl(B));
    await select('Assignment', 'protect');
    const drawn = routeD(A);

    await userEvent.click(button('Save play'));
    expect(await screen.findByText('Saved as a new play.')).toBeInTheDocument();
    expect(vi.mocked(savePlayDocV4).mock.calls[0][2]).toEqual({});
    expect(screen.queryByText('Unsaved')).not.toBeInTheDocument();
    const saved = stored('play-1')!.play;
    expect(saved.assignments).toEqual([
      expect.objectContaining({ kind: 'route', playerId: A, template: expect.objectContaining({ routeId: 'corner' }) }),
      { kind: 'protect', playerId: B, rule: 'unspecified' },
    ]);

    await userEvent.click(button('All plays'));
    await userEvent.click(await screen.findByRole('button', { name: 'Open Smash Right' }));
    await screen.findByRole('button', { name: 'Save play' });
    expect(routeD(A)).toBe(drawn);
    expect(routes()).toHaveLength(1);
    await userEvent.click(playerEl(A));
    expect(screen.getByLabelText('Route')).toHaveValue('corner');

    await userEvent.type(screen.getByLabelText('Coaching notes'), 'Hi-lo the corner');
    await userEvent.click(button('Save play'));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(vi.mocked(savePlayDocV4).mock.calls[1][2]).toEqual({ id: 'play-1', expectedRevision: 1 });
    expect(stored('play-1')!.play).toMatchObject({ revision: 2, notes: 'Hi-lo the corner' });
    expect(stored('play-1')!.play.assignments).toEqual(saved.assignments);

    // A third save uses the revision the second one produced.
    await userEvent.click(button('Flip'));
    await userEvent.click(button('Save play'));
    await waitFor(() => expect(vi.mocked(savePlayDocV4).mock.calls[2][2]).toEqual({ id: 'play-1', expectedRevision: 2 }));
  });

  it('a play converted from an older version is saved as a new play; the original is untouched', async () => {
    const concept = PASS_CONCEPTS.find(c => c.id === 'smash')!;
    const v2 = { schemaVersion: 2, teamId: 't1', name: 'Old Smash', formation: structuredClone(FORMATION), conceptId: 'smash', assignments: structuredClone(concept.assignments), read: [], level: 'jv', tags: [], notes: '' };
    const converted = migratePlayToV4(v2, 'legacy-1');
    if (converted.status !== 'ok') throw new Error(converted.reason);
    seed('legacy-1', converted.value, 2);
    const original = JSON.stringify(stored('legacy-1'));

    await openStored('Old Smash');
    expect(screen.getByText(/made in an older version/)).toBeInTheDocument();
    const drawn = routes().map(r => r.getAttribute('d'));
    expect(drawn.length).toBeGreaterThan(0);
    await userEvent.click(button('Save play'));
    expect(await screen.findByText('Saved as a new play.')).toBeInTheDocument();
    expect(vi.mocked(savePlayDocV4).mock.calls[0][2]).toEqual({});
    expect(JSON.stringify(stored('legacy-1'))).toBe(original);
    expect(stored('play-1')!.play.provenance).toMatchObject({ origin: 'migrated', sourceId: 'legacy-1', fromSchemaVersion: 2 });
    expect(routes().map(r => r.getAttribute('d'))).toEqual(drawn);
    // Both are listed. Only the new v4 copy can be deleted from here; the older original cannot.
    await userEvent.click(button('All plays'));
    expect(await screen.findAllByRole('button', { name: 'Open Old Smash' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete Old Smash' })).toHaveLength(1);
  });
});

describe('organising plays', () => {
  beforeEach(() => {
    seed('a', { ...basePlay('Mesh', ['third down']), revision: 3 });
    seed('b', basePlay('Smash', ['red zone']));
    seed('c', basePlay('Four Verts', ['red zone', 'shot']));
    db.skipped = 2;
  });

  it('lists plays by name, searches by name, formation or tag, and filters by tag', async () => {
    await openLibrary();
    const names = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(names()).toEqual(['Four Verts', 'Mesh', 'Smash']);
    expect(screen.getByText(/2 older plays were drawn in a format/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search plays'), 'sma');
    expect(names()).toEqual(['Smash']);
    await userEvent.clear(screen.getByLabelText('Search plays'));
    await userEvent.type(screen.getByLabelText('Search plays'), 'third');
    expect(names()).toEqual(['Mesh']);
    await userEvent.clear(screen.getByLabelText('Search plays'));
    await userEvent.type(screen.getByLabelText('Search plays'), 'zzz');
    expect(screen.getByText('No plays match that search.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Search plays'));

    await select('Tag', 'red zone');
    expect(names()).toEqual(['Four Verts', 'Smash']);
    await select('Tag', '');
    expect(names()).toHaveLength(3);
  });

  it('renames a play and edits its tags', async () => {
    await openStored('Mesh');
    await userEvent.clear(screen.getByLabelText('Play name'));
    await userEvent.type(screen.getByLabelText('Play name'), 'Mesh Rail');
    await userEvent.clear(screen.getByLabelText('Tags (separate with commas)'));
    await userEvent.type(screen.getByLabelText('Tags (separate with commas)'), 'Third Down,  2-point , third down');
    await userEvent.tab();
    await userEvent.click(button('Save play'));
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect(stored('a')!.play).toMatchObject({ name: 'Mesh Rail', tags: ['third down', '2-point'], revision: 4 });
    await userEvent.click(button('All plays'));
    expect(await screen.findByRole('heading', { level: 3, name: 'Mesh Rail' })).toBeInTheDocument();
  });

  it('duplicates a play as a separate new play with the same football', async () => {
    await openLibrary();
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate Smash' }));
    expect(await screen.findByLabelText('Play name')).toHaveValue('Smash (copy)');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    await userEvent.click(button('Save play'));
    expect(await screen.findByText('Saved as a new play.')).toBeInTheDocument();
    const copy = stored('play-1')!.play;
    expect(copy.provenance).toEqual({ origin: 'duplicated', sourceId: 'b', sourceRevision: 1 });
    expect(copy.assignments).toEqual(stored('b')!.play.assignments);
    expect(copy.players).toEqual(stored('b')!.play.players);
    expect(stored('b')!.play.name).toBe('Smash');
    expect(db.plays.size).toBe(4);
  });

  it('deletes only after the coach confirms, and can be cancelled', async () => {
    await openLibrary();
    await userEvent.click(screen.getByRole('button', { name: 'Delete Smash' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete play' });
    expect(within(dialog).getByText(/saved history is removed too/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }));
    expect(deletePlayV4).not.toHaveBeenCalled();
    expect(db.plays.has('b')).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Smash' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete play' }));
    await waitFor(() => expect(deletePlayV4).toHaveBeenCalledWith('t1', 'b'));
    expect(await screen.findByText('Play deleted.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Smash' })).not.toBeInTheDocument();
    expect(db.plays.has('a')).toBe(true);
  });

  it('deleting the open play returns to the list; a failed delete removes nothing', async () => {
    await openStored('Mesh');
    vi.mocked(deletePlayV4).mockRejectedValueOnce(new Error('unavailable'));
    await userEvent.click(button('Delete'));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete play' }));
    expect(await screen.findByText("Couldn't delete the play. Nothing was removed.")).toBeInTheDocument();
    expect(db.plays.has('a')).toBe(true);
    expect(screen.getByLabelText('Play name')).toHaveValue('Mesh');

    await userEvent.click(button('Delete'));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete play' }));
    expect(await screen.findByLabelText('Search plays')).toBeInTheDocument();
    expect(db.plays.has('a')).toBe(false);
  });
});

describe('printing', () => {
  it('prints a play card built from the same stored play', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    seed('b', { ...basePlay('Smash', ['red zone']), notes: 'Throw the corner vs cover 2' });
    await openStored('Smash');
    await userEvent.click(button('Print play card'));
    expect(print).toHaveBeenCalledTimes(1);
    const card = document.querySelector('.pb4-print') as HTMLElement;
    expect(card).toHaveAttribute('aria-hidden', 'true');
    expect(within(card).getByRole('heading', { level: 2, hidden: true, name: 'Smash' })).toBeInTheDocument();
    expect(card.textContent).toContain('Eagles');
    expect(card.textContent).toContain('Corner');
    expect(card.textContent).toContain('Throw the corner vs cover 2');
    expect(card.textContent).toContain('red zone');
    // The card draws the same route as the editor.
    expect(card.querySelector('[data-testid="route"]')?.getAttribute('d')).toBe(routeD(A));
    expect(card.querySelector('[role="button"]')).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe('error recovery', () => {
  it('a save conflict writes nothing, keeps the coach’s work and offers three ways forward', async () => {
    seed('a', basePlay('Mesh'));
    await openStored('Mesh');
    // Someone else saves revision 2 while this coach is editing revision 1.
    seed('a', { ...basePlay('Mesh (tablet)'), revision: 2 });
    await userEvent.type(screen.getByLabelText('Coaching notes'), 'my note');
    await userEvent.click(button('Save play'));

    const alert = await screen.findByRole('alert', { name: 'Save conflict' });
    expect(within(alert).getByText(/Your changes are still here/)).toBeInTheDocument();
    expect(stored('a')!.play).toMatchObject({ name: 'Mesh (tablet)', revision: 2 });
    expect(screen.getByLabelText('Coaching notes')).toHaveValue('my note');
    expect(screen.getByText('Unsaved')).toBeInTheDocument();

    await userEvent.click(within(alert).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alert', { name: 'Save conflict' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Coaching notes')).toHaveValue('my note');

    // Way 2: keep mine as a separate play.
    await userEvent.click(button('Save play'));
    await userEvent.click(within(await screen.findByRole('alert', { name: 'Save conflict' })).getByRole('button', { name: 'Save mine as a new play' }));
    expect(await screen.findByText('Saved as a new play.')).toBeInTheDocument();
    expect(stored('play-1')!.play).toMatchObject({ name: 'Mesh', notes: 'my note', revision: 1 });
    expect(stored('a')!.play).toMatchObject({ name: 'Mesh (tablet)', revision: 2 });
  });

  it('loading the saved version after a conflict keeps the coach’s version as a restorable draft', async () => {
    seed('a', basePlay('Mesh'));
    await openStored('Mesh');
    seed('a', { ...basePlay('Mesh (tablet)'), revision: 2 });
    await userEvent.type(screen.getByLabelText('Coaching notes'), 'my note');
    await userEvent.click(button('Save play'));
    await userEvent.click(within(await screen.findByRole('alert', { name: 'Save conflict' })).getByRole('button', { name: 'Load the saved version' }));

    await waitFor(() => expect(screen.getByLabelText('Play name')).toHaveValue('Mesh (tablet)'));
    expect(screen.queryByRole('alert', { name: 'Save conflict' })).not.toBeInTheDocument();
    const draft = screen.getByRole('region', { name: 'Unsaved play' });
    await userEvent.click(within(draft).getByRole('button', { name: 'Restore' }));
    expect(screen.getByLabelText('Coaching notes')).toHaveValue('my note');
    // Saving the saved version now works from its real revision.
    await userEvent.click(button('Save play'));
    expect(await screen.findByRole('alert', { name: 'Save conflict' })).toBeInTheDocument(); // restored draft is still revision 1
  });

  it('a failed save keeps the play, and the unsaved play survives closing and reopening', async () => {
    const tab = await newPlay();
    await userEvent.clear(screen.getByLabelText('Play name'));
    await userEvent.type(screen.getByLabelText('Play name'), 'Sideline Work');
    await userEvent.click(playerEl(A));
    await select('Assignment', 'route');
    await select('Route', 'out');
    const drawn = routeD(A);
    db.fail = 'offline';
    await userEvent.click(button('Save play'));
    expect(await screen.findByText(/Couldn't save. Your changes are still here/)).toBeInTheDocument();
    expect(db.plays.size).toBe(0);
    expect(screen.getByLabelText('Play name')).toHaveValue('Sideline Work');
    expect(routeD(A)).toBe(drawn);

    // Close the tab.
    tab.unmount();
    expect(localStorage.getItem(draftKey('coach1', 't1'))).toContain('Sideline Work');

    // Come back later, online.
    db.fail = null;
    await openLibrary();
    const draft = await screen.findByRole('region', { name: 'Unsaved play' });
    expect(within(draft).getByText('Sideline Work')).toBeInTheDocument();
    await userEvent.click(within(draft).getByRole('button', { name: 'Restore' }));
    expect(screen.getByLabelText('Play name')).toHaveValue('Sideline Work');
    expect(routeD(A)).toBe(drawn);
    await userEvent.click(button('Save play'));
    expect(await screen.findByText('Saved as a new play.')).toBeInTheDocument();
    expect(localStorage.getItem(draftKey('coach1', 't1'))).toBeNull();
  });

  it('leaving a play with unsaved changes keeps it; discarding removes it', async () => {
    seed('b', basePlay('Smash'));
    await openStored('Smash');
    await userEvent.type(screen.getByLabelText('Coaching notes'), 'half done');
    await userEvent.click(button('All plays'));
    const draft = screen.getByRole('region', { name: 'Unsaved play' });
    expect(within(draft).getByText('Smash')).toBeInTheDocument();
    await userEvent.click(within(draft).getByRole('button', { name: 'Discard' }));
    expect(screen.queryByRole('region', { name: 'Unsaved play' })).not.toBeInTheDocument();
    expect(localStorage.getItem(draftKey('coach1', 't1'))).toBeNull();
    expect(stored('b')!.play.notes).toBe('');
  });

  it("a draft is private to the coach who made it and to the team it belongs to", async () => {
    const first = await newPlay();
    await userEvent.type(screen.getByLabelText('Coaching notes'), 'mine');
    await userEvent.click(button('All plays'));
    expect(screen.getByRole('region', { name: 'Unsaved play' })).toBeInTheDocument();
    first.unmount();

    env.user = { uid: 'coach2', isAnonymous: false };
    const second = await openLibrary();
    expect(screen.queryByRole('region', { name: 'Unsaved play' })).not.toBeInTheDocument();
    second.unmount();

    env.user = { uid: 'coach1', isAnonymous: false };
    env.team = { id: 't2', name: 'Hawks', ownerId: 'coach1' };
    await openLibrary();
    expect(screen.queryByRole('region', { name: 'Unsaved play' })).not.toBeInTheDocument();
  });

  it('a damaged stored draft is ignored instead of opened', async () => {
    localStorage.setItem(draftKey('coach1', 't1'), JSON.stringify({ source: { kind: 'new' }, play: { schemaVersion: 4, name: 'Broken' } }));
    await openLibrary();
    expect(screen.queryByRole('region', { name: 'Unsaved play' })).not.toBeInTheDocument();
  });

  it('a failed load says so and can be retried', async () => {
    vi.mocked(loadPlayDocsV4).mockRejectedValueOnce(new Error('unavailable'));
    seed('b', basePlay('Smash'));
    render(<PlaybookV4Screen />);
    expect(await screen.findByText(/Couldn't load your plays/)).toBeInTheDocument();
    await userEvent.click(button('Try again'));
    expect(await screen.findByRole('heading', { level: 3, name: 'Smash' })).toBeInTheDocument();
  });
});
