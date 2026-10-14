import {act} from 'react';
import {renderHook,waitFor} from '@testing-library/react';
import {useDocument} from '../useDocument';
import {Gateway,Conflict} from '../gateway';
import {RecordData,Fields,emptyPlan,equal} from '../model';
import {readDraft,key} from '../drafts';
jest.mock('../gateway',()=>{const actual=jest.requireActual('../gateway');return {...actual,cloud:{}};});
let records:Map<string,RecordData>;let saves:number;
const stamp='2026-10-13T12:00:00.000Z';const scope={uid:'A',teamId:'T'};
const gateway:Gateway={list:jest.fn(),save:jest.fn()};
beforeEach(()=>{localStorage.clear();sessionStorage.clear();records=new Map();saves=0;Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=>`id-${Math.random()}`}});
 (gateway.list as jest.Mock).mockImplementation(async()=>Array.from(records.values()));
 (gateway.save as jest.Mock).mockImplementation(async(_s,_k,id,rev,fields:Fields)=>{const prior=records.get(id);
  if(prior&&prior.revision!==rev)throw new Conflict(prior);const next={id,revision:(rev??0)+1,fields,createdAt:prior?.createdAt??stamp,updatedAt:stamp};records.set(id,next);saves++;return next;});});
test('P15/P16 edit -> acknowledged save -> close -> clean reopen preserves exact content',async()=>{
 const h=renderHook(()=>useDocument(scope,'practicePlans',emptyPlan,gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());
 const edited={...emptyPlan,name:'Changed',notes:'Exact notes',hydrationBreakMinutes:[30,10]};act(()=>h.result.current.update(edited));expect(h.result.current.status).toBe('unsaved');
 await act(async()=>{expect(await h.result.current.save()).toBe(true);});expect(h.result.current.status).toBe('saved');expect(readDraft(scope,'practicePlans',localStorage,h.result.current.writer)).toBeNull();
 const saved=records.get(h.result.current.id)!;h.unmount();const fresh=renderHook(()=>useDocument(scope,'practicePlans',emptyPlan,gateway));await waitFor(()=>expect(fresh.result.current.records).toHaveLength(1));
 act(()=>fresh.result.current.open(saved));expect(fresh.result.current.fields).toEqual(edited);expect(fresh.result.current.timestamps?.createdAt).toBe(stamp);
});
test('never says saved before acknowledgement; edit while saving remains unsaved and retained',async()=>{
 let resolve:(r:RecordData)=>void=()=>{};(gateway.save as jest.Mock).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const h=renderHook(()=>useDocument(scope,'practicePlans',emptyPlan,gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());act(()=>h.result.current.update({...emptyPlan,name:'First'}));
 let work:Promise<boolean>;act(()=>{work=h.result.current.save();});expect(h.result.current.status).toBe('saving');
 act(()=>h.result.current.update({...emptyPlan,name:'Second'}));await act(async()=>{resolve({id:h.result.current.id,revision:1,fields:{...emptyPlan,name:'First'},createdAt:stamp,updatedAt:stamp});await work;});
 expect(h.result.current.status).toBe('unsaved');expect(readDraft(scope,'practicePlans',localStorage,h.result.current.writer)?.fields.name).toBe('Second');
});
test('P14 stale edit rejects overwrite; keep-as-copy preserves both versions',async()=>{
 const remote={id:'play',revision:1,fields:{name:'Original',players:[],routes:[]},createdAt:stamp,updatedAt:stamp};records.set('play',remote);
 const h=renderHook(()=>useDocument(scope,'plays',{},gateway));await waitFor(()=>expect(h.result.current.records).toHaveLength(1));act(()=>h.result.current.open(remote));
 act(()=>h.result.current.update({...remote.fields,name:'My version'}));records.set('play',{...remote,revision:2,fields:{...remote.fields,name:'Other version'}});
 await act(async()=>{expect(await h.result.current.save()).toBe(false);});expect(h.result.current.conflict?.revision).toBe(2);expect(records.get('play')?.fields.name).toBe('Other version');
 await act(async()=>{expect(await h.result.current.save(true)).toBe(true);});expect(records.size).toBe(2);expect(h.result.current.fields.name).toBe('My version');
});
test('failed save survives refresh; retry acknowledges exact draft',async()=>{
 (gateway.save as jest.Mock).mockRejectedValueOnce(new Error('Connection lost'));const h=renderHook(()=>useDocument(scope,'plays',{name:'New',players:[],routes:[]},gateway));
 await waitFor(()=>expect(gateway.list).toHaveBeenCalled());act(()=>h.result.current.update({name:'Retry',players:[],routes:[]}));await act(async()=>{expect(await h.result.current.save()).toBe(false);});
 expect(h.result.current.status).toBe('failed');h.unmount();const restored=renderHook(()=>useDocument(scope,'plays',{},gateway));await waitFor(()=>expect(restored.result.current.restored).toBe(true));
 expect(restored.result.current.fields.name).toBe('Retry');await act(async()=>{expect(await restored.result.current.save()).toBe(true);});expect(restored.result.current.status).toBe('saved');
});
test('P10/P17 unmounted account cannot clear new account draft on stale acknowledgement',async()=>{
 let resolve:(r:RecordData)=>void=()=>{};(gateway.save as jest.Mock).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));const h=renderHook(()=>useDocument(scope,'plays',{name:'A'},gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());
 act(()=>h.result.current.update({name:'Private A'}));let pending:Promise<boolean>;act(()=>{pending=h.result.current.save();});const id=h.result.current.id;const writerA=h.result.current.writer;h.unmount();
 const b={uid:'B',teamId:'T'};localStorage.setItem(key(b,'plays'),JSON.stringify({scope:b,kind:'plays',id:'B',expectedRevision:0,fields:{name:'B'},pending:false}));
 await act(async()=>{resolve({id,revision:1,fields:{name:'Private A'},createdAt:stamp,updatedAt:stamp});expect(await pending).toBe(false);});expect(readDraft(b,'plays')?.fields.name).toBe('B');expect(readDraft(scope,'plays',localStorage,writerA)?.fields.name).toBe('Private A');
});
test('authorization denial stays failed, not a conflict; no foreign upload is offered',async()=>{
 (gateway.save as jest.Mock).mockRejectedValueOnce(new Error('permission-denied'));const h=renderHook(()=>useDocument(scope,'plays',{name:'Denied'},gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());
 await act(async()=>{expect(await h.result.current.save()).toBe(false);});expect(h.result.current.conflict).toBeNull();expect(h.result.current.status).toBe('failed');expect(readDraft(scope,'plays',localStorage,h.result.current.writer)).not.toBeNull();
});
test('two editor drafts share storage without overwriting; one acknowledgement cannot erase the other',async()=>{
 const first=renderHook(()=>useDocument(scope,'plays',{name:'First'},gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());act(()=>first.result.current.update({name:'First draft'}));
 sessionStorage.clear(); // separate tab's sessionStorage, same shared localStorage.
 const second=renderHook(()=>useDocument(scope,'plays',{name:'Second'},gateway));await waitFor(()=>expect(second.result.current.records).toHaveLength(0));act(()=>second.result.current.update({name:'Second draft'}));
 expect(first.result.current.writer).not.toBe(second.result.current.writer);
 await act(async()=>{expect(await first.result.current.save()).toBe(true);});
 expect(readDraft(scope,'plays',localStorage,second.result.current.writer)?.fields.name).toBe('Second draft');
});
test('cloned session pointer allocates a distinct live writer instead of sharing the draft key',async()=>{
 const first=renderHook(()=>useDocument(scope,'plays',{name:'A'},gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());
 const second=renderHook(()=>useDocument(scope,'plays',{name:'B'},gateway));expect(first.result.current.writer).not.toBe(second.result.current.writer);
});
test('sign-out sync acknowledgement updates the live editor only for its exact scope and writer',async()=>{
 const h=renderHook(()=>useDocument(scope,'plays',{name:'A'},gateway));await waitFor(()=>expect(gateway.list).toHaveBeenCalled());act(()=>h.result.current.update({name:'Synced'}));
 act(()=>window.dispatchEvent(new CustomEvent('coachcore:acknowledged',{detail:{id:h.result.current.id,revision:1,fields:{name:'Synced'},createdAt:stamp,updatedAt:stamp,scope:{uid:'B',teamId:'T'},kind:'plays',writer:h.result.current.writer}})));
 expect(h.result.current.status).toBe('unsaved');
 act(()=>window.dispatchEvent(new CustomEvent('coachcore:acknowledged',{detail:{id:h.result.current.id,revision:1,fields:{name:'Synced'},createdAt:stamp,updatedAt:stamp,scope,kind:'plays',writer:h.result.current.writer}})));
 expect(h.result.current.status).toBe('saved');
});
