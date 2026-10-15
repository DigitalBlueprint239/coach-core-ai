import {auth} from '../services/firebase';
import type {Team} from './TeamContext';
import type {TeamCreationGateway, TeamCreationOperation} from './teamCreation';

type FirestoreValue = {stringValue?: string; timestampValue?: string;
  arrayValue?: {values?: FirestoreValue[]}; mapValue?: {fields?: {[key: string]: FirestoreValue}}};

const text = (value: string): FirestoreValue => ({stringValue: value});
const session = (uid: string) => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== uid) throw new Error('Account changed or signed out. Pending creation retained.');
  return user;
};

// Same authenticated REST/create-only pattern as coaching persistence. Avoids
// the SDK Write WebChannel implicated in D1; no network toggles or rule changes.
export const teamCreationGateway: TeamCreationGateway = {
  async create(op: TeamCreationOperation, signal: AbortSignal): Promise<Team> {
    const user = session(op.uid);
    const project = auth.app.options.projectId;
    if (!project) throw new Error('Firebase project is not configured.');
    const emulator = process.env.REACT_APP_USE_FIREBASE_EMULATORS === 'true';
    if (emulator && !project.startsWith('demo-')) throw new Error('Emulator requires a demo project.');
    const host = process.env.REACT_APP_FIREBASE_EMULATOR_HOST || '127.0.0.1';
    const base = emulator ? `http://${host}:8080` : 'https://firestore.googleapis.com';
    const database = `projects/${project}/databases/(default)`;
    const path = `${database}/documents/teams/${op.id}`;
    const token = await user.getIdToken();
    session(op.uid);
    if (signal.aborted) throw new Error('Team not confirmed. Retry the same creation.');
    const headers = {'Content-Type': 'application/json', Authorization: `Bearer ${token}`};
    const fields = {name: text(op.name), code: text(op.code), ownerId: text(op.uid),
      memberIds: {arrayValue: {values: [text(op.uid)]}},
      memberDetails: {arrayValue: {values: [{mapValue: {fields: {
        id: text(op.uid), email: text(user.email || ''), role: text('owner'),
        joinedAt: {timestampValue: new Date(op.startedAt).toISOString()},
      }}}]}}};
    const response = await fetch(`${base}/v1/${database}/documents:commit`, {
      method: 'POST', headers, signal, body: JSON.stringify({writes: [{
        update: {name: path, fields}, currentDocument: {exists: false},
        updateTransforms: ['createdAt', 'updatedAt'].map(fieldPath => ({fieldPath, setToServerValue: 'REQUEST_TIME'})),
      }]}),
    });
    session(op.uid);
    if (!response.ok) {
      const error = await response.json() as {error?: {status?: string}};
      if (!['ALREADY_EXISTS', 'FAILED_PRECONDITION'].includes(error.error?.status || '')) {
        throw new Error(response.status === 403 ? 'Team creation access denied. Pending creation retained.' :
          'Team creation not confirmed. Check your connection and retry the same creation.');
      }
    }
    // A commit response or ALREADY_EXISTS is not success: verify the exact
    // operation against an authoritative read, never a local pending snapshot.
    const read = await fetch(`${base}/v1/${path}`, {headers, signal});
    session(op.uid);
    if (!read.ok) throw new Error('Server confirmation unavailable. Pending creation retained; retry the same creation.');
    const data = await read.json() as {fields?: {[key: string]: FirestoreValue}};
    session(op.uid);
    const f = data.fields;
    if (!f || f.ownerId?.stringValue !== op.uid || f.name?.stringValue !== op.name || f.code?.stringValue !== op.code ||
      !f.createdAt?.timestampValue || !f.updatedAt?.timestampValue) throw new Error('Server team differs from this operation. No overwrite attempted.');
    return {id: op.id, ownerId: op.uid, name: op.name, code: op.code,
      memberIds: (f.memberIds?.arrayValue?.values || []).map(v => v.stringValue || ''),
      memberDetails: (f.memberDetails?.arrayValue?.values || []).map(v => {
        const m = v.mapValue?.fields || {};
        return {id: m.id?.stringValue || '', email: m.email?.stringValue || '', role: 'owner',
          joinedAt: new Date(m.joinedAt?.timestampValue || '')};
      }), createdAt: new Date(f.createdAt.timestampValue), updatedAt: new Date(f.updatedAt.timestampValue)};
  },
};
