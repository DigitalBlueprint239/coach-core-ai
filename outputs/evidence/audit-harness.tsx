import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useHistory } from './hooks/useHistory';
import { PlaybookProvider, usePlaybookContext } from './contexts/PlaybookContext';
import { getInitialPlaybook, savePlaybook } from './services/installService';
import { getAllFormations, alignPlayersForFormation } from './services/formationService';
import assert from 'node:assert/strict';

export async function run() {
 const results: any[] = [];
 async function check(name: string, fn: () => any) { try { await fn(); results.push({name,status:'PASS'}); } catch(e) { results.push({name,status:'FAIL',error:String(e)}); } }
 const host=document.createElement('div'); document.body.append(host); const root=createRoot(host);
 let api: any;
 function Probe(){ api=usePlaybookContext(); return null; }
 await act(async()=>root.render(<PlaybookProvider><Probe /></PlaybookProvider>));
 await check('Default play initializes offense and defense',()=>{assert.ok(api.activePlay.players.some((p:any)=>p.isOffense));assert.ok(api.activePlay.players.some((p:any)=>!p.isOffense));});
 await check('Apply offensive formation through context',async()=>{await act(async()=>api.onFormationSelect('off-sg-ace-2x2',false));assert.equal(api.activePlay.players.filter((p:any)=>p.isOffense).length,11);});
 await check('Apply defensive formation preserving offense',async()=>{const def=getAllFormations().find((f:any)=>f.category==='Defense');assert.ok(def);await act(async()=>api.onFormationSelect(def.id,false));assert.ok(api.activePlay.players.some((p:any)=>!p.isOffense));assert.equal(api.activePlay.players.filter((p:any)=>p.isOffense).length,11);});
 await check('Add generated route and edit points',async()=>{const player=api.activePlay.players.find((p:any)=>p.isOffense);await act(async()=>api.onAddRouteFromTree([player.id],1));assert.equal(api.activePlay.routes.length,1);const route=api.activePlay.routes[0];await act(async()=>api.onUpdateRoutePoints(route.id,[{x:player.x,y:player.y},{x:player.x+50,y:player.y+10}]));assert.equal(api.activePlay.routes[0].points[1].x,player.x+50);});
 await check('Save and reload route labels and geometry',async()=>{await act(async()=>api.handleForceSave());const loaded=getInitialPlaybook();assert.deepEqual(loaded.plays[api.activePlay.id].routes,api.activePlay.routes);const raw=JSON.parse(localStorage.getItem('coachcore-playbook')!);assert.equal(raw.past,undefined);assert.equal(raw.future,undefined);});
 await check('Drag move undo restores starting coordinates',async()=>{const p=api.activePlay.players[0];const oldX=p.x;await act(async()=>api.onPlayerMove(p.id,{x:oldX+40,y:p.y}));await act(async()=>api.handleCommitInteraction());assert.equal(api.activePlay.players[0].x,oldX+40);await act(async()=>api.undo());assert.equal(api.activePlay.players[0].x,oldX);});
 await check('Clear all players and undo restore',async()=>{const count=api.activePlay.players.length;await act(async()=>api.onClearAllPlayers());assert.equal(api.activePlay.players.length,0);await act(async()=>api.undo());assert.equal(api.activePlay.players.length,count);await act(async()=>api.redo());assert.equal(api.activePlay.players.length,0);});
 await check('Malformed storage does not crash initializer',()=>{localStorage.setItem('coachcore-playbook','{bad');assert.ok(getInitialPlaybook().installs.length);});
 await check('Incomplete stored play rejected safely',()=>{localStorage.setItem('coachcore-playbook',JSON.stringify({installs:[{id:'test',playIds:['test']}],plays:{test:{id:'test',players:[]}}}));const loaded=getInitialPlaybook();assert.ok(Array.isArray(loaded.plays[loaded.installs[0].playIds[0]].routes));});
 await check('All formation coordinates finite on three hashes',()=>{for(const f of getAllFormations())for(const h of ['L','M','R'] as const){const players=alignPlayersForFormation(f.id,h);assert.ok(players.length);for(const p of players){assert.ok(Number.isFinite(p.x));assert.ok(Number.isFinite(p.y));}}});
 await act(async()=>root.unmount());
 console.log(JSON.stringify(results,null,2));
 return results;
}
