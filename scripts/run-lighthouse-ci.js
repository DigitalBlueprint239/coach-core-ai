#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 Running Lighthouse CI performance tests...\n');

// Configuration
const config = {
  stagingUrl: 'https://coach-core-ai-staging.web.app',
  productionUrl: 'https://coach-core-ai.web.app',
  minPerformanceScore: 80,
  minAccessibilityScore: 90,
  minBestPracticesScore: 80,
  minSeoScore: 80,
  maxFCP: 2000,
  maxLCP: 2500,
  maxCLS: 0.1,
  maxTBT: 200,
  maxSpeedIndex: 3000,
};

// Test URLs
const testUrls = [
  config.stagingUrl,
  `${config.stagingUrl}/dashboard`,
  `${config.stagingUrl}/pricing`,
  `${config.stagingUrl}/play-designer`,
];

console.log('📋 Testing URLs:');
testUrls.forEach(url => console.log(`  - ${url}`));
console.log('');

// Run Lighthouse CI
function runLighthouseCI() {
  try {
    console.log('🚨 Running Lighthouse CI...');
    
    // Set environment variables
    process.env.LHCI_GITHUB_APP_TOKEN = process.env.LHCI_GITHUB_APP_TOKEN || '';
    
    // Run Lighthouse CI
    execSync('lhci autorun', { stdio: 'inherit' });
    
    console.log('✅ Lighthouse CI completed successfully\n');
    return true;
  } catch (error) {
    console.error('❌ Lighthouse CI failed:', error.message);
    console.log('');
    return false;
  }
}

// Parse Lighthouse results
function parseLighthouseResults() {
  try {
    const resultsPath = path.join(__dirname, '..', '.lighthouseci', 'assertion-results.json');
    
    if (!fs.existsSync(resultsPath)) {
      console.log('⚠️  No Lighthouse results found');
      return null;
    }
    
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    return results;
  } catch (error) {
    console.error('❌ Failed to parse Lighthouse results:', error.message);
    return null;
  }
}

// Generate performance report
function generatePerformanceReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    config: config,
    results: results,
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      performanceScore: 0,
      accessibilityScore: 0,
      bestPracticesScore: 0,
      seoScore: 0,
    },
  };
  
  if (results && results.assertions) {
    report.summary.totalTests = results.assertions.length;
    report.summary.passedTests = results.assertions.filter(a => a.passed).length;
    report.summary.failedTests = results.assertions.filter(a => !a.passed).length;
    
    // Extract scores
    const scoreAssertions = results.assertions.filter(a => a.assertion.includes('score'));
    scoreAssertions.forEach(assertion => {
      const score = assertion.actualValue;
      if (assertion.assertion.includes('performance')) {
        report.summary.performanceScore = score;
      } else if (assertion.assertion.includes('accessibility')) {
        report.summary.accessibilityScore = score;
      } else if (assertion.assertion.includes('best-practices')) {
        report.summary.bestPracticesScore = score;
      } else if (assertion.assertion.includes('seo')) {
        report.summary.seoScore = score;
      }
    });
  }
  
  return report;
}

// Save performance report
function savePerformanceReport(report) {
  const reportPath = path.join(__dirname, '..', 'deploy-logs', 'lighthouse-report.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Performance report saved to: ${reportPath}`);
}

// Display performance summary
function displayPerformanceSummary(report) {
  console.log('📊 Lighthouse CI Performance Summary:');
  console.log('=====================================');
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passedTests}`);
  console.log(`Failed: ${report.summary.failedTests}`);
  console.log('');
  
  console.log('📈 Performance Scores:');
  console.log(`Performance: ${report.summary.performanceScore}/100 ${report.summary.performanceScore >= config.minPerformanceScore ? '✅' : '❌'}`);
  console.log(`Accessibility: ${report.summary.accessibilityScore}/100 ${report.summary.accessibilityScore >= config.minAccessibilityScore ? '✅' : '❌'}`);
  console.log(`Best Practices: ${report.summary.bestPracticesScore}/100 ${report.summary.bestPracticesScore >= config.minBestPracticesScore ? '✅' : '❌'}`);
  console.log(`SEO: ${report.summary.seoScore}/100 ${report.summary.seoScore >= config.minSeoScore ? '✅' : '❌'}`);
  console.log('');
  
  // Check if all scores meet requirements
  const allScoresPass = 
    report.summary.performanceScore >= config.minPerformanceScore &&
    report.summary.accessibilityScore >= config.minAccessibilityScore &&
    report.summary.bestPracticesScore >= config.minBestPracticesScore &&
    report.summary.seoScore >= config.minSeoScore;
  
  if (allScoresPass) {
    console.log('🎉 All performance requirements met!');
    return true;
  } else {
    console.log('❌ Some performance requirements not met. Check the scores above.');
    return false;
  }
}

// Main execution
async function main() {
  try {
    // Run Lighthouse CI
    const lighthouseSuccess = runLighthouseCI();
    
    if (!lighthouseSuccess) {
      console.log('❌ Lighthouse CI failed. Exiting...');
      process.exit(1);
    }
    
    // Parse results
    const results = parseLighthouseResults();
    
    // Generate report
    const report = generatePerformanceReport(results);
    
    // Save report
    savePerformanceReport(report);
    
    // Display summary
    const allRequirementsMet = displayPerformanceSummary(report);
    
    // Exit with appropriate code
    if (allRequirementsMet) {
      console.log('✅ Lighthouse CI completed successfully!');
      process.exit(0);
    } else {
      console.log('❌ Lighthouse CI failed - performance requirements not met');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Lighthouse CI script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
