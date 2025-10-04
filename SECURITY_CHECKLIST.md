# Coach Core AI – Security Checklist

## ✅ Completed by Automation
- Added runtime environment validation (`src/utils/env-validator.ts`) that blocks startup if required Firebase keys are missing.
- Replaced the insecure `deploy:production` npm script with `deploy-secure.sh` to keep secrets out of `package.json`.
- Regenerated `.env.example` with clear guidance and removed legacy hard-coded keys.
- Updated `.gitignore` to prevent accidental commits of environment files, backups, and certificate material.
- Hardened `ProtectedRoute` and new auth pages to avoid leaking stack traces to users.

## 🧭 Manual Follow-up
1. **Create secure env files**
   - Copy `.env.example` to `.env.local` for development and `.env.production` for deployments.
   - Populate every required `VITE_FIREBASE_*` value and keep the files outside version control.
2. **Rotate exposed keys**
   - If previous commits contained real Firebase or Stripe keys, rotate them in the provider console and purge from git history if necessary (e.g. `git filter-repo`).
3. **Connect env-validator to Firebase config**
   - Import `env` from `@utils/env-validator` inside `src/services/firebase/firebase-config.ts` and use those validated values to instantiate Firebase.
4. **Address npm audit findings**
   - Run `npm audit` and evaluate each vulnerability. Prefer targeted upgrades; use `npm audit fix --force` only if you understand the breaking changes.
5. **Review legacy configuration files**
   - `src/utils/environmentValidator.ts` and other deprecated scripts still reference `REACT_APP_*` variables—update or archive to avoid confusion.
6. **Configure CI secrets**
   - Store production environment variables in your CI/CD secret manager and update pipelines to call `deploy-secure.sh`.
7. **Remove old secrets from history**
   - If sensitive keys were committed previously, delete the files, rotate the keys, and scrub them from history using tools such as `git filter-repo`.

## 🔐 Creating `.env.local` & `.env.production`
1. `cp .env.example .env.local`
2. `cp .env.example .env.production`
3. Fill each file with environment-specific values.
4. Keep `.env.production` in a secure secrets store (GitHub Actions secrets, 1Password, etc.).

## 🧪 Testing & Monitoring
- After updating environment files, restart `npm run dev` to ensure the validator passes.
- Monitor browser console during sign-in/out to confirm no sensitive data is logged.
- Enable two-factor authentication on Firebase, Stripe, and deployment platforms.

## ♻️ If Secrets Leak Again
1. Revoke the compromised API keys immediately.
2. Rotate application passwords and invalidate active sessions if user data is at risk.
3. Force push the cleaned branch only after verifying the history no longer contains secrets.
4. Communicate with stakeholders about the rotation and any required user action.

## 📆 Ongoing Practices
- Perform quarterly secret rotation and npm dependency audits.
- Require PR reviews for configuration changes.
- Enforce least-privilege IAM roles for Firebase, Stripe, and deployment bots.
- Keep `deploy-secure.sh` as the single entry point for production builds to avoid regressions.
