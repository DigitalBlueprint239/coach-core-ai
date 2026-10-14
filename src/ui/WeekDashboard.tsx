import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,CalendarDays,ChevronLeft,ChevronRight,ClipboardList,Clock3,MapPin,Plus,Waypoints} from 'lucide-react';
import {Panel,Action,EmptyState} from './primitives';
import type {Destination} from './AppShell';

export interface WeekEvent {id:string;title:string;date:string;time?:string;location?:string;kind:'practice'|'meeting'|'game'|'plan'}
export const dateKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays=(date:Date,days:number)=>{const next=new Date(date);next.setDate(next.getDate()+days);return next;};
const parseDay=(day:string)=>new Date(`${day}T12:00:00`);
export function sampleEvents(today:Date):WeekEvent[]{return [
  {id:'sample-practice',title:'Team practice',date:dateKey(addDays(today,1)),time:'3:30–5:00 PM',location:'Practice field',kind:'practice'},
  {id:'sample-film',title:'Staff meeting',date:dateKey(addDays(today,2)),time:'8:00–8:30 AM',location:'Coaches room',kind:'meeting'},
  {id:'sample-walkthrough',title:'Walk-through',date:dateKey(addDays(today,3)),time:'4:00–4:45 PM',location:'Practice field',kind:'practice'},
  {id:'sample-game',title:'Game day',date:dateKey(addDays(today,4)),time:'7:00 PM',location:'Home stadium',kind:'game'},
];}
const initialTasks=[{id:'plan',title:'Review the practice plan',done:true},{id:'equipment',title:'Check practice equipment',done:false},{id:'staff',title:'Prepare staff meeting notes',done:false}];

function EventDetails({event,preview,onClose}:{event:WeekEvent;preview:boolean;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const node=dialog.current;const opener=document.activeElement as HTMLElement|null;
    if(node?.showModal)node.showModal();else node?.setAttribute('open','');
    return()=>{node?.close?.();opener?.focus();};
  },[]);
  return <dialog ref={dialog} className="cc-event-detail" aria-labelledby="cc-event-title" onCancel={e=>{e.preventDefault();onClose();}}><div><span className="cc-eyebrow">{preview?'SAMPLE EVENT · PREVIEW ONLY':'SAVED PRACTICE PLAN'}</span><h2 id="cc-event-title">{event.title}</h2><p>{parseDay(event.date).toLocaleDateString('en-US',{dateStyle:'full'})} · {event.time||'Time not set'}</p><p>{preview?'This fictional event cannot be opened, saved or assigned to your team.':'Open Practice Plans to select and edit this saved plan.'}</p></div><Action autoFocus onClick={onClose}>Close details</Action></dialog>;
}

export default function WeekDashboard({teamName,events=[],loading=false,error='',preview,onPreviewChange,onNavigate,today:givenToday}:{teamName?:string;events?:WeekEvent[];loading?:boolean;error?:string;preview:boolean;onPreviewChange:(next:boolean)=>void;onNavigate:(view:Destination)=>void;today?:Date}) {
  const [today]=useState(()=>givenToday||new Date());
  const [weekOffset,setWeekOffset]=useState(0);const [selected,setSelected]=useState(dateKey(today));const [tasks,setTasks]=useState(initialTasks);
  const [detail,setDetail]=useState<WeekEvent|null>(null);
  const source=preview?sampleEvents(today):events;
  const start=addDays(today,-((today.getDay()+6)%7)+weekOffset*7);const days=Array.from({length:7},(_,i)=>addDays(start,i));
  const nextEvents=source.filter(e=>e.date>=dateKey(today)).sort((a,b)=>a.date.localeCompare(b.date));const next=nextEvents[0];
  const selectedEvents=source.filter(e=>e.date===selected);
  const changeWeek=(offset:number)=>{setWeekOffset(offset);setSelected(dateKey(addDays(today,-((today.getDay()+6)%7)+offset*7)));};
  const title=preview?'Your week. Game ready.':teamName?'Make this week count.':'Your next chapter starts here.';
  return <>
    <div className="cc-page-heading"><div><p className="cc-eyebrow">{today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p><h1>{title}</h1><p>{preview?'A look at a connected coaching week.':teamName?`Your workspace for ${teamName}.`:'Create a team, build a plan, and put your ideas on the field.'}</p></div><span className="cc-badge"><span className="cc-status-dot"/>{preview?'SAMPLE DATA':'YOUR WORKSPACE'}</span></div>
    <div className={`cc-mode ${preview?'cc-mode-preview':''}`}><div><strong>{preview?'Design preview · fictional sample data':'Your team workspace'}</strong><p>{preview?'Events and tasks are fictional. Sample changes are temporary and never saved.':'No schedules or activity are invented. Preview the sample layout at any time.'}</p></div><Action onClick={()=>{onPreviewChange(!preview);setDetail(null);setTasks(initialTasks);}}>{preview?'Exit sample preview':'View sample preview'}<ArrowUpRight size={16} aria-hidden="true"/></Action></div>
    {!preview&&error&&<p role="alert" className="cc-notice">{error}</p>}
    <div className="cc-dashboard-grid">
      <Panel title="My Week" eyebrow="THE BIG PICTURE" className="cc-calendar-panel" action={<CalendarDays size={20} className="cc-accent" aria-hidden="true"/>}>
        <div className="cc-calendar-controls"><div className="cc-week-paging"><button type="button" aria-label="Previous week" onClick={()=>changeWeek(weekOffset-1)}><ChevronLeft size={18}/></button><span aria-live="polite">{days[0].toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {days[6].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span><button type="button" aria-label="Next week" onClick={()=>changeWeek(weekOffset+1)}><ChevronRight size={18}/></button></div><Action onClick={()=>{setWeekOffset(0);setSelected(dateKey(today));}}>Today</Action></div>
        <div className="cc-week-grid" role="group" aria-label="Choose a day">{days.map(day=>{const key=dateKey(day);return <div className={`cc-day ${key===dateKey(today)?'cc-day-today':''}`} key={key}><button type="button" aria-pressed={selected===key} aria-label={day.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})} onClick={()=>setSelected(key)}><span>{day.toLocaleDateString('en-US',{weekday:'short'})}</span><strong>{day.getDate()}</strong><span className="cc-day-dot" style={{visibility:source.some(e=>e.date===key)?'visible':'hidden'}}/></button><div className="cc-day-events">{source.filter(e=>e.date===key).map(e=><button type="button" key={e.id} className={`cc-event cc-event-${e.kind}`} onClick={()=>setDetail(e)}><span>{e.time||'Time not set'}</span><strong>{e.title}</strong><span>{e.kind==='plan'?'Saved plan':e.location}</span></button>)}</div></div>;})}</div>
        <div className="cc-selected-day"><h3>{parseDay(selected).toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</h3>{selectedEvents.length?selectedEvents.map(e=><button className={`cc-event cc-event-${e.kind}`} type="button" key={e.id} onClick={()=>setDetail(e)}><strong>{e.title}</strong><span>{e.time||'Saved plan · time not set'}</span></button>):<p>No dated plans or events for this day.</p>}</div>
        {!preview&&<div className="cc-calendar-note">{loading?'Loading authorized practice plans…':events.length?'Dated saved practice plans · no event time assigned.':'No dated practice plans yet.'}<span>Calendar scheduling is planned; saved plans with dates appear here.</span></div>}
        <div className="cc-calendar-legend"><span><i className="cc-dot-practice"/>Practice{!preview?' plan':''}</span>{preview&&<><span><i className="cc-dot-meeting"/>Staff</span><span><i className="cc-dot-game"/>Game day</span></>}<span className="cc-legend-note">{preview?'SAMPLE WEEK':'TEAM-SCOPED PLANS'}</span></div>
      </Panel>
      <Panel title="Today" eyebrow="STAY ONE STEP AHEAD" className="cc-today-panel" action={<span className="cc-today-date">{today.toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>}>
        <span className="cc-eyebrow">NEXT UP {preview?'· SAMPLE':''}</span>
        {next?<div className="cc-next-event"><div className="cc-next-icon"><ClipboardList size={24} aria-hidden="true"/></div><h3>{next.title}</h3><p>{parseDay(next.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</p><p><Clock3 size={16} aria-hidden="true"/>{next.time||'Time not set'}</p>{next.location&&<p><MapPin size={16} aria-hidden="true"/>{next.location}</p>}<Action primary onClick={()=>preview?setDetail(next):onNavigate('practice')}>{preview?'View sample event':'Open practice plans'}<ArrowRight size={17} aria-hidden="true"/></Action></div>:<EmptyState title={loading?'Loading your plans…':'A clear field ahead'}>{teamName?'No upcoming dated practice plans. Build your next plan when you’re ready.':'Select or create your team to start planning.'}</EmptyState>}
        <div className="cc-quick-actions">{!next&&<Action primary onClick={()=>onNavigate(teamName?'practice':'teams')}><Plus size={18} aria-hidden="true"/>{teamName?'Create Practice Plan':'Manage Teams'}</Action>}<Action onClick={()=>onNavigate('playbook')}><Waypoints size={18} aria-hidden="true"/>Smart Playbook<ArrowUpRight size={16} aria-hidden="true"/></Action></div>
      </Panel>
      <Panel title="Upcoming" eyebrow="ON YOUR HORIZON" className="cc-upcoming-panel">{nextEvents.length?<ul className="cc-upcoming-list">{nextEvents.slice(0,4).map(e=><li key={e.id}><span className="cc-date-tile"><span>{parseDay(e.date).toLocaleDateString('en-US',{month:'short'})}</span><strong>{parseDay(e.date).getDate()}</strong></span><button type="button" onClick={()=>setDetail(e)}><strong>{e.title}</strong><span>{e.time||'Saved practice plan · time not set'}{e.location?` · ${e.location}`:''}</span></button><ArrowUpRight size={16} aria-hidden="true"/></li>)}</ul>:<EmptyState title={loading?'Loading upcoming plans…':'Room for what’s next'}>Dated saved practice plans will appear here. No events have been added.</EmptyState>}</Panel>
      <Panel title="Assignments" eyebrow="THE LITTLE THINGS MATTER" className="cc-assignments-panel" action={preview?<span className="cc-badge">{tasks.filter(t=>t.done).length}/{tasks.length}</span>:<span className="cc-badge">PLANNED</span>}>{preview?<><p className="cc-muted cc-task-intro">Sample checklist · changes are temporary.</p><ul className="cc-tasks">{tasks.map(task=><li key={task.id}><label><input type="checkbox" checked={task.done} onChange={()=>setTasks(tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t))}/><span>{task.title}</span></label></li>)}</ul></>:<EmptyState title="Assignment tracking is on the roadmap">There is no connected task feed yet. Your assignments will never be filled with sample activity.</EmptyState>}</Panel>
    </div>
    <div className="cc-bottom-note"><span>BETTER PREPARATION. STRONGER TEAMS.</span><p>One workspace for the week ahead.</p></div>
    {detail&&<EventDetails event={detail} preview={preview} onClose={()=>setDetail(null)}/>}
  </>;
}
