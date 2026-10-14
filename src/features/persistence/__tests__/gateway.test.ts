import {TextEncoder as NodeTextEncoder} from 'util';
import {cloud,Conflict} from '../gateway';
import {doc,runTransaction,getDocFromServer,getDocsFromServer} from 'firebase/firestore';
import {auth} from '../../../firebase';
import {Fields} from '../model';
jest.mock('../../../firebase',()=>({auth:{currentUser:{uid:'A',isAnonymous:false}},db:{}}));
jest.mock('firebase/firestore',()=>({doc:jest.fn(),collection:jest.fn(),query:jest.fn(),where:jest.fn(),getDocsFromServer:jest.fn(),getDocFromServer:jest.fn(),runTransaction:jest.fn(),serverTimestamp:jest.fn(()=>new Date())}));
const s={uid:'A',teamId:'T'};let rows:Map<string,{[key:string]:unknown}>;let writes:number;
const fields:Fields={name:'Mesh',phase:'special_teams',players:[{id:'p',x:10.25,y:20,number:1,position:'QB'}],routes:[{id:'r',playerId:'p',points:[{x:10.25,y:20}],color:'#fff',type:'custom'}]};
const snapshot=(path:string)=>({id:path.split('/')[1],exists:()=>rows.has(path),data:()=>rows.get(path)!});
beforeEach(()=>{Object.defineProperty(globalThis,'TextEncoder',{configurable:true,value:NodeTextEncoder});(auth as unknown as {currentUser:unknown}).currentUser={uid:'A',isAnonymous:false};rows=new Map([['teams/T',{ownerId:'A'}]]);writes=0;
 (doc as jest.Mock).mockImplementation((_db,k,id)=>`${k}/${id}`);
 (getDocFromServer as jest.Mock).mockImplementation(async path=>snapshot(path));
 (getDocsFromServer as jest.Mock).mockImplementation(async()=>({docs:Array.from(rows.keys()).filter(k=>k.startsWith('plays/')).map(snapshot)}));
 (runTransaction as jest.Mock).mockImplementation(async(_db,fn)=>fn({get:async(path:string)=>snapshot(path),set:(path:string,data:{[key:string]:unknown})=>{rows.set(path,data);writes++;}}));
 // CRA resets factory mocks between tests.
 const {serverTimestamp}=require('firebase/firestore');serverTimestamp.mockImplementation(()=>new Date('2026-10-13T00:00:00.000Z'));
});
test('create/save/server reopen preserves exact coordinates, properties and timestamps',async()=>{
 const ack=await cloud.save(s,'plays','p1',0,fields);expect(ack.revision).toBe(1);expect(ack.fields).toEqual(fields);expect(ack.createdAt).toBe('2026-10-13T00:00:00.000Z');
 expect((await cloud.list(s,'plays'))[0]).toEqual(ack);
});
test('edit increments revision and preserves immutable creation timestamp',async()=>{
 const original=await cloud.save(s,'plays','p1',0,fields);const ack=await cloud.save(s,'plays','p1',1,{...fields,name:'Edited'});
 expect(ack.revision).toBe(2);expect(ack.createdAt).toBe(original.createdAt);expect(writes).toBe(2);
});
test('stale expected revision conflicts without writing',async()=>{
 await cloud.save(s,'plays','p1',0,fields);await cloud.save(s,'plays','p1',1,{...fields,name:'Other'});
 await expect(cloud.save(s,'plays','p1',1,{...fields,name:'Stale'})).rejects.toBeInstanceOf(Conflict);expect(writes).toBe(2);expect(rows.get('plays/p1')?.name).toBe('Other');
});
test('lost acknowledgement retry is idempotent, not a second update',async()=>{
 await cloud.save(s,'plays','p1',0,fields);await cloud.save(s,'plays','p1',0,fields);expect(writes).toBe(1);
});
test('legacy null revision opts in to one without silent migration',async()=>{
 rows.set('plays/legacy',{...fields,teamId:'T',createdBy:'A',createdAt:new Date('2020-01-01'),updatedAt:new Date('2020-01-01')});
 expect((await cloud.save(s,'plays','legacy',null,{...fields,name:'Edited legacy'})).revision).toBe(1);expect(rows.get('plays/legacy')?.createdAt).toEqual(new Date('2020-01-01'));
});
test('account switch and cross-team owner mismatch refuse before writing',async()=>{
 (auth as unknown as {currentUser:unknown}).currentUser={uid:'B',isAnonymous:false};await expect(cloud.save(s,'plays','p1',0,fields)).rejects.toThrow('Account changed');
 (auth as unknown as {currentUser:unknown}).currentUser={uid:'A',isAnonymous:false};rows.set('teams/T',{ownerId:'B'});await expect(cloud.save(s,'plays','p1',0,fields)).rejects.toThrow('Team access denied');expect(writes).toBe(0);
});
test('permission denial propagates as an error, not false conflict or offline success',async()=>{
 (runTransaction as jest.Mock).mockRejectedValueOnce(new Error('permission-denied'));await expect(cloud.save(s,'plays','p1',0,fields)).rejects.toThrow('permission-denied');expect(writes).toBe(0);
});
