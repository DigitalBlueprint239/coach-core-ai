import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export interface NavigationProps {
  className?: string;
}

export const Navigation: React.FC<NavigationProps> = ({ className = '' }) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationItems = [
    { label: 'Dashboard', href: '/', icon: '��' },
    { label: 'Practice Plans', href: '/practice-plans', icon: '��' },
    { label: 'Team Roster', href: '/roster', icon: '��' },
    { label: 'Drill Library', href: '/drills', icon: '��' },
    { label: 'Analytics', href: '/analytics', icon: '��' },
  ];

  return (
    <nav className={`navigation ${className}`}>
      <div className="nav-container">
        <div className="nav-brand">
          <span className="nav-logo">��</span>
          <span className="nav-title">Coach Core AI</span>
        </div>

        {/* Desktop Navigation */}
        <div className="nav-desktop">
          {navigationItems.map(item => (
            <a key={item.href} href={item.href} className="nav-item">
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </div>

        {/* User Menu */}
        <div className="nav-user">
          {user ? (
            <div className="user-menu">
              <button className="user-button">
                <span className="user-avatar">👤</span>
                <span className="user-name">{user.email}</span>
              </button>
              <button onClick={logout} className="sign-out-button">
                Sign Out
              </button>
            </div>
          ) : (
            <button className="sign-in-button">Sign In</button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          {navigationItems.map(item => (
            <a
              key={item.href}
              href={item.href}
              className="mobile-nav-item"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
            </a>
          ))}
        </div>
      )}

      <style>{`
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
      `}</style>
    </nav>
  );
};
