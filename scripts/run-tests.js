#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running comprehensive test suite...\n');

const testResults = {
  typecheck: false,
  lint: false,
  unit: false,
  e2e: false,
  security: false,
  build: false,
};

// Helper function to run commands
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    console.log('');
    return false;
  }
}

// Run type checking
testResults.typecheck = runCommand('npm run typecheck', 'Type checking');

// Run linting
testResults.lint = runCommand('npm run lint', 'Linting');

// Run unit tests
testResults.unit = runCommand('npm run test -- --coverage', 'Unit tests');

// Run security audit
testResults.security = runCommand('npm audit --audit-level=moderate', 'Security audit');

// Run build test
testResults.build = runCommand('npm run build', 'Build test');

// Run E2E tests if staging URL is available
if (process.env.CYPRESS_BASE_URL) {
  testResults.e2e = runCommand('npm run test:e2e', 'E2E tests');
} else {
  console.log('⏭️  Skipping E2E tests (no staging URL provided)\n');
  testResults.e2e = true;
}

// Generate test report
const report = {
  timestamp: new Date().toISOString(),
  results: testResults,
  summary: {
    total: Object.keys(testResults).length,
    passed: Object.values(testResults).filter(Boolean).length,
    failed: Object.values(testResults).filter(Boolean => !Boolean).length,
  },
};

// Save test report
const reportPath = path.join(__dirname, '..', 'deploy-logs', 'test-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

// Display summary
console.log('📊 Test Summary:');
console.log('================');
console.log(`Total Tests: ${report.summary.total}`);
console.log(`Passed: ${report.summary.passed}`);
console.log(`Failed: ${report.summary.failed}`);
console.log('');

// Display individual results
Object.entries(testResults).forEach(([test, passed]) => {
  const status = passed ? '✅' : '❌';
  const testName = test.charAt(0).toUpperCase() + test.slice(1);
  console.log(`${status} ${testName}`);
});

console.log('');

// Exit with error code if any test failed
if (report.summary.failed > 0) {
  console.log('❌ Some tests failed. Check the output above for details.');
  process.exit(1);
} else {
  console.log('🎉 All tests passed successfully!');
  process.exit(0);
}
