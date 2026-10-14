import React from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useTeam} from '../../contexts/TeamContext';
import {useDocument} from '../persistence/useDocument';
import {emptyPlan,Fields} from '../persistence/model';
import FieldsEditor from '../persistence/FieldsEditor';
import {Recovery,download} from '../persistence/Recovery';
function Editor({uid,teamId}:{uid:string;teamId:string}){
  const p=useDocument({uid,teamId},'practicePlans',emptyPlan);
  const switchAllowed=()=>!p.hasWork||window.confirm('Your draft is retained until you choose another plan. Export it first if you need both. Continue?');
  return <section aria-label="Practice plan editor"><h2>Practice Planner</h2>
    <p>AI generation is disabled. Build or edit your own plan. Film connections are blocked pending implementation and approvals.</p>
    <p role="status" aria-label="Practice save status">{p.status}</p>
    <button disabled={p.saving} onClick={()=>{if(switchAllowed())p.create(emptyPlan);}}>New practice plan</button>
    <button disabled={p.saving} onClick={()=>{void p.save();}}>Save practice plan</button>
    <button onClick={()=>download(p.fields,'practice-plan-draft.json')}>Export draft</button>
    <button onClick={()=>{void p.reload();}}>Refresh practice library</button>
    {p.error&&<p role="alert">{p.error}</p>}{p.listError&&<p role="alert">{p.listError}</p>}
    {p.conflict&&<Recovery remote={p.conflict} fields={p.fields} onReload={()=>p.open(p.conflict!)} onCopy={()=>{void p.save(true);}}/>}
    <ul aria-label="Saved practice plans">{p.records.map(r=><li key={r.id}><button disabled={p.saving} onClick={()=>{if(switchAllowed())p.open(r);}}>Open {String(r.fields.name)}</button> Revision {r.revision??'legacy'}</li>)}</ul>
    {p.timestamps&&<p>Created {p.timestamps.createdAt}; last saved {p.timestamps.updatedAt}</p>}
    <FieldsEditor value={p.fields} onChange={v=>p.update(v as Fields)}/>
  </section>;
}
export default function PracticePlanner(){const {user}=useAuth();const {currentTeam}=useTeam();
  if(!user||!currentTeam||currentTeam.ownerId!==user.uid)return <p>Select your authorized team to edit practice plans.</p>;
  return <Editor key={`${user.uid}:${currentTeam.id}`} uid={user.uid} teamId={currentTeam.id}/>;
}
