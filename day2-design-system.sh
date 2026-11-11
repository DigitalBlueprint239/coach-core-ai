#!/bin/bash

# Coach Core AI - Day 2: Design System & Core Components
# This script implements the design system and core UI components

set -e

echo "🎨 Coach Core AI - Day 2: Design System & Core Components"
echo "========================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Navigate to project directory
cd coach-core-ai

# Create theme provider
create_theme_provider() {
    print_status "Creating theme provider..."
    
    cat > src/contexts/ThemeContext.tsx << 'EOF'
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', isDark);
  }, [theme, isDark]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
EOF

    print_success "Theme provider created"
}

# Create core UI components
create_core_components() {
    print_status "Creating core UI components..."
    
    # Button component
    cat > src/components/ui/Button.tsx << 'EOF'
import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    (disabled || loading) && 'opacity-50 cursor-not-allowed',
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};
EOF

    # Card component
    cat > src/components/ui/Card.tsx << 'EOF'
import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = 'sm',
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
  };
  
  const classes = clsx(
    'bg-white rounded-lg border border-gray-200',
    paddingClasses[padding],
    shadowClasses[shadow],
    className
  );

  return <div className={classes}>{children}</div>;
};
EOF

    # Input component
    cat > src/components/ui/Input.tsx << 'EOF'
import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, className, ...props }, ref) => {
    const inputClasses = clsx(
      'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors duration-200',
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      error
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500',
      className
    );

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{leftIcon}</span>
            </div>
          )}
          <input
            ref={ref}
            className={inputClasses}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-400">{rightIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
EOF

    # Modal component
    cat > src/components/ui/Modal.tsx << 'EOF'
import React, { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className={`relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full ${sizeClasses[size]} sm:p-6`}>
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div>
                  {title && (
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                      {title}
                    </Dialog.Title>
                  )}
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
EOF

    # Loading states
    cat > src/components/ui/LoadingSpinner.tsx << 'EOF'
import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <svg
      className={clsx('animate-spin text-primary-600', sizeClasses[size], className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
EOF

    # Skeleton component
    cat > src/components/ui/Skeleton.tsx << 'EOF'
import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, lines = 1 }) => {
  if (lines === 1) {
    return (
      <div
        className={clsx(
          'animate-pulse bg-gray-200 rounded',
          className || 'h-4 w-full'
        )}
      />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={clsx(
            'animate-pulse bg-gray-200 rounded',
            className || 'h-4 w-full',
            index === lines - 1 && 'w-3/4'
          )}
        />
      ))}
    </div>
  );
};
EOF

    print_success "Core UI components created"
}

# Create layout components
create_layout_components() {
    print_status "Creating layout components..."
    
    # AppShell component
    cat > src/components/layout/AppShell.tsx << 'EOF'
import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
};
EOF

    # Header component
    cat > src/components/layout/Header.tsx << 'EOF'
import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

export const Header: React.FC = () => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        <div className="flex items-center">
          <h1 className="text-xl font-semibold text-gray-900">Coach Core AI</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100"
          >
            {isDark ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
          
          <button className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative">
            <BellIcon className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="h-8 w-8 rounded-full bg-gray-300"></div>
        </div>
      </div>
    </header>
  );
};
EOF

    # Sidebar component
    cat > src/components/layout/Sidebar.tsx << 'EOF'
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarIcon,
  CogIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Team', href: '/team', icon: UsersIcon },
  { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <div className="hidden lg:flex lg:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-6 w-6 ${
                        isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
EOF

    # Mobile navigation
    cat > src/components/layout/MobileNav.tsx << 'EOF'
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'Team', href: '/team', icon: UsersIcon },
  { name: 'Schedule', href: '/schedule', icon: CalendarIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
];

export const MobileNav: React.FC = () => {
  const location = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center py-2 px-3 ${
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
EOF

    print_success "Layout components created"
}

# Create dashboard widgets
create_dashboard_widgets() {
    print_status "Creating dashboard widgets..."
    
    # Stats widget
    cat > src/components/dashboard/StatsWidget.tsx << 'EOF'
import React from 'react';
import { Card } from '../ui/Card';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

interface StatsWidgetProps {
  stats: Stat[];
  title?: string;
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ stats, title }) => {
  return (
    <Card>
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
            {stat.change && (
              <div className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' :
                stat.changeType === 'negative' ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {stat.change}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
EOF

    # Schedule widget
    cat > src/components/dashboard/ScheduleWidget.tsx << 'EOF'
import React from 'react';
import { Card } from '../ui/Card';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ScheduleEvent {
  id: string;
  title: string;
  time: string;
  type: 'practice' | 'game' | 'meeting';
  location?: string;
}

interface ScheduleWidgetProps {
  events: ScheduleEvent[];
  title?: string;
}

export const ScheduleWidget: React.FC<ScheduleWidgetProps> = ({ events, title }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'practice': return 'bg-blue-100 text-blue-800';
      case 'game': return 'bg-green-100 text-green-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {title || 'Today\'s Schedule'}
        </h3>
        <CalendarIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No events scheduled</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <ClockIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{event.title}</p>
                <p className="text-sm text-gray-500">{event.time}</p>
                {event.location && (
                  <p className="text-xs text-gray-400">{event.location}</p>
                )}
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(event.type)}`}>
                {event.type}
              </span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
EOF

    # Quick actions widget
    cat > src/components/dashboard/QuickActionsWidget.tsx << 'EOF'
import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  PlusIcon,
  CalendarIcon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface QuickActionsWidgetProps {
  actions: QuickAction[];
  title?: string;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ actions, title }) => {
  return (
    <Card>
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {title || 'Quick Actions'}
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'secondary'}
            onClick={action.onClick}
            className="w-full justify-start"
            leftIcon={action.icon}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Card>
  );
};
EOF

    print_success "Dashboard widgets created"
}

# Create component index
create_component_index() {
    print_status "Creating component index..."
    
    cat > src/components/ui/index.ts << 'EOF'
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Modal } from './Modal';
export { LoadingSpinner } from './LoadingSpinner';
export { Skeleton } from './Skeleton';
EOF

    cat > src/components/layout/index.ts << 'EOF'
export { AppShell } from './AppShell';
export { Header } from './Header';
export { Sidebar } from './Sidebar';
export { MobileNav } from './MobileNav';
EOF

    cat > src/components/dashboard/index.ts << 'EOF'
export { StatsWidget } from './StatsWidget';
export { ScheduleWidget } from './ScheduleWidget';
export { QuickActionsWidget } from './QuickActionsWidget';
EOF

    print_success "Component indices created"
}

# Update App.tsx
update_app_tsx() {
    print_status "Updating App.tsx..."
    
    cat > src/App.tsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './features/dashboard/Dashboard';
import { Team } from './features/team/Team';
import { Schedule } from './features/schedule/Schedule';
import { Analytics } from './features/analytics/Analytics';
import { Settings } from './features/settings/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/team" element={<Team />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </AppShell>
        </Router>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
EOF

    print_success "App.tsx updated"
}

# Create placeholder feature components
create_feature_placeholders() {
    print_status "Creating feature placeholders..."
    
    # Dashboard feature
    cat > src/features/dashboard/Dashboard.tsx << 'EOF'
import React from 'react';
import { StatsWidget, ScheduleWidget, QuickActionsWidget } from '../../components/dashboard';
import { PlusIcon, CalendarIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export const Dashboard: React.FC = () => {
  const stats = [
    { label: 'Team Members', value: '24', change: '+2 this week', changeType: 'positive' as const },
    { label: 'Win Rate', value: '85%', change: '+5%', changeType: 'positive' as const },
    { label: 'Attendance', value: '92%', change: '-2%', changeType: 'negative' as const },
    { label: 'Avg Rating', value: '4.2', change: '+0.3', changeType: 'positive' as const },
  ];

  const events = [
    {
      id: '1',
      title: 'Team Practice',
      time: '3:00 PM',
      type: 'practice' as const,
      location: 'Field 2',
    },
    {
      id: '2',
      title: 'Strategy Meeting',
      time: '5:30 PM',
      type: 'meeting' as const,
      location: 'Conference Room A',
    },
  ];

  const actions = [
    {
      label: 'Add Player',
      icon: <PlusIcon className="h-4 w-4" />,
      onClick: () => console.log('Add player'),
    },
    {
      label: 'Schedule Event',
      icon: <CalendarIcon className="h-4 w-4" />,
      onClick: () => console.log('Schedule event'),
    },
    {
      label: 'View Team',
      icon: <UsersIcon className="h-4 w-4" />,
      onClick: () => console.log('View team'),
    },
    {
      label: 'Analytics',
      icon: <ChartBarIcon className="h-4 w-4" />,
      onClick: () => console.log('View analytics'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your team.</p>
      </div>
      
      <StatsWidget stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScheduleWidget events={events} />
        <QuickActionsWidget actions={actions} />
      </div>
    </div>
  );
};
EOF

    # Other feature placeholders (Bash loop)
    for feature in Team Schedule Analytics Settings; do
      feature_lower=$(echo $feature | tr '[:upper:]' '[:lower:]')
      mkdir -p src/features/$feature_lower
      cat > src/features/$feature_lower/${feature}.tsx << EOF
import React from 'react';

export const ${feature}: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">${feature}</h1>
        <p className="text-gray-600">${feature} feature coming soon...</p>
      </div>
    </div>
  );
};
EOF
    done

    print_success "Feature placeholders created"
}

# Main execution
main() {
    echo "Starting Day 2: Design System & Core Components..."
    
    create_theme_provider
    create_core_components
    create_layout_components
    create_dashboard_widgets
    create_component_index
    update_app_tsx
    create_feature_placeholders
    
    echo ""
    echo "🎨 Day 2 Complete!"
    echo "=================="
    echo ""
    echo "What was created:"
    echo "- Theme provider with dark mode support"
    echo "- Core UI components (Button, Card, Input, Modal, LoadingSpinner, Skeleton)"
    echo "- Layout components (AppShell, Header, Sidebar, MobileNav)"
    echo "- Dashboard widgets (Stats, Schedule, QuickActions)"
    echo "- Feature placeholders for all main screens"
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm start' to see the new design system in action"
    echo "2. Begin Day 3: Authentication & Routing"
    echo "3. Customize colors and components as needed"
    echo ""
    echo "The app now has a complete design system foundation! 🚀"
}

# Run main function
main "$@" 