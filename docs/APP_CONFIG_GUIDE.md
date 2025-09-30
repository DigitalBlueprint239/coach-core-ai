# App Configuration (Role Permissions & Waitlist)

This service centralizes feature flags that we previously hard-coded inside the auth
and waitlist layers. Production and staging environments should create the following
Firestore documents under the `config` collection (they can be managed via the
Firebase Console or a short admin script).

## `config/rolePermissions`

```json
{
  "permissions": {
    "admin": [
      { "resource": "profile", "action": "read" },
      { "resource": "profile", "action": "write" },
      { "resource": "general", "action": "admin" }
    ],
    "coach": [
      { "resource": "profile", "action": "read" },
      { "resource": "profile", "action": "write" },
      { "resource": "teams", "action": "read" },
      { "resource": "teams", "action": "write" },
      { "resource": "plays", "action": "read" },
      { "resource": "plays", "action": "write" },
      { "resource": "practice", "action": "write" }
    ]
    // ...assistant-coach, head-coach, team-admin, client
  }
}
```

Missing roles automatically fall back to the defaults baked into
`DEFAULT_ROLE_PERMISSIONS`, so you can roll out overrides incrementally.

## `config/waitlist`

```json
{
  "rateLimit": {
    "maxAttempts": 3,
    "windowMs": 3600000
  },
  "batch": {
    "size": 10,
    "timeoutMs": 5000
  }
}
```

If this document is absent the application continues to use the default values
(3 attempts per hour, batch size 10 with a 5 second timeout).

## `config/subscriptions`

```json
{
  "tiers": [
    {
      "id": "tier_free",
      "name": "free",
      "stripePriceId": "price_free",
      "pricing": { "monthly": 0, "annual": 0, "currency": "usd" },
      "features": {
        "maxClients": 3,
        "maxTeams": 1,
        "aiGenerationsPerMonth": 10,
        "videoStorageGB": 1,
        "customBranding": false,
        "prioritySupport": false,
        "apiAccess": false
      },
      "limits": {
        "sessionsPerMonth": 10,
        "practicesPerMonth": 4,
        "playsPerTeam": 25
      }
    }
    // starter, professional, enterprise ...
  ],
  "specials": {
    "foundingMember": { "discount": 0.5, "features": "professional" },
    "earlyAccess": { "discount": 0.4, "duration": "lifetime" },
    "betaTester": { "freeMonths": 3, "thenTier": "professional" }
  }
}
```

Tiers can be extended with additional fields if needed; the defaults baked into
`DEFAULT_SUBSCRIPTION_CONFIGURATION` provide a sensible baseline for local and CI runs.

## Runtime behaviour

- `AppConfigService.ensureLoaded()` is invoked the first time a role-aware signup
  or waitlist operation runs. Failed fetches log a warning and the code falls back
  to the defaults above.
- Calling `appConfigService.refresh()` (from a future admin UI or script) will
  reload both documents.
- The waitlist service hot-swaps its in-memory rate limiter whenever the config
  changes; you can verify your overrides by inspecting `getWaitlistSettings()`.

Keep these documents version controlled (for example using the Firestore seeded
export in CI) so that environments stay in sync.
