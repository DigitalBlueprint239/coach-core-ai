import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { importLegacy, declineImport, decisionKey, LEGACY_KEY, readLegacy } from '../import-legacy';
import LegacyImport from '../LegacyImport';
jest.mock('../firebase-import', () => ({ firebaseImport: {} }));
const play = { id:'local1', name:'Mesh', phase:'special', type:'pass',
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
test('account switching requires new consent; prior decision never imports into second account', async () => {
  await importLegacy(localStorage,session,()=>true,backend);
  expect(localStorage.getItem(decisionKey('coachB'))).toBeNull();
  await importLegacy(localStorage,{uid:'coachB',teamId:'teamB'},()=>true,backend);
  expect(stored.size).toBe(2); expect(stored.get('coachB:teamB:local1')).toEqual(play);
});
test('switch during pending write discards stale completion and records neither account consent', async () => {
  let current=true;
  backend.copy.mockImplementationOnce(async () => { current=false; return 'pending'; });
  await expect(importLegacy(localStorage,session,()=>current,backend)).rejects.toThrow('Account or team changed');
  expect(localStorage.getItem(decisionKey('coachA'))).toBeNull(); expect(backend.read).not.toHaveBeenCalled();
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
