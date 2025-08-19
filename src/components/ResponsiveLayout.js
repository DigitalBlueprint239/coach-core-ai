"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsiveLayout = void 0;
const react_1 = __importDefault(require("react"));
const ResponsiveLayout = ({ children, sidebar, header, footer, sidebarCollapsed = false, onSidebarToggle, className = '' }) => {
    return (react_1.default.createElement("div", { className: `responsive-layout ${className}` },
        header && (react_1.default.createElement("header", { className: "layout-header" },
            onSidebarToggle && (react_1.default.createElement("button", { onClick: onSidebarToggle, className: "sidebar-toggle", "aria-label": "Toggle sidebar" },
                react_1.default.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" })))),
            header)),
        react_1.default.createElement("div", { className: "layout-content" },
            sidebar && (react_1.default.createElement("aside", { className: `layout-sidebar ${sidebarCollapsed ? 'collapsed' : ''}` }, sidebar)),
            react_1.default.createElement("main", { className: "layout-main", id: "main-content" }, children)),
        footer && react_1.default.createElement("footer", { className: "layout-footer" }, footer),
        react_1.default.createElement("style", null, `
        .responsive-layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }
        
        .layout-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .sidebar-toggle {
          display: none;
          padding: 0.5rem;
          margin-right: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
        }
        
        .layout-content {
          display: flex;
          flex: 1;
        }
        
        .layout-sidebar {
          width: 280px;
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
          transition: transform 0.3s ease;
        }
        
        .layout-main {
          flex: 1;
          padding: 1rem;
          overflow-y: auto;
        }
        
        .layout-footer {
          padding: 1rem;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        
        @media (max-width: 768px) {
          .sidebar-toggle {
            display: block;
          }
          
          .layout-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            z-index: 20;
            transform: translateX(-100%);
          }
          
          .layout-sidebar:not(.collapsed) {
            transform: translateX(0);
          }
          
          .layout-main {
            padding: 0.5rem;
          }
        }
        
        @media (max-width: 640px) {
          .layout-header {
            padding: 0.75rem;
          }
          
          .layout-main {
            padding: 0.5rem;
          }
        }
      `)));
};
exports.ResponsiveLayout = ResponsiveLayout;
