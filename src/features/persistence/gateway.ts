import { collection,doc,getDocsFromServer,getDocFromServer,query,where,runTransaction,serverTimestamp } from 'firebase/firestore';
import {auth,db} from '../../firebase';
import {Scope,Kind,Fields,RecordData,equal,validate} from './model';
export class Conflict extends Error {constructor(public remote:RecordData){super('Changed elsewhere. Your draft is preserved.');}}
export interface Gateway {
  list:(scope:Scope,kind:Kind)=>Promise<RecordData[]>;
  save:(scope:Scope,kind:Kind,id:string,expected:number|null,fields:Fields)=>Promise<RecordData>;
}
const check=(s:Scope)=>{if(!auth.currentUser||auth.currentUser.uid!==s.uid||auth.currentUser.isAnonymous)throw new Error('Account changed or signed out.');};
const iso=(v:unknown):string=>{if(v&&typeof v==='object'&&'toDate'in v)return (v as {toDate:()=>Date}).toDate().toISOString();if(v instanceof Date)return v.toISOString();throw new Error('Invalid server timestamp.');};
const decode=(id:string,data:{[key:string]:unknown}):RecordData=>{
  const {teamId,createdBy,createdAt,updatedAt,revision,...fields}=data;
  return {id,revision:typeof revision==='number'?revision:null,fields:fields as Fields,createdAt:iso(createdAt),updatedAt:iso(updatedAt)};
};
const owned=async(s:Scope)=>{check(s);const t=await getDocFromServer(doc(db,'teams',s.teamId));check(s);if(!t.exists()||t.data().ownerId!==s.uid)throw new Error('Team access denied.');};
export const cloud:Gateway={
  async list(s,kind){await owned(s);const result=await getDocsFromServer(query(collection(db,kind),where('teamId','==',s.teamId)));check(s);
    return result.docs.filter(d=>d.data().createdBy===s.uid).map(d=>decode(d.id,d.data()));},
  async save(s,kind,id,expected,fields){validate(kind,fields);check(s);
    await runTransaction(db,async tx=>{check(s);const team=await tx.get(doc(db,'teams',s.teamId));const ref=doc(db,kind,id);const previous=await tx.get(ref);
      if(!team.exists()||team.data().ownerId!==s.uid)throw new Error('Team access denied.');
      if(previous.exists()){
        const d=previous.data();if(d.teamId!==s.teamId||d.createdBy!==s.uid)throw new Error('Document access denied.');
        const remote=decode(id,d);const next=(expected??0)+1;
        if(remote.revision===next&&equal(remote.fields,fields))return; // ack lost after successful commit; safe retry.
        if(remote.revision!==expected)throw new Conflict(remote);
        check(s);tx.set(ref,{...fields,teamId:s.teamId,createdBy:s.uid,createdAt:d.createdAt,updatedAt:serverTimestamp(),revision:next});
      }else{
        if(expected!==0)throw new Error('Document is missing. Draft retained; save a separate copy.');
        check(s);tx.set(ref,{...fields,teamId:s.teamId,createdBy:s.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp(),revision:1});
      }
    });
    check(s);const ack=await getDocFromServer(doc(db,kind,id));check(s);
    if(!ack.exists()||ack.data().teamId!==s.teamId||ack.data().createdBy!==s.uid)throw new Error('Save acknowledgement unavailable. Draft retained.');
    const record=decode(id,ack.data());if(!equal(record.fields,fields))throw new Conflict(record);return record;
  }
};
