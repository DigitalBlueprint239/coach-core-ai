#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Social Media Poster
 * Posts content to various social media platforms
 */

class SocialMediaPoster {
  constructor(options = {}) {
    this.platforms = options.platforms || ['twitter', 'linkedin', 'slack', 'discord'];
    this.content = options.content || {};
    this.credentials = options.credentials || {};
  }

  // Post to Twitter
  async postToTwitter() {
    if (!this.credentials.twitter) {
      console.log('⚠️  Twitter credentials not provided');
      return { success: false, error: 'No credentials' };
    }

    try {
      const Twitter = require('twitter-lite');
      
      const client = new Twitter({
        consumer_key: this.credentials.twitter.apiKey,
        consumer_secret: this.credentials.twitter.apiSecret,
        access_token_key: this.credentials.twitter.accessToken,
        access_token_secret: this.credentials.twitter.accessTokenSecret,
      });

      const tweetText = this.content.twitter?.text || '';
      
      if (!tweetText) {
        throw new Error('No Twitter content provided');
      }

      const response = await client.post('statuses/update', { 
        status: tweetText 
      });

      console.log('✅ Twitter post successful:', response.id);
      return { 
        success: true, 
        platform: 'Twitter',
        postId: response.id,
        url: `https://twitter.com/user/status/${response.id}`
      };
    } catch (error) {
      console.error('❌ Twitter post failed:', error.message);
      return { 
        success: false, 
        platform: 'Twitter',
        error: error.message 
      };
    }
  }

  // Post to LinkedIn
  async postToLinkedIn() {
    if (!this.credentials.linkedin) {
      console.log('⚠️  LinkedIn credentials not provided');
      return { success: false, error: 'No credentials' };
    }

    try {
      const LinkedInAPI = require('linkedin-api-client');
      
      const linkedin = new LinkedInAPI({
        clientId: this.credentials.linkedin.clientId,
        clientSecret: this.credentials.linkedin.clientSecret,
        accessToken: this.credentials.linkedin.accessToken,
      });

      const postText = this.content.linkedin?.text || '';
      
      if (!postText) {
        throw new Error('No LinkedIn content provided');
      }

      const response = await linkedin.post('/ugcPosts', {
        author: this.credentials.linkedin.personUrn || 'urn:li:person:YOUR_PERSON_URN',
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: postText
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      });

      console.log('✅ LinkedIn post successful:', response.id);
      return { 
        success: true, 
        platform: 'LinkedIn',
        postId: response.id
      };
    } catch (error) {
      console.error('❌ LinkedIn post failed:', error.message);
      return { 
        success: false, 
        platform: 'LinkedIn',
        error: error.message 
      };
    }
  }

  // Post to Slack
  async postToSlack() {
    if (!this.credentials.slack) {
      console.log('⚠️  Slack credentials not provided');
      return { success: false, error: 'No credentials' };
    }

    try {
      const axios = require('axios');
      
      const slackText = this.content.slack?.text || '';
      
      if (!slackText) {
        throw new Error('No Slack content provided');
      }

      const response = await axios.post(this.credentials.slack.webhookUrl, {
        text: slackText,
        channel: this.credentials.slack.channel || '#general',
        username: 'Coach Core AI Bot',
        icon_emoji: ':basketball:'
      });

      if (response.status === 200) {
        console.log('✅ Slack post successful');
        return { 
          success: true, 
          platform: 'Slack',
          message: 'Posted to Slack channel'
        };
      } else {
        throw new Error(`Slack API returned status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Slack post failed:', error.message);
      return { 
        success: false, 
        platform: 'Slack',
        error: error.message 
      };
    }
  }

  // Post to Discord
  async postToDiscord() {
    if (!this.credentials.discord) {
      console.log('⚠️  Discord credentials not provided');
      return { success: false, error: 'No credentials' };
    }

    try {
      const axios = require('axios');
      
      const discordText = this.content.discord?.text || '';
      
      if (!discordText) {
        throw new Error('No Discord content provided');
      }

      const response = await axios.post(this.credentials.discord.webhookUrl, {
        content: discordText,
        username: 'Coach Core AI Bot',
        avatar_url: 'https://coach-core-ai.web.app/logo.png'
      });

      if (response.status === 204) {
        console.log('✅ Discord post successful');
        return { 
          success: true, 
          platform: 'Discord',
          message: 'Posted to Discord channel'
        };
      } else {
        throw new Error(`Discord API returned status ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Discord post failed:', error.message);
      return { 
        success: false, 
        platform: 'Discord',
        error: error.message 
      };
    }
  }

  // Post to all platforms
  async postToAll() {
    const results = [];
    
    console.log('🚀 Starting social media posts...');
    
    for (const platform of this.platforms) {
      console.log(`\n📱 Posting to ${platform}...`);
      
      let result;
      switch (platform) {
        case 'twitter':
          result = await this.postToTwitter();
          break;
        case 'linkedin':
          result = await this.postToLinkedIn();
          break;
        case 'slack':
          result = await this.postToSlack();
          break;
        case 'discord':
          result = await this.postToDiscord();
          break;
        default:
          result = { 
            success: false, 
            platform, 
            error: 'Unknown platform' 
          };
      }
      
      results.push(result);
    }
    
    return results;
  }

  // Generate summary report
  generateSummaryReport(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    let report = `# Social Media Posting Summary\n\n`;
    report += `**Generated:** ${new Date().toLocaleString()}\n\n`;
    
    report += `## ✅ Successful Posts (${successful.length})\n\n`;
    successful.forEach(result => {
      report += `- **${result.platform}**: ${result.postId ? `Post ID: ${result.postId}` : result.message || 'Posted successfully'}\n`;
      if (result.url) {
        report += `  - URL: ${result.url}\n`;
      }
    });
    
    if (failed.length > 0) {
      report += `\n## ❌ Failed Posts (${failed.length})\n\n`;
      failed.forEach(result => {
        report += `- **${result.platform}**: ${result.error}\n`;
      });
    }
    
    report += `\n## 📊 Summary\n\n`;
    report += `- Total platforms: ${results.length}\n`;
    report += `- Successful: ${successful.length}\n`;
    report += `- Failed: ${failed.length}\n`;
    report += `- Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%\n`;
    
    return report;
  }

  // Save results to file
  saveResults(results, outputDir = './social-media-results') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save JSON results
    const jsonFile = path.join(outputDir, `social-media-results-${timestamp}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
    
    // Save summary report
    const reportFile = path.join(outputDir, `social-media-summary-${timestamp}.md`);
    const summary = this.generateSummaryReport(results);
    fs.writeFileSync(reportFile, summary);
    
    console.log(`📁 Results saved to: ${outputDir}`);
    console.log(`📄 JSON: ${jsonFile}`);
    console.log(`📄 Summary: ${reportFile}`);
    
    return { jsonFile, reportFile };
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node social-media-poster.js <content-file> [platforms]');
    console.log('Example: node social-media-poster.js marketing-content.json twitter,linkedin');
    process.exit(1);
  }
  
  const contentFile = args[0];
  const platforms = args[1] ? args[1].split(',') : ['twitter', 'linkedin', 'slack', 'discord'];
  
  if (!fs.existsSync(contentFile)) {
    console.error(`❌ Content file not found: ${contentFile}`);
    process.exit(1);
  }
  
  try {
    const contentData = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
    const content = contentData.content || contentData;
    
    const credentials = {
      twitter: {
        apiKey: process.env.TWITTER_API_KEY,
        apiSecret: process.env.TWITTER_API_SECRET,
        accessToken: process.env.TWITTER_ACCESS_TOKEN,
        accessTokenSecret: process.env.TWITTER_ACCESS_SECRET,
      },
      linkedin: {
        clientId: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN,
        personUrn: process.env.LINKEDIN_PERSON_URN,
      },
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#general',
      },
      discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
      }
    };
    
    const poster = new SocialMediaPoster({
      platforms,
      content,
      credentials
    });
    
    poster.postToAll().then(results => {
      const { jsonFile, reportFile } = poster.saveResults(results);
      
      console.log('\n📊 Posting Summary:');
      console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
      console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
      
      if (results.some(r => !r.success)) {
        process.exit(1);
      }
    }).catch(error => {
      console.error('❌ Posting failed:', error.message);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = SocialMediaPoster;
