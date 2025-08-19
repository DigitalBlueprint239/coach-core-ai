"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = void 0;
const react_1 = __importDefault(require("react"));
const EmptyState = ({ title, description, icon = '📋', action, illustration, className = '' }) => {
    return (react_1.default.createElement("div", { className: `empty-state ${className}` },
        react_1.default.createElement("div", { className: "empty-state-content" },
            illustration && (react_1.default.createElement("div", { className: "empty-state-illustration" },
                react_1.default.createElement("img", { src: illustration, alt: "", className: "w-32 h-32 opacity-50" }))),
            react_1.default.createElement("div", { className: "empty-state-icon" }, typeof icon === 'string' ? (react_1.default.createElement("span", { className: "text-4xl" }, icon)) : (icon)),
            react_1.default.createElement("h3", { className: "empty-state-title" }, title),
            react_1.default.createElement("p", { className: "empty-state-description" }, description),
            action && (react_1.default.createElement("button", { onClick: action.onClick, className: `empty-state-action ${action.variant === 'secondary'
                    ? 'empty-state-action-secondary'
                    : 'empty-state-action-primary'}` }, action.label))),
        react_1.default.createElement("style", null, `
        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          text-align: center;
          min-height: 300px;
        }
        
        .empty-state-content {
          max-width: 400px;
        }
        
        .empty-state-illustration {
          margin-bottom: 1rem;
        }
        
        .empty-state-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }
        
        .empty-state-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }
        
        .empty-state-description {
          color: #6b7280;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }
        
        .empty-state-action {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
        }
        
        .empty-state-action-primary {
          background-color: #3b82f6;
          color: white;
        }
        
        .empty-state-action-primary:hover {
          background-color: #2563eb;
        }
        
        .empty-state-action-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        
        .empty-state-action-secondary:hover {
          background-color: #e5e7eb;
        }
      `)));
};
exports.EmptyState = EmptyState;
