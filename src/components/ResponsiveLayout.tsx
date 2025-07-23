import React from 'react';

export interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  className?: string;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  sidebar,
  header,
  footer,
  sidebarCollapsed = false,
  onSidebarToggle,
  className = ''
}) => {
  return (
    <div className={`responsive-layout ${className}`}>
      {header && (
        <header className="layout-header">
          {onSidebarToggle && (
            <button
              onClick={onSidebarToggle}
              className="sidebar-toggle"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          {header}
        </header>
      )}
      
      <div className="layout-content">
        {sidebar && (
          <aside className={`layout-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {sidebar}
          </aside>
        )}
        
        <main className="layout-main" id="main-content">
          {children}
        </main>
      </div>
      
      {footer && <footer className="layout-footer">{footer}</footer>}
      
      <style>{`
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
      `}</style>
    </div>
  );
}; 