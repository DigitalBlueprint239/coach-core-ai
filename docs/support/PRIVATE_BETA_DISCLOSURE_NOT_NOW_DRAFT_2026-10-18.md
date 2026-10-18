# DRAFT — Private-beta disclosure: the one-time "Not now" on device-play import

**Status: proposal for Coach Drew's approval. Not published. Wording only; no product change.**

## Where it must appear (decision needed)
Beta onboarding notes and/or the beta agreement; optionally as a sentence under the import offer
itself (that would be a UI copy change with its own review — not made here).

## Proposed disclosure (plain language)

> **Importing plays saved on this device is a one-time offer.** When Coach Core first finds plays saved
> on this device, it asks whether to copy them into your team. If you choose **"Not now"** on a fresh
> offer, the app records that decision for your account and **will not ask again on this device**. Your
> original plays stay on the device untouched, but you will need to contact us if you later want them
> copied in. If an import was already started and interrupted, "Not now" only postpones it — you can
> finish it later from the same account and team.
>
> During the private beta, importing can also be turned off entirely in the build you receive; when it
> is off, you will see a notice and no import buttons, and nothing on your device is changed.

## Why this limitation exists (for the beta FAQ)
Asking once avoids repeatedly nagging coaches and avoids accidental duplicate copies. Re-offering after
a decline would require a reviewed "offer again" control that does not exist in this release.

## What the disclosure must not claim
- That support can move plays to another team or account (it cannot; see the recovery runbook draft).
- That a declined offer can be reopened in-app (no such control exists).
- That import is available in every beta build (it is OFF by default; only explicitly opted-in test
  builds have it ON).

## Missing decisions
| # | Decision | Owner |
|---|---|---|
| P1 | Placement (onboarding doc, agreement, in-app copy) | Coach Drew |
| P2 | Whether the beta build ships with import OFF (current default) or an explicitly reviewed ON build | Coach Drew |
| P3 | The contact path named in "contact us" (same as runbook decision D1) | Coach Drew |
