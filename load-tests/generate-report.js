#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load test results analysis and reporting
class LoadTestReportGenerator {
  constructor() {
    this.reportData = {
      timestamp: new Date().toISOString(),
      testScenarios: [],
      bottlenecks: [],
      recommendations: [],
      metrics: {},
      summary: {}
    };
  }

  // Analyze k6 JSON output and generate report
  generateReport(jsonOutputPath) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
      this.analyzeMetrics(jsonData);
      this.identifyBottlenecks(jsonData);
      this.generateRecommendations();
      this.generateSummary();
      
      const report = this.formatReport();
      this.saveReport(report);
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      return null;
    }
  }

  // Analyze k6 metrics
  analyzeMetrics(data) {
    const metrics = data.metrics;
    
    this.reportData.metrics = {
      // HTTP metrics
      httpRequests: {
        total: metrics.http_reqs?.values?.count || 0,
        rate: metrics.http_reqs?.values?.rate || 0,
        duration: {
          avg: metrics.http_req_duration?.values?.avg || 0,
          p95: metrics.http_req_duration?.values?.['p(95)'] || 0,
          p99: metrics.http_req_duration?.values?.['p(99)'] || 0,
          max: metrics.http_req_duration?.values?.max || 0
        },
        failed: {
          count: metrics.http_req_failed?.values?.count || 0,
          rate: metrics.http_req_failed?.values?.rate || 0
        }
      },
      
      // Custom metrics
      firestoreRead: {
        avg: metrics.firestore_read_latency_ms?.values?.avg || 0,
        p95: metrics.firestore_read_latency_ms?.values?.['p(95)'] || 0,
        p99: metrics.firestore_read_latency_ms?.values?.['p(99)'] || 0,
        max: metrics.firestore_read_latency_ms?.values?.max || 0
      },
      
      firestoreWrite: {
        avg: metrics.firestore_write_latency_ms?.values?.avg || 0,
        p95: metrics.firestore_write_latency_ms?.values?.['p(95)'] || 0,
        p99: metrics.firestore_write_latency_ms?.values?.['p(99)'] || 0,
        max: metrics.firestore_write_latency_ms?.values?.max || 0
      },
      
      authLogin: {
        avg: metrics.auth_login_latency_ms?.values?.avg || 0,
        p95: metrics.auth_login_latency_ms?.values?.['p(95)'] || 0,
        p99: metrics.auth_login_latency_ms?.values?.['p(99)'] || 0,
        max: metrics.auth_login_latency_ms?.values?.max || 0
      },
      
      pageLoad: {
        avg: metrics.page_load_latency_ms?.values?.avg || 0,
        p95: metrics.page_load_latency_ms?.values?.['p(95)'] || 0,
        p99: metrics.page_load_latency_ms?.values?.['p(99)'] || 0,
        max: metrics.page_load_latency_ms?.values?.max || 0
      },
      
      // Error metrics
      errors: {
        response: metrics.response_errors_total?.values?.count || 0,
        firestore: metrics.firestore_errors_total?.values?.count || 0,
        auth: metrics.auth_errors_total?.values?.count || 0,
        timeout: metrics.timeout_errors_total?.values?.count || 0,
        rateLimit: metrics.rate_limit_errors_total?.values?.count || 0,
        database: metrics.database_errors_total?.values?.count || 0
      }
    };
  }

  // Identify performance bottlenecks
  identifyBottlenecks(data) {
    const metrics = this.reportData.metrics;
    const bottlenecks = [];

    // Firestore read bottlenecks
    if (metrics.firestoreRead.p95 > 1000) {
      bottlenecks.push({
        type: 'firestore_read',
        severity: metrics.firestoreRead.p95 > 2000 ? 'critical' : 'high',
        description: `Firestore read latency p95 is ${metrics.firestoreRead.p95}ms (threshold: 1000ms)`,
        impact: 'Slow data retrieval affects user experience',
        affectedUsers: Math.floor(metrics.httpRequests.total * 0.25) // Estimate 25% of requests
      });
    }

    // Firestore write bottlenecks
    if (metrics.firestoreWrite.p95 > 2000) {
      bottlenecks.push({
        type: 'firestore_write',
        severity: metrics.firestoreWrite.p95 > 5000 ? 'critical' : 'high',
        description: `Firestore write latency p95 is ${metrics.firestoreWrite.p95}ms (threshold: 2000ms)`,
        impact: 'Slow data persistence affects user interactions',
        affectedUsers: Math.floor(metrics.httpRequests.total * 0.20) // Estimate 20% of requests
      });
    }

    // Auth login bottlenecks
    if (metrics.authLogin.p95 > 3000) {
      bottlenecks.push({
        type: 'auth_login',
        severity: metrics.authLogin.p95 > 8000 ? 'critical' : 'high',
        description: `Auth login latency p95 is ${metrics.authLogin.p95}ms (threshold: 3000ms)`,
        impact: 'Slow authentication affects user onboarding',
        affectedUsers: Math.floor(metrics.httpRequests.total * 0.15) // Estimate 15% of requests
      });
    }

    // Page load bottlenecks
    if (metrics.pageLoad.p95 > 2000) {
      bottlenecks.push({
        type: 'page_load',
        severity: metrics.pageLoad.p95 > 5000 ? 'critical' : 'high',
        description: `Page load latency p95 is ${metrics.pageLoad.p95}ms (threshold: 2000ms)`,
        impact: 'Slow page loads affect user experience and SEO',
        affectedUsers: Math.floor(metrics.httpRequests.total * 0.30) // Estimate 30% of requests
      });
    }

    // Error rate bottlenecks
    const errorRate = metrics.httpRequests.failed.rate;
    if (errorRate > 0.05) {
      bottlenecks.push({
        type: 'error_rate',
        severity: errorRate > 0.10 ? 'critical' : 'high',
        description: `HTTP error rate is ${(errorRate * 100).toFixed(2)}% (threshold: 5%)`,
        impact: 'High error rate affects system reliability',
        affectedUsers: Math.floor(metrics.httpRequests.total * errorRate)
      });
    }

    this.reportData.bottlenecks = bottlenecks;
  }

  // Generate scaling recommendations
  generateRecommendations() {
    const recommendations = [];
    const bottlenecks = this.reportData.bottlenecks;

    // Firestore recommendations
    const firestoreBottlenecks = bottlenecks.filter(b => b.type.includes('firestore'));
    if (firestoreBottlenecks.length > 0) {
      recommendations.push({
        category: 'Database',
        priority: 'high',
        title: 'Optimize Firestore Performance',
        description: 'Implement Firestore performance optimizations',
        actions: [
          'Enable Firestore offline persistence for better caching',
          'Implement query optimization and indexing',
          'Use Firestore batch operations for multiple writes',
          'Consider Firestore regional deployment for lower latency',
          'Implement connection pooling for Firestore client',
          'Add Firestore query result caching with Redis'
        ],
        estimatedImpact: 'Reduce Firestore latency by 40-60%',
        implementationEffort: 'Medium (2-3 weeks)',
        cost: 'Low to Medium'
      });
    }

    // Authentication recommendations
    const authBottlenecks = bottlenecks.filter(b => b.type === 'auth_login');
    if (authBottlenecks.length > 0) {
      recommendations.push({
        category: 'Authentication',
        priority: 'high',
        title: 'Optimize Authentication Flow',
        description: 'Improve authentication performance and reliability',
        actions: [
          'Implement JWT token caching to reduce auth calls',
          'Add authentication rate limiting and circuit breakers',
          'Use Firebase Auth emulator for development testing',
          'Implement session management and token refresh',
          'Add authentication monitoring and alerting',
          'Consider OAuth provider optimization'
        ],
        estimatedImpact: 'Reduce auth latency by 30-50%',
        implementationEffort: 'Medium (1-2 weeks)',
        cost: 'Low'
      });
    }

    // Page load recommendations
    const pageLoadBottlenecks = bottlenecks.filter(b => b.type === 'page_load');
    if (pageLoadBottlenecks.length > 0) {
      recommendations.push({
        category: 'Frontend',
        priority: 'high',
        title: 'Optimize Page Load Performance',
        description: 'Improve frontend performance and loading times',
        actions: [
          'Implement code splitting and lazy loading',
          'Add CDN for static assets (images, CSS, JS)',
          'Enable gzip/brotli compression',
          'Implement service worker for caching',
          'Optimize images (WebP, AVIF formats)',
          'Add preloading for critical resources'
        ],
        estimatedImpact: 'Reduce page load time by 50-70%',
        implementationEffort: 'High (3-4 weeks)',
        cost: 'Medium'
      });
    }

    // Infrastructure recommendations
    recommendations.push({
      category: 'Infrastructure',
      priority: 'medium',
      title: 'Scale Infrastructure',
      description: 'Scale infrastructure to handle increased load',
      actions: [
        'Implement horizontal scaling for API servers',
        'Add load balancers with health checks',
        'Implement auto-scaling based on CPU/memory usage',
        'Add database read replicas for read-heavy operations',
        'Implement caching layer (Redis) for frequently accessed data',
        'Add monitoring and alerting for performance metrics'
      ],
      estimatedImpact: 'Support 2-3x current load',
      implementationEffort: 'High (4-6 weeks)',
      cost: 'High'
    });

    // Error handling recommendations
    const errorBottlenecks = bottlenecks.filter(b => b.type === 'error_rate');
    if (errorBottlenecks.length > 0) {
      recommendations.push({
        category: 'Reliability',
        priority: 'critical',
        title: 'Improve Error Handling and Resilience',
        description: 'Implement better error handling and system resilience',
        actions: [
          'Add circuit breakers for external service calls',
          'Implement retry logic with exponential backoff',
          'Add comprehensive error logging and monitoring',
          'Implement graceful degradation for non-critical features',
          'Add health checks and automated recovery',
          'Implement rate limiting and request queuing'
        ],
        estimatedImpact: 'Reduce error rate by 80-90%',
        implementationEffort: 'Medium (2-3 weeks)',
        cost: 'Low to Medium'
      });
    }

    this.reportData.recommendations = recommendations;
  }

  // Generate summary
  generateSummary() {
    const metrics = this.reportData.metrics;
    const bottlenecks = this.reportData.bottlenecks;
    const recommendations = this.reportData.recommendations;

    this.reportData.summary = {
      totalRequests: metrics.httpRequests.total,
      averageResponseTime: metrics.httpRequests.duration.avg,
      errorRate: metrics.httpRequests.failed.rate,
      bottlenecksFound: bottlenecks.length,
      criticalBottlenecks: bottlenecks.filter(b => b.severity === 'critical').length,
      recommendationsGenerated: recommendations.length,
      overallHealth: this.calculateOverallHealth(),
      performanceGrade: this.calculatePerformanceGrade()
    };
  }

  // Calculate overall system health
  calculateOverallHealth() {
    const metrics = this.reportData.metrics;
    const bottlenecks = this.reportData.bottlenecks;
    
    let healthScore = 100;
    
    // Deduct points for bottlenecks
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.severity === 'critical') {
        healthScore -= 30;
      } else if (bottleneck.severity === 'high') {
        healthScore -= 20;
      } else {
        healthScore -= 10;
      }
    });
    
    // Deduct points for high error rate
    if (metrics.httpRequests.failed.rate > 0.05) {
      healthScore -= 25;
    }
    
    return Math.max(0, healthScore);
  }

  // Calculate performance grade
  calculatePerformanceGrade() {
    const healthScore = this.reportData.summary.overallHealth;
    
    if (healthScore >= 90) return 'A';
    if (healthScore >= 80) return 'B';
    if (healthScore >= 70) return 'C';
    if (healthScore >= 60) return 'D';
    return 'F';
  }

  // Format the report
  formatReport() {
    const { summary, metrics, bottlenecks, recommendations } = this.reportData;
    
    return `
# 📊 K6 Load Testing Report

**Generated:** ${new Date(this.reportData.timestamp).toLocaleString()}
**Test Target:** https://coach-core-ai-staging.web.app

## 📈 Executive Summary

- **Overall Health:** ${summary.overallHealth}/100 (Grade: ${summary.performanceGrade})
- **Total Requests:** ${summary.totalRequests.toLocaleString()}
- **Average Response Time:** ${metrics.httpRequests.duration.avg.toFixed(2)}ms
- **Error Rate:** ${(summary.errorRate * 100).toFixed(2)}%
- **Bottlenecks Found:** ${summary.bottlenecksFound}
- **Critical Issues:** ${summary.criticalBottlenecks}

## 🚨 Performance Bottlenecks

${bottlenecks.length === 0 ? '✅ No significant bottlenecks detected' : bottlenecks.map(bottleneck => `
### ${bottleneck.type.toUpperCase()} - ${bottleneck.severity.toUpperCase()}

- **Description:** ${bottleneck.description}
- **Impact:** ${bottleneck.impact}
- **Affected Users:** ${bottleneck.affectedUsers.toLocaleString()}
`).join('')}

## 📊 Detailed Metrics

### HTTP Performance
- **Total Requests:** ${metrics.httpRequests.total.toLocaleString()}
- **Request Rate:** ${metrics.httpRequests.rate.toFixed(2)} req/s
- **Average Duration:** ${metrics.httpRequests.duration.avg.toFixed(2)}ms
- **95th Percentile:** ${metrics.httpRequests.duration.p95.toFixed(2)}ms
- **99th Percentile:** ${metrics.httpRequests.duration.p99.toFixed(2)}ms
- **Max Duration:** ${metrics.httpRequests.duration.max.toFixed(2)}ms
- **Failed Requests:** ${metrics.httpRequests.failed.count.toLocaleString()}
- **Error Rate:** ${(metrics.httpRequests.failed.rate * 100).toFixed(2)}%

### Firestore Performance
- **Read Latency (avg):** ${metrics.firestoreRead.avg.toFixed(2)}ms
- **Read Latency (p95):** ${metrics.firestoreRead.p95.toFixed(2)}ms
- **Read Latency (p99):** ${metrics.firestoreRead.p99.toFixed(2)}ms
- **Write Latency (avg):** ${metrics.firestoreWrite.avg.toFixed(2)}ms
- **Write Latency (p95):** ${metrics.firestoreWrite.p95.toFixed(2)}ms
- **Write Latency (p99):** ${metrics.firestoreWrite.p99.toFixed(2)}ms

### Authentication Performance
- **Login Latency (avg):** ${metrics.authLogin.avg.toFixed(2)}ms
- **Login Latency (p95):** ${metrics.authLogin.p95.toFixed(2)}ms
- **Login Latency (p99):** ${metrics.authLogin.p99.toFixed(2)}ms

### Page Load Performance
- **Load Time (avg):** ${metrics.pageLoad.avg.toFixed(2)}ms
- **Load Time (p95):** ${metrics.pageLoad.p95.toFixed(2)}ms
- **Load Time (p99):** ${metrics.pageLoad.p99.toFixed(2)}ms

### Error Analysis
- **Response Errors:** ${metrics.errors.response.toLocaleString()}
- **Firestore Errors:** ${metrics.errors.firestore.toLocaleString()}
- **Auth Errors:** ${metrics.errors.auth.toLocaleString()}
- **Timeout Errors:** ${metrics.errors.timeout.toLocaleString()}
- **Rate Limit Errors:** ${metrics.errors.rateLimit.toLocaleString()}
- **Database Errors:** ${metrics.errors.database.toLocaleString()}

## 💡 Scaling Recommendations

${recommendations.map(rec => `
### ${rec.title} (${rec.priority.toUpperCase()})

**Category:** ${rec.category}
**Description:** ${rec.description}
**Estimated Impact:** ${rec.estimatedImpact}
**Implementation Effort:** ${rec.implementationEffort}
**Cost:** ${rec.cost}

**Actions:**
${rec.actions.map(action => `- ${action}`).join('\n')}
`).join('')}

## 🎯 Next Steps

1. **Immediate Actions (Next 1-2 weeks):**
   ${recommendations.filter(r => r.priority === 'critical').map(r => `- ${r.title}`).join('\n') || '- No critical issues requiring immediate attention'}

2. **Short-term Improvements (Next 1-2 months):**
   ${recommendations.filter(r => r.priority === 'high').map(r => `- ${r.title}`).join('\n') || '- No high-priority improvements identified'}

3. **Long-term Scaling (Next 3-6 months):**
   ${recommendations.filter(r => r.priority === 'medium').map(r => `- ${r.title}`).join('\n') || '- No medium-priority scaling needed'}

## 📋 Monitoring Recommendations

- Set up continuous monitoring for all identified bottlenecks
- Implement alerting for performance degradation
- Regular load testing (weekly/monthly)
- Performance regression testing in CI/CD pipeline
- User experience monitoring and real user metrics (RUM)

---
*Report generated by k6 Load Testing Analysis Tool*
`;
  }

  // Save report to file
  saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `load-test-report-${timestamp}.md`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, report);
    console.log(`📊 Report saved to: ${filepath}`);
    
    return filepath;
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonOutputPath = args[0] || 'k6-output.json';
  
  if (!fs.existsSync(jsonOutputPath)) {
    console.error(`❌ JSON output file not found: ${jsonOutputPath}`);
    console.log('Usage: node generate-report.js [path-to-k6-json-output]');
    process.exit(1);
  }
  
  const generator = new LoadTestReportGenerator();
  const report = generator.generateReport(jsonOutputPath);
  
  if (report) {
    console.log('✅ Load test report generated successfully');
  } else {
    console.error('❌ Failed to generate load test report');
    process.exit(1);
  }
}

module.exports = LoadTestReportGenerator;
