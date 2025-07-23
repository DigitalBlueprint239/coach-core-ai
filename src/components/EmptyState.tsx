import React from 'react';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string | React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  illustration?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = '📋',
  action,
  illustration,
  className = ''
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-content">
        {illustration && (
          <div className="empty-state-illustration">
            <img src={illustration} alt="" className="w-32 h-32 opacity-50" />
          </div>
        )}
        
        <div className="empty-state-icon">
          {typeof icon === 'string' ? (
            <span className="text-4xl">{icon}</span>
          ) : (
            icon
          )}
        </div>
        
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-description">{description}</p>
        
        {action && (
          <button
            onClick={action.onClick}
            className={`empty-state-action ${
              action.variant === 'secondary' 
                ? 'empty-state-action-secondary' 
                : 'empty-state-action-primary'
            }`}
          >
            {action.label}
          </button>
        )}
      </div>
      
      <style>{`
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
      `}</style>
    </div>
  );
}; 