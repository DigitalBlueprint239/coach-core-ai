# Subscription Configuration Guide

## Firestore Documents

All subscription-related configuration lives under the `config` collection. The defaults
used in development are documented below.

### `config/subscriptions`

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
    // Additional tiers: starter, professional, enterprise
  ],
  "specials": {
    "foundingMember": { "discount": 0.5, "features": "professional" },
    "earlyAccess": { "discount": 0.4, "duration": "lifetime" },
    "betaTester": { "freeMonths": 3, "thenTier": "professional" }
  }
}
```

### `config/rolePermissions`
See `APP_CONFIG_GUIDE.md` for details.

### `config/waitlist`
See `APP_CONFIG_GUIDE.md` for details.

## Stripe Environment Variables

The following secrets are required for the backend runtime (Cloud Functions or other server environment):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PUBLISHABLE_KEY` (used client-side)

If you are running the emulator suite locally, place these values in `.env.local` or a Firebase Functions `.env` file.

## Usage

The application hydrates subscription tiers on boot via `appConfigService.ensureLoaded()`. When the Firestore documents
are absent, the defaults defined in `DEFAULT_SUBSCRIPTION_CONFIGURATION` are used, ensuring local development continues
without manual setup.
