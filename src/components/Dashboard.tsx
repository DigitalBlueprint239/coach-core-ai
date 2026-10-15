import React,{useEffect,useState} from 'react';
import DraftSignOut from '../features/persistence/DraftSignOut';
import {useAuth} from '../hooks/useAuth';
import {useTeam} from '../contexts/TeamContext';
import {TeamManagement} from './TeamManagement';
import LoadingSpinner from './LoadingSpinner';
import PracticePlanner from '../features/practice-planner/PracticePlanner';
import SmartPlaybook from './SmartPlaybook/SmartPlaybook';
import ErrorBoundary from './common/ErrorBoundary';
import {cloud} from '../features/persistence/gateway';
import type {RecordData} from '../features/persistence/model';
import AppShell,{Destination} from '../ui/AppShell';
import WeekDashboard,{WeekEvent} from '../ui/WeekDashboard';

export function datedPlans(records: RecordData[]): WeekEvent[] {
  return records.flatMap(record => {
    const fields = record.fields;
    const date = fields.date;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const parsed = new Date(`${date}T12:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return [];
    const event: WeekEvent = { id: record.id, title: String(fields.name), date, kind: 'plan' };
    if (typeof fields.duration === 'number' && Number.isFinite(fields.duration) && fields.duration >= 0) event.durationMinutes = fields.duration;
    if (Array.isArray(fields.periods)) event.periods = fields.periods.flatMap(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.name !== 'string') return [];
      const duration = value.durationMinutes ?? value.duration;
      return [{ name: value.name, ...(typeof duration === 'number' && Number.isFinite(duration) && duration >= 0 ? { durationMinutes: duration } : {}) }];
    });
    if (Array.isArray(fields.goals)) event.goals = fields.goals.filter((value): value is string => typeof value === 'string');
    if (typeof fields.notes === 'string') event.notes = fields.notes;
    return [event];
  });
}

const Dashboard:React.FC<{demoMode?:boolean;onDemoChange?:(value:boolean)=>void}>=({demoMode=false,onDemoChange})=>{
  const {user,loading:authLoading,logout}=useAuth();const {currentTeam,loading:teamLoading}=useTeam();
  const [active,setActive]=useState<Destination>('overview');const [preview,setPreview]=useState(demoMode);
  const [library,setLibrary]=useState<{scope:string;events:WeekEvent[];loading:boolean;error:string}>({scope:'',events:[],loading:false,error:''});
  const uid=user?.uid;const teamId=currentTeam?.ownerId===uid?currentTeam?.id:undefined;
  const scope=uid&&teamId?`${uid}:${teamId}`:'';
  useEffect(()=>setPreview(demoMode),[demoMode]);
  useEffect(()=>{let cancelled=false;
    if(!uid||!teamId||active!=='overview'||preview)return;
    setLibrary({scope,events:[],loading:true,error:''});
    void cloud.list({uid,teamId},'practicePlans').then(records=>{if(!cancelled)setLibrary({scope,events:datedPlans(records),loading:false,error:''});},()=>{if(!cancelled)setLibrary({scope,events:[],loading:false,error:'Practice library unavailable. Open Practice Plans to retry or recover your device drafts.'});});
    return()=>{cancelled=true;};
  },[uid,teamId,scope,active,preview]);
  if(authLoading)return <LoadingSpinner text="Loading your coaching dashboard..."/>;
  if(!user)return null;
  const live=library.scope===scope&&scope?library:null;
  const changePreview=(value:boolean)=>{setPreview(value);onDemoChange?.(value);};
  return <AppShell active={active} onNavigate={setActive} teamName={currentTeam?.name} email={user.email||'Coach'} onSignOut={()=>{void logout();}}>
    <div className="cc-recovery"><DraftSignOut/></div>
    {active==='overview'&&<WeekDashboard key={scope||'no-team'} teamName={currentTeam?.name} events={live?.events||[]} loading={teamLoading||(!preview&&!!scope&&(!live||live.loading))} error={live?.error} preview={preview} onPreviewChange={changePreview} onNavigate={setActive}/>}
    {active!=='overview'&&<div className="cc-feature-surface"><ErrorBoundary>{active==='teams'?<TeamManagement/>:active==='practice'?<PracticePlanner/>:<SmartPlaybook/>}</ErrorBoundary></div>}
  </AppShell>;
};
export default Dashboard;
