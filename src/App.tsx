import React,{useEffect,useState} from 'react';
import {AIProvider} from './ai-brain/AIContext';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/common/ErrorBoundary';
import ToastManager from './components/ToastManager';
import {AuthProvider} from './components/AuthProvider';
import AuthGate from './components/auth/AuthGate';
import {TeamProvider} from './contexts/TeamContext';
import {OnboardingModal} from './components/OnboardingModal';
import {PWAInstallPrompt,registerServiceWorker} from './components/PWAInstallPrompt';

const App:React.FC=()=>{
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [demoMode,setDemoMode]=useState(false);
  useEffect(()=>{registerServiceWorker();if(!localStorage.getItem('onboardingComplete'))setShowOnboarding(true);},[]);
  // No automatic notification permission request: finishing or closing onboarding only records it.
  const closeOnboarding=()=>{setShowOnboarding(false);localStorage.setItem('onboardingComplete','true');};
  return <ErrorBoundary><ToastManager><AuthProvider><AuthGate><TeamProvider><AIProvider>
    <Dashboard demoMode={demoMode} onDemoChange={setDemoMode}/>
    <PWAInstallPrompt showOnLoad={true}/>
    <OnboardingModal open={showOnboarding} onClose={closeOnboarding} onDemoMode={()=>setDemoMode(true)} onComplete={closeOnboarding}/>
  </AIProvider></TeamProvider></AuthGate></AuthProvider></ToastManager></ErrorBoundary>;
};
export default App;
