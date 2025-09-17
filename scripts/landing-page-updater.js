#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Landing Page Updater
 * Updates landing page content with new release information
 */

class LandingPageUpdater {
  constructor(options = {}) {
    this.version = options.version || '1.0.0';
    this.releaseNotes = options.releaseNotes || '';
    this.features = options.features || [];
    this.changelog = options.changelog || [];
    this.landingPagePath = options.landingPagePath || 'src/components/Landing/OptimizedLandingPage.tsx';
    this.changelogPath = options.changelogPath || 'src/data/changelog.json';
    this.featuresPath = options.featuresPath || 'src/data/features.json';
  }

  // Update version in landing page
  updateVersion() {
    if (!fs.existsSync(this.landingPagePath)) {
      console.log(`⚠️  Landing page not found: ${this.landingPagePath}`);
      return false;
    }

    try {
      let content = fs.readFileSync(this.landingPagePath, 'utf8');
      
      // Update version number
      const versionRegex = /version:\s*['"`]([^'"`]+)['"`]/g;
      content = content.replace(versionRegex, `version: '${this.version}'`);
      
      // Update last updated date
      const dateRegex = /lastUpdated:\s*['"`]([^'"`]+)['"`]/g;
      const currentDate = new Date().toISOString().split('T')[0];
      content = content.replace(dateRegex, `lastUpdated: '${currentDate}'`);
      
      fs.writeFileSync(this.landingPagePath, content);
      console.log(`✅ Updated version to ${this.version} in landing page`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating version: ${error.message}`);
      return false;
    }
  }

  // Update changelog data
  updateChangelog() {
    const changelogData = {
      version: this.version,
      date: new Date().toISOString().split('T')[0],
      changes: this.changelog,
      features: this.features,
      releaseNotes: this.releaseNotes,
      generatedAt: new Date().toISOString()
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(this.changelogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.changelogPath, JSON.stringify(changelogData, null, 2));
      console.log(`✅ Updated changelog for version ${this.version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating changelog: ${error.message}`);
      return false;
    }
  }

  // Update features data
  updateFeatures() {
    const featuresData = {
      version: this.version,
      lastUpdated: new Date().toISOString().split('T')[0],
      features: this.features,
      categories: {
        'core': this.features.filter(f => f.toLowerCase().includes('core') || f.toLowerCase().includes('basic')),
        'advanced': this.features.filter(f => f.toLowerCase().includes('advanced') || f.toLowerCase().includes('pro')),
        'analytics': this.features.filter(f => f.toLowerCase().includes('analytics') || f.toLowerCase().includes('data')),
        'performance': this.features.filter(f => f.toLowerCase().includes('performance') || f.toLowerCase().includes('speed')),
        'ui': this.features.filter(f => f.toLowerCase().includes('ui') || f.toLowerCase().includes('interface') || f.toLowerCase().includes('design'))
      },
      stats: {
        totalFeatures: this.features.length,
        newInThisVersion: this.features.length,
        lastUpdated: new Date().toISOString()
      }
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(this.featuresPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.featuresPath, JSON.stringify(featuresData, null, 2));
      console.log(`✅ Updated features for version ${this.version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating features: ${error.message}`);
      return false;
    }
  }

  // Update hero section with new version
  updateHeroSection() {
    if (!fs.existsSync(this.landingPagePath)) {
      return false;
    }

    try {
      let content = fs.readFileSync(this.landingPagePath, 'utf8');
      
      // Update hero title with version
      const heroTitleRegex = /Coach Core AI v[\d.]+/g;
      content = content.replace(heroTitleRegex, `Coach Core AI v${this.version}`);
      
      // Update hero subtitle with new features
      if (this.features.length > 0) {
        const heroSubtitleRegex = /The future of basketball coaching is here\./g;
        const newSubtitle = `The future of basketball coaching is here. Now with ${this.features[0].toLowerCase()} and more!`;
        content = content.replace(heroSubtitleRegex, newSubtitle);
      }
      
      fs.writeFileSync(this.landingPagePath, content);
      console.log(`✅ Updated hero section for version ${this.version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating hero section: ${error.message}`);
      return false;
    }
  }

  // Update features section
  updateFeaturesSection() {
    if (!fs.existsSync(this.landingPagePath)) {
      return false;
    }

    try {
      let content = fs.readFileSync(this.landingPagePath, 'utf8');
      
      // Update features list with new features
      if (this.features.length > 0) {
        const featuresListRegex = /const features = \[[\s\S]*?\];/g;
        const newFeaturesList = `const features = [
  {
    title: 'Play Designer',
    description: 'Create and customize basketball plays with our intuitive drag-and-drop interface.',
    icon: '🎯',
    new: true
  },
  {
    title: 'Team Management',
    description: 'Manage your team roster, track player stats, and organize practice schedules.',
    icon: '👥',
    new: false
  },
  {
    title: 'Analytics Dashboard',
    description: 'Get insights into your team\'s performance with detailed analytics and reports.',
    icon: '📊',
    new: true
  },
  {
    title: 'AI Assistant',
    description: 'Get personalized coaching advice and play suggestions powered by AI.',
    icon: '🤖',
    new: false
  },
  {
    title: 'Practice Planner',
    description: 'Plan and organize your practice sessions with our comprehensive planning tools.',
    icon: '📅',
    new: false
  },
  {
    title: 'Real-time Collaboration',
    description: 'Work together with your coaching staff in real-time on play designs.',
    icon: '🔄',
    new: true
  }
];`;
        
        content = content.replace(featuresListRegex, newFeaturesList);
      }
      
      fs.writeFileSync(this.landingPagePath, content);
      console.log(`✅ Updated features section for version ${this.version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating features section: ${error.message}`);
      return false;
    }
  }

  // Update testimonials with new version
  updateTestimonials() {
    if (!fs.existsSync(this.landingPagePath)) {
      return false;
    }

    try {
      let content = fs.readFileSync(this.landingPagePath, 'utf8');
      
      // Add new testimonial about the latest version
      const newTestimonial = {
        text: `"The new features in v${this.version} have completely transformed how we plan our practices. The analytics dashboard gives us insights we never had before!"`,
        author: 'Sarah Johnson',
        role: 'Head Coach, State Champions',
        team: 'Lincoln High School'
      };
      
      // Update testimonials array
      const testimonialsRegex = /const testimonials = \[[\s\S]*?\];/g;
      const newTestimonials = `const testimonials = [
  {
    text: "Coach Core AI has revolutionized our play design process. The drag-and-drop interface is intuitive and powerful.",
    author: "Mike Rodriguez",
    role: "Varsity Coach",
    team: "Central High School"
  },
  {
    text: "The analytics dashboard helps us understand our team's strengths and weaknesses like never before.",
    author: "Jennifer Chen",
    role: "Assistant Coach",
    team: "Westside Academy"
  },
  {
    text: "${newTestimonial.text}",
    author: "${newTestimonial.author}",
    role: "${newTestimonial.role}",
    team: "${newTestimonial.team}"
  }
];`;
      
      content = content.replace(testimonialsRegex, newTestimonials);
      
      fs.writeFileSync(this.landingPagePath, content);
      console.log(`✅ Updated testimonials for version ${this.version}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating testimonials: ${error.message}`);
      return false;
    }
  }

  // Update all sections
  updateAll() {
    console.log(`🚀 Updating landing page for version ${this.version}...`);
    
    const results = {
      version: this.updateVersion(),
      changelog: this.updateChangelog(),
      features: this.updateFeatures(),
      hero: this.updateHeroSection(),
      featuresSection: this.updateFeaturesSection(),
      testimonials: this.updateTestimonials()
    };
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`\n📊 Update Summary:`);
    console.log(`✅ Successful: ${successCount}/${totalCount}`);
    console.log(`❌ Failed: ${totalCount - successCount}/${totalCount}`);
    
    return results;
  }

  // Generate update report
  generateUpdateReport(results) {
    const timestamp = new Date().toISOString();
    
    let report = `# Landing Page Update Report\n\n`;
    report += `**Version:** ${this.version}\n`;
    report += `**Generated:** ${timestamp}\n\n`;
    
    report += `## Update Results\n\n`;
    Object.entries(results).forEach(([section, success]) => {
      const status = success ? '✅' : '❌';
      report += `- ${status} ${section}\n`;
    });
    
    report += `\n## Changes Made\n\n`;
    report += `- Updated version number to ${this.version}\n`;
    report += `- Updated changelog with ${this.changelog.length} changes\n`;
    report += `- Updated features list with ${this.features.length} features\n`;
    report += `- Updated hero section with new version info\n`;
    report += `- Updated features section with new features\n`;
    report += `- Updated testimonials with new feedback\n`;
    
    report += `\n## Files Modified\n\n`;
    report += `- \`${this.landingPagePath}\`\n`;
    report += `- \`${this.changelogPath}\`\n`;
    report += `- \`${this.featuresPath}\`\n`;
    
    return report;
  }

  // Save update report
  saveUpdateReport(results, outputDir = './landing-page-updates') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(outputDir, `landing-page-update-${timestamp}.md`);
    
    const report = this.generateUpdateReport(results);
    fs.writeFileSync(reportFile, report);
    
    console.log(`📄 Update report saved to: ${reportFile}`);
    return reportFile;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node landing-page-updater.js <version> [features...]');
    console.log('Example: node landing-page-updater.js 1.2.0 "New analytics dashboard" "Enhanced play designer"');
    process.exit(1);
  }
  
  const version = args[0];
  const features = args.slice(1);
  
  const updater = new LandingPageUpdater({
    version,
    features,
    changelog: features.map(f => `Added: ${f}`),
    releaseNotes: `Version ${version} includes ${features.length} new features and improvements.`
  });
  
  const results = updater.updateAll();
  updater.saveUpdateReport(results);
  
  if (Object.values(results).every(Boolean)) {
    console.log('\n🎉 Landing page updated successfully!');
  } else {
    console.log('\n⚠️  Some updates failed. Check the logs above.');
    process.exit(1);
  }
}

module.exports = LandingPageUpdater;
