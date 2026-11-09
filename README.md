# Coach Core AI

An AI-powered football coaching platform with an interactive play designer, offensive engine intelligence, and team management tools. Built for football coaches at all levels — youth through semi-pro.

## Project Status

Coach Core AI is under active development. Based on the most recent implementation audit:

| Area | Completion | Notes |
|------|-----------|-------|
| Core Architecture | ~92% | React + TypeScript + Vite foundation is solid |
| Formation System | ~80% | 24 formations, personnel packages, smart alignment |
| Offensive Engine | ~71% | Schema, concept detection, validators working |
| UI Components | ~67% | 3-panel layout, inspector, toolbelt functional |
| Route System | ~53% | Route drawing works; predefined route library in progress |
| 5-Phase Optimization | ~20% | Ghost previews, batching, micro-icons not started |

**What works today:** Interactive field canvas with drag-and-drop players, formation loading from a 24-formation catalog, freehand route drawing, concept detection (Mesh, Smash, Four Verts), and localStorage persistence.

**What doesn't work yet:** Undo/redo (reducer cases are placeholders), error boundary (not implemented), route hover previews, AI scouting assistant (stub only), real-time collaboration, export.

## Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite 6
- **Canvas:** Konva / react-konva
- **Backend:** Firebase (Auth + Firestore)
- **State Management:** React Context + Reducer
- **Styling:** Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Firebase project with Auth and Firestore enabled

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/coach-core-ai.git
   cd coach-core-ai
   ```

1. **Install dependencies**

   ```bash
   npm install
   ```

1. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your Firebase configuration:

   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

1. **Configure Firebase CLI**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use <your-firebase-project-id>
   ```

   This project includes existing Firebase configuration files. Do not run `firebase init` unless you are setting up a new project from scratch — it may overwrite expected config.

1. **Start the development server**

   ```bash
   npm run dev
   ```

   The app runs at `http://localhost:3000` by default.

### Security Note

Do not place private API keys (OpenAI, Gemini, or any third-party service) in `VITE_`-prefixed environment variables. Vite exposes all `VITE_` variables to the browser bundle. AI and third-party API calls should be routed through Firebase Functions or a secure backend.

## Available Scripts

|Command          |Description                         |
|-----------------|------------------------------------|
|`npm run dev`    |Start the Vite development server   |
|`npm run build`  |Production build                    |
|`npm run preview`|Preview the production build locally|

## Project Structure

```
src/
├── components/           # UI components
│   ├── common/           # Button, IconButton, shared elements
│   ├── FieldCanvas.tsx   # Main Konva canvas
│   ├── InspectorPanel.tsx
│   ├── InstallListPanel.tsx
│   └── Toolbelt.tsx
├── contexts/             # State management
│   ├── PlaybookDataContext.tsx  # Main reducer (play data, routes)
│   ├── PlaybookViewContext.tsx  # UI/view state
│   └── UIContext.tsx
├── engine/               # Offensive intelligence
│   └── offense/
│       ├── schema.ts           # Formation, Route, Concept, Spacing/Timing types
│       ├── data.moderate.ts    # Route library, formation data, concepts
│       ├── conceptDetection.ts # Detects Mesh, Smash, Four Verts, etc.
│       ├── spacingEngine.ts    # Vertical/horizontal spacing validation
│       └── validators.ts       # Data integrity checks
├── config/               # Feature flags
├── hooks/                # Custom React hooks
├── players/              # Player rendering logic
├── routes/               # Route system (drawing, components)
├── services/             # Business logic
│   ├── formationCatalog.ts   # 24 formations
│   ├── formationService.ts
│   ├── formationRules.ts
│   └── routeManager.ts
└── types/                # TypeScript type definitions
```

## Offensive Engine

The engine layer provides football intelligence on top of the visual play designer:

- **18 routes** across the full route tree (Hitch, Slant, Go, Corner, Post, Dig, Curl, Out, Flat, Comeback, Wheel, Seam, Stick, Angle, Swing, Screen, Fade, Arrow)
- **16 formations** with personnel groupings (10, 11, 12, 20, 21)
- **15 passing concepts** with concept detection (Mesh, Smash, Four Verts, Shallow Cross, Flood, Snag, Spacing, Stick, Curl-Flat, Dagger, Y-Cross, Drive, Mills, Hitch, Slant-Flat)
- **Spacing rules** for vertical and horizontal separation validation
- **Timing rules** coupling QB drop type to route depth windows

Concept detection, spacing warnings, and route library UI components are wired to the inspector panel.

## Known Issues

These are documented, tracked, and scheduled for resolution:

- `UNDO` and `REDO` cases in `PlaybookDataContext` are `return state` placeholders — history/future arrays exist but are never populated
- Feature flag `offensiveEngineSpacingHints` may be set to `false` — enable it to surface spacing warnings in the UI
- `firestore.ts` `addToOfflineQueue` is a known fragile point that agent sessions have reintroduced bugs into; treat with caution during edits
- `@ts-nocheck` suppressions have been removed twice and reintroduced by agents; any clean session should audit for their return
- Persistence layer needs verification that route labels survive save/load cycles
- No error boundary wrapping the app — a canvas crash takes down the whole UI

## Roadmap

**Tier 1 — Must ship:** Route library UI, concept detection, spacing warnings, undo/redo, error boundary, save/load verification

**Tier 2 — Professional feel:** Ghost route previews, concept batching, micro-icons, PDF/PNG export

**Tier 3 — Best-in-class:** AI play suggestions, timing validation, coverage analyzer

**Tier 4 — Market expansion:** Real-time collaboration, video linkage, mobile app

## Deployment

```bash
npm run build
firebase deploy
```

## License

This project is licensed under the MIT License.
