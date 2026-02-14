// src/components/PWAInstallPrompt.tsx
import React, { useState, useEffect, useRef } from 'react';
import { LoadingState } from './LoadingStates';

// ============================================
// PWA INSTALL TYPES
// ============================================

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
  className?: string;
  showOnLoad?: boolean;
  delay?: number;
}

// ============================================
// PWA INSTALL COMPONENT
// ============================================

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  onInstall,
  onDismiss,
  className = '',
  showOnLoad = false,
  delay = 3000
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // INSTALLATION DETECTION
  // ============================================

  useEffect(() => {
    // Check if PWA is already installed
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInApp;
      
      setIsInstalled(isInstalled);
      setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
      
      if (isInstalled) {
        setIsVisible(false);
      }
    };

    checkInstallation();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstallation);

    return () => {
      mediaQuery.removeEventListener('change', checkInstallation);
    };
  }, []);

  // ============================================
  // BEFOREINSTALLPROMPT HANDLING
  // ============================================

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      
      if (showOnLoad) {
        timeoutRef.current = setTimeout(() => {
          if (!isInstalled) {
            setIsVisible(true);
          }
        }, delay);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showOnLoad, delay, isInstalled, onInstall]);

  // ============================================
  // INSTALLATION HANDLERS
  // ============================================

  const handleInstall = async () => {
    if (!deferredPrompt) {
      console.warn('No install prompt available');
      return;
    }

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
        setIsVisible(false);
        onInstall?.();
      } else {
        console.log('User dismissed the install prompt');
        onDismiss?.();
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const handleShowPrompt = () => {
    if (deferredPrompt && !isInstalled) {
      setIsVisible(true);
    }
  };

  // ============================================
  // RENDERING
  // ============================================

  if (!isSupported || isInstalled || !isVisible) {
    return null;
  }

  return (
    <div className={`pwa-install-prompt ${className}`}>
      <div className="pwa-install-content">
        <div className="pwa-install-header">
          <div className="pwa-install-icon">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div className="pwa-install-text">
            <h3>Install Coach Core AI</h3>
            <p>Get the full app experience with offline access and notifications</p>
          </div>
        </div>
        
        <div className="pwa-install-features">
          <div className="feature">
            <span className="feature-icon">📱</span>
            <span>App-like experience</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Faster loading</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🔔</span>
            <span>Push notifications</span>
          </div>
          <div className="feature">
            <span className="feature-icon">📴</span>
            <span>Offline access</span>
          </div>
        </div>

        <div className="pwa-install-actions">
          <button
            className="pwa-install-btn primary"
            onClick={handleInstall}
            disabled={isInstalling || !deferredPrompt}
          >
            {isInstalling ? (
              <LoadingState type="spinner" size="small" text="Installing..." />
            ) : (
              'Install App'
            )}
          </button>
          
          <button
            className="pwa-install-btn secondary"
            onClick={handleDismiss}
            disabled={isInstalling}
          >
            Maybe Later
          </button>
        </div>

        <button
          className="pwa-install-close"
          onClick={handleDismiss}
          aria-label="Close install prompt"
        >
          ×
        </button>
      </div>

      <style>{`
        .pwa-install-prompt {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          max-width: 400px;
          margin: 0 auto;
          z-index: 1000;
          animation: slideUp 0.3s ease-out;
        }

        .pwa-install-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
          padding: 20px;
          position: relative;
          border: 1px solid #e5e7eb;
        }

        .pwa-install-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .pwa-install-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #0084ff, #00d4ff);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .pwa-install-icon svg {
          width: 24px;
          height: 24px;
        }

        .pwa-install-text h3 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .pwa-install-text p {
          margin: 0;
          font-size: 14px;
          color: #6b7280;
          line-height: 1.4;
        }

        .pwa-install-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 20px;
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #374151;
        }

        .feature-icon {
          font-size: 14px;
        }

        .pwa-install-actions {
          display: flex;
          gap: 8px;
        }

        .pwa-install-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .pwa-install-btn.primary {
          background: linear-gradient(135deg, #0084ff, #00d4ff);
          color: white;
        }

        .pwa-install-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 132, 255, 0.3);
        }

        .pwa-install-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .pwa-install-btn.secondary:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .pwa-install-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .pwa-install-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 24px;
          height: 24px;
          border: none;
          background: none;
          color: #9ca3af;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .pwa-install-close:hover {
          background: #f3f4f6;
          color: #374151;
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @media (max-width: 480px) {
          .pwa-install-prompt {
            left: 10px;
            right: 10px;
            bottom: 10px;
          }

          .pwa-install-content {
            padding: 16px;
          }

          .pwa-install-features {
            grid-template-columns: 1fr;
            gap: 6px;
          }

          .pwa-install-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================
// PWA UTILITY HOOKS
// ============================================

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkInstallation = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInApp = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isInApp);
      setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
    };

    checkInstallation();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  };

  return {
    isSupported,
    isInstalled,
    canInstall: !!deferredPrompt && !isInstalled,
    install
  };
};

// ============================================
// PWA REGISTRATION UTILITY
// ============================================

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', registration);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              console.log('New content is available');
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}; 