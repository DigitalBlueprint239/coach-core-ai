# 🎯 Staging Feedback System Guide

## Overview

The Coach Core AI staging environment includes a comprehensive feedback system that allows coaches and testers to submit feedback, bug reports, and feature requests directly from the application. This system is designed to collect valuable insights during the testing phase.

## 🚀 Features

### **For Testers/Coaches**
- ✅ **Staging-Only Feedback Button**: Visible only in staging environment
- ✅ **Quick Feedback Submission**: Easy-to-use modal interface
- ✅ **Categorized Feedback**: Bug reports, feature requests, UI issues, performance issues
- ✅ **Priority Levels**: Low, Medium, High, Critical
- ✅ **Anonymous Submission**: Can submit feedback without logging in
- ✅ **User Context**: Automatically includes user info if logged in

### **For Admins**
- ✅ **Admin Dashboard**: Comprehensive feedback review interface
- ✅ **Status Management**: Track feedback through workflow stages
- ✅ **Filtering & Search**: Find specific feedback quickly
- ✅ **Analytics**: Feedback statistics and trends
- ✅ **Admin Notes**: Add internal notes and responses

## 🎯 How It Works

### **1. Feedback Submission (Staging Only)**

#### **Accessing Feedback**
- The feedback button appears only in staging environment
- Located in the navigation bar (right side, before user menu)
- Button shows "Feedback" with a message icon

#### **Submitting Feedback**
1. Click the "Feedback" button in navigation
2. Fill out the feedback form:
   - **Feedback**: Describe your feedback (required, max 1000 chars)
   - **Category**: Select from Bug, Feature, UI, Performance, Other
   - **Priority**: Choose Low, Medium, High, or Critical
3. Click "Submit Feedback"
4. Receive confirmation message

#### **Feedback Categories**
- 🐛 **Bug Report**: Issues, errors, or unexpected behavior
- ✨ **Feature Request**: New functionality suggestions
- 🎨 **UI/UX Issue**: Interface or user experience problems
- ⚡ **Performance Issue**: Slow loading, lag, or optimization needs
- 💬 **General Feedback**: Other comments or suggestions

#### **Priority Levels**
- 🟢 **Low**: Nice to have, minor improvements
- 🟡 **Medium**: Should be addressed, moderate impact
- 🟠 **High**: Important issue, significant impact
- 🔴 **Critical**: Blocking issue, needs immediate attention

### **2. Admin Dashboard**

#### **Accessing Admin Dashboard**
- Navigate to `/admin/feedback` (admin access required)
- Only users with admin email addresses can access
- Current admin emails: `admin@coachcore.ai`, `jones@coachcore.ai`, `support@coachcore.ai`

#### **Dashboard Features**

##### **Statistics Overview**
- Total feedback count
- New feedback (unreviewed)
- In progress feedback
- Resolved feedback
- Recent feedback (last 7 days)

##### **Feedback Management**
- **View All Feedback**: Complete list with pagination
- **Filter Options**:
  - By category (Bug, Feature, UI, Performance, Other)
  - By priority (Low, Medium, High, Critical)
  - By status (New, Reviewed, In Progress, Resolved, Closed)
  - By user (if logged in)
- **Search**: Find feedback by content, email, or category
- **Sort**: By date (newest first)

##### **Status Workflow**
1. **New**: Initial submission
2. **Reviewed**: Admin has reviewed
3. **In Progress**: Being worked on
4. **Resolved**: Issue fixed or request implemented
5. **Closed**: No further action needed

##### **Admin Actions**
- **View Details**: See full feedback with user context
- **Update Status**: Change feedback status
- **Add Notes**: Internal admin notes
- **Track Progress**: Monitor resolution timeline

## 📊 Data Structure

### **Feedback Document (Firestore)**
```typescript
interface StagingFeedback {
  id?: string;
  feedback: string;                    // User's feedback text
  category?: 'bug' | 'feature' | 'ui' | 'performance' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;                     // User ID if logged in
  userEmail?: string;                  // User email if logged in
  userAgent?: string;                  // Browser info
  pageUrl?: string;                    // Page where feedback was submitted
  timestamp: Date;                     // Submission time
  status?: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed';
  adminNotes?: string;                 // Internal admin notes
  adminId?: string;                    // Admin who last updated
  adminEmail?: string;                 // Admin email
  reviewedAt?: Date;                   // When reviewed
  resolvedAt?: Date;                   // When resolved
}
```

### **Firestore Collection**
- **Collection**: `staging_feedback`
- **Security Rules**:
  - Anyone can create (submit feedback)
  - Only admins can read, update, delete

## 🔧 Configuration

### **Environment Variables**
```bash
# Staging Environment
VITE_ENVIRONMENT=staging

# Production Environment (feedback button hidden)
VITE_ENVIRONMENT=production
```

### **Admin Configuration**
Update admin emails in `src/services/feedback/feedback-service.ts`:
```typescript
const adminEmails = [
  'admin@coachcore.ai',
  'jones@coachcore.ai',
  'support@coachcore.ai',
  // Add more admin emails here
];
```

## 📈 Analytics Tracking

### **Tracked Events**
- `feedback_modal_opened`: When feedback modal is opened
- `feedback_submit_attempt`: When user attempts to submit
- `feedback_submit_success`: Successful feedback submission
- `feedback_submit_error`: Failed feedback submission
- `feedback_modal_submit_attempt`: Modal-specific submit attempt
- `feedback_modal_submit_success`: Modal-specific success
- `feedback_modal_submit_error`: Modal-specific error
- `feedback_status_update`: Admin status updates

### **Event Data**
```typescript
{
  event_category: 'feedback',
  event_label: 'specific_action',
  category: 'bug' | 'feature' | 'ui' | 'performance' | 'other',
  priority: 'low' | 'medium' | 'high' | 'critical',
  has_user: boolean,
  feedback_id?: string,
  error?: string
}
```

## 🛠️ Technical Implementation

### **Components**
- `FeedbackModal.tsx`: Feedback submission interface
- `FeedbackDashboard.tsx`: Admin review dashboard
- `feedback-service.ts`: Firestore operations and business logic

### **Services**
- **FeedbackService**: Handles all feedback operations
- **Analytics Integration**: Tracks all feedback events
- **Admin Authentication**: Simple email-based admin check

### **Routes**
- `/admin/feedback`: Admin dashboard (protected)
- Feedback button: Staging environment only

### **Security**
- **Firestore Rules**: Public create, admin-only read/update/delete
- **Admin Access**: Email-based authentication
- **Environment Check**: Staging-only feedback button

## 🎯 Usage Examples

### **For Testers**

#### **Submitting a Bug Report**
1. Navigate to staging environment
2. Click "Feedback" button in navigation
3. Select "🐛 Bug Report" category
4. Choose appropriate priority (e.g., "🔴 Critical" for blocking issues)
5. Describe the bug in detail
6. Submit feedback

#### **Requesting a Feature**
1. Click "Feedback" button
2. Select "✨ Feature Request" category
3. Choose priority level
4. Describe the desired feature
5. Submit feedback

### **For Admins**

#### **Reviewing Feedback**
1. Navigate to `/admin/feedback`
2. Use filters to find specific feedback
3. Click "View Details" to see full information
4. Update status and add admin notes
5. Track progress through resolution

#### **Managing Feedback Workflow**
1. **New**: Review incoming feedback
2. **Reviewed**: Mark as reviewed, add initial notes
3. **In Progress**: Assign to development team
4. **Resolved**: Mark as fixed/implemented
5. **Closed**: Archive completed feedback

## 📊 Best Practices

### **For Testers**
- **Be Specific**: Provide detailed descriptions
- **Include Context**: Mention the page/feature where issue occurred
- **Choose Appropriate Priority**: Don't over-prioritize minor issues
- **Test Thoroughly**: Try to reproduce issues before reporting

### **For Admins**
- **Regular Reviews**: Check for new feedback daily
- **Quick Responses**: Acknowledge feedback promptly
- **Clear Status Updates**: Keep status current and meaningful
- **Detailed Notes**: Document resolution steps and decisions

### **For Developers**
- **Monitor Dashboard**: Check for critical issues regularly
- **Update Status**: Keep feedback status current
- **Document Solutions**: Add detailed admin notes
- **Follow Up**: Verify fixes with original reporter

## 🔍 Troubleshooting

### **Common Issues**

#### **Feedback Button Not Visible**
- Check environment: Must be staging
- Verify `VITE_ENVIRONMENT=staging`
- Check browser console for errors

#### **Cannot Submit Feedback**
- Check Firestore rules are deployed
- Verify internet connection
- Check browser console for errors

#### **Cannot Access Admin Dashboard**
- Verify admin email is in allowed list
- Check user is logged in
- Verify route is correct (`/admin/feedback`)

#### **Feedback Not Appearing in Dashboard**
- Check Firestore security rules
- Verify admin permissions
- Check for JavaScript errors

### **Debug Steps**
1. Check browser console for errors
2. Verify Firestore rules are deployed
3. Check environment variables
4. Test with different user accounts
5. Check Firestore console for data

## 🎉 Success!

With the staging feedback system in place, you now have:

- ✅ **Staging-Only Feedback Collection**: Targeted feedback from testers
- ✅ **Comprehensive Admin Dashboard**: Full feedback management
- ✅ **Analytics Integration**: Complete tracking of feedback events
- ✅ **Secure Data Storage**: Proper Firestore rules and admin access
- ✅ **User-Friendly Interface**: Easy feedback submission and management
- ✅ **Workflow Management**: Status tracking from submission to resolution

The staging feedback system is now ready to collect valuable insights from your testing community! 🚀

