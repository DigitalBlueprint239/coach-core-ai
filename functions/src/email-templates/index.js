const defaultStyles = `
  <style>
    body { font-family: Arial, sans-serif; color: #1a202c; }
    h1, h2 { color: #2b6cb0; }
    .cta { display: inline-block; margin-top: 16px; padding: 12px 20px; background: #2b6cb0; color: #fff; border-radius: 8px; text-decoration: none; }
    .card { background: #f7fafc; padding: 16px; border-radius: 12px; margin: 20px 0; }
  </style>
`;

const templates = {
  transform: {
    subject: 'How Coach Core AI Transforms Your Practice',
    render: ({ name }) => `
      ${defaultStyles}
      <div>
        <h1>Hey ${name || 'Coach'},</h1>
        <p>In just a few days with Coach Core AI, coaches report:</p>
        <div class="card">
          <ul>
            <li><strong>4 hours saved</strong> every week on practice planning</li>
            <li><strong>30% faster</strong> video breakdowns with AI assistance</li>
            <li>Instant adjustments for weather, player availability, and opponent tendencies</li>
          </ul>
        </div>
        <p>Imagine walking into every session with a data-backed plan that adapts in real-time.</p>
        <a class="cta" href="https://coach-core-ai.web.app/waitlist">See how the platform works</a>
      </div>
    `,
  },
  'case-study': {
    subject: 'Coach Hayes Doubled His Practice Efficiency — Here’s How',
    render: ({ name }) => `
      ${defaultStyles}
      <div>
        <h1>Coach ${name || 'Hayes'}' Story</h1>
        <p>“Coach Core AI built our weekly install schedule in minutes. Our staff focuses on coaching, not spreadsheets.”</p>
        <div class="card">
          <h2>Quick Stats</h2>
          <ul>
            <li>Practice plans generated in under 5 minutes</li>
            <li>AI play suggestions tailored to opponent tendencies</li>
            <li>Team adoption in less than one week</li>
          </ul>
        </div>
        <p>You’ll get the same tools during early access. Spots are limited for founding programs.</p>
        <a class="cta" href="https://coach-core-ai.web.app/waitlist">Secure early access</a>
      </div>
    `,
  },
  teaser: {
    subject: 'Early Access Is Almost Here',
    render: ({ name }) => `
      ${defaultStyles}
      <div>
        <h1>We’re Almost Ready, ${name || 'Coach'}</h1>
        <p>Your team is on the short list for Coach Core AI early access. Here’s what’s coming next:</p>
        <div class="card">
          <ol>
            <li>Exclusive onboarding session with our AI coaching staff</li>
            <li>Custom practice planning templates for your program</li>
            <li>Priority support during the beta period</li>
          </ol>
        </div>
        <p>Keep an eye on your inbox for launch day instructions. We can’t wait to work with you.</p>
      </div>
    `,
  },
};

module.exports = templates;
