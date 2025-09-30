const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onCall, onRequest, HttpsError} = require('firebase-functions/v2/https');

// Email configuration
const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_PASSWORD;
const notificationEmail = process.env.NOTIFICATION_EMAIL;

const canSendEmail = Boolean(gmailUser && gmailPassword && notificationEmail);

const transporter = canSendEmail
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    })
  : null;

// Notification email template
const createNotificationEmail = (waitlistData) => {
  const {
    email,
    name,
    role,
    referringCoach,
    coachingChallenge,
    createdAt
  } = waitlistData;

  const date = new Date(createdAt.seconds * 1000).toLocaleString();
  
  return {
    subject: `🎉 New Waitlist Signup - ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">New Waitlist Signup!</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Signup Details</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Date:</strong> ${date}</p>
          ${referringCoach ? `<p><strong>Referred by:</strong> ${referringCoach}</p>` : ''}
          ${coachingChallenge ? `<p><strong>Biggest Challenge:</strong> ${coachingChallenge}</p>` : ''}
        </div>

        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #1976d2;">Quick Actions</h4>
          <p>
            <a href="https://console.firebase.google.com/project/coach-core-ai/firestore/data/~2Fwaitlist" 
               style="color: #1976d2; text-decoration: none;">
              View in Firebase Console
            </a>
          </p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          <p>This notification was sent automatically when someone joined the Coach Core AI waitlist.</p>
        </div>
      </div>
    `
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
        const emailData = createNotificationEmail(waitlistData);

        const mailOptions = {
          from: `"Coach Core AI" <${gmailUser}>`,
          to: notificationEmail,
          subject: emailData.subject,
          html: emailData.html,
        };

        await transporter.sendMail(mailOptions);
        console.log('Notification email sent successfully');

        // Optional: Send welcome email to the user
        const welcomeEmail = {
          from: `"Coach Core AI" <${gmailUser}>`,
          to: waitlistData.email,
          subject: 'Welcome to Coach Core AI - You\'re on the list! 🎉',
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #667eea;">Welcome to Coach Core AI!</h2>
            
            <p>Hi ${waitlistData.name},</p>
            
            <p>Thank you for joining our waitlist! We're excited to have you on board.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">What happens next?</h3>
              <ul>
                <li>You'll receive exclusive updates about our development progress</li>
                <li>Early access to new features before public release</li>
                <li>Special pricing for early adopters (50% off!)</li>
                <li>Direct access to our team for feedback and suggestions</li>
              </ul>
            </div>

            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #2e7d32;">Limited Early Access</h4>
              <p>Only 100 spots available for early access. You're one of the first to join!</p>
            </div>

            <p>We'll be in touch soon with more details about the launch.</p>
            
            <p>Best regards,<br>The Coach Core AI Team</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
              <p>You're receiving this because you signed up for our waitlist at coach-core-ai.web.app</p>
            </div>
          </div>
        `
        };

        await transporter.sendMail(welcomeEmail);
        console.log('Welcome email sent successfully');
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
    const totalCount = snapshot.size;
    
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
