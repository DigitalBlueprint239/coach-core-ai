#!/usr/bin/env node

/**
 * CSP Violation Monitoring Dashboard
 * Analyzes CSP violation reports and provides actionable insights
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSP Monitoring Configuration
const MONITORING_CONFIG = {
  // Violation severity levels
  SEVERITY: {
    CRITICAL: 'critical',    // Blocked malicious content
    HIGH: 'high',           // Blocked legitimate external resources
    MEDIUM: 'medium',       // Inline scripts/styles
    LOW: 'low',             // Minor policy violations
    INFO: 'info'            // Informational only
  },
  
  // Common violation patterns
  PATTERNS: {
    INLINE_SCRIPT: /<script[^>]*>.*?<\/script>/gi,
    INLINE_STYLE: /<style[^>]*>.*?<\/style>/gi,
    EXTERNAL_SCRIPT: /https?:\/\/[^\/]+\/[^"'\s]*\.js/gi,
    EXTERNAL_STYLE: /https?:\/\/[^\/]+\/[^"'\s]*\.css/gi,
    DATA_URI: /data:[^;]+;base64,/gi,
    BLOB_URI: /blob:/gi
  },
  
  // Trusted domains (should be in CSP policy)
  TRUSTED_DOMAINS: [
    'www.gstatic.com',
    'www.googletagmanager.com',
    'www.google-analytics.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'sentry.io'
  ]
};

class CSPMonitor {
  constructor() {
    this.violations = [];
    this.summary = {
      total: 0,
      byDirective: {},
      bySeverity: {},
      byDomain: {},
      byType: {},
      timeline: []
    };
  }

  // Analyze violation severity
  analyzeSeverity(violation) {
    const { violatedDirective, blockedUri, sourceFile } = violation;
    
    // Critical: Blocked malicious content
    if (blockedUri && (
      blockedUri.includes('malicious') ||
      blockedUri.includes('evil') ||
      blockedUri.includes('hack') ||
      blockedUri.includes('exploit')
    )) {
      return MONITORING_CONFIG.SEVERITY.CRITICAL;
    }
    
    // High: Blocked legitimate external resources
    if (blockedUri && blockedUri.startsWith('http') && 
        !MONITORING_CONFIG.TRUSTED_DOMAINS.some(domain => blockedUri.includes(domain))) {
      return MONITORING_CONFIG.SEVERITY.HIGH;
    }
    
    // Medium: Inline content violations
    if (violatedDirective.includes('script-src') && sourceFile.includes('inline')) {
      return MONITORING_CONFIG.SEVERITY.MEDIUM;
    }
    
    if (violatedDirective.includes('style-src') && sourceFile.includes('inline')) {
      return MONITORING_CONFIG.SEVERITY.MEDIUM;
    }
    
    // Low: Minor policy violations
    if (violatedDirective.includes('img-src') && blockedUri.startsWith('data:')) {
      return MONITORING_CONFIG.SEVERITY.LOW;
    }
    
    return MONITORING_CONFIG.SEVERITY.INFO;
  }

  // Categorize violation type
  categorizeViolation(violation) {
    const { violatedDirective, blockedUri } = violation;
    
    if (violatedDirective.includes('script-src')) {
      if (blockedUri && blockedUri.startsWith('data:')) return 'inline-script';
      if (blockedUri && blockedUri.startsWith('http')) return 'external-script';
      return 'script-violation';
    }
    
    if (violatedDirective.includes('style-src')) {
      if (blockedUri && blockedUri.startsWith('data:')) return 'inline-style';
      if (blockedUri && blockedUri.startsWith('http')) return 'external-style';
      return 'style-violation';
    }
    
    if (violatedDirective.includes('img-src')) return 'image-violation';
    if (violatedDirective.includes('connect-src')) return 'connect-violation';
    if (violatedDirective.includes('font-src')) return 'font-violation';
    
    return 'other-violation';
  }

  // Extract domain from URI
  extractDomain(uri) {
    if (!uri || !uri.startsWith('http')) return 'unknown';
    try {
      return new URL(uri).hostname;
    } catch {
      return 'invalid-uri';
    }
  }

  // Process violation data
  processViolation(violation) {
    const severity = this.analyzeSeverity(violation);
    const type = this.categorizeViolation(violation);
    const domain = this.extractDomain(violation.blockedUri);
    
    const processedViolation = {
      ...violation,
      severity,
      type,
      domain,
      timestamp: new Date(violation.timestamp?.toDate?.() || violation.timestamp)
    };
    
    this.violations.push(processedViolation);
    return processedViolation;
  }

  // Generate summary statistics
  generateSummary() {
    this.summary.total = this.violations.length;
    
    // Group by directive
    this.violations.forEach(v => {
      const directive = v.violatedDirective || 'unknown';
      this.summary.byDirective[directive] = (this.summary.byDirective[directive] || 0) + 1;
    });
    
    // Group by severity
    this.violations.forEach(v => {
      const severity = v.severity || 'unknown';
      this.summary.bySeverity[severity] = (this.summary.bySeverity[severity] || 0) + 1;
    });
    
    // Group by domain
    this.violations.forEach(v => {
      const domain = v.domain || 'unknown';
      this.summary.byDomain[domain] = (this.summary.byDomain[domain] || 0) + 1;
    });
    
    // Group by type
    this.violations.forEach(v => {
      const type = v.type || 'unknown';
      this.summary.byType[type] = (this.summary.byType[type] || 0) + 1;
    });
    
    // Timeline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    this.summary.timeline = this.violations
      .filter(v => v.timestamp >= sevenDaysAgo)
      .reduce((acc, v) => {
        const date = v.timestamp.toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
  }

  // Generate actionable recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // High severity violations (external resources)
    const highSeverity = this.violations.filter(v => v.severity === MONITORING_CONFIG.SEVERITY.HIGH);
    if (highSeverity.length > 0) {
      const domains = [...new Set(highSeverity.map(v => v.domain))];
      recommendations.push({
        priority: 'HIGH',
        type: 'ADD_DOMAINS',
        message: `Add ${domains.length} external domains to CSP policy`,
        domains: domains,
        action: `Add to appropriate directive: ${domains.join(', ')}`
      });
    }
    
    // Medium severity violations (inline content)
    const mediumSeverity = this.violations.filter(v => v.severity === MONITORING_CONFIG.SEVERITY.MEDIUM);
    if (mediumSeverity.length > 0) {
      const inlineScripts = mediumSeverity.filter(v => v.type.includes('script')).length;
      const inlineStyles = mediumSeverity.filter(v => v.type.includes('style')).length;
      
      if (inlineScripts > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'REFACTOR_INLINE_SCRIPTS',
          message: `Refactor ${inlineScripts} inline scripts to external files`,
          action: 'Move inline scripts to external .js files or add nonces'
        });
      }
      
      if (inlineStyles > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          type: 'REFACTOR_INLINE_STYLES',
          message: `Refactor ${inlineStyles} inline styles to external files`,
          action: 'Move inline styles to external .css files or add nonces'
        });
      }
    }
    
    // Low severity violations (data URIs)
    const lowSeverity = this.violations.filter(v => v.severity === MONITORING_CONFIG.SEVERITY.LOW);
    if (lowSeverity.length > 0) {
      recommendations.push({
        priority: 'LOW',
        type: 'ALLOW_DATA_URIS',
        message: `Consider allowing data: URIs for ${lowSeverity.length} violations`,
        action: 'Add "data:" to appropriate directives if needed'
      });
    }
    
    return recommendations;
  }

  // Generate monitoring report
  generateReport() {
    this.generateSummary();
    const recommendations = this.generateRecommendations();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.summary,
      recommendations,
      violations: this.violations.slice(-50), // Last 50 violations
      readiness: this.assessEnforcementReadiness()
    };
    
    return report;
  }

  // Assess readiness for CSP enforcement
  assessEnforcementReadiness() {
    const critical = this.summary.bySeverity[MONITORING_CONFIG.SEVERITY.CRITICAL] || 0;
    const high = this.summary.bySeverity[MONITORING_CONFIG.SEVERITY.HIGH] || 0;
    const medium = this.summary.bySeverity[MONITORING_CONFIG.SEVERITY.MEDIUM] || 0;
    
    if (critical > 0) {
      return {
        status: 'NOT_READY',
        reason: 'Critical violations detected',
        action: 'Investigate and fix critical violations immediately'
      };
    }
    
    if (high > 10) {
      return {
        status: 'NOT_READY',
        reason: 'Too many high-severity violations',
        action: 'Fix external resource violations before enforcement'
      };
    }
    
    if (medium > 50) {
      return {
        status: 'CAUTION',
        reason: 'Many inline content violations',
        action: 'Consider refactoring inline content or adding nonces'
      };
    }
    
    return {
      status: 'READY',
      reason: 'Violation levels are acceptable',
      action: 'Safe to enable CSP enforcement'
    };
  }

  // Display formatted report
  displayReport(report) {
    console.log('\n🔒 CSP VIOLATION MONITORING REPORT');
    console.log('=====================================\n');
    
    console.log(`📊 SUMMARY (${report.summary.total} total violations)`);
    console.log('-------------------------------------');
    console.log(`Critical: ${report.summary.bySeverity.critical || 0}`);
    console.log(`High:     ${report.summary.bySeverity.high || 0}`);
    console.log(`Medium:   ${report.summary.bySeverity.medium || 0}`);
    console.log(`Low:      ${report.summary.bySeverity.low || 0}`);
    console.log(`Info:     ${report.summary.bySeverity.info || 0}\n`);
    
    console.log('📈 TOP VIOLATIONS BY DIRECTIVE');
    console.log('--------------------------------');
    Object.entries(report.summary.byDirective)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([directive, count]) => {
        console.log(`${directive}: ${count}`);
      });
    
    console.log('\n🌐 TOP BLOCKED DOMAINS');
    console.log('----------------------');
    Object.entries(report.summary.byDomain)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([domain, count]) => {
        console.log(`${domain}: ${count}`);
      });
    
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('------------------');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
      console.log(`   Action: ${rec.action}\n`);
    });
    
    console.log('🚦 ENFORCEMENT READINESS');
    console.log('------------------------');
    console.log(`Status: ${report.readiness.status}`);
    console.log(`Reason: ${report.readiness.reason}`);
    console.log(`Action: ${report.readiness.action}\n`);
  }

  // Save report to file
  saveReport(report, filename = 'csp-monitoring-report.json') {
    const reportPath = path.join(__dirname, '..', 'reports', filename);
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const monitor = new CSPMonitor();
  
  console.log('🔍 CSP Violation Monitor');
  console.log('========================\n');
  
  // In a real implementation, this would fetch from Firestore
  // For now, we'll create a sample report
  console.log('📊 Generating monitoring report...');
  
  const report = monitor.generateReport();
  monitor.displayReport(report);
  monitor.saveReport(report);
  
  console.log('\n✅ Monitoring complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default CSPMonitor;









