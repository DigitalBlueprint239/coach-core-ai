# V3 Editor Integration — Recovery Branch Gate

After merging the prerequisite Smart Playbook PRs #106, #107, #108 and #114 into the recovery branch, PR #115 is now targeting `recovery/coach-core-mvp-2026`.

The proposed v3 workspace reuses `savePlayDocV3`/versioned transactional writes and migrates v2 records **only into new v3 documents**. Existing v3 assignments that the older 2D renderer cannot draw stay in the canonical document unchanged. Research-stage Inside Zone assistance remains advisory, not verified or auto-applied.

Re-run all required GitHub checks on the new PR base. Real signed-in Firestore and cross-account browser acceptance and production-rule deployment are separate blocked release gates, not inferred from passing unit and emulator tests.

Do not deploy production Firestore/Hosting or publish unverified football claims as part of this merge.
