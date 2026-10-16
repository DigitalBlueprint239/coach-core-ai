import { addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { migrateFromLocalStorage, savePlay, savePracticePlan, updatePlay, updatePracticePlan, deletePlay, deletePracticePlan } from '../firestore';
jest.mock('../../firebase', () => ({ db: {}, auth: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn((_auth: unknown, cb: (user: { uid: string }) => void) => { cb({ uid: 'A' }); return jest.fn(); }) }));
const play = { name: 'Mesh', formation: 'Spread', description: '', routes: [], players: [], tags: [], difficulty: 'beginner' as const, sport: 'football' };
const plan = { name: 'Practice', date: '2026-10-14', duration: 30, periods: [], goals: [], notes: '' };
const quarantine = '[ {"type":"create","collection":"plays","data":{"name":"A original"}} ]';
beforeEach(() => { localStorage.clear(); localStorage.setItem('offline_operations', quarantine); jest.mocked(addDoc).mockClear(); jest.mocked(updateDoc).mockClear(); jest.mocked(deleteDoc).mockClear(); window.dispatchEvent(new Event('online')); });
afterEach(() => { expect(localStorage.getItem('offline_operations')).toBe(quarantine); window.dispatchEvent(new Event('online')); });

test('obsolete migration rejects without cloud writes or deleting original bytes', async () => {
  const original = JSON.stringify({ plays: [play], plans: [plan] });
  localStorage.setItem('plays', 'legacy marker');
  localStorage.setItem('coach-core-ai-alpha', original);
  await expect(migrateFromLocalStorage('alpha')).rejects.toThrow(/disabled/i);
  expect(addDoc).not.toHaveBeenCalled();
  expect(localStorage.getItem('coach-core-ai-alpha')).toBe(original);
  expect(localStorage.getItem('plays')).toBe('legacy marker');
});

test.each(['play', 'plan'])('offline %s creation fails visibly without queuing or starting a write', async kind => {
  window.dispatchEvent(new Event('offline'));
  jest.mocked(addDoc).mockRejectedValueOnce(new Error('network unavailable'));
  await expect(kind === 'play' ? savePlay('alpha', play) : savePracticePlan('alpha', plan)).rejects.toThrow(/offline/i);
  expect(addDoc).not.toHaveBeenCalled();
  jest.mocked(addDoc).mockReset();
});

test('online legacy save cannot resolve before cloud acknowledgement and propagates rejection', async () => {
  let rejectWrite: (reason: Error) => void = () => { throw new Error('not started'); };
  jest.mocked(addDoc).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectWrite = reject; }));
  let acknowledged = false;
  const result = savePlay('alpha', play).then(() => { acknowledged = true; });
  await Promise.resolve();
  expect(acknowledged).toBe(false);
  rejectWrite(new Error('permission denied'));
  await expect(result).rejects.toThrow('permission denied');
  expect(acknowledged).toBe(false);
});

test.each(['update play', 'update plan', 'delete play', 'delete plan'])('offline %s rejects without mutating quarantine or calling Firestore', async action => {
  window.dispatchEvent(new Event('offline'));
  jest.mocked(updateDoc).mockRejectedValueOnce(new Error('network'));
  jest.mocked(deleteDoc).mockRejectedValueOnce(new Error('network'));
  const actions: Record<string, () => Promise<void>> = {
    'update play': () => updatePlay('alpha', 'p', { name: 'Edited' }),
    'update plan': () => updatePracticePlan('alpha', 'p', { notes: 'Edited' }),
    'delete play': () => deletePlay('alpha', 'p'),
    'delete plan': () => deletePracticePlan('alpha', 'p'),
  };
  await expect(actions[action]()).rejects.toThrow(/offline/i);
  expect(updateDoc).not.toHaveBeenCalled();
  expect(deleteDoc).not.toHaveBeenCalled();
  jest.mocked(updateDoc).mockReset(); jest.mocked(deleteDoc).mockReset();
});
