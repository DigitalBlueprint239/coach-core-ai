/** A real stored v3 play chosen by the coach in the currently selected team. */
export type PracticePlayFocus = {
  teamId: string;
  playId: string;
  playName: string;
  schemaVersion: 3;
};
export type StoredPracticePlayFocus = Omit<PracticePlayFocus, 'teamId'>;
export function focusBelongsToTeam(focus: PracticePlayFocus | null | undefined, teamId: string | undefined): focus is PracticePlayFocus {
  return Boolean(focus && teamId && focus.teamId === teamId && focus.playId && focus.schemaVersion === 3);
}
