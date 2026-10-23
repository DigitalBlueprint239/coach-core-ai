import React from 'react';
import {useAuth} from '../../hooks/useAuth';
import {useTeam} from '../../contexts/TeamContext';
import {useDocument} from '../persistence/useDocument';
import {emptyPlan,Value} from '../persistence/model';
import FieldsEditor from '../persistence/FieldsEditor';
import {Recovery,download} from '../persistence/Recovery';
import DeviceRecovery from '../persistence/DeviceRecovery';
// Elite Broadcast layout: each top-level plan field keeps its own editor, label path (Plan.<key>) and update semantics.
const PLAN=['name','date','duration','ageGroup','skillLevel','contactLevel'];
const ASIDE=['goals','notes','hydrationBreakMinutes','safetyConsiderations'];
const HIDDEN=['id','source','aiRequestId','periods'];
const text=(v:Value|undefined)=>typeof v==='string'||typeof v==='number'?String(v):'';
const minutes=(v:Value)=>{if(!v||typeof v!=='object'||Array.isArray(v))return 0;const d=v.durationMinutes??v.duration;return typeof d==='number'&&Number.isFinite(d)?d:0;};
function Editor({uid,teamId}:{uid:string;teamId:string}){
  const p=useDocument({uid,teamId},'practicePlans',emptyPlan);
  const switchAllowed=()=>!p.hasWork||window.confirm('Your draft is retained until you choose another plan. Export it first if you need both. Continue?');
  const f=p.fields;
  const field=(k:string)=>k in f?<FieldsEditor key={k} value={f[k]} path={`Plan.${k}`} onChange={next=>p.update({...f,[k]:next})}/>:null;
  const periods=Array.isArray(f.periods)?f.periods:[];const total=periods.reduce<number>((sum,v)=>sum+minutes(v),0);
  const other=Object.keys(f).filter(k=>!PLAN.includes(k)&&!ASIDE.includes(k)&&!HIDDEN.includes(k));
  return <section aria-label="Practice plan editor" className="eb-practice">
    <p className="eb-note">AI generation is disabled. Build or edit your own plan. Film connections are blocked pending implementation and approvals.</p>
    <div className="eb-hero eb-practice-hero">
      <div>
        <div className="eb-kicker-row"><h2 className="eb-kicker">Practice Planner</h2><p role="status" aria-label="Practice save status" className="eb-status" data-state={p.status}>{p.status}</p></div>
        <p className="eb-title" aria-hidden="true">{text(f.name)||'Untitled practice'}</p>
        <dl className="eb-meta">
          <div><dt>Date</dt><dd className={text(f.date)?undefined:'eb-dim'}>{text(f.date)||'Not set'}</dd></div>
          <div><dt>Duration</dt><dd className="eb-accent">{text(f.duration)||'0'} min</dd></div>
          <div><dt>Age group</dt><dd>{text(f.ageGroup)}</dd></div>
          <div><dt>Skill</dt><dd>{text(f.skillLevel)}</dd></div>
          <div><dt>Contact</dt><dd>{text(f.contactLevel).replace(/_/g,'-')}</dd></div>
        </dl>
      </div>
      <div className="eb-practice-actions">
        <div className="eb-actions">
          <button className="eb-btn" disabled={p.saving} onClick={()=>{if(switchAllowed())p.create(emptyPlan);}}>New practice plan</button>
          <button className="eb-btn" onClick={()=>download(p.fields,'practice-plan-draft.json')}>Export draft</button>
          <button className="eb-btn eb-btn-primary" disabled={p.saving} onClick={()=>{void p.save();}}>Save practice plan</button>
        </div>
        <div className="eb-secondary-actions">
          <button className="eb-link" onClick={()=>{void p.reload();}}>Refresh practice library</button>
          <DeviceRecovery scope={{uid,teamId}} kind="practicePlans" writer={p.writer} onResume={d=>{if(switchAllowed())p.resume(d);}}/>
        </div>
      </div>
    </div>
    {p.error&&<p role="alert">{p.error}</p>}{p.listError&&<p role="alert">{p.listError}</p>}
    {p.conflict&&<Recovery remote={p.conflict} fields={p.fields} onReload={()=>p.open(p.conflict!)} onCopy={()=>{void p.save(true);}}/>}
    {periods.length>0&&<ol className="eb-timeline" aria-label={`Practice timeline, ${total} minutes`}>{periods.map((v,i)=>{const o=v&&typeof v==='object'&&!Array.isArray(v)?v:{};const m=minutes(v);
      return <li key={i} data-kind={text(o.kind)||undefined} style={{flexGrow:Math.max(m,1)}}><span>{String(i+1).padStart(2,'0')}</span> <strong>{text(o.name)||'Period'}</strong> <em>{m}′</em></li>;})}</ol>}
    <div className="eb-practice-grid">
      <aside className="eb-panel eb-library" aria-label="Practice library">
        <div className="eb-panel-head"><h3>Saved practice plans</h3><span className="eb-count" aria-hidden="true">{p.records.length}</span></div>
        <ul aria-label="Saved practice plans">{p.records.map(r=><li key={r.id}><button disabled={p.saving} onClick={()=>{if(switchAllowed())p.open(r);}}>Open {String(r.fields.name)}</button> Revision {r.revision??'legacy'}</li>)}</ul>
        {p.records.length===0&&<p className="eb-empty">No saved practice plans yet.</p>}
        {p.timestamps&&<p className="eb-stamp">Created {p.timestamps.createdAt}; last saved {p.timestamps.updatedAt}</p>}
      </aside>
      <div className="eb-plan-main">
        <section className="eb-panel eb-plan-fields" aria-label="Plan details"><div className="eb-panel-head"><h3>Plan</h3></div><div className="eb-plan-grid">{PLAN.map(field)}</div></section>
        <div className="eb-periods">{field('periods')}<span className="eb-periods-total" aria-hidden="true">{periods.length} periods · {total} min</span></div>
        {other.length>0&&<section className="eb-panel eb-other" aria-label="Other plan fields">{other.map(field)}</section>}
      </div>
      <div className="eb-plan-aside">{ASIDE.filter(k=>k in f).map(k=><div key={k} className="eb-panel eb-aside-item">{field(k)}</div>)}</div>
    </div>
  </section>;
}
export default function PracticePlanner(){const {user}=useAuth();const {currentTeam}=useTeam();
  if(!user||!currentTeam||currentTeam.ownerId!==user.uid)return <p className="eb-alert">Select your authorized team to edit practice plans.</p>;
  return <Editor key={`${user.uid}:${currentTeam.id}`} uid={user.uid} teamId={currentTeam.id}/>;
}
