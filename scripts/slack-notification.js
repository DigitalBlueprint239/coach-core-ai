#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  webhookUrl: process.env.SLACK_WEBHOOK_URL,
  channel: process.env.SLACK_CHANNEL || '#deployments',
  username: 'Coach Core AI CI/CD',
  iconEmoji: ':rocket:',
};

// Colors for different statuses
const colors = {
  success: '#36a64f',
  warning: '#ff9500',
  error: '#ff0000',
  info: '#36a64f',
};

// Helper function to send Slack message
function sendSlackMessage(message, status = 'info') {
  if (!config.webhookUrl) {
    console.log('⚠️  Slack webhook URL not configured. Skipping notification.');
    return;
  }

  const payload = {
    channel: config.channel,
    username: config.username,
    icon_emoji: config.iconEmoji,
    attachments: [
      {
        color: colors[status],
        fields: message.fields || [],
        text: message.text,
        footer: 'Coach Core AI CI/CD',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
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
    if (res.statusCode === 200) {
      console.log('✅ Slack notification sent successfully');
    } else {
      console.error('❌ Failed to send Slack notification:', res.statusCode);
    }
  });

  req.on('error', (error) => {
    console.error('❌ Error sending Slack notification:', error.message);
  });

  req.write(postData);
  req.end();
}

// Generate deployment success message
function generateSuccessMessage(context) {
  const { repository, branch, commit, author, stagingUrl, productionUrl, testResults, lighthouseResults } = context;

  return {
    text: '🎉 *Deployment Successful!*',
    fields: [
      {
        title: 'Repository',
        value: repository,
        short: true,
      },
      {
        title: 'Branch',
        value: branch,
        short: true,
      },
      {
        title: 'Commit',
        value: commit,
        short: true,
      },
      {
        title: 'Author',
        value: author,
        short: true,
      },
      {
        title: 'Staging URL',
        value: `<${stagingUrl}|coach-core-ai-staging.web.app>`,
        short: true,
      },
      {
        title: 'Production URL',
        value: `<${productionUrl}|coach-core-ai.web.app>`,
        short: true,
      },
      {
        title: 'Test Results',
        value: testResults ? '✅ All tests passed' : '⚠️  Test results not available',
        short: true,
      },
      {
        title: 'Lighthouse Score',
        value: lighthouseResults ? `✅ ${lighthouseResults.performanceScore}/100` : '⚠️  Lighthouse results not available',
        short: true,
      },
    ],
  };
}

// Generate deployment failure message
function generateFailureMessage(context) {
  const { repository, branch, commit, author, error, testResults, lighthouseResults } = context;

  return {
    text: '❌ *Deployment Failed!*',
    fields: [
      {
        title: 'Repository',
        value: repository,
        short: true,
      },
      {
        title: 'Branch',
        value: branch,
        short: true,
      },
      {
        title: 'Commit',
        value: commit,
        short: true,
      },
      {
        title: 'Author',
        value: author,
        short: true,
      },
      {
        title: 'Error',
        value: error || 'Unknown error',
        short: false,
      },
      {
        title: 'Test Results',
        value: testResults ? '✅ All tests passed' : '❌ Tests failed',
        short: true,
      },
      {
        title: 'Lighthouse Score',
        value: lighthouseResults ? `❌ ${lighthouseResults.performanceScore}/100` : '❌ Lighthouse failed',
        short: true,
      },
    ],
  };
}

// Generate performance alert message
function generatePerformanceAlertMessage(context) {
  const { repository, branch, performanceScore, accessibilityScore, bestPracticesScore, seoScore } = context;

  return {
    text: '⚠️ *Performance Alert!*',
    fields: [
      {
        title: 'Repository',
        value: repository,
        short: true,
      },
      {
        title: 'Branch',
        value: branch,
        short: true,
      },
      {
        title: 'Performance Score',
        value: `${performanceScore}/100 ${performanceScore >= 80 ? '✅' : '❌'}`,
        short: true,
      },
      {
        title: 'Accessibility Score',
        value: `${accessibilityScore}/100 ${accessibilityScore >= 90 ? '✅' : '❌'}`,
        short: true,
      },
      {
        title: 'Best Practices Score',
        value: `${bestPracticesScore}/100 ${bestPracticesScore >= 80 ? '✅' : '❌'}`,
        short: true,
      },
      {
        title: 'SEO Score',
        value: `${seoScore}/100 ${seoScore >= 80 ? '✅' : '❌'}`,
        short: true,
      },
    ],
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

  let message;
  let status = 'info';

  switch (command) {
    case 'success':
      message = generateSuccessMessage(context);
      status = 'success';
      break;
    case 'failure':
      context.error = args[1] || 'Unknown error';
      message = generateFailureMessage(context);
      status = 'error';
      break;
    case 'performance-alert':
      context.performanceScore = parseInt(args[1]) || 0;
      context.accessibilityScore = parseInt(args[2]) || 0;
      context.bestPracticesScore = parseInt(args[3]) || 0;
      context.seoScore = parseInt(args[4]) || 0;
      message = generatePerformanceAlertMessage(context);
      status = 'warning';
      break;
    default:
      console.log('Usage: node slack-notification.js [success|failure|performance-alert] [additional-args]');
      process.exit(1);
  }

  sendSlackMessage(message, status);
}

// Run the script
main();
