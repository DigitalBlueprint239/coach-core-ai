import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { importLegacy, declineImport, decisionKey, LEGACY_KEY, readLegacy, importNotice, pendingKey, CLAIM_KEY } from '../import-legacy';
import LegacyImport from '../LegacyImport';
jest.mock('../firebase-import', () => ({ firebaseImport: {} }));
const play = { id:'local1', createdAt:'2026-10-01T00:00:00.000Z', updatedAt:'2026-10-02T00:00:00.000Z', name:'Mesh', phase:'special', type:'pass',
  players:[{id:'p',x:10.25,y:20,number:1,position:'QB',selected:false}],
  routes:[{id:'r',playerId:'p',points:[{x:10.25,y:20},{x:30,y:45}],type:'custom',color:'#fff'}] };
const session = { uid:'coachA',teamId:'teamA' };
const original = JSON.stringify([play]);
let stored: Map<string, any>;
const backend = { copy:jest.fn(async (s,p) => { const id=`${s.uid}:${s.teamId}:${p.id}`; if(!stored.has(id)) stored.set(id,p); return id; }),
  read:jest.fn(async (_s,id) => stored.get(id)) };
beforeEach(() => { localStorage.clear(); localStorage.setItem(LEGACY_KEY,original); localStorage.setItem('coachcore-playbook','standalone-original'); stored=new Map(); jest.clearAllMocks(); backend.copy.mockImplementation(async (s,p) => { const id=`${s.uid}:${s.teamId}:${p.id}`; if(!stored.has(id)) stored.set(id,p); return id; }); backend.read.mockImplementation(async (_s,id) => stored.get(id)); });
afterEach(() => { expect(localStorage.getItem(LEGACY_KEY)).toBe(original); expect(localStorage.getItem('coachcore-playbook')).toBe('standalone-original'); });
test('accept verifies complete geometry/properties before recording consent', async () => {
  expect(await importLegacy(localStorage,session,()=>true,backend)).toEqual(['coachA:teamA:local1']);
  expect(stored.get('coachA:teamA:local1')).toEqual(play);
  expect(JSON.parse(localStorage.getItem(decisionKey('coachA'))!)).toEqual({decision:'imported',teamId:'teamA',ids:['coachA:teamA:local1']});
});
test('decline creates no cloud writes and suppresses repeated prompt for that account', async () => {
  declineImport(localStorage,session);
  expect(await importLegacy(localStorage,session,()=>true,backend)).toEqual([]);
  expect(backend.copy).not.toHaveBeenCalled();
});
test('repeated completed import creates no duplicate copies', async () => {
  await importLegacy(localStorage,session,()=>true,backend);
  await importLegacy(localStorage,session,()=>true,backend);
  expect(backend.copy).toHaveBeenCalledTimes(1); expect(stored.size).toBe(1);
});
test('verified device claim blocks a second account without copying originals', async () => {
  await importLegacy(localStorage,session,()=>true,backend);
  expect(localStorage.getItem(decisionKey('coachB'))).toBeNull();
  await expect(importLegacy(localStorage,{uid:'coachB',teamId:'teamB'},()=>true,backend)).rejects.toThrow('already imported by another account');
  render(<LegacyImport uid="coachB" teamId="teamB" teamName="Bears" backend={backend}/>);
  expect(screen.getByText(/already imported by another account/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Import plays'})).not.toBeInTheDocument();
  expect(stored.size).toBe(1);
});
test('switch during pending write discards stale completion and records neither account consent', async () => {
  let current=true;
  backend.copy.mockImplementationOnce(async () => { current=false; return 'pending'; });
  await expect(importLegacy(localStorage,session,()=>current,backend)).rejects.toThrow('Account or team changed');
  expect(localStorage.getItem(decisionKey('coachA'))).toBeNull(); expect(backend.read).not.toHaveBeenCalled();
  expect(localStorage.getItem(pendingKey('coachA'))).not.toBeNull();
  expect(localStorage.getItem(CLAIM_KEY)).toBeNull();
});
test('unfinished import names its original team and blocks another team before writes', async () => {
  backend.read.mockRejectedValueOnce(new Error('network'));
  await expect(importLegacy(localStorage,{...session,teamName:'Alpha Eagles'},()=>true,backend)).rejects.toThrow('network');
  expect(importNotice(localStorage,{uid:'coachA',teamId:'teamB'})).toContain('Alpha Eagles');
  render(<LegacyImport uid="coachA" teamId="teamB" teamName="Bravo" backend={backend}/>);
  expect(screen.getByText(/Alpha Eagles/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Import plays'})).not.toBeInTheDocument();
  await expect(importLegacy(localStorage,{uid:'coachA',teamId:'teamB'},()=>true,backend)).rejects.toThrow('Alpha Eagles');
  expect(backend.copy).toHaveBeenCalledTimes(1);
  await importLegacy(localStorage,session,()=>true,backend);
  expect(localStorage.getItem(pendingKey('coachA'))).toBeNull();
});
test('failed read-back never marks success; idempotent retry verifies existing copy', async () => {
  backend.read.mockRejectedValueOnce(new Error('network'));
  await expect(importLegacy(localStorage,session,()=>true,backend)).rejects.toThrow('network');
  expect(localStorage.getItem(decisionKey('coachA'))).toBeNull();
  await importLegacy(localStorage,session,()=>true,backend); expect(stored.size).toBe(1);
});
test('mismatched read-back retains original and does not acknowledge', async () => {
  backend.read.mockResolvedValueOnce({...play,name:'Changed elsewhere'});
  await expect(importLegacy(localStorage,session,()=>true,backend)).rejects.toThrow('does not match');
  expect(localStorage.getItem(decisionKey('coachA'))).toBeNull();
});
test('all input validated before first write', () => {
  localStorage.setItem(LEGACY_KEY, JSON.stringify([{...play,routes:[{...play.routes[0],playerId:'missing'}]}]));
  expect(()=>readLegacy(localStorage)).toThrow('Invalid route'); localStorage.setItem(LEGACY_KEY,original);
});
test('consent UI explicitly accepts selected team and removes prompt only after verification', async () => {
  render(<LegacyImport uid="coachA" teamId="teamA" teamName="Owls" backend={backend}/>);
  expect(screen.getByText(/into Owls/)).toBeInTheDocument();
  expect(backend.copy).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Import plays'));
  await waitFor(()=>expect(localStorage.getItem(decisionKey('coachA'))).not.toBeNull()); expect(screen.queryByRole('button', {name:'Import plays'})).not.toBeInTheDocument(); expect(stored.size).toBe(1);
});
test('decline UI leaves originals intact and coach B receives an independent prompt', () => {
  const view=render(<LegacyImport uid="coachA" teamId="teamA" teamName="Owls" backend={backend}/>);
  fireEvent.click(screen.getByText('Not now')); expect(backend.copy).not.toHaveBeenCalled();
  view.rerender(<LegacyImport uid="coachB" teamId="teamB" teamName="Bears" backend={backend}/>);
  expect(screen.getByText(/into Bears/)).toBeInTheDocument();
});
