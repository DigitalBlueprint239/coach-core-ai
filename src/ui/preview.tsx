/* Standalone visual harness. Never imported by the application entry point. */
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import AppShell,{Destination} from './AppShell';
import WeekDashboard from './WeekDashboard';
import {Action,Panel} from './primitives';

function Preview(){
  const [active,setActive]=useState<Destination>('overview');const [sample,setSample]=useState(true);
  return <AppShell active={active} onNavigate={setActive} teamName={sample?'Sample coaching team':undefined} email="preview@example.test" standalone>
    {active==='overview'?<WeekDashboard preview={sample} onPreviewChange={setSample} teamName={sample?'Sample coaching team':undefined} onNavigate={setActive}/>:<Panel title="Visual preview only" eyebrow="NO AUTHENTICATION OR CLOUD CONNECTION"><p>This standalone preview demonstrates the app shell and dashboard. Team management and the existing practice and playbook editors are available in the authenticated application.</p><Action onClick={()=>setActive('overview')}>Return to dashboard</Action></Panel>}
  </AppShell>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
