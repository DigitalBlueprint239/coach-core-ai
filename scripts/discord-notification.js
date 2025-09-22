#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  username: 'Coach Core AI CI/CD',
  avatarUrl: 'https://avatars.githubusercontent.com/u/123456789?s=200&v=4',
};

// Colors for different statuses
const colors = {
  success: 0x36a64f,
  warning: 0xff9500,
  error: 0xff0000,
  info: 0x36a64f,
};

// Helper function to send Discord message
function sendDiscordMessage(embed) {
  if (!config.webhookUrl) {
    console.log('⚠️  Discord webhook URL not configured. Skipping notification.');
    return;
  }

  const payload = {
    username: config.username,
    avatar_url: config.avatarUrl,
    embeds: [embed],
  };

  const postData = JSON.stringify(payload);
  const url = new URL(config.webhookUrl);

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Discord notification sent successfully');
    } else {
      console.error('❌ Failed to send Discord notification:', res.statusCode);
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error sending Discord notification:', error.message);
  });

  req.write(postData);
  req.end();
}

// Generate deployment success embed
function generateSuccessEmbed(context) {
  const { repository, branch, commit, author, stagingUrl, productionUrl, testResults, lighthouseResults } = context;

  return {
    title: '🎉 Deployment Successful!',
    color: colors.success,
    fields: [
      {
        name: 'Repository',
        value: repository,
        inline: true,
      },
      {
        name: 'Branch',
        value: branch,
        inline: true,
      },
      {
        name: 'Commit',
        value: `\`${commit.substring(0, 7)}\``,
        inline: true,
      },
      {
        name: 'Author',
        value: author,
        inline: true,
      },
      {
        name: 'Staging URL',
        value: `[coach-core-ai-staging.web.app](${stagingUrl})`,
        inline: true,
      },
      {
        name: 'Production URL',
        value: `[coach-core-ai.web.app](${productionUrl})`,
        inline: true,
      },
      {
        name: 'Test Results',
        value: testResults ? '✅ All tests passed' : '⚠️  Test results not available',
        inline: true,
      },
      {
        name: 'Lighthouse Score',
        value: lighthouseResults ? `✅ ${lighthouseResults.performanceScore}/100` : '⚠️  Lighthouse results not available',
        inline: true,
      },
    ],
    footer: {
      text: 'Coach Core AI CI/CD',
    },
    timestamp: new Date().toISOString(),
  };
}

// Generate deployment failure embed
function generateFailureEmbed(context) {
  const { repository, branch, commit, author, error, testResults, lighthouseResults } = context;

  return {
    title: '❌ Deployment Failed!',
    color: colors.error,
    fields: [
      {
        name: 'Repository',
        value: repository,
        inline: true,
      },
      {
        name: 'Branch',
        value: branch,
        inline: true,
      },
      {
        name: 'Commit',
        value: `\`${commit.substring(0, 7)}\``,
        inline: true,
      },
      {
        name: 'Author',
        value: author,
        inline: true,
      },
      {
        name: 'Error',
        value: error || 'Unknown error',
        inline: false,
      },
      {
        name: 'Test Results',
        value: testResults ? '✅ All tests passed' : '❌ Tests failed',
        inline: true,
      },
      {
        name: 'Lighthouse Score',
        value: lighthouseResults ? `❌ ${lighthouseResults.performanceScore}/100` : '❌ Lighthouse failed',
        inline: true,
      },
    ],
    footer: {
      text: 'Coach Core AI CI/CD',
    },
    timestamp: new Date().toISOString(),
  };
}

// Generate performance alert embed
function generatePerformanceAlertEmbed(context) {
  const { repository, branch, performanceScore, accessibilityScore, bestPracticesScore, seoScore } = context;

  return {
    title: '⚠️ Performance Alert!',
    color: colors.warning,
    fields: [
      {
        name: 'Repository',
        value: repository,
        inline: true,
      },
      {
        name: 'Branch',
        value: branch,
        inline: true,
      },
      {
        name: 'Performance Score',
        value: `${performanceScore}/100 ${performanceScore >= 80 ? '✅' : '❌'}`,
        inline: true,
      },
      {
        name: 'Accessibility Score',
        value: `${accessibilityScore}/100 ${accessibilityScore >= 90 ? '✅' : '❌'}`,
        inline: true,
      },
      {
        name: 'Best Practices Score',
        value: `${bestPracticesScore}/100 ${bestPracticesScore >= 80 ? '✅' : '❌'}`,
        inline: true,
      },
      {
        name: 'SEO Score',
        value: `${seoScore}/100 ${seoScore >= 80 ? '✅' : '❌'}`,
        inline: true,
      },
    ],
    footer: {
      text: 'Coach Core AI CI/CD',
    },
    timestamp: new Date().toISOString(),
  };
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const context = {
    repository: process.env.GITHUB_REPOSITORY || 'coach-core-ai/coach-core-ai',
    branch: process.env.GITHUB_REF_NAME || 'main',
    commit: process.env.GITHUB_SHA || 'unknown',
    author: process.env.GITHUB_ACTOR || 'unknown',
    stagingUrl: 'https://coach-core-ai-staging.web.app',
    productionUrl: 'https://coach-core-ai.web.app',
  };

  // Load test results if available
  const testReportPath = path.join(__dirname, '..', 'deploy-logs', 'test-report.json');
  if (fs.existsSync(testReportPath)) {
    try {
      const testReport = JSON.parse(fs.readFileSync(testReportPath, 'utf8'));
      context.testResults = testReport.summary.passed === testReport.summary.total;
    } catch (error) {
      console.error('Failed to load test report:', error.message);
    }
  }

  // Load Lighthouse results if available
  const lighthouseReportPath = path.join(__dirname, '..', 'deploy-logs', 'lighthouse-report.json');
  if (fs.existsSync(lighthouseReportPath)) {
    try {
      const lighthouseReport = JSON.parse(fs.readFileSync(lighthouseReportPath, 'utf8'));
      context.lighthouseResults = lighthouseReport.summary;
    } catch (error) {
      console.error('Failed to load Lighthouse report:', error.message);
    }
  }

  let embed;

  switch (command) {
    case 'success':
      embed = generateSuccessEmbed(context);
      break;
    case 'failure':
      context.error = args[1] || 'Unknown error';
      embed = generateFailureEmbed(context);
      break;
    case 'performance-alert':
      context.performanceScore = parseInt(args[1]) || 0;
      context.accessibilityScore = parseInt(args[2]) || 0;
      context.bestPracticesScore = parseInt(args[3]) || 0;
      context.seoScore = parseInt(args[4]) || 0;
      embed = generatePerformanceAlertEmbed(context);
      break;
    default:
      console.log('Usage: node discord-notification.js [success|failure|performance-alert] [additional-args]');
      process.exit(1);
  }

  sendDiscordMessage(embed);
}

// Run the script
main();
