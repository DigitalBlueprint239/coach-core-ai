#!/bin/bash

# Coach Core AI - Day 1 Integration Setup Script
# This script automates the project setup and architecture foundation

set -e  # Exit on any error

echo "🚀 Coach Core AI - Day 1 Integration Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Create React TypeScript project
create_project() {
    print_status "Creating React TypeScript project..."
    
    if [ -d "coach-core-ai" ]; then
        print_warning "coach-core-ai directory already exists. Removing..."
        rm -rf coach-core-ai
    fi
    
    npx create-react-app coach-core-ai --template typescript --yes
    
    cd coach-core-ai
    print_success "React TypeScript project created"
}

# Set up folder structure
setup_folder_structure() {
    print_status "Setting up folder structure..."
    
    # Create main directories
    mkdir -p src/{components,features,hooks,services,utils,types,contexts,assets}
    mkdir -p src/components/{ui,layout,forms}
    mkdir -p src/features/{auth,dashboard,team,schedule,analytics,communication}
    mkdir -p src/services/{api,firebase,ai}
    mkdir -p src/types/{api,models,ui}
    mkdir -p public/{images,icons}
    
    # Create feature-specific directories
    mkdir -p src/features/auth/{components,hooks,services}
    mkdir -p src/features/dashboard/{components,widgets}
    mkdir -p src/features/team/{components,forms}
    mkdir -p src/features/schedule/{components,calendar}
    mkdir -p src/features/analytics/{components,charts}
    mkdir -p src/features/communication/{components,services}
    
    print_success "Folder structure created"
}

# Install core dependencies
install_dependencies() {
    print_status "Installing core dependencies..."
    
    # Core dependencies
    npm install firebase react-router-dom @tanstack/react-query
    npm install recharts date-fns react-hook-form
    npm install @headlessui/react @heroicons/react
    npm install clsx tailwind-merge
    npm install react-hot-toast
    npm install react-intersection-observer
    npm install react-query-devtools
    
    # Development dependencies
    npm install -D @types/react @types/node
    npm install -D tailwindcss postcss autoprefixer
    npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
    npm install -D eslint-plugin-react eslint-plugin-react-hooks
    npm install -D prettier eslint-config-prettier eslint-plugin-prettier
    npm install -D @testing-library/react @testing-library/jest-dom
    npm install -D @storybook/react @storybook/addon-essentials
    
    print_success "Dependencies installed"
}

# Configure Tailwind CSS
setup_tailwind() {
    print_status "Configuring Tailwind CSS..."
    
    npx tailwindcss init -p
    
    # Create custom Tailwind config
    cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e3a8a',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
EOF

    # Update CSS file
    cat > src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-semibold transition-colors duration-200;
  }
  
  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-900 hover:bg-gray-300;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }
}
EOF

    print_success "Tailwind CSS configured"
}

# Configure ESLint and Prettier
setup_linting() {
    print_status "Configuring ESLint and Prettier..."
    
    # Create ESLint config
    cat > .eslintrc.js << 'EOF'
module.exports = {
  extends: [
    'react-app',
    'react-app/jest',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
EOF

    # Create Prettier config
    cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
EOF

    # Create .prettierignore
    cat > .prettierignore << 'EOF'
node_modules
build
dist
coverage
*.log
EOF

    print_success "ESLint and Prettier configured"
}

# Set up environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    # Create .env.local
    cat > .env.local << 'EOF'
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id

# API Configuration
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_AI_SERVICE_URL=http://localhost:8000

# Feature Flags
REACT_APP_ENABLE_AI_FEATURES=true
REACT_APP_ENABLE_OFFLINE_MODE=true
REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=your_ga_id
REACT_APP_SENTRY_DSN=your_sentry_dsn
EOF

    # Create .env.production
    cat > .env.production << 'EOF'
# Production Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_production_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_production_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_production_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_production_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_production_app_id

# Production API Configuration
REACT_APP_API_BASE_URL=https://api.coachcore.ai
REACT_APP_AI_SERVICE_URL=https://ai.coachcore.ai

# Feature Flags
REACT_APP_ENABLE_AI_FEATURES=true
REACT_APP_ENABLE_OFFLINE_MODE=true
REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=your_production_ga_id
REACT_APP_SENTRY_DSN=your_production_sentry_dsn
EOF

    print_success "Environment variables configured"
}

# Create basic CI/CD pipeline
setup_cicd() {
    print_status "Setting up CI/CD pipeline..."
    
    mkdir -p .github/workflows
    
    # Create GitHub Actions workflow
    cat > .github/workflows/ci.yml << 'EOF'
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linter
      run: npm run lint
    
    - name: Run tests
      run: npm test -- --coverage --watchAll=false
    
    - name: Build project
      run: npm run build
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
      env:
        REACT_APP_FIREBASE_API_KEY: ${{ secrets.STAGING_FIREBASE_API_KEY }}
        REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.STAGING_FIREBASE_AUTH_DOMAIN }}
        REACT_APP_FIREBASE_PROJECT_ID: ${{ secrets.STAGING_FIREBASE_PROJECT_ID }}
    
    - name: Deploy to Firebase Hosting (Staging)
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        channelId: staging
        projectId: ${{ secrets.STAGING_FIREBASE_PROJECT_ID }}

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
      env:
        REACT_APP_FIREBASE_API_KEY: ${{ secrets.PRODUCTION_FIREBASE_API_KEY }}
        REACT_APP_FIREBASE_AUTH_DOMAIN: ${{ secrets.PRODUCTION_FIREBASE_AUTH_DOMAIN }}
        REACT_APP_FIREBASE_PROJECT_ID: ${{ secrets.PRODUCTION_FIREBASE_PROJECT_ID }}
    
    - name: Deploy to Firebase Hosting (Production)
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: ${{ secrets.PRODUCTION_FIREBASE_PROJECT_ID }}
EOF

    print_success "CI/CD pipeline configured"
}

# Create basic TypeScript types
setup_types() {
    print_status "Setting up TypeScript types..."
    
    # Create base types
    cat > src/types/models.ts << 'EOF'
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'coach' | 'assistant' | 'admin';
  teamIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  level: 'youth' | 'high-school' | 'college' | 'professional';
  coachId: string;
  players: Player[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string;
  number: number;
  photoURL?: string;
  stats: PlayerStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  performanceRating: number;
  attendanceRate: number;
}

export interface Session {
  id: string;
  teamId: string;
  title: string;
  description: string;
  date: Date;
  duration: number; // minutes
  drills: Drill[];
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface Drill {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
}

export interface Schedule {
  id: string;
  teamId: string;
  events: ScheduleEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  type: 'practice' | 'game' | 'meeting' | 'other';
  location?: string;
  attendees: string[];
}
EOF

    # Create API types
    cat > src/types/api.ts << 'EOF'
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}
EOF

    print_success "TypeScript types configured"
}

# Create basic service structure
setup_services() {
    print_status "Setting up service structure..."
    
    # Create Firebase service
    cat > src/services/firebase/config.ts << 'EOF'
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);

export default app;
EOF

    # Create API service base
    cat > src/services/api/base.ts << 'EOF'
import { ApiResponse, ApiError, QueryParams } from '../../types/api';

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_BASE_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  protected get<T>(endpoint: string, params?: QueryParams): Promise<ApiResponse<T>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.request<T>(`${endpoint}${queryString}`);
  }

  protected post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  protected put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  protected delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  private buildQueryString(params: QueryParams): string {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    return searchParams.toString() ? `?${searchParams.toString()}` : '';
  }
}

export default ApiService;
EOF

    print_success "Service structure configured"
}

# Initialize Git repository
setup_git() {
    print_status "Setting up Git repository..."
    
    # Initialize Git
    git init
    
    # Create .gitignore
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Storybook
storybook-static/
EOF

    # Make initial commit
    git add .
    git commit -m "Initial commit: Coach Core AI project setup"
    
    print_success "Git repository initialized"
}

# Create README
create_readme() {
    print_status "Creating README..."
    
    cat > README.md << 'EOF'
# Coach Core AI

A comprehensive mobile assistant for coaches, seamlessly blending coaching tools with administrative capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Firebase project

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.local.example` to `.env.local` and configure your Firebase settings
4. Start development server: `npm start`

### Available Scripts
- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📱 Features

- **Dashboard** - Central hub with key metrics and quick actions
- **Team Management** - Comprehensive player and team organization
- **Session Planning** - Create and manage training sessions
- **Schedule & Calendar** - Unified view of all coaching activities
- **Analytics & Reports** - Data-driven insights for performance improvement
- **Communication Hub** - Centralized messaging and announcements
- **Resources & Learning** - Coaching development and resource library

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Deployment**: Firebase Hosting
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── features/       # Feature-specific components and logic
├── hooks/          # Custom React hooks
├── services/       # API and external service integrations
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── contexts/       # React contexts for state management
```

## 🔧 Development

### Code Style
- ESLint + Prettier for code formatting
- TypeScript for type safety
- Component-based architecture
- Mobile-first responsive design

### Testing
- React Testing Library for component tests
- Jest for unit tests
- Coverage reporting

## 📦 Deployment

### Staging
- Automatic deployment on `develop` branch
- Firebase Hosting staging channel

### Production
- Automatic deployment on `main` branch
- Firebase Hosting production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details
EOF

    print_success "README created"
}

# Main execution
main() {
    echo "Starting Coach Core AI integration setup..."
    
    check_prerequisites
    create_project
    setup_folder_structure
    install_dependencies
    setup_tailwind
    setup_linting
    setup_environment
    setup_cicd
    setup_types
    setup_services
    setup_git
    create_readme
    
    echo ""
    echo "🎉 Coach Core AI - Day 1 Setup Complete!"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "1. Update .env.local with your Firebase configuration"
    echo "2. Run 'npm start' to start the development server"
    echo "3. Begin implementing Day 2 features (Design System & Core Components)"
    echo ""
    echo "Project structure created:"
    echo "- React TypeScript app with Tailwind CSS"
    echo "- ESLint and Prettier configured"
    echo "- CI/CD pipeline with GitHub Actions"
    echo "- TypeScript types and service structure"
    echo "- Git repository initialized"
    echo ""
    echo "Happy coding! 🚀"
}

# Run main function
main "$@" 