/* eslint-disable */
// Reviewer probe: D5 s2bClass vs A5's durable recovery mark (job.recovery), at C.
const path = require('path'); const root = process.argv[2];
const {s2bClass} = require(path.join(root, 'functions/scripts/film-cleanup-admin.js'));
const film = {status: 'validating', objectGeneration: '7'};
const cases = {
  'exhaustion recovery-needed (attempts-exhausted)': {recovery: {reason: 'attempts-exhausted'}, exhaustion: {outcome: 'recovery-needed'}},
  'holdForRecovery: precondition-changed-mid-run': {recovery: {reason: 'precondition-changed-mid-run'}, exhaustion: null},
  'holdForRecovery: validation-record-invalid': {recovery: {reason: 'validation-record-invalid'}, exhaustion: null},
  'output-ownership-unproven': {recovery: {reason: 'output-ownership-unproven'}, exhaustion: null},
  'team-ownership-changed': {recovery: {reason: 'team-ownership-changed'}, exhaustion: null},
  'validation-record-stale': {recovery: {reason: 'validation-record-stale'}, exhaustion: null},
  'rejection-precondition-failed (exhaustion rejected)': {recovery: {reason: 'rejection-precondition-failed'}, exhaustion: {outcome: 'rejected'}},
  'control: running, no recovery': {recovery: null, exhaustion: null},
};
for (const [k, j] of Object.entries(cases)) console.log(JSON.stringify({case: k, listed: s2bClass(film, j, '7')}));
