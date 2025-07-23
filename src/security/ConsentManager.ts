// src/security/ConsentManager.ts
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { ConsentSettings, ConsentHistory, ConsentLevel } from '../types/privacy-schema';

export class ConsentManager {
  private static readonly CONSENT_TYPES = [
    'aiTraining',
    'analytics', 
    'dataCollection',
    'dataSharing',
    'marketing',
    'thirdPartyIntegrations'
  ] as const;

  /**
   * Initialize consent settings for a new user
   */
  static async initializeConsent(userId: string): Promise<ConsentSettings> {
    const defaultConsent: ConsentSettings = {
      aiTraining: 'pending',
      aiTrainingLastUpdated: serverTimestamp(),
      aiTrainingReason: 'Initial setup',
      analytics: 'pending',
      analyticsLastUpdated: serverTimestamp(),
      analyticsReason: 'Initial setup',
      dataCollection: 'pending',
      dataCollectionLastUpdated: serverTimestamp(),
      dataCollectionReason: 'Initial setup',
      dataSharing: 'denied',
      dataSharingLastUpdated: serverTimestamp(),
      dataSharingReason: 'Initial setup - denied by default',
      marketing: 'denied',
      marketingLastUpdated: serverTimestamp(),
      marketingReason: 'Initial setup - denied by default',
      thirdPartyIntegrations: 'denied',
      thirdPartyIntegrationsLastUpdated: serverTimestamp(),
      thirdPartyIntegrationsReason: 'Initial setup - denied by default'
    };

    await setDoc(doc(db, 'users', userId, 'privacy', 'consent'), defaultConsent);
    return defaultConsent;
  }

  /**
   * Get consent settings for a user
   */
  static async getConsent(userId: string): Promise<ConsentSettings | null> {
    try {
      const docRef = doc(db, 'users', userId, 'privacy', 'consent');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as ConsentSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting consent settings:', error);
      return null;
    }
  }

  /**
   * Update consent for a specific type
   */
  static async updateConsent(
    userId: string,
    consentType: keyof ConsentSettings,
    newValue: ConsentLevel,
    reason: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<boolean> {
    try {
      const currentConsent = await this.getConsent(userId);
      if (!currentConsent) return false;

      const previousValue = currentConsent[consentType] as ConsentLevel;
      
      const updateData = {
        [consentType]: newValue,
        [`${consentType}LastUpdated`]: serverTimestamp(),
        [`${consentType}Reason`]: reason
      };

      await updateDoc(doc(db, 'users', userId, 'privacy', 'consent'), updateData);

      // Log consent change
      await this.logConsentChange(userId, consentType, previousValue, newValue, reason, metadata);

      return true;
    } catch (error) {
      console.error('Error updating consent:', error);
      return false;
    }
  }

  /**
   * Check if user has given consent for a specific type
   */
  static async hasConsent(userId: string, consentType: keyof ConsentSettings): Promise<boolean> {
    const consent = await this.getConsent(userId);
    if (!consent) return false;
    
    return consent[consentType] === 'granted';
  }

  /**
   * Get consent history for a user
   */
  static async getConsentHistory(userId: string, limitCount: number = 50): Promise<ConsentHistory[]> {
    try {
      const q = query(
        collection(db, 'users', userId, 'privacy', 'consentHistory'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ConsentHistory);
    } catch (error) {
      console.error('Error getting consent history:', error);
      return [];
    }
  }

  /**
   * Log consent change
   */
  private static async logConsentChange(
    userId: string,
    consentType: keyof ConsentSettings,
    previousValue: ConsentLevel,
    newValue: ConsentLevel,
    reason: string,
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    const consentHistory: Omit<ConsentHistory, 'id'> = {
      userId,
      consentType,
      previousValue,
      newValue,
      reason,
      timestamp: serverTimestamp(),
      ipAddress: metadata?.ipAddress || 'unknown',
      userAgent: metadata?.userAgent || 'unknown'
    };

    await addDoc(
      collection(db, 'users', userId, 'privacy', 'consentHistory'),
      consentHistory
    );
  }

  /**
   * Withdraw all consent
   */
  static async withdrawAllConsent(userId: string, reason: string): Promise<boolean> {
    try {
      const consentTypes = this.CONSENT_TYPES;

      const updateData: Partial<ConsentSettings> = {};
      
      consentTypes.forEach(type => {
        (updateData as any)[type] = 'withdrawn';
        (updateData as any)[`${type}LastUpdated`] = serverTimestamp();
        (updateData as any)[`${type}Reason`] = reason;
      });

      await updateDoc(doc(db, 'users', userId, 'privacy', 'consent'), updateData);
      return true;
    } catch (error) {
      console.error('Error withdrawing all consent:', error);
      return false;
    }
  }

  /**
   * Get consent summary
   */
  static async getConsentSummary(userId: string): Promise<{
    totalConsents: number;
    grantedConsents: number;
    deniedConsents: number;
    pendingConsents: number;
    withdrawnConsents: number;
    lastUpdated: Date;
  }> {
    try {
      const consent = await this.getConsent(userId);
      if (!consent) {
        return {
          totalConsents: 0,
          grantedConsents: 0,
          deniedConsents: 0,
          pendingConsents: 0,
          withdrawnConsents: 0,
          lastUpdated: new Date()
        };
      }

      const consentValues = Object.values(consent).filter(value => 
        typeof value === 'string' && 
        ['granted', 'denied', 'pending', 'withdrawn'].includes(value)
      ) as ConsentLevel[];

      return {
        totalConsents: consentValues.length,
        grantedConsents: consentValues.filter(v => v === 'granted').length,
        deniedConsents: consentValues.filter(v => v === 'denied').length,
        pendingConsents: consentValues.filter(v => v === 'pending').length,
        withdrawnConsents: consentValues.filter(v => v === 'withdrawn').length,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting consent summary:', error);
      return {
        totalConsents: 0,
        grantedConsents: 0,
        deniedConsents: 0,
        pendingConsents: 0,
        withdrawnConsents: 0,
        lastUpdated: new Date()
      };
    }
  }
} 