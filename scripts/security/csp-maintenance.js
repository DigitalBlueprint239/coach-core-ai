#!/usr/bin/env node

/**
 * CSP Policy Maintenance Script
 * Automated tools for maintaining and updating CSP policies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSPMaintenance {
  constructor() {
    this.firebaseConfigs = ['firebase.json', 'firebase.production.json'];
    this.cspDirectives = [
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'object-src',
      'base-uri',
      'form-action',
      'frame-ancestors'
    ];
  }

  // Parse CSP policy from header
  parseCSPPolicy(cspHeader) {
    if (!cspHeader) return {};
    
    const directives = {};
    const parts = cspHeader.split(';');
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;
      
      const [directive, ...values] = trimmed.split(' ');
      if (directive && values.length > 0) {
        directives[directive] = values;
      }
    });
    
    return directives;
  }

  // Generate CSP policy from configuration
  generateCSPPolicy(config) {
    const {
      defaultSrc = "'self'",
      scriptSrc = "'self' 'wasm-unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com",
      styleSrc = "'self' 'unsafe-inline'",
      imgSrc = "'self' data: https:",
      fontSrc = "'self' data:",
      connectSrc = "'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://sentry.io https://www.google-analytics.com",
      objectSrc = "'none'",
      baseUri = "'self'",
      formAction = "'self'",
      frameAncestors = "'none'",
      upgradeInsecureRequests = true,
      reportUri = '/csp-report'
    } = config;
    
    let policy = `default-src ${defaultSrc}; `;
    policy += `script-src ${scriptSrc}; `;
    policy += `style-src ${styleSrc}; `;
    policy += `img-src ${imgSrc}; `;
    policy += `font-src ${fontSrc}; `;
    policy += `connect-src ${connectSrc}; `;
    policy += `object-src ${objectSrc}; `;
    policy += `base-uri ${baseUri}; `;
    policy += `form-action ${formAction}; `;
    policy += `frame-ancestors ${frameAncestors}`;
    
    if (upgradeInsecureRequests) {
      policy += '; upgrade-insecure-requests';
    }
    
    if (reportUri) {
      policy += `; report-uri ${reportUri}`;
    }
    
    return policy;
  }

  // Add domain to CSP directive
  addDomainToDirective(policy, directive, domain) {
    const parsed = this.parseCSPPolicy(policy);
    
    if (!parsed[directive]) {
      parsed[directive] = ["'self'"];
    }
    
    if (!parsed[directive].includes(domain)) {
      parsed[directive].push(domain);
    }
    
    return this.generateCSPPolicy(parsed);
  }

  // Remove domain from CSP directive
  removeDomainFromDirective(policy, directive, domain) {
    const parsed = this.parseCSPPolicy(policy);
    
    if (parsed[directive]) {
      parsed[directive] = parsed[directive].filter(d => d !== domain);
    }
    
    return this.generateCSPPolicy(parsed);
  }

  // Update CSP policy in Firebase config
  updateCSPPolicy(configPath, newPolicy, mode = 'report-only') {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (!config.hosting || !config.hosting.headers) {
        console.error('❌ No hosting headers found in config');
        return false;
      }
      
      // Find the global headers section
      const globalHeaders = config.hosting.headers.find(h => h.source === '**');
      if (!globalHeaders) {
        console.error('❌ No global headers section found');
        return false;
      }
      
      // Update CSP header
      const cspHeader = globalHeaders.headers.find(h => 
        h.key === 'Content-Security-Policy-Report-Only' || 
        h.key === 'Content-Security-Policy'
      );
      
      if (cspHeader) {
        cspHeader.value = newPolicy;
        if (mode === 'enforcement') {
          cspHeader.key = 'Content-Security-Policy';
        } else {
          cspHeader.key = 'Content-Security-Policy-Report-Only';
        }
      } else {
        // Add new CSP header
        globalHeaders.headers.push({
          key: mode === 'enforcement' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only',
          value: newPolicy
        });
      }
      
      // Write updated config
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`✅ Updated CSP policy in ${configPath}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Error updating ${configPath}:`, error.message);
      return false;
    }
  }

  // Validate CSP policy
  validateCSPPolicy(policy) {
    const issues = [];
    
    // Check for required directives
    const requiredDirectives = ['default-src', 'script-src', 'style-src', 'img-src'];
    requiredDirectives.forEach(directive => {
      if (!policy.includes(`${directive} `)) {
        issues.push(`Missing required directive: ${directive}`);
      }
    });
    
    // Check for dangerous patterns
    if (policy.includes("'unsafe-eval'") && !policy.includes("'wasm-unsafe-eval'")) {
      issues.push("Consider using 'wasm-unsafe-eval' instead of 'unsafe-eval'");
    }
    
    if (policy.includes("'unsafe-inline'") && policy.includes('script-src')) {
      issues.push("'unsafe-inline' in script-src reduces security - consider using nonces");
    }
    
    if (policy.includes("'unsafe-inline'") && policy.includes('style-src')) {
      issues.push("'unsafe-inline' in style-src reduces security - consider using nonces");
    }
    
    // Check for missing security directives
    if (!policy.includes("object-src 'none'")) {
      issues.push("Consider adding object-src 'none' for better security");
    }
    
    if (!policy.includes("base-uri 'self'")) {
      issues.push("Consider adding base-uri 'self' for better security");
    }
    
    if (!policy.includes("frame-ancestors 'none'")) {
      issues.push("Consider adding frame-ancestors 'none' for clickjacking protection");
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  // Generate CSP policy recommendations
  generateRecommendations(violations) {
    const recommendations = [];
    
    // Group violations by type
    const violationsByType = violations.reduce((acc, v) => {
      const type = v.type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(v);
      return acc;
    }, {});
    
    // Generate recommendations based on violation types
    Object.entries(violationsByType).forEach(([type, typeViolations]) => {
      switch (type) {
        case 'external-script':
          const scriptDomains = [...new Set(typeViolations.map(v => v.domain))];
          recommendations.push({
            type: 'add-domains',
            directive: 'script-src',
            domains: scriptDomains,
            message: `Add ${scriptDomains.length} domains to script-src`,
            action: `Add to script-src: ${scriptDomains.join(' ')}`
          });
          break;
          
        case 'external-style':
          const styleDomains = [...new Set(typeViolations.map(v => v.domain))];
          recommendations.push({
            type: 'add-domains',
            directive: 'style-src',
            domains: styleDomains,
            message: `Add ${styleDomains.length} domains to style-src`,
            action: `Add to style-src: ${styleDomains.join(' ')}`
          });
          break;
          
        case 'inline-script':
          recommendations.push({
            type: 'refactor',
            directive: 'script-src',
            message: 'Refactor inline scripts to external files',
            action: 'Move inline scripts to external .js files or add nonces'
          });
          break;
          
        case 'inline-style':
          recommendations.push({
            type: 'refactor',
            directive: 'style-src',
            message: 'Refactor inline styles to external files',
            action: 'Move inline styles to external .css files or add nonces'
          });
          break;
      }
    });
    
    return recommendations;
  }

  // Apply recommendations to CSP policy
  applyRecommendations(policy, recommendations) {
    let updatedPolicy = policy;
    
    recommendations.forEach(rec => {
      if (rec.type === 'add-domains') {
        rec.domains.forEach(domain => {
          updatedPolicy = this.addDomainToDirective(updatedPolicy, rec.directive, domain);
        });
      }
    });
    
    return updatedPolicy;
  }

  // Generate maintenance report
  generateMaintenanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configs: [],
      recommendations: [],
      nextActions: []
    };
    
    // Analyze each Firebase config
    this.firebaseConfigs.forEach(configPath => {
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          const globalHeaders = config.hosting?.headers?.find(h => h.source === '**');
          const cspHeader = globalHeaders?.headers?.find(h => 
            h.key.includes('Content-Security-Policy')
          );
          
          if (cspHeader) {
            const validation = this.validateCSPPolicy(cspHeader.value);
            report.configs.push({
              file: configPath,
              mode: cspHeader.key.includes('Report-Only') ? 'report-only' : 'enforcement',
              policy: cspHeader.value,
              validation
            });
          }
        } catch (error) {
          console.error(`Error analyzing ${configPath}:`, error.message);
        }
      }
    });
    
    return report;
  }

  // Display maintenance report
  displayReport(report) {
    console.log('\n🔧 CSP MAINTENANCE REPORT');
    console.log('==========================\n');
    
    report.configs.forEach(config => {
      console.log(`📁 ${config.file}`);
      console.log(`   Mode: ${config.mode}`);
      console.log(`   Valid: ${config.validation.valid ? '✅' : '❌'}`);
      
      if (!config.validation.valid) {
        console.log('   Issues:');
        config.validation.issues.forEach(issue => {
          console.log(`     • ${issue}`);
        });
      }
      console.log('');
    });
  }

  // Save maintenance report
  saveReport(report) {
    const reportPath = path.join(__dirname, '..', 'reports', 'csp-maintenance-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Maintenance report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const maintenance = new CSPMaintenance();
  const report = maintenance.generateMaintenanceReport();
  
  maintenance.displayReport(report);
  maintenance.saveReport(report);
  
  console.log('\n✅ CSP maintenance analysis complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CSPMaintenance;









