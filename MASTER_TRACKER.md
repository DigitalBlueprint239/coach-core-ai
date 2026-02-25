# MASTER TRACKER - Coach Core AI

**Last Audited**: 2026-02-25
**Audited By**: Automated codebase review
**Branch**: `claude/review-master-tracker-RZtQh`

---

## Overall Completion: ~35%

| Area | Status | Completion |
|------|--------|------------|
| Project scaffolding & config | Broken | 40% |
| Authentication (Firebase) | Functional | 75% |
| Smart Playbook (play designer) | Mostly functional | 70% |
| Dashboard UI | Partial | 45% |
| AI Brain (core AI engine) | Stub only | 5% |
| AI Service (OpenAI integration) | Written, not runnable | 30% |
| Roster Management | Not functional | 10% |
| Practice Planner | Partial UI only | 20% |
| Data layer / Firestore services | Written, untested | 40% |
| Offline / PWA | Partial | 25% |
| Tests | Failing | 5% |
| CI/CD & Deployment | Configured, not working | 20% |
| File structure / hygiene | Poor | 15% |

**Weighted estimate**: The app does not build, does not pass tests, and the core AI feature is entirely stubbed. Approximately 35% of the advertised work is functional.

---

## BUILD STATUS: FAILING

```
npm run build   -> FAILS (PostCSS/Tailwind config error)
npx tsc         -> 166 ERRORS (2 files)
npm test        -> FAILS (import.meta not supported in Jest)
npm audit       -> 24 vulnerabilities (1 critical, 14 high)
```

### Build Blockers

1. **PostCSS/Tailwind v4 misconfiguration** - `react-scripts build` fails because Tailwind CSS v4 changed its PostCSS plugin to `@tailwindcss/postcss`. The `postcss.config.js` uses the new package but `react-scripts` (Webpack 5) does not support it properly.
2. **TypeScript errors in 2 files** - 104 errors in `src/components/Coach Core AI Brain /ai-brain-mvp-setup.ts`, 62 errors in `src/components/coach-core-integration.ts`. Both are malformed JSX in `.ts` files.
3. **Jest cannot handle `import.meta`** - Tests crash because `src/ai-brain/AIContext.tsx` uses `import.meta.env` which Jest/react-scripts does not support without transform config.

---

## KNOWN ISSUES

### CRITICAL (App won't run)

| # | Issue | File | Description |
|---|-------|------|-------------|
| C1 | Build fails | `postcss.config.js` | Tailwind v4 PostCSS plugin incompatible with react-scripts/Webpack 5. Build cannot produce output. |
| C2 | Firebase config crashes app | `src/services/firebase.ts:33-36` | Uses `NEXT_PUBLIC_*` env var prefix (Next.js convention) but app uses react-scripts. `process.env.NEXT_PUBLIC_*` is always undefined, causing a hard `throw new Error()` on import. App cannot start. |
| C3 | AI Brain is empty | `src/ai-brain/core/AIBrain.ts` | All 8 methods are TODO stubs returning mock data. The "AI" in Coach Core AI does not exist yet. |
| C4 | coach-core-integration.tsx is all stubs | `src/components/coach-core-integration.tsx` | Exports `CoachCoreAIComplete` and service objects that are entirely empty/placeholder. Conflicts with `.ts` version of same name. |
| C5 | 24 npm vulnerabilities | `package.json` | 1 critical (nth-check ReDoS), 14 high (tar path traversal, webpack SSRF, postcss parse errors). |

### HIGH (Feature broken or security risk)

| # | Issue | File | Description |
|---|-------|------|-------------|
| H1 | API key exposed client-side | `src/services/ai-service.ts` | OpenAI API key passed directly in browser-side fetch calls. Anyone can extract it from network tab. |
| H2 | Tests completely broken | `src/App.test.tsx` | Only 1 test suite exists. It fails due to `import.meta` in AIContext. Zero tests pass. |
| H3 | SmartPlaybook Field.js has illegal filename | `src/components/SmartPlaybook/:components:SmartPlaybook:Field.js` | Colons in filename break Windows. This is the canvas renderer - without it the playbook won't render. |
| H4 | Env var prefix mismatch | `.env.local.example` | Template uses `NEXT_PUBLIC_*` prefix throughout. Some code uses `VITE_*`, some uses `NEXT_PUBLIC_*`. No consistency. |
| H5 | TypeScript errors block type-checking | `src/components/Coach Core AI Brain /ai-brain-mvp-setup.ts` | 104 TS errors because JSX is written in a `.ts` file (needs `.tsx`). Directory name has trailing space. |

### MEDIUM (Quality/maintenance issues)

| # | Issue | File | Description |
|---|-------|------|-------------|
| M1 | 4 duplicate coach-core files | `src/components/coach-core-*.{ts,tsx}` | `coach-core-integration.ts`, `coach-core-integration.tsx`, `coach-core-complete-integration.tsx`, `coach-core-backend.ts` - overlapping purpose, none properly integrated. |
| M2 | Roster Management files are `.jsx.txt` | `src/components/Coach's Corner/Roster Management/*.jsx.txt` | 4 React component files have `.txt` appended - cannot be imported by bundler. |
| M3 | Python files in React src/ | `src/components/integration_package.py`, `setup_script.py`, `coach-core-ai-brain.py` | Python scripts mixed into TypeScript React source tree. They can't run in the browser. |
| M4 | 16 empty .gitkeep placeholder dirs | `src/coach-core-ai/src/**/.gitkeep` | Entire `src/coach-core-ai/` subdirectory tree is empty scaffolding with zero implementation. |
| M5 | Barrel export incomplete | `src/components/index.ts` | Missing exports for Dashboard, SmartPlaybook, FixedCoachCore, and other key components. |
| M6 | SmartPlaybook nested app duplication | `src/components/SmartPlaybook/src/` | Contains a second React app structure (own `App.tsx`, `Dashboard.tsx`, auth forms, firebase service) that duplicates the parent app. |
| M7 | Dashboard has placeholder content | `src/components/Dashboard.tsx` | Tab structure defined but some tabs have no content. Sign-in button is non-functional placeholder. |
| M8 | `handleDemoMode()` is incomplete | `src/App.tsx:52-56` | Sets demo flag but never populates any demo data. |
| M9 | SmartPlaybook broken Field import | `src/components/SmartPlaybook/SmartPlaybook.tsx:9` | Imports `./Field` but no `Field.js` exists at that path (it's at the colon-named path). |
| M10 | TouchOptimizedPlaybook has stub methods | `src/components/SmartPlaybook/TouchOptimizedPlaybook.tsx:344-363` | `showPlayerMenu`, `hidePlayerMenu`, `showContextMenu`, `nextPlay`, `previousPlay` are empty. |

### LOW (Minor issues)

| # | Issue | File | Description |
|---|-------|------|-------------|
| L1 | Apostrophe in directory name | `src/components/Coach's Corner/` | May cause issues in shell scripts and some tooling. |
| L2 | Browserslist data 8 months old | `package.json` | `caniuse-lite` database is outdated. |
| L3 | Storybook configured but unused | `src/components/SmartPlaybook/.storybook/` | Config exists but no stories are wired into the main build. |
| L4 | Multiple `robots.txt` files | `public/robots.txt`, `coach-core-ai/public/robots.txt` | Two different robots.txt in different public dirs. |
| L5 | Hardcoded field dimensions | `SmartPlaybook/SmartPlaybook.tsx` | Canvas is fixed 600x300, no responsive scaling. |

---

## FILE STRUCTURE ISSUES

### Files with spaces in paths (8 files)
```
src/components/Coach Core AI Brain /ai-brain-mvp-setup.ts
src/components/Coach Core AI Brain /ai-brain-mvp-setup.tsx
src/components/Coach Core AI Brain /coach-core-ai-brain.py
src/components/Coach's Corner/Roster Management/AttendanceCheckIn.jsx.txt
src/components/Coach's Corner/Roster Management/AttendanceTable.jsx.txt
src/components/Coach's Corner/Roster Management/PlayerForm.jsx.txt
src/components/Coach's Corner/Roster Management/RosterManagement.jsx.txt
src/components/Coach's Corner/Roster Management/rosterUtils.js
```

### Files with wrong extensions (4 files)
```
*.jsx.txt - These are React components saved with .txt appended, making them non-importable
```

### File with illegal characters (1 file)
```
src/components/SmartPlaybook/:components:SmartPlaybook:Field.js  (colons)
```

### Redundant/conflicting files (4 groups)
```
coach-core-integration.ts vs coach-core-integration.tsx (same name, different ext)
coach-core-backend.ts vs coach-core-complete-integration.tsx (overlapping purpose)
ai-brain-mvp-setup.ts vs ai-brain-mvp-setup.tsx (same name, different ext)
src/services/firebase.ts vs SmartPlaybook/src/services/firebase.ts (duplicate firebase init)
```

---

## WHAT ACTUALLY WORKS

These components contain real, functional code:

| Component | File | Quality |
|-----------|------|---------|
| Auth hook | `src/hooks/useAuth.tsx` | Good - full Firebase auth flow |
| SmartPlaybook core | `src/components/SmartPlaybook/SmartPlaybook.tsx` | Good - drag/drop play designer, undo/redo, formations |
| PlayController | `src/components/SmartPlaybook/PlayController.js` | Excellent - 526 lines of well-structured utility functions |
| Field renderer | `SmartPlaybook/:components:SmartPlaybook:Field.js` | Excellent - full canvas rendering (but filename is broken) |
| Fixed core functionality | `src/components/fixed-core-functionality.tsx` | Good - standalone play designer with 11-player formations |
| SmartPlaybook CSS | `src/components/SmartPlaybook/SmartPlaybook.css` | Good - responsive, accessible, mobile-first |
| SmartPlaybook Firebase services | `SmartPlaybook/src/services/firebase.ts` | Good - full CRUD for practice plans, plays, coaches |
| App shell | `src/App.tsx` | Functional - routing, providers, lazy loading |
| Error boundary | `src/components/ErrorBoundary.tsx` | Functional |
| Loading states | `src/components/LoadingStates.tsx` | Functional |

---

## WHAT COMES NEXT

### Phase 1: Make It Build (Priority: BLOCKING)

1. **Fix PostCSS/Tailwind config** - Either downgrade to Tailwind v3 (compatible with react-scripts) or migrate to Vite. This is the single biggest blocker.
2. **Fix Firebase env var prefix** - Change `NEXT_PUBLIC_*` to `REACT_APP_*` in `src/services/firebase.ts` and `.env.local.example` (or migrate to Vite and use `VITE_*` everywhere).
3. **Fix or exclude broken TS files** - Either fix JSX in `.ts` files or add them to `tsconfig.json` exclude list. Rename directories to remove spaces.
4. **Fix Jest config for `import.meta`** - Add transform or mock for `import.meta.env` in test setup.

### Phase 2: Fix Critical File Issues

5. **Rename `:components:SmartPlaybook:Field.js`** to `Field.js` and update imports.
6. **Rename `.jsx.txt` files** to `.jsx` and move to proper directory (no spaces/apostrophes).
7. **Remove or consolidate duplicate files** - Pick one `coach-core-integration` file and delete the rest.
8. **Remove Python files from src/** - Move to a `scripts/` or `integrations/` directory.

### Phase 3: Implement the AI Brain

9. **Implement `AIBrain.ts` methods** - All 8 methods are TODO stubs. This is the core value proposition.
10. **Fix API key security** - Move OpenAI calls to a backend proxy (the proxy service exists at `src/services/ai-proxy.ts` but the backend endpoint doesn't exist).
11. **Wire AI service to actual UI** - Connect `ai-service.ts` to Dashboard and Playbook components.

### Phase 4: Complete Features

12. **Make Roster Management functional** - Rename files, fix imports, integrate into app routing.
13. **Complete Dashboard tabs** - Add missing tab content and wire data.
14. **Complete Practice Planner** - Currently partial UI only.
15. **Add real tests** - Current test count: 0 passing.

### Phase 5: Production Readiness

16. **Fix all npm audit vulnerabilities** - 24 total, including 1 critical.
17. **Set up working CI/CD** - GitHub Actions workflow exists but build fails.
18. **Clean up empty scaffolding** - Remove 16 `.gitkeep` placeholder directories.
19. **Consolidate SmartPlaybook nested app** - Remove duplicate `src/` structure inside SmartPlaybook.

---

## DISCREPANCY NOTE

The existing documentation files (`PRODUCTION_STATUS.md`, `IMPLEMENTATION_SUMMARY.md`, `PHASE0_COMPLETION_REPORT.md`) all claim 100% completion across 20+ items. This does not match the actual codebase state:

- The app **does not build**
- The app **does not pass tests** (0/0 pass, 1 suite crashes)
- The **AI Brain has zero implementation** (all methods are TODO stubs)
- The **Firebase config crashes on import** (wrong env var prefix)
- **24 security vulnerabilities** remain unaddressed

These documents describe aspirational architecture rather than verified, working functionality.
