#!/usr/bin/env node

/**
 * Script to enable CSP enforcement mode
 * This script switches from Content-Security-Policy-Report-Only to Content-Security-Policy
 * Run this after monitoring CSP reports for violations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIREBASE_CONFIG_FILES = [
  'firebase.json',
  'firebase.production.json'
];

const CSP_POLICY = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://sentry.io https://www.google-analytics.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-report";

function enableCSPEnforcement() {
  console.log('🔒 Enabling CSP enforcement mode...\n');

  FIREBASE_CONFIG_FILES.forEach(configFile => {
    const filePath = path.join(process.cwd(), configFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${configFile} not found, skipping...`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Replace Content-Security-Policy-Report-Only with Content-Security-Policy
      content = content.replace(
        /"Content-Security-Policy-Report-Only"/g,
        '"Content-Security-Policy"'
      );

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${configFile} - CSP enforcement enabled`);
      } else {
        console.log(`ℹ️  ${configFile} - No changes needed`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${configFile}:`, error.message);
    }
  });

  console.log('\n🎯 Next steps:');
  console.log('1. Review CSP violation reports in Firestore (cspViolations collection)');
  console.log('2. Fix any legitimate violations before deploying');
  console.log('3. Deploy the updated configuration:');
  console.log('   - Staging: firebase deploy --config firebase.json');
  console.log('   - Production: firebase deploy --config firebase.production.json');
  console.log('4. Monitor for any new violations after deployment');
}

function disableCSPEnforcement() {
  console.log('🔓 Disabling CSP enforcement (switching to report-only mode)...\n');

  FIREBASE_CONFIG_FILES.forEach(configFile => {
    const filePath = path.join(process.cwd(), configFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  ${configFile} not found, skipping...`);
      return;
    }

    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Replace Content-Security-Policy with Content-Security-Policy-Report-Only
      content = content.replace(
        /"Content-Security-Policy"/g,
        '"Content-Security-Policy-Report-Only"'
      );

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated ${configFile} - CSP report-only mode enabled`);
      } else {
        console.log(`ℹ️  ${configFile} - No changes needed`);
      }
    } catch (error) {
      console.error(`❌ Error updating ${configFile}:`, error.message);
    }
  });

  console.log('\n🎯 CSP is now in report-only mode');
  console.log('Monitor violations and fix them before re-enabling enforcement');
}

// Command line argument handling
const command = process.argv[2];

switch (command) {
  case 'enable':
    enableCSPEnforcement();
    break;
  case 'disable':
    disableCSPEnforcement();
    break;
  default:
    console.log('🔒 CSP Enforcement Control Script');
    console.log('\nUsage:');
    console.log('  node scripts/security/enable-csp-enforcement.js enable   # Enable CSP enforcement');
    console.log('  node scripts/security/enable-csp-enforcement.js disable  # Switch to report-only mode');
    console.log('\nCurrent CSP Policy:');
    console.log(CSP_POLICY);
    break;
}
