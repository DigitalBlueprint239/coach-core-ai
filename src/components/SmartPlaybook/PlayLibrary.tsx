import React from 'react';

interface PlayLibraryProps {
  savedPlays: any[];
  onLoadPlay: (play: any) => void;
  onDeletePlay: (id: string) => void;
}

export default function PlayLibrary({ savedPlays, onLoadPlay, onDeletePlay }: PlayLibraryProps) {
  return (
    <div className="p-4">
      <h3 className="font-bold text-lg mb-4">Play Library</h3>
      {savedPlays.length === 0 && <div className="text-gray-500">No plays saved.</div>}
      <div className="space-y-4">
        {savedPlays.map(play => (
          <div key={play.id} className="p-3 rounded-lg border bg-white shadow">
            <div className="font-semibold">{play.name}</div>
            <div className="text-xs text-gray-500 mb-2">Phase: {play.phase} | Type: {play.type} | {new Date(play.createdAt).toLocaleString()}</div>
            <div className="flex gap-2">
              <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => onLoadPlay(play)}>Load</button>
              <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={() => onDeletePlay(play.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
