import React,{useEffect,useState} from 'react';
import {registerSignOutGuard,useAuth} from '../../hooks/useAuth';
import {scopedDrafts,key,readDraft,writeDraft} from './drafts';
import {equal} from './model';
import {cloud} from './gateway';
import {download} from './Recovery';
export default function DraftSignOut(){
  const {user}=useAuth();const [pending,setPending]=useState<{uid:string;resolve:(v:boolean)=>void}|null>(null);const [error,setError]=useState('');
  useEffect(()=>{let waiter:((v:boolean)=>void)|null=null;const unregister=registerSignOutGuard(uid=>{
    if(uid!==user?.uid)return false;
    if(!scopedDrafts(uid).length)return true;
    return new Promise<boolean>(resolve=>{waiter=resolve;setPending({uid,resolve});setError('');});
  });return()=>{unregister();waiter?.(false);};},[user?.uid]);
  if(!pending||pending.uid!==user?.uid)return null;
  const finish=(yes:boolean)=>{pending.resolve(yes);setPending(null);};
  const sync=async()=>{try{for(const d of scopedDrafts(pending.uid)){const ack=await cloud.save(d.scope,d.kind,d.id,d.expectedRevision,d.fields);const current=readDraft(d.scope,d.kind,localStorage,d.writer);
    if(current&&current.id===d.id&&equal(current.fields,d.fields))localStorage.removeItem(key(d.scope,d.kind,d.writer));
    else if(current&&current.id===d.id)writeDraft({...current,expectedRevision:ack.revision});
  }if(scopedDrafts(pending.uid).length)throw new Error('More edits were made during sync. Drafts retained; sync again or export.');finish(true);}catch(e){setError(e instanceof Error?e.message:'Sync failed. Drafts retained.');}};
  return <section role="dialog" aria-label="Unsynced draft recovery"><h2>You have unsynced drafts</h2><p>Keep a recovery copy before signing out. Only this account can reopen its device drafts.</p>
    <button onClick={()=>{void sync();}}>Sync now</button><button onClick={()=>download(scopedDrafts(pending.uid),'account-drafts.json')}>Export drafts</button>
    <button onClick={()=>finish(true)}>Sign out anyway</button><button onClick={()=>finish(false)}>Cancel</button>{error&&<p role="alert">{error}</p>}</section>;
}
