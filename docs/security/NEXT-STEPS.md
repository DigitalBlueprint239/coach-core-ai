# CSP Implementation - Next Steps Guide

**Current Status:** Report-Only Mode Active  
**Next Phase:** Monitoring & Gradual Enforcement  
**Timeline:** 2-4 weeks to full enforcement

## 🎯 **IMMEDIATE NEXT STEPS (Week 1-2)**

### **1. Monitor CSP Violations** 📊
```bash
# Run daily monitoring
npm run csp:monitor

# Check violation reports in Firestore
# Collection: cspViolations
```

**What to look for:**
- Critical violations (malicious content)
- High-severity violations (blocked legitimate resources)
- Inline script/style violations
- External domain violations

### **2. Run Compliance Tests** 🧪
```bash
# Test CSP compliance
npm run csp:test

# Test with different URLs
TEST_URL=https://coach-core-ai.web.app npm run csp:test
```

**Test coverage:**
- CSP headers present and correct
- OAuth paths have COOP/COEP disabled
- Application functionality works
- CSP report endpoint functional

### **3. Generate Enforcement Plan** 📋
```bash
# Create gradual enforcement strategy
npm run csp:plan
```

**Review the plan:**
- Timeline for each phase
- Readiness criteria
- Rollback procedures
- Monitoring schedule

## 🔧 **WEEK 2-3: FIX VIOLATIONS**

### **Critical Violations (Fix Immediately)**
- Blocked malicious content
- Security vulnerabilities
- Authentication issues

### **High-Severity Violations (Fix Before Enforcement)**
- Blocked legitimate external resources
- Missing trusted domains
- Network connectivity issues

### **Medium-Severity Violations (Fix or Document)**
- Inline scripts and styles
- Data URI usage
- Blob URL usage

### **Common Fixes:**

#### **Add External Domains**
```bash
# Example: Add Google Fonts
# Update firebase.json or firebase.production.json
# Add to style-src: https://fonts.googleapis.com
# Add to font-src: https://fonts.gstatic.com
```

#### **Refactor Inline Content**
```html
<!-- Bad -->
<script>alert('hello');</script>

<!-- Good -->
<script src="/js/script.js"></script>
```

#### **Use Nonces for Inline Content**
```html
<!-- Add nonce to CSP policy -->
<script nonce="random-nonce">alert('hello');</script>
```

## 🚀 **WEEK 3-4: GRADUAL ENFORCEMENT**

### **Phase 1: Script Enforcement**
```bash
# Enable script-src enforcement first
# Test thoroughly before proceeding
```

### **Phase 2: Style Enforcement**
```bash
# Enable style-src enforcement
# Monitor for style-related issues
```

### **Phase 3: Image Enforcement**
```bash
# Enable img-src enforcement
# Check for broken images
```

### **Phase 4: Network Enforcement**
```bash
# Enable connect-src enforcement
# Test API calls and external requests
```

### **Phase 5: Full Enforcement**
```bash
# Enable all remaining directives
# Complete CSP enforcement
```

## 📊 **MONITORING SCHEDULE**

### **Daily (First 2 Weeks)**
- [ ] Check violation reports
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Review application performance

### **Weekly (Ongoing)**
- [ ] Analyze violation trends
- [ ] Update CSP policy if needed
- [ ] Review security effectiveness
- [ ] Document lessons learned

### **Monthly (Ongoing)**
- [ ] Comprehensive security review
- [ ] Update documentation
- [ ] Team training refresh
- [ ] Policy optimization

## 🛠️ **MAINTENANCE COMMANDS**

### **CSP Management**
```bash
npm run csp:status     # Check current CSP status
npm run csp:enable     # Enable enforcement mode
npm run csp:disable    # Switch to report-only mode
npm run csp:monitor    # Generate violation report
npm run csp:test       # Run compliance tests
npm run csp:plan       # Generate enforcement plan
npm run csp:maintain   # Run maintenance analysis
```

### **Deployment**
```bash
# Staging
firebase deploy --config firebase.json

# Production
firebase deploy --config firebase.production.json
```

## 🚨 **EMERGENCY PROCEDURES**

### **Immediate Rollback (Critical Issues)**
```bash
# Switch to report-only mode immediately
npm run csp:disable
firebase deploy --config firebase.json
firebase deploy --config firebase.production.json
```

### **Partial Rollback (Specific Issues)**
```bash
# Remove problematic directives from CSP policy
# Edit firebase.json or firebase.production.json
# Deploy updated configuration
```

### **Complete Rollback (Major Issues)**
```bash
# Revert to previous Firebase configuration
# Use git to restore previous state
# Deploy previous configuration
```

## 📈 **SUCCESS METRICS**

### **Phase 1: Monitoring (Week 1-2)**
- [ ] Violation reports being collected
- [ ] No critical violations detected
- [ ] Application functionality verified
- [ ] Team trained on CSP management

### **Phase 2: Fixes (Week 2-3)**
- [ ] All critical violations fixed
- [ ] High-severity violations < 5
- [ ] Inline content documented/refactored
- [ ] External domains categorized

### **Phase 3: Enforcement (Week 3-4)**
- [ ] Gradual enforcement successful
- [ ] No functionality broken
- [ ] Violation levels acceptable
- [ ] Full enforcement active

### **Phase 4: Maintenance (Ongoing)**
- [ ] Regular monitoring active
- [ ] Policy updates documented
- [ ] Team self-sufficient
- [ ] Security posture improved

## 🔍 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions**

#### **OAuth Popup Blocked**
- **Symptom:** OAuth flows fail to open popups
- **Solution:** Verify COOP/COEP disabled for auth paths
- **Check:** `/__/auth/**`, `/auth/**`, `/oauth/**` paths

#### **External Resources Blocked**
- **Symptom:** External scripts/styles/images don't load
- **Solution:** Add domain to appropriate CSP directive
- **Check:** script-src, style-src, img-src directives

#### **Inline Content Blocked**
- **Symptom:** Inline scripts/styles don't work
- **Solution:** Refactor to external files or add nonces
- **Check:** Remove 'unsafe-inline' from directives

#### **API Calls Blocked**
- **Symptom:** Network requests fail
- **Solution:** Add API domain to connect-src
- **Check:** connect-src directive

#### **Images Not Loading**
- **Symptom:** Images show broken or don't load
- **Solution:** Add image domain to img-src
- **Check:** img-src directive

## 📚 **RESOURCES**

### **Documentation**
- [CSP Implementation Guide](./CSP.md)
- [Security Overview](./SECURITY.md)
- [Quick Reference](./CSP-QUICK-REFERENCE.md)
- [Implementation Summary](./IMPLEMENTATION-SUMMARY.md)

### **Tools**
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Security Headers](https://securityheaders.com/)
- [OWASP ZAP](https://owasp.org/www-project-zap/)

### **References**
- [CSP Level 3 Specification](https://w3c.github.io/webappsec-csp/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## 🎯 **READINESS CHECKLIST**

### **Before Enabling Enforcement**
- [ ] No critical violations for 1 week
- [ ] High-severity violations < 5
- [ ] All external domains identified
- [ ] Application functionality tested
- [ ] Rollback plan prepared
- [ ] Team trained on CSP management
- [ ] Monitoring dashboard active

### **After Enabling Enforcement**
- [ ] All functionality works correctly
- [ ] No user complaints
- [ ] Violation levels acceptable
- [ ] Monitoring active
- [ ] Documentation updated
- [ ] Team ready for maintenance

---

**Next Review:** $(date + 1 week)  
**Enforcement Target:** $(date + 3 weeks)  
**Maintenance Start:** $(date + 4 weeks)

**Questions?** Contact the security team or check the documentation above.





