#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Coach Core private-beta allowlist (founder-run, never run by agents).
 *
 * Grants or revokes the `beta` custom claim that Firestore/Storage rules and
 * the coachAI gateway require. Revoking also revokes refresh tokens so the
 * coach is signed out everywhere within minutes.
 *
 * Usage (from functions/, with Google Application Default Credentials for an
 * account that can manage Firebase Auth users in the target project):
 *   node scripts/beta-access.js grant coach@example.com \
 *     --project coach-core-mvp-staging-239
 *   node scripts/beta-access.js revoke coach@example.com \
 *     --project coach-core-mvp-staging-239
 *   node scripts/beta-access.js status coach@example.com \
 *     --project coach-core-mvp-staging-239
 *
 * Safety:
 *   - --project is required; there is no default project.
 *   - The historical production project (coach-core-ai) is refused unless
 *     --i-understand-this-is-production is passed.
 *   - The coach must already have signed in once (the user must exist).
 *   - Against the Auth emulator, set FIREBASE_AUTH_EMULATOR_HOST.
 */
"use strict";

const PRODUCTION_PROJECTS = new Set(["coach-core-ai"]);

/**
 * @param {string[]} argv
 * @return {{action: string, email: string, project: string, prodOk: boolean}}
 */
function parseArgs(argv) {
  const [action, email, ...rest] = argv;
  const i = rest.indexOf("--project");
  const project = i >= 0 ? rest[i + 1] : "";
  const prodOk = rest.includes("--i-understand-this-is-production");
  if (!["grant", "revoke", "status"].includes(action)) {
    throw new Error("action must be grant, revoke or status");
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("a valid email address is required");
  }
  if (!project) throw new Error("--project <firebase-project-id> is required");
  if (PRODUCTION_PROJECTS.has(project) && !prodOk) {
    throw new Error(`refusing to touch production project "${project}" ` +
      "without --i-understand-this-is-production");
  }
  return {action, email, project, prodOk};
}

/**
 * @param {object} auth firebase-admin Auth
 * @param {{action: string, email: string}} args
 * @return {Promise<object>} resulting state (no secrets)
 */
async function run(auth, {action, email}) {
  const user = await auth.getUserByEmail(email);
  const claims = {...(user.customClaims || {})};
  if (action === "grant") {
    claims.beta = true;
    await auth.setCustomUserClaims(user.uid, claims);
  } else if (action === "revoke") {
    delete claims.beta;
    await auth.setCustomUserClaims(user.uid, claims);
    await auth.revokeRefreshTokens(user.uid);
  }
  const fresh = await auth.getUser(user.uid);
  return {
    uid: fresh.uid,
    email: fresh.email,
    emailVerified: fresh.emailVerified,
    disabled: fresh.disabled,
    beta: !!(fresh.customClaims && fresh.customClaims.beta === true),
  };
}

if (require.main === module) {
  (async () => {
    try {
      const args = parseArgs(process.argv.slice(2));
      const {initializeApp} = require("firebase-admin/app");
      const {getAuth} = require("firebase-admin/auth");
      initializeApp({projectId: args.project});
      const result = await run(getAuth(), args);
      console.log(JSON.stringify({project: args.project, action: args.action,
        ...result}, null, 2));
      if (args.action === "grant" && !result.emailVerified) {
        console.log("Note: email is not verified yet; access starts once " +
          "the coach signs in with Google or an email link.");
      }
    } catch (err) {
      console.error(`beta-access: ${err.message}`);
      process.exit(1);
    }
  })();
}

module.exports = {parseArgs, run};
