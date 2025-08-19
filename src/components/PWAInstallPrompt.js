"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerServiceWorker = exports.usePWAInstall = exports.PWAInstallPrompt = void 0;
// src/components/PWAInstallPrompt.tsx
const react_1 = __importStar(require("react"));
const LoadingStates_1 = require("./LoadingStates");
// ============================================
// PWA INSTALL COMPONENT
// ============================================
const PWAInstallPrompt = ({ onInstall, onDismiss, className = '', showOnLoad = false, delay = 3000 }) => {
    const [deferredPrompt, setDeferredPrompt] = (0, react_1.useState)(null);
    const [isVisible, setIsVisible] = (0, react_1.useState)(false);
    const [isInstalling, setIsInstalling] = (0, react_1.useState)(false);
    const [isInstalled, setIsInstalled] = (0, react_1.useState)(false);
    const [isSupported, setIsSupported] = (0, react_1.useState)(false);
    const timeoutRef = (0, react_1.useRef)(null);
    // ============================================
    // INSTALLATION DETECTION
    // ============================================
    (0, react_1.useEffect)(() => {
        // Check if PWA is already installed
        const checkInstallation = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isInApp = window.navigator.standalone === true;
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
    (0, react_1.useEffect)(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
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
            onInstall === null || onInstall === void 0 ? void 0 : onInstall();
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
    const handleInstall = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!deferredPrompt) {
            console.warn('No install prompt available');
            return;
        }
        setIsInstalling(true);
        try {
            // Show the install prompt
            yield deferredPrompt.prompt();
            // Wait for user choice
            const { outcome } = yield deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                console.log('User accepted the install prompt');
                setIsInstalled(true);
                setIsVisible(false);
                onInstall === null || onInstall === void 0 ? void 0 : onInstall();
            }
            else {
                console.log('User dismissed the install prompt');
                onDismiss === null || onDismiss === void 0 ? void 0 : onDismiss();
            }
        }
        catch (error) {
            console.error('Installation failed:', error);
        }
        finally {
            setIsInstalling(false);
            setDeferredPrompt(null);
        }
    });
    const handleDismiss = () => {
        setIsVisible(false);
        onDismiss === null || onDismiss === void 0 ? void 0 : onDismiss();
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
    return (react_1.default.createElement("div", { className: `pwa-install-prompt ${className}` },
        react_1.default.createElement("div", { className: "pwa-install-content" },
            react_1.default.createElement("div", { className: "pwa-install-header" },
                react_1.default.createElement("div", { className: "pwa-install-icon" },
                    react_1.default.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor" },
                        react_1.default.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" }))),
                react_1.default.createElement("div", { className: "pwa-install-text" },
                    react_1.default.createElement("h3", null, "Install Coach Core AI"),
                    react_1.default.createElement("p", null, "Get the full app experience with offline access and notifications"))),
            react_1.default.createElement("div", { className: "pwa-install-features" },
                react_1.default.createElement("div", { className: "feature" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\uD83D\uDCF1"),
                    react_1.default.createElement("span", null, "App-like experience")),
                react_1.default.createElement("div", { className: "feature" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\u26A1"),
                    react_1.default.createElement("span", null, "Faster loading")),
                react_1.default.createElement("div", { className: "feature" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\uD83D\uDD14"),
                    react_1.default.createElement("span", null, "Push notifications")),
                react_1.default.createElement("div", { className: "feature" },
                    react_1.default.createElement("span", { className: "feature-icon" }, "\uD83D\uDCF4"),
                    react_1.default.createElement("span", null, "Offline access"))),
            react_1.default.createElement("div", { className: "pwa-install-actions" },
                react_1.default.createElement("button", { className: "pwa-install-btn primary", onClick: handleInstall, disabled: isInstalling || !deferredPrompt }, isInstalling ? (react_1.default.createElement(LoadingStates_1.LoadingState, { type: "spinner", size: "small", text: "Installing..." })) : ('Install App')),
                react_1.default.createElement("button", { className: "pwa-install-btn secondary", onClick: handleDismiss, disabled: isInstalling }, "Maybe Later")),
            react_1.default.createElement("button", { className: "pwa-install-close", onClick: handleDismiss, "aria-label": "Close install prompt" }, "\u00D7")),
        react_1.default.createElement("style", null, `
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
      `)));
};
exports.PWAInstallPrompt = PWAInstallPrompt;
// ============================================
// PWA UTILITY HOOKS
// ============================================
const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = (0, react_1.useState)(null);
    const [isInstalled, setIsInstalled] = (0, react_1.useState)(false);
    const [isSupported, setIsSupported] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const checkInstallation = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
            const isInApp = window.navigator.standalone === true;
            setIsInstalled(isStandalone || isInApp);
            setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
        };
        checkInstallation();
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
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
    const install = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!deferredPrompt)
            return false;
        try {
            yield deferredPrompt.prompt();
            const { outcome } = yield deferredPrompt.userChoice;
            return outcome === 'accepted';
        }
        catch (error) {
            console.error('Installation failed:', error);
            return false;
        }
    });
    return {
        isSupported,
        isInstalled,
        canInstall: !!deferredPrompt && !isInstalled,
        install
    };
};
exports.usePWAInstall = usePWAInstall;
// ============================================
// PWA REGISTRATION UTILITY
// ============================================
const registerServiceWorker = () => __awaiter(void 0, void 0, void 0, function* () {
    if ('serviceWorker' in navigator) {
        try {
            const registration = yield navigator.serviceWorker.register('/sw.js');
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
        }
        catch (error) {
            console.error('Service Worker registration failed:', error);
            return null;
        }
    }
    return null;
});
exports.registerServiceWorker = registerServiceWorker;
