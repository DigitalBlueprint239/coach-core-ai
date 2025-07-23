// src/types/privacy-schema.ts
import { Timestamp, FieldValue } from 'firebase/firestore';

// ============================================
// CONSENT MANAGEMENT TYPES
// ============================================

export interface ConsentSettings {
  // AI Training Consent
  aiTraining: ConsentLevel;
  aiTrainingLastUpdated: Timestamp | FieldValue;
  aiTrainingReason: string;
  
  // Analytics Consent
  analytics: ConsentLevel;
  analyticsLastUpdated: Timestamp | FieldValue;
  analyticsReason: string;
  
  // Data Collection Consent
  dataCollection: ConsentLevel;
  dataCollectionLastUpdated: Timestamp | FieldValue;
  dataCollectionReason: string;
  
  // Data Sharing Consent
  dataSharing: ConsentLevel;
  dataSharingLastUpdated: Timestamp | FieldValue;
  dataSharingReason: string;
  
  // Marketing Consent
  marketing: ConsentLevel;
  marketingLastUpdated: Timestamp | FieldValue;
  marketingReason: string;
  
  // Third-party Integration Consent
  thirdPartyIntegrations: ConsentLevel;
  thirdPartyIntegrationsLastUpdated: Timestamp | FieldValue;
  thirdPartyIntegrationsReason: string;
}

export type ConsentLevel = 'granted' | 'denied' | 'pending' | 'withdrawn';

export interface ConsentHistory {
  id: string;
  userId: string;
  consentType: keyof ConsentSettings;
  previousValue: ConsentLevel;
  newValue: ConsentLevel;
  reason: string;
  timestamp: Timestamp | FieldValue;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// ENHANCED PRIVACY SETTINGS
// ============================================

export interface EnhancedPrivacySettings {
  // Profile Visibility
  profileVisibility: 'public' | 'team_only' | 'private' | 'coaches_only';
  
  // Data Collection Preferences
  allowDataCollection: boolean;
  allowAnonymousDataCollection: boolean;
  allowPerformanceTracking: boolean;
  allowUsageAnalytics: boolean;
  
  // AI Features
  allowAIPersonalization: boolean;
  allowAITraining: boolean;
  allowAISuggestions: boolean;
  allowAIAnalytics: boolean;
  
  // Communication Preferences
  allowEmailNotifications: boolean;
  allowPushNotifications: boolean;
  allowSMSNotifications: boolean;
  allowInAppNotifications: boolean;
  
  // Data Retention
  dataRetentionPeriod: '30_days' | '90_days' | '1_year' | '2_years' | 'indefinite';
  autoDeleteInactiveData: boolean;
  deleteAccountDataOnDeactivation: boolean;
  
  // Data Export/Portability
  allowDataExport: boolean;
  allowDataPortability: boolean;
  
  // Right to be Forgotten
  allowDataDeletion: boolean;
  deletionConfirmationRequired: boolean;
  
  // Audit and Transparency
  showDataUsageHistory: boolean;
  showConsentHistory: boolean;
  showDataAccessLogs: boolean;
}

// ============================================
// DATA ANONYMIZATION TYPES
// ============================================

export interface AnonymizedData {
  id: string;
  originalDataType: string;
  anonymizedData: Record<string, any>;
  anonymizationLevel: 'low' | 'medium' | 'high';
  anonymizationMethod: string;
  retentionPeriod: string;
  createdAt: Timestamp | FieldValue;
  expiresAt: Timestamp | FieldValue;
  metadata: AnonymizationMetadata;
}

export interface AnonymizationMetadata {
  originalDataSize: number;
  anonymizedDataSize: number;
  piiFieldsRemoved: string[];
  sensitiveFieldsMasked: string[];
  anonymizationVersion: string;
  complianceStandards: string[];
}

// ============================================
// AUDIT LOGGING TYPES
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  timestamp: Timestamp | FieldValue;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outcome: 'success' | 'failure' | 'partial';
}

export interface DataAccessLog {
  id: string;
  userId: string;
  dataType: string;
  accessType: 'read' | 'write' | 'delete' | 'export';
  dataId?: string;
  timestamp: Timestamp | FieldValue;
  purpose: string;
  consentLevel: ConsentLevel;
  anonymized: boolean;
}

// ============================================
// PRIVACY COMPLIANCE TYPES
// ============================================

export interface PrivacyCompliance {
  gdpr: GDPRCompliance;
  ferpa: FERPACompliance;
  coppa: COPPACompliance;
  hipaa: HIPAACompliance;
  lastUpdated: Timestamp | FieldValue;
}

export interface GDPRCompliance {
  dataProcessingBasis: 'consent' | 'legitimate_interest' | 'contract' | 'legal_obligation';
  dataSubjectRights: {
    rightToAccess: boolean;
    rightToRectification: boolean;
    rightToErasure: boolean;
    rightToPortability: boolean;
    rightToObject: boolean;
    rightToRestriction: boolean;
  };
  dataProtectionOfficer?: string;
  dataBreachNotification: boolean;
}

export interface FERPACompliance {
  educationalInstitution: boolean;
  studentDataProtection: boolean;
  parentConsentRequired: boolean;
  directoryInformationOptOut: boolean;
  annualNotification: boolean;
}

export interface COPPACompliance {
  under13Protection: boolean;
  parentalConsentRequired: boolean;
  limitedDataCollection: boolean;
  noPersonalizedAds: boolean;
  parentalAccess: boolean;
}

export interface HIPAACompliance {
  coveredEntity: boolean;
  phiProtection: boolean;
  minimumNecessary: boolean;
  accessControls: boolean;
  auditTrail: boolean;
} 