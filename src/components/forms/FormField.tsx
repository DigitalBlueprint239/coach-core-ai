import React from 'react';

export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  rows?: number;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  helpText,
  disabled = false,
  options = [],
  rows = 3,
  className = '',
}) => {
  const id = `field-${name}`;
  const hasError = !!error;

  const renderInput = () => {
    const commonProps = {
      id,
      name,
      value,
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => onChange(e.target.value),
      placeholder,
      required,
      disabled,
      className: `form-input ${hasError ? 'error' : ''} ${disabled ? 'disabled' : ''}`,
    };

    switch (type) {
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={rows}
            onChange={e => onChange(e.target.value)}
          />
        );

      case 'select':
        return (
          <select {...commonProps} onChange={e => onChange(e.target.value)}>
            <option value="">Select an option</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return <input {...commonProps} type={type} />;
    }
  };

  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>

      {renderInput()}

      {helpText && <p className="help-text">{helpText}</p>}
      {hasError && <p className="error-text">{error}</p>}

      <style>{`
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
      `}</style>
    </div>
  );
};
