import React, { useEffect, useRef } from 'react';
import { CalendarDays, Users, ClipboardList, Waypoints, LogOut } from 'lucide-react';
import './coach-core.css';

export type Destination = 'overview' | 'teams' | 'practice' | 'playbook';
const destinations = [
  { id: 'overview' as const, label: 'My Week', accessible: 'Overview · My Week', short: 'Today', icon: CalendarDays },
  { id: 'teams' as const, label: 'Teams', accessible: 'Teams', short: 'Teams', icon: Users },
  { id: 'practice' as const, label: 'Practice Plans', accessible: 'Practice Plans', short: 'Practice', icon: ClipboardList },
  { id: 'playbook' as const, label: 'Smart Playbook', accessible: 'Smart Playbook', short: 'Playbook', icon: Waypoints },
];
export default function AppShell({ active, onNavigate, teamName, email, onSignOut, children, standalone = false }: {
  active: Destination; onNavigate: (view: Destination) => void; teamName?: string; email: string;
  onSignOut?: () => void; children: React.ReactNode; standalone?: boolean;
}) {
  const main = useRef<HTMLElement>(null); const previous = useRef(active);
  useEffect(() => { if (previous.current !== active) { main.current?.focus(); previous.current = active; } }, [active]);
  const links = (mobile = false) => destinations.map(({ id, label, accessible, short, icon: Icon }) => <button key={id} type="button" aria-label={accessible} title={accessible} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
    <Icon size={18} aria-hidden="true" /><span>{mobile ? short : label}</span>
  </button>);
  return <div className="cc-app">
    <a href="#cc-main" className="cc-skip">Skip to main content</a>
    <aside className="cc-sidebar">
      <a className="cc-brand" href="#cc-main" aria-label="Coach Core home" onClick={() => onNavigate('overview')}><span>COACH CORE <b>AI</b></span><span className="cc-brand-compact" aria-hidden="true">CC</span></a>
      <nav className="cc-desktop-nav" aria-label="Main navigation">{links()}</nav>
      <details className="cc-roadmap"><summary>Planned features</summary><p>Film review · unavailable</p><p>Roster & attendance · unavailable</p><p>Player development · unavailable</p></details>
      <span className="cc-sidebar-foot">Private beta</span>
    </aside>
    <div className="cc-workspace">
      <header className="cc-topbar"><div className="cc-mobile-brand">COACH CORE <b>AI</b></div><div className="cc-team-context"><Users size={16} aria-hidden="true" /><span>{teamName || 'No team selected'}</span></div>
        <div className="cc-account"><span className="cc-welcome">Welcome, {email}</span>{onSignOut && <button type="button" className="cc-signout" onClick={onSignOut}><LogOut size={16} aria-hidden="true" /><span>Sign out</span></button>}{standalone && <span className="cc-badge">Local preview</span>}</div>
      </header>
      <main id="cc-main" className="cc-main" ref={main} tabIndex={-1}>{children}</main>
    </div>
    <nav className="cc-bottom-nav" aria-label="Mobile navigation">{links(true)}</nav>
  </div>;
}
