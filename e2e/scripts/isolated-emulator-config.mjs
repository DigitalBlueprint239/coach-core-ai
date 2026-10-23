// Writes firebase.isolated.json at the repository root (git-ignored): the repository's emulator setup
// with EVERY emulator (auth, firestore + websocket, functions, storage, hub, logging, eventarc, tasks)
// bound to one loopback host, so a run can coexist with emulators a developer keeps on 127.0.0.1.
// It sits at the root because the Firebase CLI resolves rules and functions paths inside the
// config file's directory.
// Usage: node e2e/scripts/isolated-emulator-config.mjs <host>     e.g. 127.0.0.2
// Then:  firebase emulators:exec --config firebase.isolated.json --project demo-coach-core-e2e ...
//        with E2E_EMULATOR_HOST, E2E_APP_HOST and REACT_APP_FIREBASE_EMULATOR_HOST set to the same host.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = process.argv[2];
if (!/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host || '')) throw new Error('Pass a loopback IPv4 host such as 127.0.0.2.');
if (host === '127.0.0.1') throw new Error('127.0.0.1 is the default; the isolated config exists to use a different loopback host.');

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const base = JSON.parse(readFileSync(join(repo, 'firebase.json'), 'utf8'));
const at = (port, extra = {}) => ({ host, port, ...extra });

const config = {
  firestore: { rules: base.firestore.rules, indexes: base.firestore.indexes },
  storage: { rules: base.storage.rules },
  functions: { source: base.functions.source },
  emulators: {
    auth: at(9099),
    firestore: at(8080, { websocketPort: 9150 }),
    functions: at(5001),
    storage: at(9199),
    hub: at(4400),
    logging: at(4500),
    eventarc: at(9299),
    tasks: at(9499),
    ui: { enabled: false },
    singleProjectMode: true,
  },
};
const out = join(repo, 'firebase.isolated.json');
writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
console.log(`wrote ${out} with every emulator on ${host}`);
