import React from 'react';
import { usePlaybookData, type Play } from '../contexts/PlaybookDataContext';

const InstallListPanel: React.FC = () => {
  const { state, dispatch } = usePlaybookData();
  const { plays, activePlayId } = state;

  const handleAddPlay = () => {
    dispatch({ type: 'ADD_PLAY' });
  };

  const handleSelectPlay = (playId: string) => {
    dispatch({ type: 'SET_ACTIVE_PLAY', payload: { playId } });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Install List</h3>
        <button
          onClick={handleAddPlay}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          + New Play
        </button>
      </div>
      <ul className="space-y-1">
        {plays.map((play: Play) => (
          <li key={play.id}>
            <button
              onClick={() => handleSelectPlay(play.id)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                play.id === activePlayId
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              {play.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InstallListPanel;
