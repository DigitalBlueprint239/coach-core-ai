import { readFileSync } from 'node:fs';
import { generateTeamCode, TEAM_CODE_LENGTH, TEAM_JOIN_ENABLED } from '../TeamContext';

describe('team codes', () => {
  it('are 8 characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateTeamCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    }
    expect(TEAM_CODE_LENGTH).toBe(8);
  });

  it('do not repeat across many draws', () => {
    const codes = new Set(Array.from({ length: 1000 }, generateTeamCode));
    expect(codes.size).toBe(1000);
  });

  it('creating a team never searches all teams by code (the rules deny that query)', () => {
    const source = readFileSync('src/contexts/TeamContext.tsx', 'utf8');
    const createTeam = source.slice(source.indexOf('const createTeam'), source.indexOf('const joinTeam'));
    expect(createTeam).not.toMatch(/getDocs|where\(/);
  });

  it('joining by code is switched off until team sharing has its own design', () => {
    expect(TEAM_JOIN_ENABLED).toBe(false);
  });
});
