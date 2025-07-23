// src/security/PrivacyManager.ts
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  ConsentSettings, 
  EnhancedPrivacySettings, 
  PrivacyCompliance,
  ConsentLevel 
} from '../types/privacy-schema';

export class PrivacyManager {
  /**
   * Initialize privacy settings for a new user
   */
  static async initializePrivacy(userId: string): Promise<EnhancedPrivacySettings> {
    const defaultSettings: EnhancedPrivacySettings = {
      profileVisibility: 'team_only',
      allowDataCollection: false,
      allowAnonymousDataCollection: false,
      allowPerformanceTracking: false,
      allowUsageAnalytics: false,
      allowAIPersonalization: false,
      allowAITraining: false,
      allowAISuggestions: false,
      allowAIAnalytics: false,
      allowEmailNotifications: false,
      allowPushNotifications: false,
      allowSMSNotifications: false,
      allowInAppNotifications: true,
      dataRetentionPeriod: '90_days',
      autoDeleteInactiveData: true,
      deleteAccountDataOnDeactivation: true,
      allowDataExport: false,
      allowDataPortability: false,
      allowDataDeletion: true,
      deletionConfirmationRequired: true,
      showDataUsageHistory: true,
      showConsentHistory: true,
      showDataAccessLogs: true
    };

    await setDoc(doc(db, 'privacySettings', userId), defaultSettings);
    return defaultSettings;
  }

  /**
   * Get privacy settings for a user
   */
  static async getPrivacySettings(userId: string): Promise<EnhancedPrivacySettings | null> {
    try {
      const docRef = doc(db, 'privacySettings', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as EnhancedPrivacySettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      return null;
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(
    userId: string,
    updates: Partial<EnhancedPrivacySettings>
  ): Promise<boolean> {
    try {
      const docRef = doc(db, 'privacySettings', userId);
      await updateDoc(docRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return false;
    }
  }

  /**
   * Initialize compliance settings
   */
  static async initializeCompliance(userId: string): Promise<PrivacyCompliance> {
    const defaultCompliance: PrivacyCompliance = {
      gdpr: {
        dataProcessingBasis: 'consent',
        dataSubjectRights: {
          rightToAccess: false,
          rightToRectification: false,
          rightToErasure: false,
          rightToPortability: false,
          rightToObject: false,
          rightToRestriction: false
        },
        dataProtectionOfficer: undefined,
        dataBreachNotification: false
      },
      coppa: {
        under13Protection: false,
        parentalConsentRequired: false,
        limitedDataCollection: false,
        noPersonalizedAds: false,
        parentalAccess: false
      },
      ferpa: {
        educationalInstitution: false,
        studentDataProtection: false,
        parentConsentRequired: false,
        directoryInformationOptOut: false,
        annualNotification: false
      },
      hipaa: {
        coveredEntity: false,
        phiProtection: false,
        minimumNecessary: true,
        accessControls: false,
        auditTrail: false
      },
      lastUpdated: serverTimestamp()
    };

    await setDoc(doc(db, 'privacyCompliance', userId), defaultCompliance);
    return defaultCompliance;
  }

  /**
   * Get compliance settings
   */
  static async getCompliance(userId: string): Promise<PrivacyCompliance | null> {
    try {
      const docRef = doc(db, 'privacyCompliance', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as PrivacyCompliance;
      }
      return null;
    } catch (error) {
      console.error('Error getting compliance settings:', error);
      return null;
    }
  }

  /**
   * Check if user is under 13 (COPPA compliance)
   */
  static async isUnder13(userId: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.birthDate) {
          const age = this.calculateAge(userData.birthDate.toDate());
          return age < 13;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking user age:', error);
      return false;
    }
  }

  /**
   * Calculate age from birth date
   */
  private static calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Check if data collection is allowed
   */
  static async canCollectData(userId: string, dataType: string): Promise<boolean> {
    try {
      const settings = await this.getPrivacySettings(userId);
      if (!settings) return false;

      if (!settings.allowDataCollection) return false;

      // Check age restrictions for certain data types
      if (dataType === 'biometric' || dataType === 'location') {
        const isUnder13 = await this.isUnder13(userId);
        if (isUnder13) return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking data collection permission:', error);
      return false;
    }
  }

  /**
   * Check if AI training is allowed
   */
  static async canTrainAI(userId: string): Promise<boolean> {
    try {
      const settings = await this.getPrivacySettings(userId);
      if (!settings) return false;

      return settings.allowAITraining;
    } catch (error) {
      console.error('Error checking AI training permission:', error);
      return false;
    }
  }

  /**
   * Check if data export is allowed
   */
  static async canExportData(userId: string): Promise<boolean> {
    try {
      const settings = await this.getPrivacySettings(userId);
      if (!settings) return false;

      return settings.allowDataExport;
    } catch (error) {
      console.error('Error checking data export permission:', error);
      return false;
    }
  }

  /**
   * Get data retention period for user
   */
  static async getDataRetentionPeriod(userId: string): Promise<number> {
    try {
      const settings = await this.getPrivacySettings(userId);
      if (!settings) return 90; // Default 90 days

      switch (settings.dataRetentionPeriod) {
        case '30_days': return 30;
        case '90_days': return 90;
        case '1_year': return 365;
        case '2_years': return 730;
        default: return 90;
      }
    } catch (error) {
      console.error('Error getting data retention period:', error);
      return 90;
    }
  }
}