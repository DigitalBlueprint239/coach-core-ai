"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormField = void 0;
const react_1 = __importDefault(require("react"));
const FormField = ({ label, name, type = 'text', value, onChange, placeholder, required = false, error, helpText, disabled = false, options = [], rows = 3, className = '' }) => {
    const id = `field-${name}`;
    const hasError = !!error;
    const renderInput = () => {
        const commonProps = {
            id,
            name,
            value,
            onChange: (e) => onChange(e.target.value),
            placeholder,
            required,
            disabled,
            className: `form-input ${hasError ? 'error' : ''} ${disabled ? 'disabled' : ''}`
        };
        switch (type) {
            case 'textarea':
                return (react_1.default.createElement("textarea", Object.assign({}, commonProps, { rows: rows, onChange: (e) => onChange(e.target.value) })));
            case 'select':
                return (react_1.default.createElement("select", Object.assign({}, commonProps, { onChange: (e) => onChange(e.target.value) }),
                    react_1.default.createElement("option", { value: "" }, "Select an option"),
                    options.map(option => (react_1.default.createElement("option", { key: option.value, value: option.value }, option.label)))));
            default:
                return react_1.default.createElement("input", Object.assign({}, commonProps, { type: type }));
        }
    };
    return (react_1.default.createElement("div", { className: `form-field ${className}` },
        react_1.default.createElement("label", { htmlFor: id, className: "form-label" },
            label,
            required && react_1.default.createElement("span", { className: "required" }, "*")),
        renderInput(),
        helpText && react_1.default.createElement("p", { className: "help-text" }, helpText),
        hasError && react_1.default.createElement("p", { className: "error-text" }, error),
        react_1.default.createElement("style", null, `
        .form-field {
          margin-bottom: 1rem;
        }
        
        .form-label {
          display: block;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
        }
        
        .required {
          color: #dc2626;
          margin-left: 0.25rem;
        }
        
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 1rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .form-input.error {
          border-color: #dc2626;
        }
        
        .form-input.disabled {
          background-color: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }
        
        .help-text {
          font-size: 0.875rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }
        
        .error-text {
          font-size: 0.875rem;
          color: #dc2626;
          margin-top: 0.25rem;
        }
        
        @media (max-width: 640px) {
          .form-input {
            font-size: 16px; /* Prevents zoom on iOS */
          }
        }
      `)));
};
exports.FormField = FormField;
