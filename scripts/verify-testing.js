#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Verification script for Coach Core AI testing implementation
 * Ensures all tests are properly configured and can run successfully
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`✅ ${description}: ${filePath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath} (missing)`, 'red');
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  const fullPath = path.join(process.cwd(), dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  
  if (exists) {
    log(`✅ ${description}: ${dirPath}`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${dirPath} (missing)`, 'red');
    return false;
  }
}

function checkPackageJsonScript(scriptName, description) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const exists = packageJson.scripts && packageJson.scripts[scriptName];
    
    if (exists) {
      log(`✅ ${description}: ${scriptName}`, 'green');
      return true;
    } else {
      log(`❌ ${description}: ${scriptName} (missing)`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ ${description}: Could not read package.json`, 'red');
    return false;
  }
}

function checkTestFile(filePath, description) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`❌ ${description}: ${filePath} (missing)`, 'red');
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for basic test structure
  const hasDescribe = content.includes('describe(');
  const hasIt = content.includes('it(') || content.includes('test(');
  const hasExpect = content.includes('expect(');
  
  if (hasDescribe && hasIt && hasExpect) {
    log(`✅ ${description}: ${filePath} (valid test structure)`, 'green');
    return true;
  } else {
    log(`❌ ${description}: ${filePath} (invalid test structure)`, 'red');
    return false;
  }
}

function runQuickTest(command, description) {
  try {
    log(`\n${colors.cyan}🧪 ${description}${colors.reset}`);
    execSync(command, { stdio: 'pipe', cwd: process.cwd() });
    log(`✅ ${description} passed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, 'red');
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

function main() {
  log(`${colors.bright}${colors.blue}🔍 Coach Core AI Testing Verification${colors.reset}`);
  log(`${colors.blue}============================================${colors.reset}`);
  
  let allChecksPassed = true;
  
  // Check configuration files
  log(`\n${colors.cyan}📋 Configuration Files${colors.reset}`);
  allChecksPassed &= checkFileExists('vitest.config.ts', 'Vitest config');
  allChecksPassed &= checkFileExists('vitest.integration.config.ts', 'Vitest integration config');
  allChecksPassed &= checkFileExists('cypress.config.ts', 'Cypress config');
  allChecksPassed &= checkFileExists('src/test/setup.ts', 'Test setup file');
  
  // Check test directories
  log(`\n${colors.cyan}📁 Test Directories${colors.reset}`);
  allChecksPassed &= checkDirectoryExists('src/components/__tests__', 'Component tests directory');
  allChecksPassed &= checkDirectoryExists('src/services/__tests__', 'Service tests directory');
  allChecksPassed &= checkDirectoryExists('cypress/e2e', 'Cypress E2E tests directory');
  allChecksPassed &= checkDirectoryExists('cypress/support', 'Cypress support directory');
  allChecksPassed &= checkDirectoryExists('cypress/tasks', 'Cypress tasks directory');
  allChecksPassed &= checkDirectoryExists('cypress/plugins', 'Cypress plugins directory');
  
  // Check package.json scripts
  log(`\n${colors.cyan}📦 Package.json Scripts${colors.reset}`);
  allChecksPassed &= checkPackageJsonScript('test', 'Basic test script');
  allChecksPassed &= checkPackageJsonScript('test:unit', 'Unit test script');
  allChecksPassed &= checkPackageJsonScript('test:integration', 'Integration test script');
  allChecksPassed &= checkPackageJsonScript('test:e2e', 'E2E test script');
  allChecksPassed &= checkPackageJsonScript('test:coverage', 'Coverage test script');
  allChecksPassed &= checkPackageJsonScript('test:full', 'Full test script');
  
  // Check test files
  log(`\n${colors.cyan}🧪 Test Files${colors.reset}`);
  allChecksPassed &= checkTestFile('src/components/__tests__/LandingPage.test.tsx', 'Landing page test');
  allChecksPassed &= checkTestFile('src/components/__tests__/WaitlistForm.test.tsx', 'Waitlist form test');
  allChecksPassed &= checkTestFile('src/components/__tests__/LoginPage.test.tsx', 'Login page test');
  allChecksPassed &= checkTestFile('src/services/__tests__/waitlist-service.test.ts', 'Waitlist service test');
  allChecksPassed &= checkTestFile('src/services/__tests__/auth-service.test.ts', 'Auth service test');
  allChecksPassed &= checkTestFile('src/services/__tests__/subscription-service.test.ts', 'Subscription service test');
  allChecksPassed &= checkTestFile('src/services/__tests__/firebase-integration.test.ts', 'Firebase integration test');
  
  // Check Cypress test files
  allChecksPassed &= checkTestFile('cypress/e2e/authentication.cy.ts', 'Authentication E2E test');
  allChecksPassed &= checkTestFile('cypress/e2e/subscription.cy.ts', 'Subscription E2E test');
  allChecksPassed &= checkTestFile('cypress/e2e/access-control.cy.ts', 'Access control E2E test');
  allChecksPassed &= checkTestFile('cypress/e2e/waitlist-form.cy.ts', 'Waitlist form E2E test');
  allChecksPassed &= checkTestFile('cypress/e2e/main-app-flow.cy.ts', 'Main app flow E2E test');
  
  // Check utility files
  log(`\n${colors.cyan}🛠️  Utility Files${colors.reset}`);
  allChecksPassed &= checkFileExists('src/test/helpers/test-utils.tsx', 'Test utilities');
  allChecksPassed &= checkFileExists('scripts/run-tests.js', 'Test runner script');
  allChecksPassed &= checkFileExists('scripts/combine-coverage.js', 'Coverage combination script');
  allChecksPassed &= checkFileExists('docs/TESTING_GUIDE.md', 'Testing documentation');
  
  // Check GitHub Actions workflows
  log(`\n${colors.cyan}🚀 CI/CD Configuration${colors.reset}`);
  allChecksPassed &= checkFileExists('.github/workflows/ci-cd.yml', 'Main CI/CD workflow');
  allChecksPassed &= checkFileExists('.github/workflows/cypress-e2e.yml', 'Cypress E2E workflow');
  
  // Run quick tests
  log(`\n${colors.cyan}⚡ Quick Tests${colors.reset}`);
  allChecksPassed &= runQuickTest('npm run typecheck', 'TypeScript compilation');
  allChecksPassed &= runQuickTest('npm run lint', 'ESLint check');
  
  // Try to run unit tests (may fail if dependencies aren't installed)
  try {
    allChecksPassed &= runQuickTest('npm run test -- --run --reporter=verbose', 'Unit tests (dry run)');
  } catch (error) {
    log(`${colors.yellow}⚠️  Unit tests skipped (dependencies may not be installed)${colors.reset}`);
  }
  
  // Final results
  log(`\n${colors.blue}============================================${colors.reset}`);
  
  if (allChecksPassed) {
    log(`${colors.green}🎉 All verification checks passed!${colors.reset}`);
    log(`${colors.green}✅ Testing infrastructure is properly configured${colors.reset}`);
    log(`\n${colors.cyan}Next steps:${colors.reset}`);
    log(`1. Install dependencies: npm install`);
    log(`2. Run unit tests: npm run test:unit`);
    log(`3. Run integration tests: npm run test:integration`);
    log(`4. Run E2E tests: npm run test:e2e`);
    log(`5. Run full test suite: npm run test:full`);
    process.exit(0);
  } else {
    log(`${colors.red}💥 Some verification checks failed!${colors.reset}`);
    log(`${colors.red}Please fix the issues above before proceeding${colors.reset}`);
    process.exit(1);
  }
}

main().catch(error => {
  log(`${colors.red}💥 Verification failed: ${error.message}${colors.reset}`);
  process.exit(1);
});
