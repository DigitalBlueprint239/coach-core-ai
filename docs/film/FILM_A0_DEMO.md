# Film A0: local synthetic coaching demo

Authorized scope: Coach Drew's A0 implementation instruction under [FR1 r2.2](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6340778849). Base: accepted INT-A `c7baeb006a1fc01a6c9986088e1b1594927f9aba`, containing accepted PR79. Implementation delivery only; Claude non-author acceptance is separate. MVP remains NO-GO.

## Run

Use Node22+ and the existing lockfiles. No Firebase project, credentials, emulators, provider account or cloud deployment is needed.

```sh
npm ci --legacy-peer-deps
npm run demo:film-a0
```

Open **http://localhost:4210** on this machine. The server binds127.0.0.1 only; it is not a hosted preview, deployment or shared-device service. Ctrl+C stops it. `node scripts/film-a0.cjs --build-only` produces `film-a0-build/`, separately from the ordinary app build. Do not deploy this output. The normal app entry and its auth/import/identity behavior are unchanged. Core navigation shown by the reused AppShell only explains the isolated demo boundary; it does not access Teams/Practice/Playbook.

If a project environment variable is already set to a non-`demo-*` project, the runner refuses by variable name without printing its value. Unset that variable **for this process**, not global configuration. No project is actually used by A0. The separate module graph rejects Firebase/AI modules; it never imports App/Auth, provider clients, notification setup or service-worker registration. A controlled service worker on this origin also blocks the client demo. The loopback server rejects foreign Host, non-GET/HEAD and paths outside the generated static allowlist; CSP prohibits external connections/frames. These are local-demo controls, not a staging/beta security certification.

## Coach task

1. Play the original synthetic out-route diagram. Pause, seek or choose0.5×/1×/1.5×/2×.
2. Seek near3.5seconds and **Mark start here**, then6seconds and **Mark end here**. Direct second inputs work too. Replay interval starts at the mark and stops at its end (HTML media events are not frame-accurate clipping).
3. Label it “Out route”; add “Break toward the sideline.”
4. **Save in this browser**. A positive status appears only after setItem and byte-equal, schema-validated readback.
5. Reload to reopen the same interval/text bound to the sample identity/hashes. This is this-browser persistence, not team/cloud/cross-device saving.
6. **Reset local demo** removes only this sample's record and verifies absence before confirming. Unrelated site data stays intact.

Storage unavailable/throwing, quota, invalid/corrupt/foreign record, mismatching/throwing readback and failed/no-op reset are visible unsaved states. Session edits and playback remain usable when storage fails. Corrupt records are preserved until explicit reset or a successful replacement save. Editing or another-tab storage changes clear the positive saved status. Clearing browser site data loses notes. Never enter real athlete information in this synthetic demo.

## Sample provenance

`scripts/film-a0/sample/out-route.mp4` and `.webm` are original, fully synthetic, eight-second640×360,15fps diagrams. White circles and blue crosses illustrate players; one yellow receiver runs and breaks toward the sideline. No camera footage, people/likeness, third-party video, roster, audio, AI generation or paid service was used. The suggested3.5–6.0second interval includes the break. It is a manual coaching interaction example, not a game, tactic-quality or model-accuracy claim. Coach usefulness feedback remains to be collected.

The MP4 H.264 and WebM VP8 files depict the same diagram. Browser support chooses one fixed allowlisted encoding; no URL/file picker exists. Fetch verifies the complete bytes and SHA256 against the compiled manifest before exposing a blob URL; duration is checked on metadata load. Bad/missing media blocks playback/save. Blob URLs are released when unmounted.

Provenance, byte sizes and final hashes: `scripts/film-a0/sample/sample.json`, mirrored in the demo client. Original generator: `python scripts/film-a0/generate-sample.py`; recorded toolchain FFmpeg7.1.5 Debian and Pillow12.3.0, DejaVu Sans font. This is **sample authoring**, not a replacement for the accepted pinned S2a decoder or its licensing/runtime evidence. Frozen accepted decoder fixtures and tools are unchanged. Re-generation uses single-thread/bitexact muxing and matched byte-for-byte in two consecutive runs; other toolchains need independent digest comparison. No generator tool is required to run the checked-in demo.

## Focused validation and review

```sh
CI=true npm test -- --watchAll=false --runInBand --runTestsByPath \
  src/features/film-analyzer/demo/localRecord.test.ts \
  src/ui/AppShell.test.tsx src/ui/WeekDashboard.test.tsx
npx tsc --noEmit
npm --prefix e2e ci
npm --prefix e2e exec -- playwright install chromium firefox
# In another terminal, while npm run demo:film-a0 is running:
node tests/film-a0/isolation.cjs
A0_EVIDENCE_DIR=/tmp/film-a0-evidence node tests/film-a0/browser.cjs
```

Browser checks exercise actual advancing media, seek/speed, mark buttons, end-stop, byte-exact note save/reload/reset, failed/blocked/quota/mismatching readback, corrupted/foreign identity, other-tab invalidation, invalid bounds, tampered/missing media, and390px identity/layout/status visibility. Every context rejects unexpected external requests and page errors. No browser skips or retries are configured. Results include the served build SHA/dirty state; traces/screenshots and failures are retained to the chosen evidence directory. Physical devices/Safari, real coaches, deployment and cloud behavior are unverified. No unchanged core matrix is needed for this isolated entry.

Initial observations retained for review: the first non-bitexact WebM generator changed its segment bytes/hash on regeneration; fixed with bitexact/single-thread output and final repeated generation. An inherited dark text color initially made light cards hard to read; corrected in demo-scoped CSS. First browser functional run28/28 and focused unit/identity23/23 passed before these presentation/fixture refinements. Final exact-SHA results and evidence links are posted on #39 and the draft PR; they are implementation measurements, not independent acceptance.

Claude's non-author review should independently challenge false Saved/Reset, sample identity/reload binding, unsupported or failed media, actual interval playback, another-tab behavior, identity/no-team/sample distinction preservation, and source/module/network isolation. Verify accepted source/assertions/settings byte preservation. Review this exact source SHA rather than a temporary merge checkout. No A1 proxy, worker entry, upload, retention/deletion backend, AI, real footage, activation, deployment or spending is included.

## A0-1 / A0-2 repairs (Claude FAIL retained)

Claude's [review of the original6c8a90b candidate](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6342214324) found two blocking in-scope defects. That FAIL and its evidence remain valid for the superseded head.

**A0-1:** a manifest-valid stored cue used to reopen and claim Saved before actual media validation. Reopening now has a pending state: the editor stays empty and the status says the sample is being verified. Both loaded bytes and duration must pass before the cue enters the editor and a positive checked/Saved status appears. Tampered, missing or duration-mismatched media shows not verified and preserves the stored record. Reset, edits and another-tab changes invalidate pending restoration, so a late media response cannot resurrect deleted or stale cues or overwrite session edits. A later media error also suppresses a positive Saved claim.

**A0-2:** samples were originally under CRA's public directory and were copied into ordinary app output. They now live only in `scripts/film-a0/sample/`; the isolated runner alone validates and copies them into `film-a0-build/film-a0/`. The generator writes that source directory. Sample media bytes/hashes are unchanged. A fresh ordinary app build must contain no A0 path, sample file, build provenance or matching media digest.

Additional regression commands (while the isolated demo is running):

```sh
A0_EVIDENCE_DIR=/tmp/film-a0-reopen node tests/film-a0/reopen-regressions.cjs
# Separate ordinary app build, no deployment:
CI=false npm run build
node tests/film-a0/normal-build-isolation.cjs
```

The same new reopen regressions ran against the failed build:4 passed/10 failed,0 skipped across Chromium and Firefox. Valid stored records with tampered/missing/slow/duration-error media expose the false claim; the pending other-tab case also fails. The normal-build isolation assertion fails against the old output containing all three sample files. These baseline failures are retained rather than relabelled. Repair validation and the new exact-SHA re-review handoff are posted on #39/PR89. These are author regressions, not Claude's re-review verdict. Existing28 browser assertions, storage tests, identity tests and all accepted source remain unchanged.
