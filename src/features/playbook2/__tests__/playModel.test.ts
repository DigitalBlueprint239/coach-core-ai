import { describe, expect, it } from 'vitest';
import { fullLibrary } from '../../../football-core';
import { formationCopy, isPlayV2, newBlankPlay, playFromConcept } from '../playModel';

const lib = fullLibrary();
const doubles = lib.formations.find(f => f.id === 'doubles')!;
const smash = lib.concepts.find(c => c.id === 'smash')!;

describe('playFromConcept', () => {
  it('deep-copies the template, so editing the copy leaves the library untouched', () => {
    const before = JSON.stringify({ doubles, smash });
    const play = playFromConcept('t1', smash, doubles);
    play.formation.players[0].at.x = 99;
    play.formation.players.pop();
    play.assignments.pop();
    (play.assignments[0] as { route: string }).route = 'go';
    play.read[0].text = 'changed';
    expect(JSON.stringify({ doubles, smash })).toBe(before);
  });

  it('records where the play came from and copies its read and level', () => {
    const play = playFromConcept('t1', smash, doubles);
    expect(play.fromLibrary).toEqual({ kind: 'concept', id: 'smash' });
    expect(play.conceptId).toBe('smash');
    expect(play.name).toBe('Smash');
    expect(play.level).toBe('jv');
    expect(play.read).toEqual(smash.read);
    expect(play.teamId).toBe('t1');
  });
});

describe('newBlankPlay', () => {
  it('uses schemaVersion 2 and the cc-yards-v1 coordinate profile', () => {
    const play = newBlankPlay('t1', doubles);
    expect(play.schemaVersion).toBe(2);
    expect(play.coordinateProfile).toBe('cc-yards-v1');
    expect(play.assignments).toEqual([]);
    expect(play.formation.players).toHaveLength(11);
    play.formation.players[0].at.x = 50;
    expect(doubles.players[0].at.x).not.toBe(50);
  });
});

describe('formationCopy', () => {
  it('gives a team: id, keeps positions and marks it approved by the team', () => {
    const copy = formationCopy(doubles, 'Our Doubles');
    expect(copy.id.startsWith('team:')).toBe(true);
    expect(copy.name).toBe('Our Doubles');
    expect(copy.players).toEqual(doubles.players);
    expect(copy.players).not.toBe(doubles.players);
    expect(copy.verification).toMatchObject({ status: 'approved', reviewer: 'team', sources: [] });
    expect(formationCopy(doubles, 'x').id).not.toBe(copy.id);
  });
});

describe('isPlayV2', () => {
  it('accepts a version-2 play', () => {
    expect(isPlayV2(newBlankPlay('t1', doubles))).toBe(true);
  });

  it('rejects version-1 play documents and junk', () => {
    expect(isPlayV2({ name: 'Mesh', teamId: 't1', players: [], routes: [] })).toBe(false);
    expect(isPlayV2({ schemaVersion: 1, name: 'x', teamId: 't1' })).toBe(false);
    expect(isPlayV2({ schemaVersion: 2, name: 'x', teamId: 't1' })).toBe(false);
    expect(isPlayV2(null)).toBe(false);
    expect(isPlayV2('play')).toBe(false);
  });
});
