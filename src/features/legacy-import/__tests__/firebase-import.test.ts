import { webcrypto } from 'crypto';
import { TextEncoder as NodeTextEncoder } from 'util';
import { firebaseImport } from '../firebase-import';
import { auth } from '../../../firebase';
import { doc, serverTimestamp, runTransaction, getDocFromServer } from 'firebase/firestore';
import {createOnly,AlreadyCreated} from '../../persistence/createOnly';
jest.mock('../../persistence/createOnly',()=>({...jest.requireActual('../../persistence/createOnly'),createOnly:jest.fn()}));
jest.mock('../../../firebase',()=>({auth:{currentUser:{uid:'A',isAnonymous:false}},db:{}}));
jest.mock('firebase/firestore',()=>({doc:jest.fn((_db,_collection,id)=>({id})),collection:jest.fn(),query:jest.fn(),where:jest.fn(),
  getDocsFromServer:jest.fn(),getDocFromServer:jest.fn(),runTransaction:jest.fn(),serverTimestamp:jest.fn(()=> 'server-time')}));
const play={id:'local',createdAt:'2026-10-01T00:00:00.000Z',updatedAt:'2026-10-02T00:00:00.000Z',name:'Mesh',phase:'special',type:'pass',players:[{id:'p',number:1,position:'QB',x:10,y:20}],routes:[]};
const session={uid:'A',teamId:'teamA'};
let docs:Map<string,any>;
let writes: number;
beforeEach(()=>{
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:webcrypto});
  Object.defineProperty(globalThis,'TextEncoder',{configurable:true,value:NodeTextEncoder});
  (auth as any).currentUser={uid:'A',isAnonymous:false}; docs=new Map(); writes=0;
  (doc as jest.Mock).mockImplementation((_db,_collection,id)=>({id}));
  (serverTimestamp as jest.Mock).mockReturnValue('server-time');
  (createOnly as jest.Mock).mockImplementation(async(s,k,id,fields,dates)=>{if(docs.has(id))throw new AlreadyCreated('exists');docs.set(id,{...fields,teamId:s.teamId,createdBy:s.uid,revision:1,createdAt:dates.createdAt?new Date(dates.createdAt):'server-time',updatedAt:dates.updatedAt?new Date(dates.updatedAt):'server-time'});writes++;});
  (runTransaction as jest.Mock).mockImplementation(async (_db,fn)=>fn({
    get:async (ref:any)=>({exists:()=>docs.has(ref.id),data:()=>docs.get(ref.id)}),
    set:(ref:any,data:any)=>{docs.set(ref.id,data);writes++;},
  }));
  (getDocFromServer as jest.Mock).mockImplementation(async ref=>({exists:()=>docs.has(ref.id),data:()=>docs.get(ref.id)}));
});
test('transaction retries do not duplicate or overwrite; server read reverses special phase exactly',async()=>{
  const id=await firebaseImport.copy(session,play);
  expect(await firebaseImport.copy(session,play)).toBe(id); expect(writes).toBe(1);
  expect(docs.get(id)).toMatchObject({teamId:'teamA',createdBy:'A',revision:1,localId:'local',phase:'special_teams'});
  expect(await firebaseImport.read(session,id)).toEqual(play);
});
test('legacy plays with absent timestamps reopen without inventing source fields',async()=>{
  const {createdAt,updatedAt,...withoutDates}=play;
  const id=await firebaseImport.copy(session,withoutDates);
  expect(await firebaseImport.read(session,id)).toEqual(withoutDates);
});
test('changed existing imported copy is a visible error, never overwritten',async()=>{
  const id=await firebaseImport.copy(session,play); docs.get(id).name='Other edit';
  await expect(firebaseImport.copy(session,play)).rejects.toThrow('changed elsewhere'); expect(writes).toBe(1);
});
test('different account or anonymous caller is refused before cloud access',async()=>{
  (auth as any).currentUser={uid:'B',isAnonymous:false};
  await expect(firebaseImport.copy(session,play)).rejects.toThrow('Account changed'); expect(writes).toBe(0);
  (auth as any).currentUser={uid:'A',isAnonymous:true};
  await expect(firebaseImport.copy(session,play)).rejects.toThrow('Account changed');
});
test('read-back cannot acknowledge another team or another author',async()=>{
  const id=await firebaseImport.copy(session,play); docs.get(id).teamId='teamB';
  await expect(firebaseImport.read(session,id)).rejects.toThrow('could not be verified');
});
test('server permission denial is propagated rather than queued or reported as saved',async()=>{
  (createOnly as jest.Mock).mockRejectedValueOnce(new Error('permission-denied'));
  await expect(firebaseImport.copy(session,play)).rejects.toThrow('permission-denied'); expect(writes).toBe(0);
});
