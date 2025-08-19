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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Navigation = void 0;
const react_1 = __importStar(require("react"));
const useAuth_1 = require("../../hooks/useAuth");
const Navigation = ({ className = '' }) => {
    const { user, logout } = (0, useAuth_1.useAuth)();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = (0, react_1.useState)(false);
    const navigationItems = [
        { label: 'Dashboard', href: '/', icon: '��' },
        { label: 'Practice Plans', href: '/practice-plans', icon: '��' },
        { label: 'Team Roster', href: '/roster', icon: '��' },
        { label: 'Drill Library', href: '/drills', icon: '��' },
        { label: 'Analytics', href: '/analytics', icon: '��' },
    ];
    return (react_1.default.createElement("nav", { className: `navigation ${className}` },
        react_1.default.createElement("div", { className: "nav-container" },
            react_1.default.createElement("div", { className: "nav-brand" },
                react_1.default.createElement("span", { className: "nav-logo" }, "\uFFFD\uFFFD"),
                react_1.default.createElement("span", { className: "nav-title" }, "Coach Core AI")),
            react_1.default.createElement("div", { className: "nav-desktop" }, navigationItems.map(item => (react_1.default.createElement("a", { key: item.href, href: item.href, className: "nav-item" },
                react_1.default.createElement("span", { className: "nav-icon" }, item.icon),
                react_1.default.createElement("span", { className: "nav-label" }, item.label))))),
            react_1.default.createElement("div", { className: "nav-user" }, user ? (react_1.default.createElement("div", { className: "user-menu" },
                react_1.default.createElement("button", { className: "user-button" },
                    react_1.default.createElement("span", { className: "user-avatar" }, "\uD83D\uDC64"),
                    react_1.default.createElement("span", { className: "user-name" }, user.email)),
                react_1.default.createElement("button", { onClick: logout, className: "sign-out-button" }, "Sign Out"))) : (react_1.default.createElement("button", { className: "sign-in-button" }, "Sign In"))),
            react_1.default.createElement("button", { className: "mobile-menu-toggle", onClick: () => setIsMobileMenuOpen(!isMobileMenuOpen), "aria-label": "Toggle mobile menu" },
                react_1.default.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" })))),
        isMobileMenuOpen && (react_1.default.createElement("div", { className: "mobile-menu" }, navigationItems.map(item => (react_1.default.createElement("a", { key: item.href, href: item.href, className: "mobile-nav-item", onClick: () => setIsMobileMenuOpen(false) },
            react_1.default.createElement("span", { className: "mobile-nav-icon" }, item.icon),
            react_1.default.createElement("span", { className: "mobile-nav-label" }, item.label)))))),
        react_1.default.createElement("style", null, `
        .navigation {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          max-width: 1200px;
          margin: 0 auto;
          height: 64px;
        }
        
        .nav-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .nav-logo {
          font-size: 1.5rem;
        }
        
        .nav-title {
          font-weight: 600;
          color: #1f2937;
        }
        
        .nav-desktop {
          display: flex;
          gap: 1rem;
        }
        
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          color: #6b7280;
          text-decoration: none;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        
        .nav-item:hover {
          background: #f3f4f6;
          color: #374151;
        }
        
        .nav-icon {
          font-size: 1.125rem;
        }
        
        .nav-user {
          display: flex;
          align-items: center;
        }
        
        .user-menu {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .user-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 0.5rem;
        }
        
        .user-button:hover {
          background: #f3f4f6;
        }
        
        .user-avatar {
          font-size: 1.25rem;
        }
        
        .sign-out-button {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .sign-out-button:hover {
          background: #e5e7eb;
        }
        
        .sign-in-button {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .sign-in-button:hover {
          background: #2563eb;
        }
        
        .mobile-menu-toggle {
          display: none;
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
        }
        
        .mobile-menu {
          display: none;
          padding: 1rem;
          border-top: 1px solid #e5e7eb;
          background: white;
        }
        
        .mobile-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          color: #374151;
          text-decoration: none;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        
        .mobile-nav-item:hover {
          background: #f3f4f6;
        }
        
        .mobile-nav-icon {
          font-size: 1.25rem;
        }
        
        @media (max-width: 768px) {
          .nav-desktop {
            display: none;
          }
          
          .mobile-menu-toggle {
            display: block;
          }
          
          .mobile-menu {
            display: block;
          }
          
          .nav-user {
            display: none;
          }
        }
      `)));
};
exports.Navigation = Navigation;
