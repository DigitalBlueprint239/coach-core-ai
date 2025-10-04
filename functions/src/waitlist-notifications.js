const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');

// Email configuration
const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_PASSWORD;
const configuredNotificationEmail = process.env.NOTIFICATION_EMAIL;
const ADMIN_NOTIFICATION_EMAIL = configuredNotificationEmail || 'Digitalblueprint239@gmail.com';

const canSendEmail = Boolean(gmailUser && gmailPassword && ADMIN_NOTIFICATION_EMAIL);

const transporter = canSendEmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    })
  : null;

const toDate = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value.seconds) {
    return new Date(value.seconds * 1000);
  }

  return null;
};

const resolveSignupDate = (waitlistData, eventSnapshot) => {
  const candidate =
    toDate(waitlistData.timestamp) ||
    toDate(waitlistData.createdAt) ||
    toDate(waitlistData.created_at) ||
    toDate(waitlistData.created_at_timestamp);

  if (candidate) {
    return candidate;
  }

  if (eventSnapshot?.createTime) {
    const created = new Date(eventSnapshot.createTime);
    if (!Number.isNaN(created.getTime())) {
      return created;
    }
  }

  if (eventSnapshot?.readTime) {
    const readTime = new Date(eventSnapshot.readTime);
    if (!Number.isNaN(readTime.getTime())) {
      return readTime;
    }
  }

  return new Date();
};

const calculateSignupStats = (docs) => {
  const total = docs.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let todaySignups = 0;
  let weekSignups = 0;

  docs.forEach((doc) => {
    const data = doc.data?.() || doc.data;
    const signupDate =
      toDate(data?.timestamp) ||
      toDate(data?.createdAt) ||
      toDate(data?.created_at) ||
      null;

    if (!signupDate) {
      return;
    }

    if (signupDate >= today) {
      todaySignups += 1;
    }

    if (signupDate >= weekAgo) {
      weekSignups += 1;
    }
  });

  return { total, todaySignups, weekSignups };
};

const getWaitlistStats = async () => {
  const snapshot = await admin.firestore().collection('waitlist').get();
  return calculateSignupStats(snapshot.docs);
};

const generateReferralLink = (email = '') => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return 'https://coach-core-ai.web.app/waitlist';
  }

  const code = Buffer.from(normalizedEmail).toString('base64').substring(0, 8);
  return `https://coach-core-ai.web.app/waitlist?ref=${code}`;
};

// Notification email template for admins
const createNotificationEmail = (waitlistData, stats = { total: 0, todaySignups: 0, weekSignups: 0 }, context = {}) => {
  const {
    email,
    name,
    role,
    source,
    referringCoach,
    referralCode,
    referredBy,
    coachingChallenge,
  } = waitlistData;

  const {
    signupPosition,
    signupDate,
    docId,
    referralLink,
  } = context;

  const safeSignupDate = signupDate || new Date();
  const formattedSignupDate = safeSignupDate.toLocaleString();
  const formattedPosition = signupPosition
    ? `#${Number(signupPosition).toLocaleString('en-US')}`
    : 'N/A';

  const referralDetails = [
    referralCode ? `<p><strong>Referral Code:</strong> ${referralCode}</p>` : '',
    referredBy ? `<p><strong>Referred By:</strong> ${referredBy}</p>` : '',
    referringCoach ? `<p><strong>Referring Coach:</strong> ${referringCoach}</p>` : '',
    source ? `<p><strong>Source:</strong> ${source}</p>` : '',
  ]
    .filter(Boolean)
    .join('');

  const challengeDetail = coachingChallenge
    ? `<p><strong>Primary Challenge:</strong> ${coachingChallenge}</p>`
    : '';

  const referralBlock = referralDetails
    ? `
      <div style="background: #fff7ed; padding: 16px; border-radius: 8px; margin-top: 20px;">
        <h4 style="margin: 0 0 12px; color: #9a3412;">Referral Insights</h4>
        ${referralDetails}
        ${referralLink ? `<p><strong>Auto-Generated Link:</strong> <a href="${referralLink}" style="color: #9a3412;">${referralLink}</a></p>` : ''}
      </div>
    `
    : '';

  return {
    subject: 'New Coach Core Waitlist Signup! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Coach Core Waitlist Signup! 🎉</h2>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #111827;">Signup Snapshot</h3>
          <p style="margin: 4px 0;"><strong>Name:</strong> ${name || 'Not provided'}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> ${email || 'Unknown'}</p>
          <p style="margin: 4px 0;"><strong>Role:</strong> ${role || 'Not specified'}</p>
          <p style="margin: 4px 0;"><strong>Signup Position:</strong> ${formattedPosition}</p>
          <p style="margin: 4px 0;"><strong>Signed Up:</strong> ${formattedSignupDate}</p>
          ${docId ? `<p style="margin: 4px 0;"><strong>Entry ID:</strong> ${docId}</p>` : ''}
          ${challengeDetail}
        </div>

        ${referralBlock}

        <div style="background: #e0f2fe; padding: 16px; border-radius: 8px; margin-top: 20px;">
          <h4 style="margin: 0 0 12px; color: #0c4a6e;">Waitlist Momentum</h4>
          <p style="margin: 4px 0;"><strong>Total Signups:</strong> ${Number(stats.total || 0).toLocaleString('en-US')}</p>
          <p style="margin: 4px 0;"><strong>Signups Today:</strong> ${stats.todaySignups || 0}</p>
          <p style="margin: 4px 0;"><strong>Signups This Week:</strong> ${stats.weekSignups || 0}</p>
        </div>

        <div style="background: #eef2ff; padding: 16px; border-radius: 8px; margin-top: 20px;">
          <h4 style="margin: 0 0 12px; color: #3730a3;">Quick Access</h4>
          <p style="margin: 0;">
            <a href="https://console.firebase.google.com/project/coach-core-ai/firestore/data/~2Fwaitlist" style="color: #3730a3; text-decoration: none; font-weight: 600;">
              View waitlist entry in Firebase Console
            </a>
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">This alert was generated automatically when a new coach joined the Coach Core AI waitlist.</p>
        </div>
      </div>
    `,
  };
};

const createWelcomeEmail = (waitlistData, context = {}) => {
  const {
    signupPosition,
    referralLink,
  } = context;

  const recipientName = waitlistData.name?.trim() || 'Coach';
  const firstName = recipientName.split(' ')[0] || 'Coach';
  const positionLabel = signupPosition
    ? `#${Number(signupPosition).toLocaleString('en-US')}`
    : '#100+';
  const shareLink = referralLink || generateReferralLink(waitlistData.email || '');

  return {
    subject: "Welcome to Coach Core - You're on the list!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Coach Core - You're on the list!</h2>
        <p style="font-size: 16px; color: #1f2937;">Hi ${firstName},</p>

        <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
          You're officially ${positionLabel} on the Coach Core AI waitlist. We're thrilled to have you with us and can't wait to show you what's coming.
        </p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #111827;">What's next?</h3>
          <ul style="margin: 0; padding-left: 18px; color: #374151; line-height: 1.6;">
            <li>You’ll get early previews of our AI-powered coaching tools.</li>
            <li>We’ll share insider progress updates so you always know how launch is going.</li>
            <li>Invitations roll out in batches—your spot is saved and we’ll email you as soon as we open the next wave.</li>
          </ul>
        </div>

        <div style="background: #ecfdf5; padding: 20px; border-radius: 10px; margin: 24px 0;">
          <h3 style="margin: 0 0 12px; color: #047857;">Share your spot & move up the list</h3>
          <p style="margin: 0 0 12px; color: #065f46;">Pass your personal referral link to fellow coaches—each signup helps you climb the list.</p>
          <p style="margin: 0;">
            <a href="${shareLink}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">Share your referral link</a>
          </p>
          <p style="margin: 12px 0 0; font-size: 14px; color: #047857;">${shareLink}</p>
        </div>

        <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
          Keep an eye on your inbox—we’ll send your early access invite as soon as your cohort opens up.
        </p>

        <p style="font-size: 16px; color: #1f2937; line-height: 1.6;">
          — The Coach Core AI Team
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0;">You’re receiving this email because you joined the Coach Core AI waitlist.</p>
        </div>
      </div>
    `,
  };
};

async function doesWaitlistEmailExist(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return false;
  }

  const snapshot = await admin
    .firestore()
    .collection('waitlist')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  return !snapshot.empty;
}

// Cloud Function to send notification on new waitlist signup
exports.onWaitlistSignup = onDocumentCreated(
  'waitlist/{docId}',
  async (event) => {
    try {
      const waitlistData = event.data.data();
      const docId = event.params.docId;

      console.log('New waitlist signup:', { docId, email: waitlistData.email });

      // Send notification email
      if (!canSendEmail || !transporter) {
        console.warn('Email notifications are not configured. Skipping waitlist alert send.');
      } else {
        const stats = await getWaitlistStats();
        const signupDate = resolveSignupDate(waitlistData, event.data);
        const signupPosition = stats.total;
        const referralLink = generateReferralLink(waitlistData.email || '');

        const emailData = createNotificationEmail(waitlistData, stats, {
          signupPosition,
          signupDate,
          docId,
          referralLink,
        });

        const adminMailOptions = {
          from: `"Coach Core AI" <${gmailUser}>`,
          to: ADMIN_NOTIFICATION_EMAIL,
          subject: emailData.subject,
          html: emailData.html,
        };

        await transporter.sendMail(adminMailOptions);
        console.log('Notification email sent successfully', {
          docId,
          signupPosition,
          adminRecipient: ADMIN_NOTIFICATION_EMAIL,
        });

        if (waitlistData.email) {
          const welcomeEmailData = createWelcomeEmail(waitlistData, {
            signupPosition,
            referralLink,
          });

          await transporter.sendMail({
            from: `"Coach Core AI" <${gmailUser}>`,
            to: waitlistData.email,
            subject: welcomeEmailData.subject,
            html: welcomeEmailData.html,
          });
          console.log('Welcome email sent successfully', {
            email: waitlistData.email,
            signupPosition,
          });
        } else {
          console.warn('Skipping welcome email: missing recipient address', { docId });
        }
      }

      return { success: true, docId };

    } catch (error) {
      console.error('Error processing waitlist signup:', error);
      throw error;
    }
  }
);

// Function to get waitlist statistics
exports.getWaitlistStats = onCall({ cors: true, enforceAppCheck: false, invoker: 'public' }, async (request) => {
  try {
    const db = admin.firestore();
    const waitlistRef = db.collection('waitlist');
    
    // Get total count
    const snapshot = await waitlistRef.get();
    const aggregateStats = calculateSignupStats(snapshot.docs);
    const totalCount = aggregateStats.total;
    
    // Get counts by role
    const roleCounts = {};
    const challengeCounts = {};
    const referralCounts = {};
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Count by role
      const role = data.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      
      // Count challenges
      if (data.coachingChallenge) {
        const challenge = data.coachingChallenge.toLowerCase();
        challengeCounts[challenge] = (challengeCounts[challenge] || 0) + 1;
      }
      
      // Count referrals
      if (data.referringCoach) {
        const referrer = data.referringCoach;
        referralCounts[referrer] = (referralCounts[referrer] || 0) + 1;
      }
    });
    
    return {
      totalCount,
      roleCounts,
      challengeCounts,
      referralCounts,
      todaySignups: aggregateStats.todaySignups,
      weekSignups: aggregateStats.weekSignups,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting waitlist stats:', error);
    throw new HttpsError('internal', 'Failed to get waitlist statistics');
  }
});

// Callable function for duplicate checks from the app
exports.checkWaitlistEmailCallable = onCall({ cors: true, enforceAppCheck: false, invoker: 'public' }, async (request) => {
  const email = request.data?.email;
  const exists = await doesWaitlistEmailExist(email);
  return { exists };
});

// HTTP endpoint for duplicate checks (used by standalone clients)
exports.checkWaitlistEmail = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    let email = req.query.email;

    if (!email && req.body) {
      if (typeof req.body === 'string') {
        try {
          email = JSON.parse(req.body).email;
        } catch (parseError) {
          console.warn('Failed to parse duplicate check request body.', parseError);
        }
      } else if (typeof req.body === 'object') {
        email = req.body.email;
      }
    }

    if (!email) {
      res.status(400).json({ error: 'Missing email parameter' });
      return;
    }

    const exists = await doesWaitlistEmailExist(email);
    res.json({ exists });
  } catch (error) {
    console.error('Error checking waitlist email:', error);
    res.status(500).json({ error: 'Failed to check waitlist email' });
  }
});
