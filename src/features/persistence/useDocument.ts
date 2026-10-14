import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Scope,Kind,Fields,RecordData,Draft,equal} from './model';
import {Gateway,cloud,Conflict} from './gateway';
import {readDraft,writeDraft,key} from './drafts';
import {registerSignOutGuard} from '../../hooks/useAuth';
export function useDocument(incomingScope:Scope,kind:Kind,initial:Fields,gateway:Gateway=cloud){
  const scope=useMemo(()=>({uid:incomingScope.uid,teamId:incomingScope.teamId}),[incomingScope.uid,incomingScope.teamId]);
  const [mountId]=useState(()=>crypto.randomUUID());
  const lease=useCallback((id:string)=>`coachcore:v1:${scope.uid}:${scope.teamId}:editorLease:${kind}:${id}`,[scope,kind]);
  const [writer]=useState(()=>{try{const name=`coachcore:v1:${scope.uid}:${scope.teamId}:editor:${kind}`;const old=sessionStorage.getItem(name);
    const id=old&&!localStorage.getItem(lease(old))?old:crypto.randomUUID();sessionStorage.setItem(name,id);localStorage.setItem(lease(id),JSON.stringify({mount:mountId}));return id;
  }catch{return crypto.randomUUID();}});
  const restored=useRef<Draft|null>(null);const restoreError=useRef('');
  const boot=useRef(false);if(!boot.current){boot.current=true;try{restored.current=readDraft(scope,kind,localStorage,writer)??readDraft(scope,kind);}catch{restoreError.current='Draft recovery failed. Original bytes retained; export/review before continuing.';}}
  const [fields,setFields]=useState(restored.current?.fields??initial);
  const [id,setId]=useState(restored.current?.id??crypto.randomUUID());
  const [revision,setRevision]=useState<number|null>(restored.current?.expectedRevision??0);
  const [ack,setAck]=useState<Fields|null>(null);
  const [saving,setSaving]=useState(false);const [error,setError]=useState(restoreError.current);
  const [conflict,setConflict]=useState<RecordData|null>(null);const [opened,setOpened]=useState(0);
  const [records,setRecords]=useState<RecordData[]>([]);const [listError,setListError]=useState('');
  const [timestamps,setTimestamps]=useState<{createdAt:string;updatedAt:string}|null>(null);
  const mounted=useRef(true);const state=useRef({fields,id,revision});state.current={fields,id,revision};
  const generation=useRef(0);const locked=useRef(false);
  const retryAfterSave=useRef(false);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  useEffect(()=>{try{localStorage.setItem(lease(writer),JSON.stringify({mount:mountId}));}catch{/* Recovery UI handles unavailable storage. */}
    const release=()=>{try{if(JSON.parse(localStorage.getItem(lease(writer))||'null')?.mount===mountId)localStorage.removeItem(lease(writer));}catch{/* Preserve unrecognised bytes. */}};
    window.addEventListener('pagehide',release);return()=>{window.removeEventListener('pagehide',release);release();};
  },[lease,writer,mountId]);
  const reload=useCallback(async()=>{try{const rows=await gateway.list(scope,kind);if(mounted.current){setRecords(rows);setListError('');}}catch{if(mounted.current)setListError('Cloud library unavailable. Your drafts are preserved. Retry when connected.');}},[gateway,scope,kind]);
  useEffect(()=>{void reload();},[reload]);
  const update=useCallback((next:Fields)=>{
    if(equal(next,state.current.fields))return;
    setFields(next);state.current={...state.current,fields:next};setError('');
    try{writeDraft({scope,kind,writer,id:state.current.id,expectedRevision:state.current.revision,fields:next,pending:false});}
    catch{setError('Device recovery storage failed. Keep this page open and export your work.');}
  },[scope,kind,writer]);
  const save=useCallback(async(copy=false):Promise<boolean>=>{
    if(locked.current)return false;locked.current=true;const run=generation.current;
    const snapshot={...state.current,id:copy?crypto.randomUUID():state.current.id,revision:copy?0:state.current.revision};
    setSaving(true);setError('');let acknowledged=false;
    try{
      writeDraft({scope,kind,writer,id:snapshot.id,expectedRevision:snapshot.revision,fields:snapshot.fields,pending:true});
      const result=await gateway.save(scope,kind,snapshot.id,snapshot.revision,snapshot.fields);
      if(!mounted.current||run!==generation.current)return false;
      setId(result.id);setRevision(result.revision);setAck(result.fields);setTimestamps(result);setConflict(null);
      state.current={...state.current,id:result.id,revision:result.revision};
      if(equal(state.current.fields,snapshot.fields))localStorage.removeItem(key(scope,kind,writer));
      else writeDraft({scope,kind,writer,id:result.id,expectedRevision:result.revision,fields:state.current.fields,pending:false});
      acknowledged=true;await reload();return true;
    }catch(e){if(mounted.current&&run===generation.current){if(e instanceof Conflict)setConflict(e.remote);setError(e instanceof Error?e.message:'Save failed; draft preserved.');}return false;}
    finally{locked.current=false;if(mounted.current&&run===generation.current){setSaving(false);
      if(retryAfterSave.current&&!acknowledged){retryAfterSave.current=false;queueMicrotask(()=>{void save();});}else retryAfterSave.current=false;
    }}
  },[gateway,scope,kind,writer,reload]);
  const open=(record:RecordData)=>{generation.current++;setFields(record.fields);setId(record.id);setRevision(record.revision);setAck(record.fields);setTimestamps(record);setError('');setConflict(null);setOpened(n=>n+1);state.current={fields:record.fields,id:record.id,revision:record.revision};localStorage.removeItem(key(scope,kind,writer));};
  useEffect(()=>{
    const retry=()=>{try{if(readDraft(scope,kind,localStorage,writer)?.pending){if(locked.current)retryAfterSave.current=true;else void save();}}catch{setError('Recovery envelope invalid; it was preserved.');}};
    window.addEventListener('online',retry);return()=>window.removeEventListener('online',retry);
  },[scope,kind,writer,save]);
  useEffect(()=>registerSignOutGuard(uid=>{
    if(uid!==scope.uid)return true;
    try{if(!readDraft(scope,kind,localStorage,writer)&&!equal(state.current.fields,ack??initial)){
      setError('Device recovery is unavailable. Export your unsaved work before leaving.');return false;
    }}catch{setError('Recovery data cannot be read. Export before signing out.');return false;}return true;
  }),[scope,kind,writer,ack,initial]);
  useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{
    if(!equal(state.current.fields,ack??initial)){e.preventDefault();e.returnValue='';}
  };window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[ack,initial]);
  const create=(next:Fields)=>{const newId=crypto.randomUUID();try{writeDraft({scope,kind,writer,id:newId,expectedRevision:0,fields:next,pending:false});}
    catch{setError('Cannot retain a new draft on this device. Export your work first.');return;}
    generation.current++;setId(newId);setRevision(0);setAck(null);setTimestamps(null);setConflict(null);setFields(next);setError('');state.current={fields:next,id:newId,revision:0};setOpened(n=>n+1);};
  const resume=(d:Draft)=>{if(d.scope.uid!==scope.uid||d.scope.teamId!==scope.teamId||d.kind!==kind)throw new Error('Draft belongs to another scope.');
    generation.current++;setFields(d.fields);setId(d.id);setRevision(d.expectedRevision);setAck(null);setTimestamps(null);setConflict(null);setError('');state.current={fields:d.fields,id:d.id,revision:d.expectedRevision};setOpened(n=>n+1);
    try{writeDraft({...d,writer});}catch{setError('Recovered in memory only. Keep this page open and export your work.');}
  };
  const status=saving?'saving':error?'failed':ack&&equal(ack,fields)?'saved':'unsaved';
  const hasWork=ack?!equal(ack,fields):!!restored.current||!equal(initial,fields);
  return {fields,id,writer,revision,ack,saving,error,conflict,records,listError,opened,timestamps,restored:!!restored.current,hasWork,status,update,save,open,create,resume,reload};
}
