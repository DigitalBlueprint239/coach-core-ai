#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Marketing Content Generator
 * Generates marketing content for various platforms based on release information
 */

class MarketingContentGenerator {
  constructor(options = {}) {
    this.version = options.version || '1.0.0';
    this.commitMessage = options.commitMessage || 'New release';
    this.commitAuthor = options.commitAuthor || 'Developer';
    this.commitDate = options.commitDate || new Date().toISOString().split('T')[0];
    this.changelog = options.changelog || [];
    this.features = options.features || [];
    this.bugFixes = options.bugFixes || [];
    this.performance = options.performance || [];
  }

  // Generate Twitter content
  generateTwitterContent() {
    const maxLength = 280;
    const baseText = `🚀 Coach Core AI v${this.version} is now live! ${this.commitMessage}`;
    
    let content = baseText;
    
    // Add features if there's space
    if (this.features.length > 0) {
      const featuresText = `\n\n✨ ${this.features.slice(0, 2).join('\n🔧 ')}`;
      if (content.length + featuresText.length < maxLength - 50) {
        content += featuresText;
      }
    }
    
    // Add hashtags
    const hashtags = '\n\n#CoachCoreAI #Basketball #SportsTech #AI #Coaching';
    if (content.length + hashtags.length < maxLength) {
      content += hashtags;
    }
    
    // Add link
    const link = '\n\nTry it now: https://coach-core-ai.web.app';
    if (content.length + link.length < maxLength) {
      content += link;
    }
    
    return {
      text: content,
      length: content.length,
      maxLength: maxLength,
      isValid: content.length <= maxLength
    };
  }

  // Generate LinkedIn content
  generateLinkedInContent() {
    let content = `🚀 Exciting news! Coach Core AI v${this.version} is now available!\n\n`;
    content += `${this.commitMessage}\n\n`;
    
    content += `Key highlights:\n`;
    
    if (this.features.length > 0) {
      content += `✨ ${this.features.join('\n🔧 ')}\n`;
    }
    
    if (this.performance.length > 0) {
      content += `⚡ ${this.performance.join('\n📊 ')}\n`;
    }
    
    if (this.bugFixes.length > 0) {
      content += `🐛 ${this.bugFixes.join('\n🔧 ')}\n`;
    }
    
    content += `\nWe're committed to helping coaches create better plays and develop winning strategies.\n\n`;
    content += `Try the latest version: https://coach-core-ai.web.app\n\n`;
    content += `#SportsTech #Basketball #Coaching #AI #Innovation #BasketballCoaching`;
    
    return {
      text: content,
      length: content.length,
      platform: 'LinkedIn'
    };
  }

  // Generate Slack content
  generateSlackContent() {
    let content = `🚀 *Coach Core AI v${this.version}* has been deployed!\n\n`;
    content += `*What's New:*\n${this.commitMessage}\n\n`;
    
    content += `*Deployment Details:*\n`;
    content += `• Environment: Production\n`;
    content += `• Version: ${this.version}\n`;
    content += `• Author: ${this.commitAuthor}\n`;
    content += `• Date: ${this.commitDate}\n\n`;
    
    if (this.features.length > 0) {
      content += `*New Features:*\n`;
      this.features.forEach(feature => {
        content += `• ${feature}\n`;
      });
      content += `\n`;
    }
    
    if (this.performance.length > 0) {
      content += `*Performance Improvements:*\n`;
      this.performance.forEach(improvement => {
        content += `• ${improvement}\n`;
      });
      content += `\n`;
    }
    
    content += `*Links:*\n`;
    content += `• 🌐 Production: https://coach-core-ai.web.app\n`;
    content += `• 🧪 Staging: https://coach-core-ai-staging.web.app\n`;
    content += `• 📊 Analytics: https://coach-core-ai.web.app/admin/analytics\n\n`;
    
    content += `*Next Steps:*\n`;
    content += `• Monitor performance metrics\n`;
    content += `• Check error rates\n`;
    content += `• Review user feedback`;
    
    return {
      text: content,
      platform: 'Slack'
    };
  }

  // Generate Discord content
  generateDiscordContent() {
    let content = `🚀 **Coach Core AI v${this.version}** is now live!\n\n`;
    content += `**What's New:**\n${this.commitMessage}\n\n`;
    
    content += `**Deployment Info:**\n`;
    content += `• Version: ${this.version}\n`;
    content += `• Author: ${this.commitAuthor}\n`;
    content += `• Date: ${this.commitDate}\n\n`;
    
    if (this.features.length > 0) {
      content += `**Features:**\n`;
      this.features.forEach(feature => {
        content += `✨ ${feature}\n`;
      });
      content += `\n`;
    }
    
    if (this.performance.length > 0) {
      content += `**Performance:**\n`;
      this.performance.forEach(improvement => {
        content += `⚡ ${improvement}\n`;
      });
      content += `\n`;
    }
    
    content += `**Links:**\n`;
    content += `• 🌐 Production: https://coach-core-ai.web.app\n`;
    content += `• 🧪 Staging: https://coach-core-ai-staging.web.app\n`;
    content += `• 📊 Analytics: https://coach-core-ai.web.app/admin/analytics`;
    
    return {
      text: content,
      platform: 'Discord'
    };
  }

  // Generate email content
  generateEmailContent() {
    let content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Coach Core AI v${this.version} Release</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; max-width: 600px; margin: 0 auto; }
        .feature { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
        .cta { background: #667eea; color: white; padding: 15px; text-align: center; margin: 20px 0; }
        .cta a { color: white; text-decoration: none; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Coach Core AI v${this.version}</h1>
        <p>New features and improvements are now live!</p>
    </div>
    
    <div class="content">
        <h2>What's New</h2>
        <p>${this.commitMessage}</p>
        
        <h2>Key Features</h2>`;
    
    this.features.forEach(feature => {
      content += `
        <div class="feature">
            <strong>✨ ${feature}</strong>
        </div>`;
    });
    
    if (this.performance.length > 0) {
      content += `
        <h2>Performance Improvements</h2>`;
      this.performance.forEach(improvement => {
        content += `
        <div class="feature">
            <strong>⚡ ${improvement}</strong>
        </div>`;
      });
    }
    
    content += `
        <div class="cta">
            <a href="https://coach-core-ai.web.app">Try Coach Core AI Now</a>
        </div>
        
        <h2>Stay Connected</h2>
        <p>Follow us for the latest updates and basketball coaching tips:</p>
        <ul>
            <li>🌐 Website: <a href="https://coach-core-ai.web.app">coach-core-ai.web.app</a></li>
            <li>📧 Email: support@coachcoreai.com</li>
            <li>🐦 Twitter: @CoachCoreAI</li>
            <li>💼 LinkedIn: Coach Core AI</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>© 2025 Coach Core AI. All rights reserved.</p>
        <p>You received this email because you're subscribed to our updates.</p>
    </div>
</body>
</html>`;
    
    return {
      html: content,
      platform: 'Email'
    };
  }

  // Generate press release content
  generatePressReleaseContent() {
    let content = `FOR IMMEDIATE RELEASE

Coach Core AI Releases Version ${this.version} with Enhanced Features

${this.commitMessage}

[City, State] - [Date] - Coach Core AI, the leading basketball coaching platform, today announced the release of version ${this.version}, featuring significant improvements and new capabilities designed to help coaches create better plays and develop winning strategies.

Key Features in This Release:

`;
    
    this.features.forEach((feature, index) => {
      content += `${index + 1}. ${feature}\n`;
    });
    
    if (this.performance.length > 0) {
      content += `\nPerformance Improvements:\n\n`;
      this.performance.forEach((improvement, index) => {
        content += `${index + 1}. ${improvement}\n`;
      });
    }
    
    content += `
"These updates represent our continued commitment to providing coaches with the most advanced tools for play design and team management," said [Spokesperson Name], [Title] at Coach Core AI. "We're excited to see how coaches will use these new features to elevate their teams' performance."

About Coach Core AI:
Coach Core AI is a comprehensive basketball coaching platform that combines artificial intelligence with intuitive design tools to help coaches create, manage, and optimize their team's plays. The platform serves coaches at all levels, from youth leagues to professional teams.

For more information, visit https://coach-core-ai.web.app or contact:
[Contact Name]
[Contact Title]
[Email]
[Phone]

###`;
    
    return {
      text: content,
      platform: 'Press Release'
    };
  }

  // Generate all content
  generateAllContent() {
    return {
      twitter: this.generateTwitterContent(),
      linkedin: this.generateLinkedInContent(),
      slack: this.generateSlackContent(),
      discord: this.generateDiscordContent(),
      email: this.generateEmailContent(),
      pressRelease: this.generatePressReleaseContent()
    };
  }

  // Save content to files
  saveContent(outputDir = './marketing-content') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const content = this.generateAllContent();
    
    // Save individual platform content
    Object.entries(content).forEach(([platform, data]) => {
      const filename = `${platform.toLowerCase().replace(/\s+/g, '-')}-content.txt`;
      const filepath = path.join(outputDir, filename);
      
      if (platform === 'email') {
        fs.writeFileSync(filepath.replace('.txt', '.html'), data.html);
      } else {
        fs.writeFileSync(filepath, data.text);
      }
    });
    
    // Save combined JSON
    const jsonContent = {
      version: this.version,
      generatedAt: new Date().toISOString(),
      content: content
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'marketing-content.json'),
      JSON.stringify(jsonContent, null, 2)
    );
    
    console.log(`✅ Marketing content saved to ${outputDir}`);
    return outputDir;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node marketing-content-generator.js <version> [commit-message] [author]');
    console.log('Example: node marketing-content-generator.js 1.2.0 "Added new play designer" "John Doe"');
    process.exit(1);
  }
  
  const version = args[0];
  const commitMessage = args[1] || 'New release';
  const author = args[2] || 'Developer';
  
  const generator = new MarketingContentGenerator({
    version,
    commitMessage,
    commitAuthor: author,
    commitDate: new Date().toISOString().split('T')[0],
    features: [
      'Enhanced user experience',
      'Performance improvements',
      'Advanced analytics',
      'Better coaching tools'
    ],
    performance: [
      'Faster page load times',
      'Improved database queries',
      'Enhanced caching',
      'Better error handling'
    ],
    bugFixes: [
      'Fixed authentication issues',
      'Resolved data sync problems',
      'Improved error messages'
    ]
  });
  
  const outputDir = generator.saveContent();
  console.log(`📱 Generated marketing content for version ${version}`);
  console.log(`📁 Content saved to: ${outputDir}`);
}

module.exports = MarketingContentGenerator;
