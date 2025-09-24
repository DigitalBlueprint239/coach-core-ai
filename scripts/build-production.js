#!/usr/bin/env node

/**
 * Production Build Script
 * 
 * This script creates a minimal, production-ready build by:
 * 1. Using the production App.tsx (minimal features)
 * 2. Disabling problematic features
 * 3. Ensuring only essential dependencies are included
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building production-ready Coach Core AI...\n');

// Step 1: Backup original App.tsx
const originalAppPath = path.join(__dirname, '../src/App.tsx');
const productionAppPath = path.join(__dirname, '../src/App.production.tsx');
const backupAppPath = path.join(__dirname, '../src/App.original.tsx');

console.log('📋 Step 1: Backing up original App.tsx...');
if (fs.existsSync(originalAppPath)) {
  fs.copyFileSync(originalAppPath, backupAppPath);
  console.log('✅ Original App.tsx backed up');
} else {
  console.log('⚠️  Original App.tsx not found, skipping backup');
}

// Step 2: Use production App.tsx
console.log('\n📋 Step 2: Using production App.tsx...');
if (fs.existsSync(productionAppPath)) {
  fs.copyFileSync(productionAppPath, originalAppPath);
  console.log('✅ Production App.tsx activated');
} else {
  console.log('❌ Production App.tsx not found!');
  process.exit(1);
}

// Step 3: Create production environment file
console.log('\n📋 Step 3: Creating production environment...');
const envContent = `# Production Environment
NODE_ENV=production
REACT_APP_ENVIRONMENT=production
REACT_APP_FEATURE_FLAGS=minimal
REACT_APP_ANALYTICS_ENABLED=true
REACT_APP_ERROR_REPORTING_ENABLED=true
`;

fs.writeFileSync(path.join(__dirname, '../.env.production'), envContent);
console.log('✅ Production environment created');

// Step 4: Build the application
console.log('\n📋 Step 4: Building application...');
try {
  execSync('npm run build:production', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 5: Restore original App.tsx
console.log('\n📋 Step 5: Restoring original App.tsx...');
if (fs.existsSync(backupAppPath)) {
  fs.copyFileSync(backupAppPath, originalAppPath);
  fs.unlinkSync(backupAppPath);
  console.log('✅ Original App.tsx restored');
}

// Step 6: Generate build report
console.log('\n📋 Step 6: Generating build report...');
const buildReport = {
  timestamp: new Date().toISOString(),
  buildType: 'production-minimal',
  features: {
    enabled: [
      'Waitlist System',
      'Authentication',
      'Basic Dashboard',
      'Firebase Integration',
      'Beta Testing Dashboard'
    ],
    disabled: [
      'Practice Planner',
      'Advanced Playbook Tooling',
      'Complex Analytics',
      'Legacy Subscription System',
      'Advanced Monitoring'
    ]
  },
  buildSize: getBuildSize(),
  recommendations: [
    'Deploy to production environment',
    'Monitor error rates and performance',
    'Gather customer feedback',
    'Plan feature additions based on demand'
  ]
};

fs.writeFileSync(
  path.join(__dirname, '../build-report.json'),
  JSON.stringify(buildReport, null, 2)
);

console.log('✅ Build report generated');

console.log('\n🎉 Production build completed successfully!');
console.log('\n📊 Build Summary:');
console.log(`   • Build Type: ${buildReport.buildType}`);
console.log(`   • Features Enabled: ${buildReport.features.enabled.length}`);
console.log(`   • Features Disabled: ${buildReport.features.disabled.length}`);
console.log(`   • Build Size: ${buildReport.buildSize}`);
console.log('\n🚀 Ready for deployment!');

function getBuildSize() {
  try {
    const distPath = path.join(__dirname, '../dist');
    if (!fs.existsSync(distPath)) {
      return 'Unknown';
    }
    
    const stats = fs.statSync(distPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    return `${sizeInMB} MB`;
  } catch (error) {
    return 'Unknown';
  }
}
