// @ts-nocheck Complex generator pending rewrite
/**
 * Security Rules Generator
 * - Generate Firebase security rules for different environments
 * - Validate rule syntax and security
 * - Provide rule templates and best practices
 * - Environment-specific rule generation
 */

export interface SecurityRuleConfig {
  environment: 'development' | 'staging' | 'production';
  enableStrictMode: boolean;
  enableRateLimiting: boolean;
  enableAuditLogging: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  allowedDomains: string[];
  sessionTimeout: number;
}

export interface GeneratedRules {
  firestore: string;
  storage: string;
  validation: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class SecurityRulesGenerator {
  private defaultConfig: SecurityRuleConfig = {
    environment: 'production',
    enableStrictMode: true,
    enableRateLimiting: true,
    enableAuditLogging: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
    allowedDomains: ['coachcore.ai', 'localhost'],
    sessionTimeout: 3600000, // 1 hour
  };

  /**
   * Generate security rules for specified environment
   */
  generateRules(config: Partial<SecurityRuleConfig> = {}): GeneratedRules {
    const finalConfig = { ...this.defaultConfig, ...config };

    const firestoreRules = this.generateFirestoreRules(finalConfig);
    const storageRules = this.generateStorageRules(finalConfig);
    const validation = this.validateRules(
      firestoreRules,
      storageRules,
      finalConfig
    );

    return {
      firestore: firestoreRules,
      storage: storageRules,
      validation,
    };
  }

  /**
   * Generate Firestore security rules
   */
  private generateFirestoreRules(config: SecurityRuleConfig): string {
    const isDevelopment = config.environment === 'development';
    const isProduction = config.environment === 'production';

    let rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================
    
    // Authentication helpers
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isEmailVerified() {
      return request.auth.token.email_verified == true;
    }
    
    function isCoach() {
      return isAuthenticated() && 
        request.auth.token.role == 'coach';
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        request.auth.token.role == 'admin';
    }
    
    function isPlayer() {
      return isAuthenticated() && 
        request.auth.token.role == 'player';
    }
    
    // Team ownership helpers
    function isTeamOwner(teamId) {
      return isAuthenticated() && 
        get(/databases/\$(database)/documents/teams/\$(teamId)).data.coachId == request.auth.uid;
    }
    
    function isTeamMember(teamId) {
      return isAuthenticated() && 
        exists(/databases/\$(database)/documents/teams/\$(teamId)/players/\$(request.auth.uid));
    }
    
    function isTeamCoach(teamId) {
      return isAuthenticated() && 
        get(/databases/\$(database)/documents/teams/\$(teamId)).data.coachId == request.auth.uid;
    }
    
    // Data validation helpers
    function isValidEmail(email) {
      return email.matches('^[^@]+@[^@]+\\.[^@]+$');
    }
    
    function isValidDate(date) {
      return date is timestamp && 
        date <= request.time && 
        date > timestamp.date(2020, 1, 1);
    }
    
    function isValidAge(birthDate) {
      return birthDate is timestamp && 
        request.time.toMillis() - birthDate.toMillis() >= 13 * 365 * 24 * 60 * 60 * 1000;
    }`;

    // Add rate limiting for production
    if (config.enableRateLimiting && isProduction) {
      rules += `
    
    // Rate limiting helpers
    function isWithinRateLimit(collection, userId, limit) {
      let recentWrites = getAfter(/databases/\$(database)/documents/\$(collection)/\$(userId)).data.recentWrites;
      return recentWrites.size() <= limit;
    }`;
    }

    // Add development-specific rules
    if (isDevelopment) {
      rules += `
    
    // Development helpers
    function isDevelopment() {
      return true;
    }`;
    }

    rules += `
    
    // ============================================================================
    // USER PROFILES
    // ============================================================================
    match /users/{userId} {
      allow read: if isAuthenticated() && 
        (request.auth.uid == userId || isAdmin());
      allow create: if isAuthenticated() && 
        request.auth.uid == userId &&
        ${isProduction ? 'isEmailVerified() &&' : ''}
        request.resource.data.keys().hasAll(['email', 'displayName', 'role', 'createdAt']) &&
        request.resource.data.email == request.auth.token.email &&
        isValidEmail(request.resource.data.email) &&
        request.resource.data.displayName.size() >= 2 &&
        request.resource.data.displayName.size() <= 50 &&
        request.resource.data.role in ['coach', 'player', 'admin'] &&
        request.resource.data.createdAt == request.time;
      allow update: if isAuthenticated() && 
        request.auth.uid == userId &&
        request.resource.data.email == request.auth.token.email &&
        isValidEmail(request.resource.data.email) &&
        request.resource.data.displayName.size() >= 2 &&
        request.resource.data.displayName.size() <= 50;
      allow delete: if isAdmin() || 
        (isAuthenticated() && request.auth.uid == userId);
      
      // User preferences subcollection
      match /preferences/{prefId} {
        allow read, write: if isAuthenticated() && 
          request.auth.uid == userId;
      }
      
      // User sessions subcollection
      match /sessions/{sessionId} {
        allow read, write: if isAuthenticated() && 
          request.auth.uid == userId;
      }
    }
    
    // ============================================================================
    // TEAMS
    // ============================================================================
    match /teams/{teamId} {
      allow read: if isAuthenticated() && 
        (isTeamMember(teamId) || isTeamCoach(teamId) || isAdmin());
      allow create: if isCoach() &&
        request.resource.data.keys().hasAll(['name', 'sport', 'level', 'coachId', 'createdAt']) &&
        request.resource.data.coachId == request.auth.uid &&
        request.resource.data.name.size() >= 2 &&
        request.resource.data.name.size() <= 100 &&
        request.resource.data.sport in ['football', 'basketball', 'soccer', 'baseball', 'volleyball'] &&
        request.resource.data.level in ['youth', 'high-school', 'college', 'professional'] &&
        request.resource.data.createdAt == request.time;
      allow update: if isTeamCoach(teamId) &&
        request.resource.data.coachId == request.auth.uid &&
        request.resource.data.name.size() >= 2 &&
        request.resource.data.name.size() <= 100;
      allow delete: if isTeamCoach(teamId) || isAdmin();
      
      // Players subcollection
      match /players/{playerId} {
        allow read: if isAuthenticated() && 
          (isTeamMember(teamId) || isTeamCoach(teamId) || request.auth.uid == playerId);
        allow create: if isTeamCoach(teamId) &&
          request.resource.data.keys().hasAll(['email', 'firstName', 'lastName', 'position', 'number', 'joinedAt']) &&
          isValidEmail(request.resource.data.email) &&
          request.resource.data.firstName.size() >= 1 &&
          request.resource.data.firstName.size() <= 50 &&
          request.resource.data.lastName.size() >= 1 &&
          request.resource.data.lastName.size() <= 50 &&
          request.resource.data.position in ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] &&
          request.resource.data.number >= 0 &&
          request.resource.data.number <= 99 &&
          request.resource.data.joinedAt == request.time;
        allow update: if isTeamCoach(teamId) &&
          request.resource.data.firstName.size() >= 1 &&
          request.resource.data.firstName.size() <= 50 &&
          request.resource.data.lastName.size() >= 1 &&
          request.resource.data.lastName.size() <= 50 &&
          request.resource.data.position in ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'] &&
          request.resource.data.number >= 0 &&
          request.resource.data.number <= 99;
        allow delete: if isTeamCoach(teamId);
        
        // Player stats subcollection
        match /stats/{statId} {
          allow read: if isAuthenticated() && 
            (isTeamMember(teamId) || isTeamCoach(teamId) || request.auth.uid == playerId);
          allow write: if isTeamCoach(teamId);
        }
      }
      
      // Practices subcollection
      match /practices/{practiceId} {
        allow read: if isAuthenticated() && 
          (isTeamMember(teamId) || isTeamCoach(teamId));
        allow create: if isTeamCoach(teamId) &&
          request.resource.data.keys().hasAll(['date', 'duration', 'focus', 'createdAt']) &&
          isValidDate(request.resource.data.date) &&
          request.resource.data.duration >= 30 &&
          request.resource.data.duration <= 240 &&
          request.resource.data.focus.size() >= 5 &&
          request.resource.data.focus.size() <= 200 &&
          request.resource.data.createdAt == request.time;
        allow update: if isTeamCoach(teamId) &&
          isValidDate(request.resource.data.date) &&
          request.resource.data.duration >= 30 &&
          request.resource.data.duration <= 240 &&
          request.resource.data.focus.size() >= 5 &&
          request.resource.data.focus.size() <= 200;
        allow delete: if isTeamCoach(teamId);
      }
      
      // Games subcollection
      match /games/{gameId} {
        allow read: if isAuthenticated() && 
          (isTeamMember(teamId) || isTeamCoach(teamId));
        allow create: if isTeamCoach(teamId) &&
          request.resource.data.keys().hasAll(['date', 'opponent', 'location', 'createdAt']) &&
          isValidDate(request.resource.data.date) &&
          request.resource.data.opponent.size() >= 2 &&
          request.resource.data.opponent.size() <= 100 &&
          request.resource.data.location.size() >= 5 &&
          request.resource.data.location.size() <= 200 &&
          request.resource.data.createdAt == request.time;
        allow update: if isTeamCoach(teamId) &&
          isValidDate(request.resource.data.date) &&
          request.resource.data.opponent.size() >= 2 &&
          request.resource.data.opponent.size() <= 100 &&
          request.resource.data.location.size() >= 5 &&
          request.resource.data.location.size() <= 200;
        allow delete: if isTeamCoach(teamId);
      }
    }
    
    // ============================================================================
    // PLAYS
    // ============================================================================
    match /plays/{playId} {
      allow read: if isAuthenticated() && 
        (resource.data.coachId == request.auth.uid || 
         isTeamMember(resource.data.teamId) || 
         isAdmin());
      allow create: if isCoach() &&
        request.resource.data.keys().hasAll(['name', 'formation', 'description', 'coachId', 'teamId', 'createdAt']) &&
        request.resource.data.coachId == request.auth.uid &&
        request.resource.data.name.size() >= 3 &&
        request.resource.data.name.size() <= 100 &&
        request.resource.data.formation.size() >= 2 &&
        request.resource.data.formation.size() <= 50 &&
        request.resource.data.description.size() >= 10 &&
        request.resource.data.description.size() <= 1000 &&
        request.resource.data.createdAt == request.time;
      allow update: if isAuthenticated() && 
        resource.data.coachId == request.auth.uid &&
        request.resource.data.name.size() >= 3 &&
        request.resource.data.name.size() <= 100 &&
        request.resource.data.formation.size() >= 2 &&
        request.resource.data.formation.size() <= 50 &&
        request.resource.data.description.size() >= 10 &&
        request.resource.data.description.size() <= 1000;
      allow delete: if isAuthenticated() && 
        resource.data.coachId == request.auth.uid;
    }
    
    // ============================================================================
    // ANALYTICS
    // ============================================================================
    match /analytics/{document=**} {
      allow read: if isCoach() || isAdmin();
      allow write: if false; // Only backend can write analytics
    }
    
    // ============================================================================
    // NOTIFICATIONS
    // ============================================================================
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() &&
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.keys().hasAll(['title', 'message', 'type', 'createdAt']) &&
        request.resource.data.title.size() >= 1 &&
        request.resource.data.title.size() <= 100 &&
        request.resource.data.message.size() >= 1 &&
        request.resource.data.message.size() <= 500 &&
        request.resource.data.type in ['info', 'warning', 'error', 'success'] &&
        request.resource.data.createdAt == request.time;
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid &&
        request.resource.data.readAt == request.time;
      allow delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // ============================================================================
    // SYSTEM CONFIGURATION
    // ============================================================================
    match /system/{configId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // ============================================================================
    // AUDIT LOGS
    // ============================================================================
    match /audit/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Only backend can write audit logs
    }`;

    // Add rate limiting for production
    if (config.enableRateLimiting && isProduction) {
      rules += `
    
    // ============================================================================
    // RATE LIMITING
    // ============================================================================
    match /rateLimits/{userId} {
      allow read, write: if isAuthenticated() && 
        request.auth.uid == userId;
    }`;
    }

    // Add development-specific rules
    if (isDevelopment) {
      rules += `
    
    // ============================================================================
    // DEVELOPMENT RULES
    // ============================================================================
    match /dev/{document=**} {
      allow read, write: if isDevelopment();
    }`;
    }

    rules += `
    
    // ============================================================================
    // DEFAULT DENY
    // ============================================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

    return rules;
  }

  /**
   * Generate Storage security rules
   */
  private generateStorageRules(config: SecurityRuleConfig): string {
    const isDevelopment = config.environment === 'development';
    const maxFileSize = config.maxFileSize;
    const allowedFileTypes = config.allowedFileTypes;

    let rules = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================
    
    // Authentication helpers
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isEmailVerified() {
      return request.auth.token.email_verified == true;
    }
    
    function isCoach() {
      return isAuthenticated() && 
        request.auth.token.role == 'coach';
    }
    
    function isAdmin() {
      return isAuthenticated() && 
        request.auth.token.role == 'admin';
    }
    
    function isPlayer() {
      return isAuthenticated() && 
        request.auth.token.role == 'player';
    }
    
    // File validation helpers
    function isValidFileSize() {
      return request.resource.size <= ${maxFileSize};
    }
    
    function isValidImageSize() {
      return request.resource.size <= 10 * 1024 * 1024; // 10MB max for images
    }
    
    function isValidDocumentSize() {
      return request.resource.size <= 25 * 1024 * 1024; // 25MB max for documents
    }
    
    function isValidVideoSize() {
      return request.resource.size <= 100 * 1024 * 1024; // 100MB max for videos
    }
    
    function isValidImageType() {
      return request.resource.contentType.matches('image/(jpeg|jpg|png|gif|webp|svg)');
    }
    
    function isValidDocumentType() {
      return request.resource.contentType.matches('application/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.ms-excel|vnd.openxmlformats-officedocument.spreadsheetml.sheet|vnd.ms-powerpoint|vnd.openxmlformats-officedocument.presentationml.presentation)');
    }
    
    function isValidVideoType() {
      return request.resource.contentType.matches('video/(mp4|avi|mov|wmv|flv|webm)');
    }
    
    function isValidAudioType() {
      return request.resource.contentType.matches('audio/(mp3|wav|ogg|m4a|aac)');
    }
    
    function isValidArchiveType() {
      return request.resource.contentType.matches('application/(zip|rar|7z|x-zip-compressed)');
    }
    
    // File name validation
    function isValidFileName() {
      return request.resource.name.matches('^[a-zA-Z0-9._-]+$') &&
        request.resource.name.size() <= 255;
    }
    
    function hasValidExtension() {
      return request.resource.name.matches('.*\\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|ppt|pptx|mp4|avi|mov|wmv|flv|webm|mp3|wav|ogg|m4a|aac|zip|rar|7z)$');
    }
    
    // Metadata validation
    function hasValidMetadata() {
      return request.resource.metadata.keys().hasAll(['uploadedBy', 'uploadedAt']) &&
        request.resource.metadata.uploadedBy == request.auth.uid &&
        request.resource.metadata.uploadedAt is timestamp;
    }`;

    // Add rate limiting for production
    if (config.enableRateLimiting && config.environment === 'production') {
      rules += `
    
    // Rate limiting
    function isWithinUploadLimit() {
      return request.time.toMillis() - resource.metadata.uploadedAt.toMillis() > 1000; // 1 second between uploads
    }`;
    }

    rules += `
    
    // ============================================================================
    // USER PROFILE IMAGES
    // ============================================================================
    match /users/{userId}/profile/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        request.auth.uid == userId &&
        ${config.environment === 'production' ? 'isEmailVerified() &&' : ''}
        isValidImageSize() &&
        isValidImageType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isAuthenticated() && 
        request.auth.uid == userId &&
        isValidImageSize() &&
        isValidImageType() &&
        hasValidMetadata();
      allow delete: if isAuthenticated() && 
        request.auth.uid == userId;
    }
    
    // ============================================================================
    // TEAM DOCUMENTS
    // ============================================================================
    match /teams/{teamId}/documents/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidDocumentSize() &&
        isValidDocumentType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidDocumentSize() &&
        isValidDocumentType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // Team images (logos, team photos)
    match /teams/{teamId}/images/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidImageSize() &&
        isValidImageType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidImageSize() &&
        isValidImageType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // Team videos
    match /teams/{teamId}/videos/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // ============================================================================
    // PRACTICE PLANS
    // ============================================================================
    match /practice-plans/{planId}/attachments/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidDocumentSize() &&
        (isValidDocumentType() || isValidImageType() || isValidVideoType()) &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidDocumentSize() &&
        (isValidDocumentType() || isValidImageType() || isValidVideoType()) &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // Practice videos
    match /practice-plans/{planId}/videos/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // ============================================================================
    // PLAY DIAGRAMS AND MEDIA
    // ============================================================================
    match /plays/{playId}/diagrams/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidImageSize() &&
        isValidImageType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidImageSize() &&
        isValidImageType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    match /plays/{playId}/videos/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // ============================================================================
    // GAME FOOTAGE
    // ============================================================================
    match /games/{gameId}/footage/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidVideoSize() &&
        isValidVideoType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    match /games/{gameId}/photos/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        isValidImageSize() &&
        isValidImageType() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        isValidImageSize() &&
        isValidImageType() &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // ============================================================================
    // PLAYER MEDIA
    // ============================================================================
    match /players/{playerId}/media/{fileName} {
      allow read: if isAuthenticated();
      allow create: if isCoach() &&
        (isValidImageSize() || isValidVideoSize()) &&
        (isValidImageType() || isValidVideoType()) &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isCoach() &&
        (isValidImageSize() || isValidVideoSize()) &&
        (isValidImageType() || isValidVideoType()) &&
        hasValidMetadata();
      allow delete: if isCoach() || isAdmin();
    }
    
    // ============================================================================
    // ANALYTICS REPORTS
    // ============================================================================
    match /analytics/reports/{fileName} {
      allow read: if isCoach() || isAdmin();
      allow create: if false; // Only backend can create reports
      allow update: if false;
      allow delete: if isAdmin();
    }
    
    // ============================================================================
    // BACKUP FILES
    // ============================================================================
    match /backups/{fileName} {
      allow read: if isAdmin();
      allow create: if false; // Only backend can create backups
      allow update: if false;
      allow delete: if isAdmin();
    }
    
    // ============================================================================
    // TEMPORARY FILES
    // ============================================================================
    match /temp/{userId}/{fileName} {
      allow read: if isAuthenticated() && 
        request.auth.uid == userId;
      allow create: if isAuthenticated() && 
        request.auth.uid == userId &&
        isValidFileSize() &&
        isValidFileName() &&
        hasValidExtension() &&
        hasValidMetadata();
      allow update: if isAuthenticated() && 
        request.auth.uid == userId &&
        isValidFileSize() &&
        hasValidMetadata();
      allow delete: if isAuthenticated() && 
        request.auth.uid == userId;
    }
    
    // ============================================================================
    // SYSTEM FILES
    // ============================================================================
    match /system/{fileName} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();
    }`;

    // Add development-specific rules
    if (isDevelopment) {
      rules += `
    
    // ============================================================================
    // DEVELOPMENT RULES
    // ============================================================================
    match /dev/{allPaths=**} {
      allow read, write: if isDevelopment();
    }`;
    }

    rules += `
    
    // ============================================================================
    // DEFAULT DENY
    // ============================================================================
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}`;

    return rules;
  }

  /**
   * Validate generated rules
   */
  private validateRules(
    firestoreRules: string,
    storageRules: string,
    config: SecurityRuleConfig
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic syntax validation
    if (!firestoreRules.includes("rules_version = '2'")) {
      errors.push('Firestore rules missing rules_version declaration');
    }

    if (!storageRules.includes("rules_version = '2'")) {
      errors.push('Storage rules missing rules_version declaration');
    }

    // Security validation
    if (!firestoreRules.includes('allow read, write: if false;')) {
      warnings.push('Firestore rules missing default deny rule');
    }

    if (!storageRules.includes('allow read, write: if false;')) {
      warnings.push('Storage rules missing default deny rule');
    }

    // Authentication validation
    if (!firestoreRules.includes('isAuthenticated()')) {
      warnings.push('Firestore rules missing authentication checks');
    }

    if (!storageRules.includes('isAuthenticated()')) {
      warnings.push('Storage rules missing authentication checks');
    }

    // File size validation
    if (
      !storageRules.includes(`request.resource.size <= ${config.maxFileSize}`)
    ) {
      warnings.push('Storage rules missing file size validation');
    }

    // Environment-specific suggestions
    if (config.environment === 'production') {
      suggestions.push('Enable rate limiting for production');
      suggestions.push('Enable audit logging for production');
      suggestions.push('Review and test all security rules before deployment');
    }

    if (config.environment === 'development') {
      suggestions.push('Consider using Firebase emulators for development');
      suggestions.push('Disable strict validation for development');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * Get rule templates
   */
  getRuleTemplates(): Record<string, string> {
    return {
      basic: this.generateRules({
        environment: 'development',
        enableStrictMode: false,
      }),
      development: this.generateRules({
        environment: 'development',
        enableStrictMode: false,
      }),
      staging: this.generateRules({
        environment: 'staging',
        enableStrictMode: true,
      }),
      production: this.generateRules({
        environment: 'production',
        enableStrictMode: true,
      }),
      strict: this.generateRules({
        environment: 'production',
        enableStrictMode: true,
        enableRateLimiting: true,
        enableAuditLogging: true,
      }),
    };
  }

  /**
   * Generate rules for specific use case
   */
  generateRulesForUseCase(useCase: string): GeneratedRules {
    const useCaseConfigs: Record<string, Partial<SecurityRuleConfig>> = {
      'coaching-app': {
        environment: 'production',
        enableStrictMode: true,
        enableRateLimiting: true,
        maxFileSize: 100 * 1024 * 1024, // 100MB for video uploads
        allowedFileTypes: ['image/*', 'video/*', 'application/pdf', 'text/*'],
      },
      'youth-sports': {
        environment: 'production',
        enableStrictMode: true,
        enableRateLimiting: true,
        maxFileSize: 50 * 1024 * 1024,
        allowedFileTypes: ['image/*', 'application/pdf'],
      },
      'professional-team': {
        environment: 'production',
        enableStrictMode: true,
        enableRateLimiting: true,
        enableAuditLogging: true,
        maxFileSize: 500 * 1024 * 1024, // 500MB for high-quality video
        allowedFileTypes: [
          'image/*',
          'video/*',
          'application/pdf',
          'text/*',
          'audio/*',
        ],
      },
    };

    const config = useCaseConfigs[useCase] || this.defaultConfig;
    return this.generateRules(config);
  }
}

// Export singleton instance
export const securityRulesGenerator = new SecurityRulesGenerator();

// Export convenience functions
export const generateRules = (config?: Partial<SecurityRuleConfig>) =>
  securityRulesGenerator.generateRules(config);
export const getRuleTemplates = () => securityRulesGenerator.getRuleTemplates();
export const generateRulesForUseCase = (useCase: string) =>
  securityRulesGenerator.generateRulesForUseCase(useCase);
