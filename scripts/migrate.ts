import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const INDEXES_FILE = path.resolve('firestore.indexes.json');
const DEFAULT_PROJECT = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-project';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const projectFlagIndex = args.findIndex((arg) => arg === '--project');
const projectId = projectFlagIndex >= 0 && args[projectFlagIndex + 1] ? args[projectFlagIndex + 1] : DEFAULT_PROJECT;

if (!fs.existsSync(INDEXES_FILE)) {
  console.error(`🔥 firestore.indexes.json not found at ${INDEXES_FILE}`);
  process.exit(1);
}

if (isDryRun) {
  console.log('🧪 Dry run: displaying Firestore index definitions');
  const content = fs.readFileSync(INDEXES_FILE, 'utf8');
  console.log(content);
  process.exit(0);
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const firebaseArgs = [
  'firebase',
  'deploy',
  '--only',
  'firestore:indexes',
  '--project',
  projectId,
];

console.log(`🚀 Deploying Firestore indexes for project "${projectId}" using ${INDEXES_FILE}`);

const child = spawn(npxCommand, firebaseArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
  },
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log('✅ Firestore indexes deployed successfully');
  } else {
    console.error(`❌ Firestore index deployment failed with exit code ${code}`);
  }
  process.exit(code ?? 1);
});
