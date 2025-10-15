# Contributing to Coach Core AI

## Prerequisites

- **Node.js:** 18.x or 20.x (see `.nvmrc`)
- **npm:** 10.x or later
- **Git:** Latest version

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/DigitalBlueprint239/coach-core-ai.git
   cd coach-core-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:3000`

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run start` - Alias for dev command
- `npm run preview` - Preview production build

### Building
- `npm run build` - Create production build
- `npm run build:safe` - Build with validation checks

### Code Quality
- `npm run typecheck` - TypeScript compilation check
- `npm run lint` - ESLint code linting
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Prettier code formatting

### Testing
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run cypress:open` - Open Cypress test runner

### Validation
- `npm run validate` - Quick validation
- `npm run validate:comprehensive` - Full validation suite
- `npm run ci:validate` - CI validation pipeline

## Project Structure

```
coach-core-ai/
├── src/
│   ├── components/          # React components
│   ├── services/            # Business logic & API services
│   ├── hooks/               # Custom React hooks
│   ├── contexts/            # React contexts
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   └── index.css            # Global styles (Tailwind CSS)
├── public/                  # Static assets
├── dist/                    # Build output (generated)
├── .github/workflows/       # CI/CD workflows
└── docs/                    # Documentation
```

## Technology Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite 7
- **Styling:** Tailwind CSS 3.4.x + Chakra UI
- **State Management:** Zustand + React Query
- **Testing:** Vitest + Cypress
- **Linting:** ESLint + Prettier
- **CI/CD:** GitHub Actions

## Common Issues & Solutions

### Build Failures

#### Tailwind CSS Issues
**Problem:** CSS import order errors
**Solution:** Ensure `@import` statements come before `@tailwind` directives in `src/index.css`

```css
/* ✅ CORRECT ORDER */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ❌ INCORRECT ORDER */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
```

#### Firebase Import Issues
**Problem:** Services can't import Firebase configuration
**Solution:** Always import from `./firebase-config.ts`, not `./config.js`

```typescript
// ✅ CORRECT
import { db, auth } from './firebase-config';

// ❌ INCORRECT
import { firebase } from './config';
```

### TypeScript Errors

#### Path Alias Issues
**Problem:** Import paths not resolving
**Solution:** Use the configured path aliases in `tsconfig.json`

```typescript
// ✅ CORRECT - Using path aliases
import { Button } from '@components/ui/Button';
import { useAuth } from '@hooks/useAuth';

// ❌ INCORRECT - Relative paths
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../../hooks/useAuth';
```

#### Component Syntax Errors
**Problem:** JSX syntax issues in components
**Solution:** Check for missing parentheses in map functions and proper JSX structure

```typescript
// ✅ CORRECT
{items.map((item) => (
  <div key={item.id}>{item.name}</div>
))}

// ❌ INCORRECT - Missing opening parenthesis
{items.map((item) => 
  <div key={item.id}>{item.name}</div>
)}
```

### ESLint Issues

#### Plugin Compatibility
**Problem:** ESLint plugins not loading
**Solution:** Use ESLint v8 with compatible plugin versions

```bash
# Install compatible versions
npm install -D eslint@^8.57.0 @typescript-eslint/eslint-plugin@^6.0.0
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature-name
```

### 2. Code Quality Checks
```bash
# Before committing, run:
npm run typecheck    # TypeScript errors
npm run lint         # Code style issues
npm run format       # Auto-format code
npm run build        # Ensure build works
```

### 3. Testing
```bash
# Run tests before pushing
npm run test         # Unit tests
npm run test:e2e     # End-to-end tests
```

## Environment Variables

Create a `.env.local` file for local development:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_BASE_URL=http://localhost:5001
VITE_USE_EMULATOR=true
```

## Performance Considerations

### Bundle Size
- **Current:** ~1.8MB (uncompressed), ~460KB (gzipped)
- **Target:** Keep under 2MB uncompressed
- **Monitoring:** Check bundle size after major changes

### Code Splitting
- Vendor chunks are automatically created
- Route-based splitting is implemented
- Lazy loading for large components

### Build Optimization
- Tree shaking is enabled
- Source maps for debugging
- Minification for production

## Troubleshooting

### Node Version Issues
```bash
# Use the correct Node version
nvm use  # If using nvm
# or
node --version  # Should match .nvmrc
```

### Dependency Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Issues
```bash
# Check for TypeScript errors
npm run typecheck

# Check for linting issues
npm run lint

# Clean build
rm -rf dist
npm run build
```

## Getting Help

- **Issues:** Create GitHub issues for bugs
- **Discussions:** Use GitHub Discussions for questions
- **Documentation:** Check `docs/` folder for detailed guides
- **Code Review:** Request reviews from maintainers

## Contributing Guidelines

1. **Follow the existing code style**
2. **Write meaningful commit messages**
3. **Add tests for new features**
4. **Update documentation as needed**
5. **Ensure all checks pass before submitting**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
