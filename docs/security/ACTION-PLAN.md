# CSP Implementation - Action Plan

**Date:** $(date)  
**Status:** Ready to Begin Next Steps  
**Current Phase:** Monitoring & Testing

## 🎯 **IMMEDIATE ACTION ITEMS**

### **Phase 1: Deploy and Test CSP (Today)**

#### **1.1 Deploy CSP Configuration to Staging**
```bash
# Build the project
npm run build

# Deploy to staging
firebase deploy --config firebase.json

# Verify deployment
firebase hosting:channel:list
```

#### **1.2 Test CSP Headers in Staging**
```bash
# Test CSP headers
curl -I https://coach-core-ai-staging.web.app

# Check for CSP headers:
# - Content-Security-Policy-Report-Only
# - X-Frame-Options: DENY
# - X-Content-Type-Options: nosniff
# - Referrer-Policy: strict-origin-when-cross-origin
```

#### **1.3 Test OAuth Paths**
```bash
# Test OAuth paths have COOP/COEP disabled
curl -I https://coach-core-ai-staging.web.app/__/auth/iframe
curl -I https://coach-core-ai-staging.web.app/auth/callback
```

### **Phase 2: Monitor Violations (Week 1-2)**

#### **2.1 Set Up Monitoring**
```bash
# Run daily monitoring
npm run csp:monitor

# Check Firestore for violations
# Collection: cspViolations
```

#### **2.2 Test Application Functionality**
- [ ] Login/Logout flows
- [ ] OAuth authentication
- [ ] Dashboard functionality
- [ ] Play designer features
- [ ] Analytics and monitoring

#### **2.3 Run Compliance Tests**
```bash
# Test with staging URL
TEST_URL=https://coach-core-ai-staging.web.app npm run csp:test

# Test with production URL
TEST_URL=https://coach-core-ai.web.app npm run csp:test
```

### **Phase 3: Fix Violations (Week 2-3)**

#### **3.1 Analyze Violation Reports**
- Review Firestore `cspViolations` collection
- Categorize violations by severity
- Identify patterns and common issues

#### **3.2 Fix Critical Violations**
- Blocked malicious content
- Authentication issues
- Security vulnerabilities

#### **3.3 Fix High-Severity Violations**
- Blocked legitimate external resources
- Missing trusted domains
- Network connectivity issues

#### **3.4 Refactor Inline Content**
- Move inline scripts to external files
- Move inline styles to external files
- Add nonces if needed

### **Phase 4: Gradual Enforcement (Week 3-4)**

#### **4.1 Generate Enforcement Plan**
```bash
npm run csp:plan
```

#### **4.2 Enable Enforcement Gradually**
```bash
# Step 1: Enable script-src enforcement
# Step 2: Enable style-src enforcement
# Step 3: Enable img-src enforcement
# Step 4: Enable connect-src enforcement
# Step 5: Enable remaining directives
```

#### **4.3 Deploy with Enforcement**
```bash
npm run csp:enable
firebase deploy --config firebase.json
firebase deploy --config firebase.production.json
```

## 📊 **MONITORING SCHEDULE**

### **Daily Tasks (Week 1-2)**
- [ ] Run `npm run csp:monitor`
- [ ] Check Firestore `cspViolations` collection
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Check application performance

### **Weekly Tasks (Ongoing)**
- [ ] Run `npm run csp:test`
- [ ] Analyze violation trends
- [ ] Update CSP policy if needed
- [ ] Review security effectiveness
- [ ] Document lessons learned

### **Monthly Tasks (Ongoing)**
- [ ] Run `npm run csp:maintain`
- [ ] Comprehensive security review
- [ ] Update documentation
- [ ] Team training refresh
- [ ] Policy optimization

## 🛠️ **TESTING CHECKLIST**

### **CSP Headers Test**
- [ ] Content-Security-Policy-Report-Only present
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy present

### **OAuth Paths Test**
- [ ] /__/auth/** - COOP/COEP disabled
- [ ] /auth/** - COOP/COEP disabled
- [ ] /oauth/** - COOP/COEP disabled

### **Application Functionality Test**
- [ ] Home page loads
- [ ] Login page loads
- [ ] Dashboard loads
- [ ] Play designer works
- [ ] Analytics tracking works
- [ ] OAuth flows work

### **CSP Report Endpoint Test**
- [ ] /csp-report accepts POST requests
- [ ] Returns 204 status code
- [ ] Stores violations in Firestore
- [ ] Handles malformed reports

## 🚨 **EMERGENCY PROCEDURES**

### **Immediate Rollback (Critical Issues)**
```bash
# Switch to report-only mode immediately
npm run csp:disable
firebase deploy --config firebase.json
firebase deploy --config firebase.production.json
```

### **Partial Rollback (Specific Issues)**
- Edit CSP policy in Firebase config
- Remove problematic directives
- Deploy updated configuration

### **Complete Rollback (Major Issues)**
- Revert to previous Firebase configuration
- Use git to restore previous state
- Deploy previous configuration

## 📈 **SUCCESS METRICS**

### **Week 1: Baseline Established**
- [ ] CSP deployed in report-only mode
- [ ] Violation monitoring active
- [ ] Application functionality verified
- [ ] No critical issues detected

### **Week 2: Violations Fixed**
- [ ] Critical violations: 0
- [ ] High-severity violations: < 5
- [ ] Inline content documented/refactored
- [ ] External domains categorized

### **Week 3: Enforcement Ready**
- [ ] All violations fixed
- [ ] Application tested thoroughly
- [ ] Rollback plan prepared
- [ ] Team trained on CSP management

### **Week 4: Full Enforcement**
- [ ] Gradual enforcement successful
- [ ] No functionality broken
- [ ] Violation levels acceptable
- [ ] Full enforcement active

## 🔍 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions**

#### **CSP Headers Not Present**
- **Cause:** Headers only apply in Firebase hosting
- **Solution:** Deploy to staging/production to test

#### **OAuth Popup Blocked**
- **Cause:** COOP/COEP headers too restrictive
- **Solution:** Verify headers disabled for auth paths

#### **External Resources Blocked**
- **Cause:** Domains not in CSP policy
- **Solution:** Add domains to appropriate directives

#### **Inline Content Blocked**
- **Cause:** 'unsafe-inline' not allowed
- **Solution:** Refactor to external files or add nonces

#### **API Calls Blocked**
- **Cause:** API domains not in connect-src
- **Solution:** Add API domains to connect-src

## 📚 **RESOURCES**

### **Documentation**
- [CSP Implementation Guide](./CSP.md)
- [Next Steps Guide](./NEXT-STEPS.md)
- [Quick Reference](./CSP-QUICK-REFERENCE.md)
- [Implementation Complete](./IMPLEMENTATION-COMPLETE.md)

### **Tools**
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers](https://securityheaders.com/)
- [OWASP ZAP](https://owasp.org/www-project-zap/)

### **Commands**
```bash
npm run csp:status     # Check current CSP status
npm run csp:enable     # Enable enforcement mode
npm run csp:disable    # Switch to report-only mode
npm run csp:monitor    # Generate violation report
npm run csp:test       # Run compliance tests
npm run csp:plan       # Generate enforcement plan
npm run csp:maintain   # Run maintenance analysis
```

---

**Next Review:** $(date + 1 day)  
**Enforcement Target:** $(date + 3 weeks)  
**Maintenance Start:** $(date + 4 weeks)

**Ready to begin implementation!** 🚀









