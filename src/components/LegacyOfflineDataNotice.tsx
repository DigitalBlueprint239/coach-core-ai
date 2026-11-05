// Do not reveal contents of the legacy shared-browser queue. Historical entries are
// blocked from replay and discarded only after a direct, informed user action.
import React, { useState } from 'react';
import {
  discardQuarantinedLegacyOfflineOperations,
  hasQuarantinedLegacyOfflineOperations,
} from '../services/firestore';

export const LegacyOfflineDataNotice: React.FC = () => {
  const [present, setPresent] = useState(hasQuarantinedLegacyOfflineOperations);
  if (!present) return null;
  return (
    <section className="mx-auto max-w-7xl p-4 border border-amber-500 bg-amber-50 rounded-lg"
      aria-label="Legacy offline data privacy">
      <h2 className="font-semibold">Old unsynced local data detected</h2>
      <p className="text-sm mt-1">
        An older Coach Core version left unsynced data on this browser. For privacy, it will never
        automatically sync to any account. If you need that old work, do not discard it until you've
        arranged an authorized recovery. Otherwise you can permanently clear it from this device.
      </p>
      <button type="button" className="mt-2 px-3 py-2 border rounded bg-white"
        onClick={() => {
          if (!window.confirm('Permanently discard old unsynced Coach Core data from this browser? It cannot be recovered.')) return;
          discardQuarantinedLegacyOfflineOperations();
          setPresent(false);
        }}>
        Permanently discard old unsynced data
      </button>
    </section>
  );
};
