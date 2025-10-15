# Next Steps (Weeks 1–12)

## Week-by-Week Action Plan
1. **Week 1:** Finalize pilot agreements, audit repo, set up CI pipeline, kick off design token inventory.
2. **Week 2:** Launch Storybook baseline, implement analytics event taxonomy draft, configure monitoring (Sentry/Datadog).
3. **Week 3:** Harden Firebase rules, onboard pilots into staging environment, deliver stability demo.
4. **Week 4:** Ship PlayCanvas drag-and-drop MVP on web and mobile, run accessibility sweep.
5. **Week 5:** Implement route animation engine, seed play library (20 plays), finalize play data schema.
6. **Week 6:** Deploy AI suggestion service `/ai/suggestions`, commit prompt library v1, run evaluation harness.
7. **Week 7:** Add AI approval UI, document human-in-loop protocol, conduct pilot training session.
8. **Week 8:** Release PDF export pipeline, execute 100 export stress tests, validate field printer compatibility.
9. **Week 9:** Launch sharing with signed URLs, document HUDL/GameChanger export plan, add audit logging.
10. **Week 10:** Implement RBAC middleware and regression tests, draft pricing narrative, run pen test sprint.
11. **Week 11:** Build play adoption dashboard, deploy event batch worker, collect coach feedback loop #2.
12. **Week 12:** Host pilot showcase, run bug bash, finalize case studies, update GTM collateral.

_Assumption:_ Sprints are one-week cadence with Monday planning and Friday demos.

## Team Onboarding Checklist
- [ ] GitHub access granted with required 2FA.
- [ ] Clone repository and run `npm install`.
- [ ] Configure `.env.local` using secrets manager (`vault kv get coachcore/dev`).
- [ ] Verify Firebase emulator setup: `npm run firebase:emulators`.
- [ ] Run `npm run lint && npm run test && npm run typecheck`.
- [ ] Install Expo tooling (`npm install -g expo-cli`) and run `npm run mobile:start`.
- [ ] Join Slack channels (#engineering, #pilots, #incidents).
- [ ] Review /docs folder (PlayExportSpec, Runbooks, Compliance).
- [ ] Enroll in PagerDuty rotation (engineers) or support schedule (GTM).
