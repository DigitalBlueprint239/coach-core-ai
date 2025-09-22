#!/usr/bin/env node

/**
 * Firebase Security Migration Script
 * 
 * This script automates the migration from the current Firebase setup
 * to a secure, environment-based configuration.
 * 
 * Usage:
 *   node scripts/migrate-firebase-security.js [options]
 * 
 * Options:
 *   --environment=dev|staging|prod    Target environment
 *   --validate-only                   Only validate environment
 *   --generate-rules                  Generate security rules
 *   --deploy-rules                    Deploy security rules
 *   --update-code                     Update code imports
 *   --dry-run                         Show what would be done without making changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
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

function logStep(step, message) {
  log(`\n${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  environment: 'dev',
  validateOnly: false,
  generateRules: false,
  deployRules: false,
  updateCode: false,
  dryRun: false
};

args.forEach(arg => {
  if (arg.startsWith('--environment=')) {
    options.environment = arg.split('=')[1];
  } else if (arg === '--validate-only') {
    options.validateOnly = true;
  } else if (arg === '--generate-rules') {
    options.generateRules = true;
  } else if (arg === '--deploy-rules') {
    options.deployRules = true;
  } else if (arg === '--update-code') {
    options.updateCode = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  }
});

// Check if no specific action is specified
if (!options.validateOnly && !options.generateRules && !options.deployRules && !options.updateCode) {
  // Run all actions
  options.validateOnly = true;
  options.generateRules = true;
  options.deployRules = true;
  options.updateCode = true;
}

class FirebaseSecurityMigrator {
  constructor(options) {
    this.options = options;
    this.projectRoot = process.cwd();
    this.migrationLog = [];
  }

  async run() {
    log('🚀 Firebase Security Migration Script', 'bright');
    log(`Target Environment: ${options.environment}`, 'blue');
    log(`Dry Run: ${options.dryRun ? 'Yes' : 'No'}`, 'blue');

    try {
      if (options.validateOnly) {
        await this.validateEnvironment();
      }

      if (options.generateRules) {
        await this.generateSecurityRules();
      }

      if (options.deployRules) {
        await this.deploySecurityRules();
      }

      if (options.updateCode) {
        await this.updateCodeImports();
      }

      this.printSummary();
    } catch (error) {
      logError(`Migration failed: ${error.message}`);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    logStep(1, 'Validating Environment Configuration');

    // Check if .env.local exists
    const envFile = path.join(this.projectRoot, '.env.local');
    if (!fs.existsSync(envFile)) {
      logWarning('.env.local file not found');
      if (!this.options.dryRun) {
        await this.createEnvironmentFile();
      }
    } else {
      logSuccess('.env.local file found');
    }

    // Check required environment variables
    const requiredVars = [
      'REACT_APP_FIREBASE_API_KEY',
      'REACT_APP_FIREBASE_AUTH_DOMAIN',
      'REACT_APP_FIREBASE_PROJECT_ID',
      'REACT_APP_FIREBASE_STORAGE_BUCKET',
      'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
      'REACT_APP_FIREBASE_APP_ID',
      'REACT_APP_OPENAI_API_KEY',
      'REACT_APP_AI_PROXY_TOKEN'
    ];

    const missingVars = [];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      logError(`Missing required environment variables: ${missingVars.join(', ')}`);
      logInfo('Please set these variables in your .env.local file');
      throw new Error('Environment validation failed');
    }

    logSuccess('Environment validation passed');
    this.migrationLog.push('Environment validation completed');
  }

  async createEnvironmentFile() {
    logInfo('Creating .env.local file from template...');
    
    const envExample = path.join(this.projectRoot, 'env.example');
    const envLocal = path.join(this.projectRoot, '.env.local');
    
    if (fs.existsSync(envExample)) {
      fs.copyFileSync(envExample, envLocal);
      logSuccess('.env.local file created from template');
      logWarning('Please edit .env.local with your actual values');
    } else {
      throw new Error('env.example file not found');
    }
  }

  async generateSecurityRules() {
    logStep(2, 'Generating Security Rules');

    const rulesDir = path.join(this.projectRoot, 'src', 'utils');
    const generatorPath = path.join(rulesDir, 'securityRulesGenerator.ts');

    if (!fs.existsSync(generatorPath)) {
      logError('Security rules generator not found');
      throw new Error('Security rules generator missing');
    }

    // Generate rules for the target environment
    const config = {
      environment: options.environment === 'prod' ? 'production' : 
                  options.environment === 'staging' ? 'staging' : 'development',
      enableStrictMode: options.environment !== 'dev',
      enableRateLimiting: options.environment !== 'dev',
      enableAuditLogging: options.environment === 'prod'
    };

    if (!this.options.dryRun) {
      // Copy enhanced rules
      const firestoreRulesEnhanced = path.join(this.projectRoot, 'firestore.rules.enhanced');
      const firestoreRules = path.join(this.projectRoot, 'firestore.rules');
      
      if (fs.existsSync(firestoreRulesEnhanced)) {
        fs.copyFileSync(firestoreRulesEnhanced, firestoreRules);
        logSuccess('Firestore rules updated');
      }

      const storageRulesEnhanced = path.join(this.projectRoot, 'storage.rules.enhanced');
      const storageRules = path.join(this.projectRoot, 'storage.rules');
      
      if (fs.existsSync(storageRulesEnhanced)) {
        fs.copyFileSync(storageRulesEnhanced, storageRules);
        logSuccess('Storage rules updated');
      }
    }

    logSuccess('Security rules generated');
    this.migrationLog.push('Security rules generated');
  }

  async deploySecurityRules() {
    logStep(3, 'Deploying Security Rules');

    if (this.options.dryRun) {
      logInfo('Dry run: Would deploy security rules to Firebase');
      return;
    }

    try {
      // Check if Firebase CLI is installed
      execSync('firebase --version', { stdio: 'pipe' });
    } catch (error) {
      logError('Firebase CLI not found. Please install it first: npm install -g firebase-tools');
      throw new Error('Firebase CLI not available');
    }

    try {
      // Deploy Firestore rules
      logInfo('Deploying Firestore rules...');
      execSync('firebase deploy --only firestore:rules', { stdio: 'inherit' });
      logSuccess('Firestore rules deployed');

      // Deploy Storage rules
      logInfo('Deploying Storage rules...');
      execSync('firebase deploy --only storage', { stdio: 'inherit' });
      logSuccess('Storage rules deployed');

      this.migrationLog.push('Security rules deployed to Firebase');
    } catch (error) {
      logError('Failed to deploy security rules');
      throw error;
    }
  }

  async updateCodeImports() {
    logStep(4, 'Updating Code Imports');

    const filesToUpdate = [
      'src/services/firebase.ts',
      'src/services/firestore.ts',
      'src/components/FirebaseTest.tsx',
      'src/components/IntegrationTest.tsx'
    ];

    for (const filePath of filesToUpdate) {
      const fullPath = path.join(this.projectRoot, filePath);
      
      if (fs.existsSync(fullPath)) {
        if (!this.options.dryRun) {
          await this.updateFileImports(fullPath);
        } else {
          logInfo(`Dry run: Would update imports in ${filePath}`);
        }
      } else {
        logWarning(`File not found: ${filePath}`);
      }
    }

    logSuccess('Code imports updated');
    this.migrationLog.push('Code imports updated');
  }

  async updateFileImports(filePath) {
    logInfo(`Updating imports in ${path.relative(this.projectRoot, filePath)}`);

    let content = fs.readFileSync(filePath, 'utf8');

    // Replace old Firebase imports with secure imports
    const replacements = [
      {
        from: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]\.\/services\/firebase['"]/g,
        to: (match, imports) => {
          const importList = imports.split(',').map(imp => imp.trim());
          const secureImports = importList.map(imp => {
            if (imp === 'auth') return 'getSecureAuth';
            if (imp === 'db') return 'getSecureFirestore';
            if (imp === 'analytics') return 'getSecureAnalytics';
            if (imp === 'storage') return 'getSecureStorage';
            return imp;
          });
          return `import { ${secureImports.join(', ')} } from './services/firebase/secureFirebase'`;
        }
      },
      {
        from: /import\s*{\s*([^}]+)\s*}\s*from\s*['"]\.\.\/services\/firebase['"]/g,
        to: (match, imports) => {
          const importList = imports.split(',').map(imp => imp.trim());
          const secureImports = importList.map(imp => {
            if (imp === 'auth') return 'getSecureAuth';
            if (imp === 'db') return 'getSecureFirestore';
            if (imp === 'analytics') return 'getSecureAnalytics';
            if (imp === 'storage') return 'getSecureStorage';
            return imp;
          });
          return `import { ${secureImports.join(', ')} } from '../services/firebase/secureFirebase'`;
        }
      }
    ];

    for (const replacement of replacements) {
      content = content.replace(replacement.from, replacement.to);
    }

    // Add environment validation if not present
    if (!content.includes('validateEnvironment') && filePath.includes('.tsx')) {
      const validationImport = `import { validateEnvironment } from '../utils/environmentValidator';\n`;
      const validationCode = `
  // Validate environment on component mount
  useEffect(() => {
    const checkEnvironment = async () => {
      const validation = await validateEnvironment();
      if (!validation.isValid) {
        console.error('Environment validation failed:', validation.errors);
      }
    };
    checkEnvironment();
  }, []);`;

      // Add import at the top
      const importMatch = content.match(/import\s+React[^;]+;/);
      if (importMatch) {
        content = content.replace(importMatch[0], importMatch[0] + '\n' + validationImport);
      }

      // Add validation code in component
      const componentMatch = content.match(/(const\s+\w+\s*=\s*\(\)\s*=>\s*\{)/);
      if (componentMatch) {
        content = content.replace(componentMatch[0], componentMatch[0] + validationCode);
      }
    }

    fs.writeFileSync(filePath, content);
    logSuccess(`Updated ${path.relative(this.projectRoot, filePath)}`);
  }

  printSummary() {
    log('\n📋 Migration Summary', 'bright');
    log('==================', 'bright');

    if (this.migrationLog.length === 0) {
      logInfo('No actions performed');
      return;
    }

    for (const logEntry of this.migrationLog) {
      logSuccess(logEntry);
    }

    log('\n🎯 Next Steps', 'bright');
    log('============', 'bright');
    logInfo('1. Test your application with the new configuration');
    logInfo('2. Verify all Firebase operations work correctly');
    logInfo('3. Check Firebase Console for any security rule violations');
    logInfo('4. Update your CI/CD pipeline with new environment variables');
    logInfo('5. Document the changes for your team');

    if (this.options.dryRun) {
      logWarning('\nThis was a dry run. No actual changes were made.');
      logInfo('Run without --dry-run to apply the changes.');
    }

    log('\n🔒 Security Checklist', 'bright');
    log('==================', 'bright');
    logInfo('☐ Environment variables are set in .env.local');
    logInfo('☐ .env.local is in .gitignore');
    logInfo('☐ Security rules are deployed to Firebase');
    logInfo('☐ All hardcoded keys are removed from source code');
    logInfo('☐ Environment validation is working');
    logInfo('☐ CI/CD environment variables are configured');
  }
}

// Run the migration
async function main() {
  const migrator = new FirebaseSecurityMigrator(options);
  await migrator.run();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:');
  logError(promise);
  logError('reason:');
  logError(reason);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    logError(`Script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { FirebaseSecurityMigrator }; 