/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {logger} = require("firebase-functions");

// Import waitlist notification functions
const waitlistNotifications = require('./src/waitlist-notifications');
const dripCampaign = require('./src/drip-campaign');

// Initialize Firebase Admin
initializeApp();

// Set global options for cost control
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 540,
  memory: "256MiB",
});

const db = getFirestore();

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

// Create user profile when new user signs up
exports.createUserProfile = onDocumentCreated(
    "users/{userId}",
    async (event) => {
      const userId = event.params.userId;
      const userData = event.data.data();

      try {
      // Create default user profile
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

// Send notification when user joins team
exports.onTeamMemberAdded = onDocumentUpdated(
    "teams/{teamId}",
    async (event) => {
      const teamId = event.params.teamId;
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      // Check if new members were added
      const beforeMembers = beforeData.memberIds || [];
      const afterMembers = afterData.memberIds || [];
      const newMembers = afterMembers.filter(
          (member) => !beforeMembers.includes(member),
      );

      if (newMembers.length > 0) {
        try {
        // Send welcome notification to new members
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

          // eslint-disable-next-line max-len
          logger.info(`Notifications sent to ${newMembers.length} new team members`);
        } catch (error) {
          logger.error(`Error sending team join notifications:`, error);
        }
      }
    },
);

// ============================================
// PRACTICE PLAN FUNCTIONS
// ============================================

// Update team stats when practice plan is created
exports.onPracticePlanCreated = onDocumentCreated(
    "practicePlans/{planId}",
    async (event) => {
      const planData = event.data.data();
      const teamId = planData.teamId;
      const createdBy = planData.createdBy;

      try {
      // Update team stats
        const teamRef = db.collection("teams").doc(teamId);
        await teamRef.update({
          "stats.practicePlansCount": FieldValue.increment(1),
          "stats.lastPracticePlanCreated": new Date(),
        });

        // Update user stats
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

// ============================================
// PLAY MANAGEMENT FUNCTIONS
// ============================================

// Update team stats when play is created
exports.onPlayCreated = onDocumentCreated(
    "plays/{playId}",
    async (event) => {
      const playData = event.data.data();
      const teamId = playData.teamId;
      const createdBy = playData.createdBy;

      try {
      // Update team stats
        const teamRef = db.collection("teams").doc(teamId);
        await teamRef.update({
          "stats.playsCount": FieldValue.increment(1),
          "stats.lastPlayCreated": new Date(),
        });

        // Update user stats
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
// ANALYTICS FUNCTIONS
// ============================================

// Track user activity for analytics
exports.trackUserActivity = onCall(async (request) => {
  const {activity, data} = request.data;

  if (!request.auth) {
    throw new Error("Unauthorized");
  }

  try {
    await db
        .collection("analytics")
        .add({
          userId: request.auth.uid,
          activity: activity,
          data: data,
          timestamp: new Date(),
          userAgent: request.headers["user-agent"],
          ip: request.ip,
        });

    return {success: true};
  } catch (error) {
    logger.error(`Error tracking user activity:`, error);
    throw new Error("Failed to track activity");
  }
});

// ============================================
// CLEANUP FUNCTIONS
// ============================================

// Clean up old notifications (older than 30 days)
exports.cleanupOldNotifications = onRequest(async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db
        .collection("notifications")
        .where("createdAt", "<", thirtyDaysAgo)
        .get();

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    res.json({
      success: true,
      deletedCount: snapshot.size,
      message: `Deleted ${snapshot.size} old notifications`,
    });
  } catch (error) {
    logger.error("Error cleaning up old notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cleanup notifications",
    });
  }
});

// ============================================
// HEALTH CHECK FUNCTION
// ============================================

// Simple health check endpoint
exports.healthCheck = onRequest(async (req, res) => {
  try {
    // Test database connection
    await db.collection("health").doc("test").get();

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        functions: "running",
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Service unavailable",
    });
  }
});

// ============================================
// WAITLIST NOTIFICATION FUNCTIONS
// ============================================

// Export waitlist notification functions
exports.onWaitlistSignup = waitlistNotifications.onWaitlistSignup;
exports.getWaitlistStats = waitlistNotifications.getWaitlistStats;
exports.checkWaitlistEmailCallable = waitlistNotifications.checkWaitlistEmailCallable;
exports.checkWaitlistEmail = waitlistNotifications.checkWaitlistEmail;
exports.scheduleWaitlistDrip = dripCampaign.scheduleWaitlistDrip;
exports.processScheduledEmails = dripCampaign.processScheduledEmails;
