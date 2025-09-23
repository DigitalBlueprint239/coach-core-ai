# Content Security Policy (CSP) Implementation

**Last Updated:** $(date)  
**Status:** Report-Only Mode (Monitoring Phase)  
**Enforcement:** Pending Review of Violation Reports

## 🛡️ Overview

This document outlines the Content Security Policy (CSP) implementation for Coach Core AI, designed to prevent Cross-Site Scripting (XSS) attacks and other code injection vulnerabilities.

## 📋 Current CSP Policy

### Report-Only Mode (Current)
```
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://sentry.io https://www.google-analytics.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-uri /csp-report
```

### Enforcement Mode (Future)
```
Content-Security-Policy: [same policy as above]
```

## 🔧 Policy Breakdown

### Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default source for all resource types |
| `script-src` | `'self' 'wasm-unsafe-eval' 'unsafe-inline' https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com` | Allowed script sources |
| `connect-src` | `'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://sentry.io https://www.google-analytics.com` | Allowed fetch/XHR endpoints |
| `img-src` | `'self' data: https:` | Allowed image sources |
| `style-src` | `'self' 'unsafe-inline'` | Allowed stylesheet sources |
| `font-src` | `'self' data:` | Allowed font sources |
| `object-src` | `'none'` | Block all object/embed/applet elements |
| `base-uri` | `'self'` | Restrict base element URLs |
| `form-action` | `'self'` | Restrict form submission URLs |
| `frame-ancestors` | `'none'` | Prevent framing (clickjacking protection) |
| `upgrade-insecure-requests` | - | Upgrade HTTP to HTTPS |

## 🚨 COOP/COEP Configuration

### OAuth/Auth Paths (COOP/COEP Disabled)
- `/__/auth/**` - Firebase Auth UI
- `/auth/**` - Custom auth routes  
- `/oauth/**` - OAuth callbacks

These paths have `unsafe-none` for both COOP and COEP to prevent popup blocking issues.

### All Other Paths
- Default COOP/COEP policies apply
- Enhanced security for main application

## 📊 CSP Violation Reporting

### Report Endpoint
- **URL:** `/csp-report`
- **Method:** POST
- **Cloud Function:** `cspReport`
- **Storage:** Firestore collection `cspViolations`

### Report Structure
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "clientIP": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "referer": "https://coach-core-ai.web.app/",
  "documentUri": "https://coach-core-ai.web.app/",
  "violatedDirective": "script-src 'self'",
  "effectiveDirective": "script-src",
  "originalPolicy": "default-src 'self'; script-src...",
  "blockedUri": "https://evil.com/malicious.js",
  "sourceFile": "https://coach-core-ai.web.app/index.html",
  "lineNumber": 42,
  "columnNumber": 15,
  "statusCode": 200
}
```

## 🔄 Implementation Phases

### Phase 1: Report-Only Mode ✅
- [x] Deploy CSP in report-only mode
- [x] Monitor violation reports
- [x] Analyze and categorize violations
- [x] Fix legitimate violations

### Phase 2: Enforcement Mode (Pending)
- [ ] Review violation reports for 1-2 weeks
- [ ] Fix all legitimate violations
- [ ] Switch to enforcement mode
- [ ] Monitor for new violations

## 🛠️ Management Commands

### Enable CSP Enforcement
```bash
node scripts/security/enable-csp-enforcement.js enable
```

### Disable CSP Enforcement (Report-Only)
```bash
node scripts/security/enable-csp-enforcement.js disable
```

### Deploy Configuration
```bash
# Staging
firebase deploy --config firebase.json

# Production  
firebase deploy --config firebase.production.json
```

## 📈 Monitoring & Analysis

### Firestore Queries
```javascript
// Get all violations
db.collection('cspViolations').orderBy('timestamp', 'desc').limit(100)

// Get violations by directive
db.collection('cspViolations').where('violatedDirective', '==', 'script-src')

// Get violations by blocked URI
db.collection('cspViolations').where('blockedUri', '==', 'https://example.com')
```

### Common Violation Types

1. **Inline Scripts** - `'unsafe-inline'` in script-src
2. **External Scripts** - Add domain to script-src
3. **Data URIs** - Add `data:` to appropriate directive
4. **WebSocket Connections** - Add to connect-src
5. **Blob URLs** - Add `blob:` to appropriate directive

## 🔍 Troubleshooting

### Common Issues

#### 1. Firebase Auth Popup Blocked
**Symptom:** OAuth popups fail to open  
**Solution:** COOP/COEP headers disabled for auth paths

#### 2. Inline Scripts Blocked
**Symptom:** `Refused to execute inline script`  
**Solution:** Move to external files or add nonce/hash

#### 3. External Resources Blocked
**Symptom:** External scripts/styles/images blocked  
**Solution:** Add domain to appropriate directive

#### 4. WebSocket Connections Blocked
**Symptom:** WebSocket connections fail  
**Solution:** Add WebSocket URL to connect-src

### Debugging Steps

1. **Check Browser Console** for CSP violation messages
2. **Review Firestore** `cspViolations` collection
3. **Test in Report-Only Mode** before enforcement
4. **Use CSP Evaluator** tools for policy validation

## 🎯 Security Benefits

### XSS Protection
- Prevents execution of malicious scripts
- Blocks inline script injection
- Restricts script sources to trusted domains

### Data Exfiltration Prevention
- Limits network requests to approved endpoints
- Prevents data leakage via unauthorized connections
- Controls form submission destinations

### Clickjacking Protection
- `frame-ancestors 'none'` prevents framing
- `X-Frame-Options: DENY` additional protection

### Content Injection Prevention
- `object-src 'none'` blocks dangerous objects
- `base-uri 'self'` prevents base tag hijacking
- `upgrade-insecure-requests` enforces HTTPS

## 📚 Additional Security Headers

### Implemented Headers
- `X-Frame-Options: DENY` - Clickjacking protection
- `X-Content-Type-Options: nosniff` - MIME type sniffing protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Referrer control
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()` - Feature restrictions

## 🔄 Maintenance

### Regular Tasks
- [ ] Review violation reports weekly
- [ ] Update policy as new services are added
- [ ] Test policy changes in report-only mode first
- [ ] Monitor for new security threats

### Policy Updates
When adding new services or features:
1. Test in report-only mode
2. Add necessary domains to appropriate directives
3. Monitor for violations
4. Switch to enforcement after validation

---

**Security Contact:** Development Team  
**Emergency Contact:** Security Team  
**Last Review:** $(date)









