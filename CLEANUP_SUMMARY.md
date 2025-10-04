# Coach Core AI - Cleanup Summary

## ✅ Completed Tasks

### 1. File Cleanup
- Removed build artefacts (`dist/`, `dist 2/`, `dist 3/`, generated reports, log files)
- Removed legacy CRA duplicate (`coach-core-ai/`)
- Deleted duplicate service implementations (`src/services/api/*.js`, `src/utils/securityRulesGenerator.js`)
- Removed unused waitlist service variants and empty support directories (`models/`, `model_registry/`, `.storybook/`)
- Pruned unused tooling/static files (Tailwind config, legacy HTML assets, `.eslintrc.js`, `src/styles/theme.css`, `vite.config.production.ts`)

### 2. Dependencies
- Added missing runtime deps: `express`, `cors`, `express-rate-limit`, `react-icons`
- Uninstalled unused prod deps (Supabase, D3, Framer Motion, Workbox, etc.)
- Uninstalled unused dev deps (Storybook, TailwindCSS toolchain, Vitest UI)
- Ran a clean `npm install`

### 3. Critical Fixes
- Migrated `APIService` env references from `process.env.REACT_APP_*` to `import.meta.env.VITE_*`
- Added `.env.example` template with required keys
- Ensured Waitlist enhanced form falls back to `simpleWaitlistService` after removing enhanced service
- Created `src/pages/auth/` and `src/pages/dashboard/` scaffolding directories

### 4. Verification
- `npx tsc --noEmit --skipLibCheck`
- `npm run build`

## 📊 Impact
- Legacy CRA bundle removed (~700k LOC including node_modules)
- Node_modules trimmed by uninstalling unused packages
- Production build passes without Tailwind/PostCSS plugins

## ⚠️ Manual Actions Suggested
- Add missing `/login` route or associated page (directory exists, component still needed)
- Introduce `private isAuthenticated = false;` to `src/services/api/api-service.ts` if you intend to query that flag later
- Remove deployment secrets from `package.json` `deploy:production` script
- Review remaining components that import removed services/configs

## 📁 Files Added / Updated
- `CLEANUP_SUMMARY.md`
- `.env.example`
- `postcss.config.js` (clean plugin list)
- `src/components/Waitlist/EnhancedWaitlistForm.tsx` (fallback to simple service)

