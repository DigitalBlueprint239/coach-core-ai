#!/usr/bin/env node

import fs from 'fs';

const lighthouseFile = './deploy-logs/lighthouse-staging.json';

try {
  const data = JSON.parse(fs.readFileSync(lighthouseFile, 'utf8'));
  
  console.log('🔍 Lighthouse Staging Results:');
  console.log('================================');
  
  const categories = data.categories;
  
  console.log(`📊 Performance: ${Math.round(categories.performance.score * 100)}/100`);
  console.log(`♿ Accessibility: ${Math.round(categories.accessibility.score * 100)}/100`);
  console.log(`✅ Best Practices: ${Math.round(categories['best-practices'].score * 100)}/100`);
  console.log(`🔍 SEO: ${Math.round(categories.seo.score * 100)}/100`);
  
  console.log('\n📈 Key Metrics:');
  const audits = data.audits;
  
  if (audits['first-contentful-paint']) {
    console.log(`⚡ First Contentful Paint: ${audits['first-contentful-paint'].displayValue || 'N/A'}`);
  }
  if (audits['largest-contentful-paint']) {
    console.log(`🎯 Largest Contentful Paint: ${audits['largest-contentful-paint'].displayValue || 'N/A'}`);
  }
  if (audits['speed-index']) {
    console.log(`🚀 Speed Index: ${audits['speed-index'].displayValue || 'N/A'}`);
  }
  if (audits['total-blocking-time']) {
    console.log(`⏱️ Total Blocking Time: ${audits['total-blocking-time'].displayValue || 'N/A'}`);
  }
  if (audits['cumulative-layout-shift']) {
    console.log(`📐 Cumulative Layout Shift: ${audits['cumulative-layout-shift'].displayValue || 'N/A'}`);
  }
  
  console.log('\n🎯 Overall Assessment:');
  const performanceScore = Math.round(categories.performance.score * 100);
  const accessibilityScore = Math.round(categories.accessibility.score * 100);
  const bestPracticesScore = Math.round(categories['best-practices'].score * 100);
  const seoScore = Math.round(categories.seo.score * 100);
  
  if (performanceScore >= 90 && accessibilityScore >= 90 && bestPracticesScore >= 90 && seoScore >= 90) {
    console.log('✅ EXCELLENT - All scores are 90+');
  } else if (performanceScore >= 80 && accessibilityScore >= 80 && bestPracticesScore >= 80 && seoScore >= 80) {
    console.log('✅ GOOD - All scores are 80+');
  } else if (performanceScore >= 70 && accessibilityScore >= 70 && bestPracticesScore >= 70 && seoScore >= 70) {
    console.log('⚠️ FAIR - Some scores need improvement');
  } else {
    console.log('❌ NEEDS IMPROVEMENT - Multiple scores below 70');
  }
  
} catch (error) {
  console.error('❌ Error reading Lighthouse results:', error.message);
  process.exit(1);
}
