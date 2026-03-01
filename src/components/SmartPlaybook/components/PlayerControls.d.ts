import { FC } from 'react';
declare const PlayerControls: FC<{
  selectedPlayer: unknown;
  players: unknown[];
  onUpdatePlayer: (updates: Record<string, unknown>) => void;
  onDeletePlayer: () => void;
}>;
export default PlayerControls;
