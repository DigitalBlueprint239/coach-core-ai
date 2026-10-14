import React,{useState} from 'react';
import {Scope,Kind,Draft} from './model';
import {scopedDrafts} from './drafts';
export default function DeviceRecovery({scope,kind,writer,onResume}:{scope:Scope;kind:Kind;writer:string;onResume:(d:Draft)=>void}){
  const [entries,setEntries]=useState<Draft[]>([]);const [error,setError]=useState('');
  const inspect=()=>{try{setEntries(scopedDrafts(scope.uid).filter(d=>d.scope.teamId===scope.teamId&&d.kind===kind&&d.writer!==writer));setError('');}catch{setError('Recovery data could not be validated. Original bytes preserved.');}};
  return <section aria-label="Device recovery"><button onClick={inspect}>Find other device drafts</button>
    {entries.map(d=><button key={d.writer??'earlier'} onClick={()=>onResume(d)}>Recover draft {String(d.fields.name||'Untitled')}</button>)}{error&&<p role="alert">{error}</p>}</section>;
}
