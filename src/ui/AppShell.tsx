import React, {useEffect,useRef} from 'react';
import {CalendarDays,Users,ClipboardList,Waypoints,ArrowUpRight,ShieldCheck,LogOut} from 'lucide-react';
import './coach-core.css';

export type Destination='overview'|'teams'|'practice'|'playbook';
const destinations=[
  {id:'overview' as const,label:'My Week',accessible:'Overview · My Week',short:'Today',icon:CalendarDays},
  {id:'teams' as const,label:'Teams',accessible:'Teams',short:'Teams',icon:Users},
  {id:'practice' as const,label:'Practice Plans',accessible:'Practice Plans',short:'Practice',icon:ClipboardList},
  {id:'playbook' as const,label:'Smart Playbook',accessible:'Smart Playbook',short:'Playbook',icon:Waypoints},
];
export default function AppShell({active,onNavigate,teamName,email,onSignOut,children,standalone=false}:{active:Destination;onNavigate:(view:Destination)=>void;teamName?:string;email:string;onSignOut?:()=>void;children:React.ReactNode;standalone?:boolean}) {
  const main=useRef<HTMLElement>(null);const previous=useRef(active);
  useEffect(()=>{if(previous.current!==active){main.current?.focus();previous.current=active;}},[active]);
  const links=(mobile=false)=>destinations.map(({id,label,accessible,short,icon:Icon})=><button key={id} type="button" aria-label={accessible} aria-current={active===id?'page':undefined} onClick={()=>onNavigate(id)}><Icon size={20} aria-hidden="true"/><span>{mobile?short:label}</span>{!mobile&&active===id&&<span className="cc-nav-indicator"/>}</button>);
  return <div className="cc-app">
    <a href="#cc-main" className="cc-skip">Skip to main content</a>
    <aside className="cc-sidebar"><a className="cc-brand" href="#cc-main" aria-label="Coach Core home" onClick={()=>onNavigate('overview')}><span className="cc-brand-mark">C<span>∕</span>C</span><span className="cc-brand-name">COACH CORE<span>THE COACH'S WORKSPACE</span></span></a>
      <div className="cc-team-label"><span className="cc-eyebrow">YOUR WORKSPACE</span><strong>{teamName||'No team selected'}</strong><span>Private beta</span></div>
      <nav className="cc-desktop-nav" aria-label="Main navigation">{links()}</nav>
      <div className="cc-roadmap"><span className="cc-eyebrow">ON THE ROADMAP</span><p>Film review</p><p>Roster & attendance</p><p>Player development</p><span>Planned · not available yet</span></div>
      <div className="cc-sidebar-foot"><ShieldCheck size={18} aria-hidden="true"/><span>Your team. Your workspace.</span></div>
    </aside>
    <div className="cc-workspace"><header className="cc-topbar"><div className="cc-mobile-brand">COACH CORE<span> AI</span></div><div className="cc-breadcrumb">WORKSPACE <span>/</span> {destinations.find(d=>d.id===active)?.label}</div><div className="cc-account"><span className="cc-welcome">Welcome, {email}</span>{onSignOut&&<button type="button" className="cc-signout" onClick={onSignOut}><LogOut size={16} aria-hidden="true"/><span>Sign out</span></button>}{standalone&&<span className="cc-badge">LOCAL PREVIEW</span>}</div></header>
      <main id="cc-main" className="cc-main" ref={main} tabIndex={-1}>{children}</main>
      <footer className="cc-footer"><span>BUILT FOR THE WORK BETWEEN GAME DAYS.</span><span>Coach Core <ArrowUpRight size={14} aria-hidden="true"/></span></footer>
    </div>
    <nav className="cc-bottom-nav" aria-label="Mobile navigation">{links(true)}</nav>
  </div>;
}
