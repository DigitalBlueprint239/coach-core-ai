/**
 * WristbandExportModal — select plays, choose color mode, export a PDF wristband.
 */
import React, { memo, useState, useMemo } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { exportWristbandPDF } from '../../../services/exportService';
import { detectConcepts } from '../../../services/conceptDetection';
import { toEnginePlay, SmartPlaybookSavedPlay } from '../../../utils/playbookBridge';

interface WristbandExportModalProps {
  savedPlays: SmartPlaybookSavedPlay[];
  onClose: () => void;
}

const WristbandExportModal = memo(({ savedPlays, onClose }: WristbandExportModalProps) => {
  const [selected, setSelected] = useState<Set<string>>(() =>
    new Set(savedPlays.slice(0, 16).map((p) => p.id)),
  );
  const [colorMode, setColorMode] = useState<'color' | 'blackwhite'>('color');
  const [exporting, setExporting] = useState(false);

  const conceptLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const sp of savedPlays) {
      const engine = toEnginePlay(sp.players, sp.routes, sp.id, sp.name);
      const detected = detectConcepts(engine);
      map[sp.id] = detected.length > 0 ? detected[0].conceptName : '\u2014';
    }
    return map;
  }, [savedPlays]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(savedPlays.map((p) => p.id)));
  const selectNone = () => setSelected(new Set());

  const selectedPlays = savedPlays.filter((p) => selected.has(p.id));
  const cardCount = Math.ceil(selectedPlays.length / 16);

  const handleExport = async () => {
    if (selectedPlays.length === 0) return;
    setExporting(true);
    try {
      const enginePlays = selectedPlays.map((sp) =>
        toEnginePlay(sp.players, sp.routes, sp.id, sp.name),
      );
      await exportWristbandPDF({
        plays: enginePlays,
        format: 'wristband-standard',
        colorMode,
        playsPerCard: 16,
      });
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
        data-testid="wristband-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Export Wristband</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Play list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Select plays to include:</p>
            <div className="flex gap-2 text-xs">
              <button onClick={selectAll} className="text-blue-600 hover:underline">All</button>
              <button onClick={selectNone} className="text-blue-600 hover:underline">None</button>
            </div>
          </div>

          {savedPlays.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No saved plays yet.</p>
          ) : (
            <div className="space-y-1">
              {savedPlays.map((play) => (
                <label
                  key={play.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(play.id)}
                    onChange={() => toggle(play.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800 flex-1 truncate">{play.name}</span>
                  <span className="text-xs text-gray-400">({conceptLabels[play.id]})</span>
                </label>
              ))}
            </div>
          )}

          {/* Count + warning */}
          <div className="mt-3 text-sm">
            <span className="text-gray-600">
              {selected.size} selected — {cardCount === 1 ? 'fits 1 wristband card' : `spans ${cardCount} cards`}
            </span>
            {selected.size > 16 && (
              <p className="text-amber-600 text-xs mt-1" data-testid="multi-card-warning">
                More than 16 plays will span multiple wristband cards.
              </p>
            )}
          </div>
        </div>

        {/* Options + Actions */}
        <div className="px-5 py-4 border-t space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Color mode:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="colorMode"
                checked={colorMode === 'color'}
                onChange={() => setColorMode('color')}
                className="text-blue-600"
              />
              <span className="text-sm">Color</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="colorMode"
                checked={colorMode === 'blackwhite'}
                onChange={() => setColorMode('blackwhite')}
                className="text-blue-600"
              />
              <span className="text-sm">B&W</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || selected.size === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

WristbandExportModal.displayName = 'WristbandExportModal';

export default WristbandExportModal;
