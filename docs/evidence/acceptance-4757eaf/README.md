# Candidate4757eaf acceptance evidence

Application tested:4757eaffad31664dae727c34355aca8109fcc63c. This documentation-only recovery-based branch is not the tested application. Use the exact candidate in a fresh isolated checkout. Complete results:summary.json and repeats/run-01..run-10. RawZIP/PNG remain private/local with checksum metadata, because traces contain emulator Auth tokens. The old initialL1 binaries remainmissing; these runs do not replace them. See the existing repair handoff and security report§11 for counts, setup failures, root-cause confidence, ownership and commands.

For the exact external runner layout, copy repeat-runner.mjs to the candidate checkout's parent as acceptance-4757eaf-healthy-repeat.mjs; copy summarize.py there as acceptance-4757eaf-summarize.py. Do not reuse an existing acceptance-4757eaf-healthy-runs folder: runner refuses it to preserve evidence. Run the command from the candidate root with the documented emulators/demo-only environment. No retries, skip flags removed; all ten runs continue after failures. Never print/commit real keys or raw Auth-token traces.

Invalid startup-attempt evidence:startup-failed/run-01 and preflight emulator logs. Completed healthy runs:repeats. Both remain separately identified; no partial startup is counted as acceptance. No archive or input data was deleted by the evidence export.
