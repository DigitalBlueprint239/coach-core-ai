# Features Checklist

Use this list to verify the project after cleanup.

## Authentication & Routing
- [ ] `/` waitlist page loads and submits email successfully.
- [ ] `/admin` and `/beta/dashboard` remain accessible behind `ProtectedRoute` (requires mocked auth user).
- [ ] `/login` route created and connected to Firebase auth flows.

## Services
- [ ] `simpleWaitlistService` handles enhanced form requests after service consolidation.
- [ ] Stripe webhook (`api/stripe-webhook.js`) references installed dependencies (`express`, `cors`, `express-rate-limit`).
- [ ] `src/services/api/api-service.ts` builds without type errors after adding `isAuthenticated` flag.

## Build & Tooling
- [x] `npx tsc --noEmit --skipLibCheck`
- [x] `npm run build`
- [ ] Optional: `npm run test`

## Configuration
- [ ] Populate `.env.example` values for each deployment target.
- [ ] Remove hard-coded secrets from `package.json`.
- [ ] Review `postcss.config.js` if additional CSS tooling is required.
