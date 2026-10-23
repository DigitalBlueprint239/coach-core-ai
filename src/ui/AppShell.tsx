import React, { useEffect, useRef } from 'react';
import { CalendarDays, Users, ClipboardList, Waypoints, LogOut } from 'lucide-react';
import './coach-core.css';
// Elite Broadcast overrides must load after the base shell styles.
import './elite-broadcast.css';

export type Destination = 'overview' | 'teams' | 'practice' | 'playbook';
const destinations = [
  { id: 'overview' as const, label: 'My Week', accessible: 'Overview · My Week', short: 'Today', icon: CalendarDays },
  { id: 'teams' as const, label: 'Teams', accessible: 'Teams', short: 'Teams', icon: Users },
  { id: 'practice' as const, label: 'Practice Plans', accessible: 'Practice Plans', short: 'Practice', icon: ClipboardList },
  { id: 'playbook' as const, label: 'Smart Playbook', accessible: 'Smart Playbook', short: 'Playbook', icon: Waypoints },
];
export default function AppShell({ active, onNavigate, teamName, email, onSignOut, children, standalone = false, samplePreview = false }: {
  active: Destination; onNavigate: (view: Destination) => void; teamName?: string; email: string;
  onSignOut?: () => void; children: React.ReactNode; standalone?: boolean;
  /** True only while sample (non-saved) data is on screen. */
  samplePreview?: boolean;
}) {
  const app = useRef<HTMLDivElement>(null); const nav = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null); const previous = useRef(active);
  useEffect(() => { if (previous.current !== active) { main.current?.focus(); previous.current = active; } }, [active]);
  useEffect(() => {
    const bar = nav.current; const content = main.current;
    if (!bar || !content) return;
    const measure = () => app.current?.style.setProperty('--cc-nav-height', `${bar.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(bar, { box: 'border-box' });
    // Keyboard focus must remain above the fixed bar, including its safe-area inset.
    const revealFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target === content || !bar.getBoundingClientRect().height) return;
      const bottom = target.getBoundingClientRect().bottom;
      const limit = bar.getBoundingClientRect().top - 12;
      if (bottom > limit) window.scrollBy({ top: bottom - limit, behavior: 'auto' });
    };
    content.addEventListener('focusin', revealFocus);
    return () => { observer?.disconnect(); content.removeEventListener('focusin', revealFocus); };
  }, []);
  const links = (mobile = false) => destinations.map(({ id, label, accessible, short, icon: Icon }) => <button key={id} type="button" aria-label={accessible} title={accessible} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
    <Icon size={18} aria-hidden="true" /><span>{mobile ? short : label}</span>
  </button>);
  return <div className="cc-app" ref={app}>
    <a href="#cc-main" className="cc-skip">Skip to main content</a>
    <header className="cc-topbar">
      <a className="cc-brand" href="#cc-main" aria-label="Coach Core home" onClick={() => onNavigate('overview')}><span className="cc-brand-mark" aria-hidden="true">CC</span><span className="cc-brand-name">COACH CORE <b>AI</b></span></a>
      <nav className="cc-desktop-nav" aria-label="Main navigation">{links()}</nav>
      {/* Identity is shown at every width (shared devices): active team or an explicit no-team state, and a
          badge whenever sample data, not saved team data, is on screen. */}
      <div className="cc-team-context"><span className="cc-team-dot" aria-hidden="true" /><span><span className="cc-visually-hidden">Active team: </span>{teamName || 'No team selected'}</span>
        {samplePreview && <span className="cc-mode-badge">Sample preview · not saved</span>}</div>
      <div className="cc-account"><span className="cc-welcome" title={email}>Welcome, {email}</span>{onSignOut && <button type="button" className="cc-signout" onClick={onSignOut}><LogOut size={16} aria-hidden="true" /><span>Sign out</span></button>}{standalone && <span className="cc-badge">Local preview</span>}</div>
    </header>
    <main id="cc-main" className="cc-main" ref={main} tabIndex={-1}>{children}</main>
    <footer className="cc-footer"><strong>Planned features</strong><span>Film review · unavailable</span><span>Roster &amp; attendance · unavailable</span><span>Player development · unavailable</span><span className="cc-footer-tag">Private beta</span></footer>
    <nav ref={nav} className="cc-bottom-nav" aria-label="Mobile navigation">{links(true)}</nav>
  </div>;
}
