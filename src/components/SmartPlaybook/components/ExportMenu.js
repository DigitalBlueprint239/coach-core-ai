/**
 * ExportMenu.js – Export dropdown for play PNG and call sheet PDF
 */

import React, { useState, useRef, useEffect, memo } from 'react';
import { Download, Image, FileText, ChevronDown } from 'lucide-react';
import { exportPlayAsPNG, exportCallSheetPDF } from '../utils/exportUtils';

const ExportMenu = memo(({
  players = [],
  routes = [],
  playName = 'Play',
  savedPlays = [],
}) => {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportPNG = () => {
    setOpen(false);
    exportPlayAsPNG(players, routes, playName);
  };

  const handleExportPDF = async () => {
    setOpen(false);
    if (savedPlays.length === 0) {
      alert('Save at least one play before exporting a call sheet.');
      return;
    }
    setExporting(true);
    try {
      await exportCallSheetPDF(savedPlays);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        disabled={exporting}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
        title="Export play or call sheet"
      >
        <div className="flex items-center gap-2">
          <Download size={14} />
          <span className="text-sm">{exporting ? 'Exporting…' : 'Export'}</span>
        </div>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <button
            onClick={handleExportPNG}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-t-lg"
          >
            <Image size={14} className="text-blue-500" />
            <div className="text-left">
              <div className="font-medium">Download Play as PNG</div>
              <div className="text-xs text-gray-500">Current play at 2× resolution</div>
            </div>
          </button>

          <div className="border-t border-gray-100" />

          <button
            onClick={handleExportPDF}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-b-lg"
          >
            <FileText size={14} className="text-red-500" />
            <div className="text-left">
              <div className="font-medium">Download Call Sheet</div>
              <div className="text-xs text-gray-500">
                All {savedPlays.length} saved play{savedPlays.length !== 1 ? 's' : ''} as PDF
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
});

ExportMenu.displayName = 'ExportMenu';
export default ExportMenu;
