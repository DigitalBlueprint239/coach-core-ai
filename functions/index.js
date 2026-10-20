/**
 * Coach Core AI — Cloud Functions (v2).
 *
 * Security notes (Day 2, issues #43 / #46):
 *  - `coachAI` is the ONLY AI entry point. The OpenAI key lives in Secret
 *    Manager as COACH_CORE_OPENAI_API_KEY and is bound only to this function.
 *  - AI is OFF by default (COACH_CORE_AI_ENABLED=false) — a kill switch the
 *    founders flip per environment.
 *  - The old public HTTP `cleanupOldNotifications` endpoint is replaced by a
 *    scheduled job; there is no unauthenticated destructive surface.
 *  - Nothing here is deployed by agents. Deploys need founder approval.
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const {
  defineSecret, defineString, defineBoolean, defineInt, defineList,
} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const {createCoachAIHandler} = require("./src/ai/gateway");
const {createOpenAIProvider} = require("./src/ai/providers/openai");
const {reserveQuota, recordUsage} = require("./src/ai/quota");

initializeApp();

// Cost control defaults. Request handlers override timeouts where needed.
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "256MiB",
});

const db = getFirestore();

// ============================================
// PARAMETERS & SECRETS
// ============================================

const OPENAI_API_KEY = defineSecret("COACH_CORE_OPENAI_API_KEY");
const OPENAI_MODEL = defineString("COACH_CORE_OPENAI_MODEL", {
  default: "gpt-6.1-sol",
  description: "OpenAI model id used by the coaching gateway. Confirm the " +
    "OpenAI project has access before enabling AI in an environment.",
});
const AI_ENABLED = defineBoolean("COACH_CORE_AI_ENABLED", {
  default: false,
  description: "Kill switch for all AI features. false = gateway refuses " +
    "every request with reason ai-disabled.",
});
const AI_USER_DAILY_LIMIT = defineInt("COACH_CORE_AI_USER_DAILY_LIMIT", {
  default: 25,
});
const AI_USER_PER_MINUTE = defineInt("COACH_CORE_AI_USER_PER_MINUTE", {
  default: 5,
});
const AI_GLOBAL_DAILY_LIMIT = defineInt("COACH_CORE_AI_GLOBAL_DAILY_LIMIT", {
  default: 300,
});
const ALLOWED_ORIGINS = defineList("COACH_CORE_ALLOWED_ORIGINS", {
  default: [
    "https://coach-core-mvp-staging-239.web.app",
    "https://coach-core-mvp-staging-239.firebaseapp.com",
  ],
  description: "Browser origins allowed to call the AI gateway. Add " +
    "http://localhost:3000 only in a local/emulator .env file.",
});

// ============================================
// AI GATEWAY
// ============================================

let cachedProvider = null;
/**
 * Lazily build the provider so the secret is read only at request time.
 * @return {object}
 */
function getProvider() {
  const model = OPENAI_MODEL.value();
  if (!cachedProvider || cachedProvider.model !== model) {
    cachedProvider = createOpenAIProvider({
      apiKey: OPENAI_API_KEY.value(),
      model,
    });
  }
  return cachedProvider;
}

const coachAIHandler = createCoachAIHandler({
  isEnabled: () => AI_ENABLED.value() === true,
  getUser: (uid) => getAuth().getUser(uid),
  getTeam: async (teamId) => {
    const snap = await db.collection("teams").doc(teamId).get();
    return snap.exists ? snap.data() : null;
  },
  reserveQuota: (uid) => reserveQuota(db, uid, {
    userDaily: AI_USER_DAILY_LIMIT.value(),
    userPerMinute: AI_USER_PER_MINUTE.value(),
    globalDaily: AI_GLOBAL_DAILY_LIMIT.value(),
  }),
  recordUsage: (uid, usage) => recordUsage(db, uid, usage, FieldValue),
  getProvider,
  logger,
});

exports.coachAI = onCall({
  secrets: [OPENAI_API_KEY],
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 60,
  memory: "512MiB",
  maxInstances: 5,
  // App Check is recommended once the web app registers a provider:
  // enforceAppCheck: true,
}, coachAIHandler);

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

// Create user profile when a user document is created (server-side only;
// clients cannot write `users/*` under the Firestore rules).
exports.createUserProfile = onDocumentCreated(
    "users/{userId}",
    async (event) => {
      const userId = event.params.userId;
      const userData = event.data.data();

      try {
        await db.collection("userProfiles").doc(userId).set({
          uid: userId,
          email: userData.email,
          displayName: userData.displayName || "",
          photoURL: userData.photoURL || "",
          createdAt: new Date(),
          updatedAt: new Date(),
          preferences: {
            notifications: true,
            emailUpdates: true,
            theme: "light",
          },
          stats: {
            teamsCreated: 0,
            practicePlansCreated: 0,
            playsCreated: 0,
          },
        });

        logger.info(`User profile created for ${userId}`);
      } catch (error) {
        logger.error(`Error creating user profile for ${userId}:`, error);
      }
    },
);

// ============================================
// TEAM MANAGEMENT FUNCTIONS
// ============================================

// Send notification when user joins team. Membership changes are denied to
// clients during the private beta, so this only fires for server writes.
exports.onTeamMemberAdded = onDocumentUpdated(
    "teams/{teamId}",
    async (event) => {
      const teamId = event.params.teamId;
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      const beforeMembers = beforeData.memberIds || [];
      const afterMembers = afterData.memberIds || [];
      const newMembers = afterMembers.filter(
          (member) => !beforeMembers.includes(member),
      );

      if (newMembers.length > 0) {
        try {
          for (const memberId of newMembers) {
            await db.collection("notifications").add({
              userId: memberId,
              teamId: teamId,
              type: "team_joined",
              title: `Welcome to ${afterData.name}!`,
              message: `You've successfully joined ${afterData.name}.`,
              createdAt: new Date(),
              read: false,
            });
          }

          logger.info("Team join notifications sent",
              {count: newMembers.length});
        } catch (error) {
          logger.error(`Error sending team join notifications:`, error);
        }
      }
    },
);

// ============================================
// PRACTICE PLAN / PLAY STATS
// ============================================

exports.onPracticePlanCreated = onDocumentCreated(
    "practicePlans/{planId}",
    async (event) => {
      const planData = event.data.data();
      const teamId = planData.teamId;
      const createdBy = planData.createdBy;

      try {
        const teamRef = db.collection("teams").doc(teamId);
        await teamRef.update({
          "stats.practicePlansCount": FieldValue.increment(1),
          "stats.lastPracticePlanCreated": new Date(),
        });

        const userProfileRef = db.collection("userProfiles").doc(createdBy);
        await userProfileRef.update({
          "stats.practicePlansCreated": FieldValue.increment(1),
        });

        logger.info(`Stats updated for practice plan creation`);
      } catch (error) {
        logger.error(`Error updating stats for practice plan:`, error);
      }
    },
);

exports.onPlayCreated = onDocumentCreated(
    "plays/{playId}",
    async (event) => {
      const playData = event.data.data();
      const teamId = playData.teamId;
      const createdBy = playData.createdBy;

      try {
        const teamRef = db.collection("teams").doc(teamId);
        await teamRef.update({
          "stats.playsCount": FieldValue.increment(1),
          "stats.lastPlayCreated": new Date(),
        });

        const userProfileRef = db.collection("userProfiles").doc(createdBy);
        await userProfileRef.update({
          "stats.playsCreated": FieldValue.increment(1),
        });

        logger.info(`Stats updated for play creation`);
      } catch (error) {
        logger.error(`Error updating stats for play:`, error);
      }
    },
);

// ============================================
// ANALYTICS
// ============================================

// Minimal, allowlisted product analytics. No IP address, user agent or
// free-form payload is stored (Day 1 finding F-06).
const ALLOWED_ACTIVITIES = new Set([
  "sign_in", "sign_out", "play_created", "play_opened", "plan_created",
  "plan_opened", "ai_request", "export",
]);

exports.trackUserActivity = onCall(async (request) => {
  const token = request.auth && request.auth.token;
  if (!request.auth || !token ||
      (token.firebase && token.firebase.sign_in_provider === "anonymous") ||
      token.email_verified !== true || token.beta !== true) {
    throw new HttpsError("permission-denied", "beta-access-required");
  }
  const activity = request.data && request.data.activity;
  if (typeof activity !== "string" || !ALLOWED_ACTIVITIES.has(activity)) {
    throw new HttpsError("invalid-argument", "unknown-activity");
  }

  try {
    await db.collection("analytics").add({
      userId: request.auth.uid,
      activity,
      timestamp: new Date(),
    });
    return {success: true};
  } catch (error) {
    logger.error(`Error tracking user activity`, {error: String(error)});
    throw new HttpsError("internal", "tracking-failed");
  }
});

// ============================================
// CLEANUP (scheduled, not publicly callable)
// ============================================

// Replaces the former public HTTP endpoint. Deletes notifications older than
// 30 days in batches of 400 (Firestore batches max out at 500 writes).
exports.cleanupOldNotifications = onSchedule({
  schedule: "every day 03:30",
  timeZone: "America/New_York",
  timeoutSeconds: 300,
}, async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let deleted = 0;
  for (;;) {
    const snapshot = await db.collection("notifications")
        .where("createdAt", "<", cutoff)
        .limit(400)
        .get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < 400) break;
  }
  logger.info("cleanupOldNotifications", {deleted});
});

// ============================================
// HEALTH CHECK
// ============================================

// Static liveness probe; performs no database reads for anonymous callers.
exports.healthCheck = onRequest((req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
});

// ============================================
// FILM (coach-film.v1, FILM-S1: reservation + cancellation only)
// ============================================
// Appended block. No decoder, no playback, no AI, no `ready` state.
// Limits are TEST PLACEHOLDERS (src/film/limits.js, PENDING_D3/D7).
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {Timestamp: FilmTimestamp} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const {createFilmHandlers} = require("./src/film/handlers");
const {createStorageAdapter} = require("./src/film/storage-adapter");
const {noRetryBucketFor} = require("./src/film/cleanup");

// R1: film switch, default OFF. The candidate is also blocked from deploy by
// the functions.predeploy guard (scripts/film-terms-guard.js) while D3/D7 are
// placeholders. Emulator tests inject their own handlers and do not use this.
const FILM_ENABLED = defineBoolean("COACH_CORE_FILM_ENABLED", {
  default: false,
  description: "Kill switch for Film upload callables. false = every film " +
    "callable is refused. Do not enable while D3/D7 terms are PENDING.",
});

let filmStorage = null;
const getFilmStorage = () =>
  filmStorage || (filmStorage = createStorageAdapter(getStorage().bucket()));
// FILM-S1-C1 (injection only, no new export): exact deletes use a dedicated
// Cloud Storage client of the same class with implicit retries disabled, so
// one admitted attempt is one delete request; the configured default bucket
// name binds every cleanup record.
let filmCleanupBucket = null;
const getFilmCleanupBucket = () => filmCleanupBucket ||
  (filmCleanupBucket = noRetryBucketFor(getStorage().bucket()));

const filmHandlers = createFilmHandlers({
  db,
  Timestamp: FilmTimestamp,
  isEnabled: () => FILM_ENABLED.value() === true,
  getUser: (uid) => getAuth().getUser(uid),
  cleanupBucketName: () => getStorage().bucket().name,
  cleanupBucket: getFilmCleanupBucket,
  readHead: (target) => getFilmStorage().readHead(target),
  logger,
});

exports.reserveFilmUpload = onCall({
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 30,
  maxInstances: 5,
}, filmHandlers.reserveFilmUpload);

exports.abandonFilmUpload = onCall({
  cors: ALLOWED_ORIGINS,
  timeoutSeconds: 30,
  maxInstances: 5,
}, filmHandlers.abandonFilmUpload);

exports.onFilmQuarantineFinalized = onObjectFinalized({
  timeoutSeconds: 60,
  memory: "256MiB",
  maxInstances: 5,
}, (event) => filmHandlers.onQuarantineFinalized(event.data));
