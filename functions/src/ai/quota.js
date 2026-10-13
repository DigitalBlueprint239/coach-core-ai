"use strict";
/**
 * Per-user and global request quotas for the AI gateway (cost control).
 *
 * Stored in the server-only `aiUsage` collection (no client rules), keyed by
 * UTC day. A request slot is reserved in a transaction BEFORE the provider is
 * called, so concurrent requests cannot overshoot the limits. Failed provider
 * calls still consume the slot, which prevents abuse-by-failure loops.
 */

/**
 * @param {Date} now
 * @return {string} YYYY-MM-DD (UTC)
 */
function utcDay(now) {
  return now.toISOString().slice(0, 10);
}

/** Thrown when a quota would be exceeded. */
class QuotaError extends Error {
  /**
   * @param {"user_daily"|"user_burst"|"global_daily"} scope
   */
  constructor(scope) {
    super(`quota exceeded: ${scope}`);
    this.name = "QuotaError";
    this.scope = scope;
  }
}

/**
 * Reserve one AI request for `uid`.
 * @param {FirebaseFirestore.Firestore} db Admin Firestore
 * @param {string} uid
 * @param {object} limits {userDaily, userPerMinute, globalDaily}
 * @param {Date} [now]
 * @return {Promise<{usedToday: number, dailyLimit: number}>}
 */
async function reserveQuota(db, uid, limits, now = new Date()) {
  const day = utcDay(now);
  const userRef = db.collection("aiUsage").doc(`${uid}__${day}`);
  const globalRef = db.collection("aiUsage").doc(`_global__${day}`);
  const nowMs = now.getTime();

  return db.runTransaction(async (tx) => {
    const [userSnap, globalSnap] = await Promise.all([
      tx.get(userRef), tx.get(globalRef),
    ]);
    const user = userSnap.exists ? userSnap.data() : {count: 0, recent: []};
    const global = globalSnap.exists ? globalSnap.data() : {count: 0};

    if ((global.count || 0) >= limits.globalDaily) {
      throw new QuotaError("global_daily");
    }
    if ((user.count || 0) >= limits.userDaily) {
      throw new QuotaError("user_daily");
    }
    const recent = (user.recent || []).filter((t) => nowMs - t < 60_000);
    if (recent.length >= limits.userPerMinute) {
      throw new QuotaError("user_burst");
    }

    const count = (user.count || 0) + 1;
    tx.set(userRef, {
      uid, day, count, recent: [...recent, nowMs], updatedAt: now,
    }, {merge: true});
    tx.set(globalRef, {
      day, count: (global.count || 0) + 1, updatedAt: now,
    }, {merge: true});
    return {usedToday: count, dailyLimit: limits.userDaily};
  });
}

/**
 * Record token usage after a provider call (best effort, never throws).
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @param {{inputTokens: number, outputTokens: number}} usage
 * @param {*} FieldValue firebase-admin FieldValue
 * @param {Date} [now]
 */
async function recordUsage(db, uid, usage, FieldValue, now = new Date()) {
  try {
    const day = utcDay(now);
    const inc = (n) => FieldValue.increment(Number(n) || 0);
    const tokens = {
      inputTokens: inc(usage.inputTokens),
      outputTokens: inc(usage.outputTokens),
    };
    await Promise.all([
      db.collection("aiUsage").doc(`${uid}__${day}`).set(tokens, {merge: true}),
      db.collection("aiUsage").doc(`_global__${day}`)
          .set(tokens, {merge: true}),
    ]);
  } catch (_) {
    // Usage accounting must never break a successful response.
  }
}

module.exports = {reserveQuota, recordUsage, QuotaError, utcDay};
