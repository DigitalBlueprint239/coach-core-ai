import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { sendEmail } from '../lib/email-service';
import { logger } from 'firebase-functions';

interface WaitlistEntry {
  email: string;
  name: string;
  role: string;
  teamLevel: string;
  source: string;
  onboardingStatus: 'invited' | 'onboarded' | 'pending';
  createdAt: any;
  invitedAt?: any;
  onboardedAt?: any;
  inviteToken?: string;
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export const sendWaitlistConfirmationEmail = onDocumentCreated(
  'waitlist/{waitlistId}',
  async (event) => {
    const waitlistData = event.data?.data() as WaitlistEntry;
    const waitlistId = event.params.waitlistId;

    if (!waitlistData) {
      logger.error('No waitlist data found for document:', waitlistId);
      return;
    }

    try {
      // Generate staging invite link if this is a beta signup
      const stagingUrl = process.env.STAGING_URL || 'https://coach-core-ai-staging.vercel.app';
      const inviteLink = waitlistData.inviteToken 
        ? `${stagingUrl}/beta?token=${waitlistData.inviteToken}`
        : stagingUrl;

      // Prepare email content based on source
      const isBetaSignup = waitlistData.source === 'beta-launch';
      const subject = isBetaSignup 
        ? 'Welcome to Coach Core AI Beta! 🎉'
        : 'You\'re on the Coach Core AI Waitlist!';

      const htmlContent = generateEmailHTML(waitlistData, inviteLink, isBetaSignup);
      const textContent = generateEmailText(waitlistData, inviteLink, isBetaSignup);

      // Send confirmation email
      await sendEmail({
        to: waitlistData.email,
        subject,
        html: htmlContent,
        text: textContent,
        from: 'noreply@coachcoreai.com',
        replyTo: 'support@coachcoreai.com',
      });

      logger.info('Waitlist confirmation email sent successfully', {
        waitlistId,
        email: waitlistData.email,
        source: waitlistData.source,
        hasInviteLink: !!waitlistData.inviteToken,
      });

    } catch (error) {
      logger.error('Failed to send waitlist confirmation email', {
        waitlistId,
        email: waitlistData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

function generateEmailHTML(
  entry: WaitlistEntry, 
  inviteLink: string, 
  isBeta: boolean
): string {
  const roleLabel = getRoleLabel(entry.role);
  const teamLevelLabel = getTeamLevelLabel(entry.teamLevel);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${isBeta ? 'Welcome to Coach Core AI Beta!' : 'You\'re on the Waitlist!'}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #2c5aa0; }
        .feature { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #3182ce; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        .highlight { background: #e6f3ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isBeta ? 'Welcome to Coach Core AI Beta!' : 'You\'re on the Waitlist!'}</h1>
          <p>Hi ${entry.name}, thanks for joining us!</p>
        </div>
        
        <div class="content">
          <h2>What's Next?</h2>
          
          ${isBeta ? `
            <div class="highlight">
              <h3>🎉 You have immediate beta access!</h3>
              <p>As a ${roleLabel} at the ${teamLevelLabel} level, you're perfect for our beta program.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" class="button">Access Beta Now</a>
            </div>
            
            <h3>What you'll get access to:</h3>
            <div class="feature">
              <h4>🧠 AI Play Suggestions</h4>
              <p>Get intelligent play recommendations based on game situations and opponent analysis.</p>
            </div>
            <div class="feature">
              <h4>📋 Smart Playbook Designer</h4>
              <p>Design, save, and export professional playbooks with our visual editor.</p>
            </div>
            <div class="feature">
              <h4>📅 Practice Planner</h4>
              <p>AI-assisted practice planning with drill assignments and time management.</p>
            </div>
            <div class="feature">
              <h4>👥 Team Management</h4>
              <p>Comprehensive roster management and performance tracking.</p>
            </div>
          ` : `
            <p>We're working hard to bring you the future of coaching with AI. You'll be among the first to know when we launch!</p>
            
            <h3>What to expect:</h3>
            <ul>
              <li>Early access to Coach Core AI</li>
              <li>Exclusive updates on new features</li>
              <li>Special launch pricing</li>
              <li>Direct feedback channel to our team</li>
            </ul>
          `}
          
          <h3>Your Information:</h3>
          <ul>
            <li><strong>Name:</strong> ${entry.name}</li>
            <li><strong>Role:</strong> ${roleLabel}</li>
            <li><strong>Team Level:</strong> ${teamLevelLabel}</li>
            <li><strong>Email:</strong> ${entry.email}</li>
          </ul>
          
          ${isBeta ? `
            <div class="highlight">
              <h3>🔗 Your Beta Access Link</h3>
              <p>Save this link for easy access: <a href="${inviteLink}">${inviteLink}</a></p>
            </div>
          ` : ''}
          
          <h3>Need Help?</h3>
          <p>If you have any questions or need assistance, don't hesitate to reach out:</p>
          <ul>
            <li>Email: support@coachcoreai.com</li>
            <li>Response time: Within 24 hours</li>
          </ul>
        </div>
        
        <div class="footer">
          <p>© 2024 Coach Core AI. All rights reserved.</p>
          <p>You're receiving this email because you signed up for our ${isBeta ? 'beta program' : 'waitlist'}.</p>
          <p><a href="#">Unsubscribe</a> | <a href="#">Privacy Policy</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateEmailText(
  entry: WaitlistEntry, 
  inviteLink: string, 
  isBeta: boolean
): string {
  const roleLabel = getRoleLabel(entry.role);
  const teamLevelLabel = getTeamLevelLabel(entry.teamLevel);

  return `
${isBeta ? 'Welcome to Coach Core AI Beta!' : 'You\'re on the Coach Core AI Waitlist!'}

Hi ${entry.name},

${isBeta ? `
Thank you for joining our beta program! As a ${roleLabel} at the ${teamLevelLabel} level, you're perfect for testing our new AI-powered coaching platform.

YOUR BETA ACCESS LINK: ${inviteLink}

What you'll get access to:
- AI Play Suggestions: Get intelligent play recommendations
- Smart Playbook Designer: Design and export professional playbooks  
- Practice Planner: AI-assisted practice planning
- Team Management: Comprehensive roster and performance tracking

Your Information:
- Name: ${entry.name}
- Role: ${roleLabel}
- Team Level: ${teamLevelLabel}
- Email: ${entry.email}

Need Help?
Email: support@coachcoreai.com
Response time: Within 24 hours
` : `
Thank you for joining our waitlist! We're working hard to bring you the future of coaching with AI.

What to expect:
- Early access to Coach Core AI
- Exclusive updates on new features
- Special launch pricing
- Direct feedback channel to our team

Your Information:
- Name: ${entry.name}
- Role: ${roleLabel}
- Team Level: ${teamLevelLabel}
- Email: ${entry.email}

We'll notify you as soon as we're ready to launch!

Need Help?
Email: support@coachcoreai.com
`}

© 2024 Coach Core AI. All rights reserved.
You're receiving this email because you signed up for our ${isBeta ? 'beta program' : 'waitlist'}.
  `;
}

function getRoleLabel(role: string): string {
  const roleMap: Record<string, string> = {
    'head-coach': 'Head Coach',
    'assistant-coach': 'Assistant Coach',
    'coordinator': 'Coordinator',
    'position-coach': 'Position Coach',
    'volunteer': 'Volunteer Coach',
    'athletic-director': 'Athletic Director',
    'other': 'Other',
  };
  return roleMap[role] || role;
}

function getTeamLevelLabel(level: string): string {
  const levelMap: Record<string, string> = {
    'youth': 'Youth (Ages 8-13)',
    'high-school': 'High School',
    'college': 'College',
    'semi-pro': 'Semi-Pro',
    'professional': 'Professional',
    'other': 'Other',
  };
  return levelMap[level] || level;
}


