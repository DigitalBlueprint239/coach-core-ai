# 🚀 Load Testing Guide - Coach Core AI

## Overview

This guide provides comprehensive load testing capabilities for the Coach Core AI application, testing both HTTP endpoints and Firebase operations under various load conditions.

## Test Scenarios

### 1. HTTP Load Testing (100, 500, 1000 concurrent users)

**Target:** Staging environment (`https://coach-core-ai-staging.web.app`)

**Scenarios:**
- **Landing Page Load** (30% weight)
- **Authentication Flow** (25% weight)
- **Waitlist Submission** (20% weight)
- **Dashboard Access** (15% weight)
- **API Endpoints** (10% weight)

**Metrics Measured:**
- Response times (average, p95, p99)
- Throughput (requests per second)
- Error rates
- HTTP status codes
- Connection times

### 2. Firebase Load Testing

**Operations Tested:**
- Firebase Authentication (sign up, sign in, sign out)
- Firestore writes (waitlist, teams, plays, user profiles)
- Firestore reads (queries with limits and filters)
- Error handling and retry logic

**Metrics Measured:**
- Operation success rates
- Operation response times
- Authentication performance
- Database connection stability
- Error patterns and types

## Running Load Tests

### Quick Start

```bash
# Run all load tests
npm run load-test:all

# Run specific test types
npm run load-test              # Custom Node.js tests
npm run load-test:firebase     # Firebase-specific tests
npm run load-test:artillery    # Artillery tests only
```

### Individual Test Commands

```bash
# Custom HTTP load testing
node load-tests/load-test.js

# Firebase operations testing
node load-tests/firebase-load-test.js

# Artillery configuration testing
artillery run load-tests/artillery-config.yml

# Comprehensive test suite
./load-tests/run-load-tests.sh
```

## Test Configuration

### Artillery Configuration

The Artillery configuration (`load-tests/artillery-config.yml`) includes:

- **Warm-up phase:** 30 seconds, 5 users/second
- **100 users load:** 2 minutes, 10 users/second
- **500 users load:** 5 minutes, 50 users/second
- **1000 users load:** 5 minutes, 100 users/second
- **Cool-down phase:** 1 minute, 5 users/second

### Custom Load Testing

The custom Node.js load tester (`load-tests/load-test.js`) provides:

- **Real-time metrics collection**
- **Performance bottleneck identification**
- **Automated recommendations**
- **Detailed reporting**

### Firebase Load Testing

The Firebase-specific tester (`load-tests/firebase-load-test.js`) includes:

- **Authentication flow testing**
- **Firestore read/write operations**
- **Error rate monitoring**
- **Performance analysis**

## Expected Results

### Performance Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **Response Time** | < 1s | 1s - 2s | > 2s |
| **Error Rate** | < 1% | 1% - 5% | > 5% |
| **Throughput** | > 100 req/s | 50-100 req/s | < 50 req/s |
| **Auth Success Rate** | > 98% | 95% - 98% | < 95% |
| **Firestore Write Time** | < 500ms | 500ms - 1s | > 1s |
| **Firestore Read Time** | < 300ms | 300ms - 500ms | > 500ms |

### Scaling Recommendations

Based on test results, the system will provide recommendations for:

1. **Performance Optimization**
   - CDN implementation
   - Image optimization
   - Code splitting
   - Caching strategies

2. **Database Optimization**
   - Firestore rule optimization
   - Query indexing
   - Connection pooling
   - Batch operations

3. **Infrastructure Scaling**
   - Server capacity planning
   - Load balancer configuration
   - Database scaling
   - CDN configuration

## Results Analysis

### Generated Reports

After running tests, the following files are generated in `./load-test-results/`:

- `artillery-results-{timestamp}.json` - Artillery test results
- `load-test-report-{timestamp}.json` - Custom load test results
- `firebase-load-test-report-{timestamp}.json` - Firebase operation results
- `lighthouse-{page}-{timestamp}.json` - Performance audit results
- `load-test-summary-{timestamp}.md` - Comprehensive summary report

### Key Metrics to Monitor

1. **Response Times**
   - Average response time
   - 95th percentile response time
   - 99th percentile response time
   - Maximum response time

2. **Error Rates**
   - Overall error rate
   - Error rate by endpoint
   - Error rate by user load
   - Error types and patterns

3. **Throughput**
   - Requests per second
   - Peak throughput
   - Sustained throughput
   - Throughput degradation

4. **Firebase Performance**
   - Authentication success rate
   - Firestore operation success rate
   - Operation response times
   - Connection stability

## Troubleshooting

### Common Issues

1. **High Response Times**
   - Check server resources
   - Review database queries
   - Implement caching
   - Optimize images and assets

2. **High Error Rates**
   - Check server logs
   - Review error handling
   - Verify database connections
   - Check rate limiting

3. **Firebase Errors**
   - Check Firebase quotas
   - Review security rules
   - Verify authentication configuration
   - Check network connectivity

### Performance Bottlenecks

The load testing suite automatically identifies:

- **Slow endpoints** (> 2s response time)
- **High error rate endpoints** (> 5% errors)
- **Database performance issues**
- **Authentication bottlenecks**
- **Resource constraints**

## Best Practices

### Before Running Tests

1. **Ensure staging environment is stable**
2. **Check Firebase quotas and limits**
3. **Verify all endpoints are accessible**
4. **Review test configuration**
5. **Monitor system resources**

### During Tests

1. **Monitor system resources**
2. **Watch for error patterns**
3. **Check database performance**
4. **Monitor network connectivity**
5. **Review logs for issues**

### After Tests

1. **Analyze detailed results**
2. **Identify performance bottlenecks**
3. **Implement recommended optimizations**
4. **Re-run tests to validate improvements**
5. **Document findings and actions**

## Continuous Monitoring

### Regular Testing Schedule

- **Daily:** Basic connectivity tests
- **Weekly:** Performance regression tests
- **Monthly:** Full load testing suite
- **Before releases:** Comprehensive testing

### Monitoring Integration

The load testing results can be integrated with:

- **Performance monitoring dashboards**
- **Alerting systems**
- **CI/CD pipelines**
- **Quality gates**

## Advanced Configuration

### Custom Test Scenarios

To create custom test scenarios:

1. **Modify Artillery configuration** (`artillery-config.yml`)
2. **Update custom load tester** (`load-test.js`)
3. **Adjust Firebase test parameters** (`firebase-load-test.js`)
4. **Configure test runner** (`run-load-tests.sh`)

### Environment Variables

Set the following environment variables for Firebase testing:

```bash
export FIREBASE_API_KEY="your-api-key"
export FIREBASE_AUTH_DOMAIN="your-auth-domain"
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_STORAGE_BUCKET="your-storage-bucket"
export FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
export FIREBASE_APP_ID="your-app-id"
```

## Support

For issues or questions regarding load testing:

1. **Check the generated reports** for detailed error information
2. **Review the troubleshooting section** for common issues
3. **Examine system logs** for additional context
4. **Contact the development team** for complex issues

---

**Last Updated:** September 17, 2025
**Version:** 1.0
**Maintainer:** Development Team
