import React, { useEffect, useRef, useState } from 'react';
import { D10_APPROVED, CLAIM_KEY, LEGACY_KEY, decisionKey, readLegacy, importLegacy, declineImport, importNotice, ImportBackend } from './import-legacy';
import { firebaseImport } from './firebase-import';
export default function LegacyImport({ uid, teamId, teamName, backend = firebaseImport, onImported }: {
  uid: string; teamId: string; teamName: string; backend?: ImportBackend; onImported?: () => void;
}) {
  const session = `${uid}:${teamId}`;
  const current = useRef(session); current.current = session;
  const [count, setCount] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    current.current = session;
    const refreshOffer = () => {
      setCount(0); setError('');
      try { const notice = importNotice(localStorage, {uid,teamId}); if(notice) setError(notice); else if (D10_APPROVED && !localStorage.getItem(decisionKey(uid))) setCount(readLegacy(localStorage).length); }
      catch { setError('Device library cannot be imported safely. Originals preserved.'); }
    };
    setBusy(false); refreshOffer();
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === null || event.key === CLAIM_KEY || event.key === LEGACY_KEY
        || event.key === decisionKey(uid) || event.key?.endsWith(':legacyImportPending'))) refreshOffer();
    };
    window.addEventListener('storage', onStorage);
    return () => { current.current = ''; window.removeEventListener('storage', onStorage); };
  }, [uid, teamId]);
  if (!count && !error) return null;
  const accept = async () => {
    setBusy(true); setError('');
    try {
      await importLegacy(localStorage, { uid, teamId, teamName }, () => current.current === session, backend);
      if (current.current === session) { setCount(0); onImported?.(); }
    } catch { if (current.current === session) setError('Import not completed. Original plays preserved. Retry or review your team access.'); }
    finally { if (current.current === session) setBusy(false); }
  };
  return <section aria-label="Import device plays" className="p-4 border rounded bg-white">
    {count > 0 && <><p>Import {count} plays saved on this device into {teamName} for this account?</p>
      <p>Review that these are your plays. Copies will be saved; the originals remain on this device.</p>
      <button disabled={busy} onClick={() => { void accept(); }}>{busy ? 'Verifying copies…' : 'Import plays'}</button>
      <button disabled={busy} onClick={() => { try { declineImport(localStorage, { uid, teamId }); setCount(0); } catch { setError('Decision could not be saved.'); } }}>Not now</button></>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
