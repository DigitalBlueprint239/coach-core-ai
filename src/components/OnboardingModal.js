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
exports.OnboardingModal = void 0;
// src/components/OnboardingModal.tsx
const react_1 = __importStar(require("react"));
const LoadingStates_1 = require("./LoadingStates");
const ONBOARDING_STEPS = [
    {
        title: 'Welcome to Coach Core AI!',
        description: 'Your all-in-one sports coaching platform. Let’s get you started with a quick walkthrough.',
        illustration: '🏆'
    },
    {
        title: 'Team Management',
        description: 'Create or join a team to collaborate with coaches and players. Manage rosters, attendance, and more.',
        illustration: '👥'
    },
    {
        title: 'Practice Planner',
        description: 'Use the AI-powered planner to generate, customize, and save practice plans for your team.',
        illustration: '📋'
    },
    {
        title: 'Smart Playbook',
        description: 'Design plays with drag-and-drop, get AI suggestions, and share with your team. Touch-optimized for mobile!',
        illustration: '🏈'
    },
    {
        title: 'Analytics & Feedback',
        description: 'Track player progress, attendance, and get actionable insights from your data.',
        illustration: '📈'
    },
    {
        title: 'AI Assistant',
        description: 'Ask the AI for coaching advice, practice ideas, or game strategy. Get instant, personalized suggestions.',
        illustration: '🤖'
    },
    {
        title: 'Offline & PWA',
        description: 'Install the app for offline access, push notifications, and a native-like experience on any device.',
        illustration: '📱'
    },
    {
        title: 'Ready to Get Started?',
        description: 'You can start with your own team or try Demo Mode to explore all features with sample data.',
        illustration: '🚀'
    }
];
const OnboardingModal = ({ open, onClose, onDemoMode, onComplete, className = '' }) => {
    const [step, setStep] = (0, react_1.useState)(0);
    const [loadingDemo, setLoadingDemo] = (0, react_1.useState)(false);
    if (!open)
        return null;
    const handleNext = () => {
        if (step < ONBOARDING_STEPS.length - 1) {
            setStep(step + 1);
        }
        else {
            onComplete === null || onComplete === void 0 ? void 0 : onComplete();
            onClose();
        }
    };
    const handleBack = () => {
        if (step > 0)
            setStep(step - 1);
    };
    const handleDemo = () => __awaiter(void 0, void 0, void 0, function* () {
        setLoadingDemo(true);
        try {
            yield onDemoMode();
            onClose();
        }
        finally {
            setLoadingDemo(false);
        }
    });
    const { title, description, illustration } = ONBOARDING_STEPS[step];
    return (react_1.default.createElement("div", { className: `onboarding-modal-overlay ${className}` },
        react_1.default.createElement("div", { className: "onboarding-modal" },
            react_1.default.createElement("div", { className: "onboarding-illustration" }, illustration),
            react_1.default.createElement("h2", { className: "onboarding-title" }, title),
            react_1.default.createElement("p", { className: "onboarding-description" }, description),
            react_1.default.createElement("div", { className: "onboarding-actions" },
                step === ONBOARDING_STEPS.length - 1 ? (react_1.default.createElement(react_1.default.Fragment, null,
                    react_1.default.createElement("button", { className: "onboarding-btn demo", onClick: handleDemo, disabled: loadingDemo }, loadingDemo ? react_1.default.createElement(LoadingStates_1.LoadingState, { type: "spinner", size: "small", text: "Loading Demo..." }) : 'Try Demo Mode'),
                    react_1.default.createElement("button", { className: "onboarding-btn primary", onClick: handleNext }, "Start Using Coach Core"))) : (react_1.default.createElement("button", { className: "onboarding-btn primary", onClick: handleNext }, step === ONBOARDING_STEPS.length - 2 ? 'Finish' : 'Next')),
                step > 0 && (react_1.default.createElement("button", { className: "onboarding-btn secondary", onClick: handleBack }, "Back"))),
            react_1.default.createElement("button", { className: "onboarding-close", onClick: onClose, "aria-label": "Close onboarding" }, "\u00D7")),
        react_1.default.createElement("style", null, `
        .onboarding-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onboarding-modal {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          padding: 2rem 2.5rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          position: relative;
        }
        .onboarding-illustration {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .onboarding-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .onboarding-description {
          font-size: 1rem;
          color: #555;
          margin-bottom: 2rem;
        }
        .onboarding-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .onboarding-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .onboarding-btn.primary {
          background: linear-gradient(135deg, #0084ff, #00d4ff);
          color: white;
        }
        .onboarding-btn.secondary {
          background: #f3f4f6;
          color: #374151;
        }
        .onboarding-btn.demo {
          background: #fbbf24;
          color: #111827;
        }
        .onboarding-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .onboarding-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #aaa;
          cursor: pointer;
        }
        .onboarding-close:hover {
          color: #0084ff;
        }
        @media (max-width: 480px) {
          .onboarding-modal {
            padding: 1.25rem 0.5rem;
            max-width: 95vw;
          }
        }
      `)));
};
exports.OnboardingModal = OnboardingModal;
