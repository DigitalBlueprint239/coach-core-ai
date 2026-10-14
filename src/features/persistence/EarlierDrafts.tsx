import React,{useState,useRef,useEffect} from 'react';
import {Scope,RecordData,equal} from './model';
import {firebaseImport} from '../legacy-import/firebase-import';
import {LegacyPlay,readLegacy} from '../legacy-import/import-legacy';
import {cloud} from './gateway';
export default function EarlierDrafts({scope,onOpen}:{scope:Scope;onOpen:(r:RecordData)=>void}){
  const [error,setError]=useState('');const active=useRef(true);useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const [plays]=useState<LegacyPlay[]>(()=>{try{return readLegacy({getItem:()=>localStorage.getItem(`coachcore:v1:${scope.uid}:${scope.teamId}:drafts`)} as Storage);}catch{setError('Earlier account drafts could not be validated. Original bytes preserved; export/review before recovery.');return [];}});
  const recover=async(play:LegacyPlay)=>{try{const id=await firebaseImport.copy(scope,play);const copy=await firebaseImport.read(scope,id);if(!equal(play,copy))throw new Error('Recovery copy differs; original retained.');
    const record=(await cloud.list(scope,'plays')).find(r=>r.id===id);if(record&&active.current)onOpen(record);
  }catch(e){if(active.current)setError(e instanceof Error?e.message:'Recovery failed. Original retained.');}};
  return <section aria-label="Earlier account drafts">{plays.length>0&&<p>Earlier device drafts for this account and team remain preserved. Recover a verified cloud copy explicitly.</p>}
    {plays.map(p=><button key={p.id} onClick={()=>{void recover(p);}}>Recover {p.name}</button>)}{error&&<p role="alert">{error}</p>}</section>;
}
