import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { WaitlistEntry } from './waitlist-service';
import { authService } from '../firebase/auth-service';
import { auditLogger } from '../security/audit-logger';
import { UserRole } from '../../types/user';

export interface WaitlistFilters {
  search?: string;
  status?: 'pending' | 'converted' | 'invited';
  source?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ConversionResult {
  entryId: string;
  success: boolean;
  message?: string;
}

export interface WaitlistAdminEntry extends WaitlistEntry {
  id: string;
  status?: 'pending' | 'converted' | 'invited';
  invitedAt?: Date | null;
  convertedAt?: Date | null;
  convertedRole?: UserRole;
  convertedBy?: string | null;
}

const WAITLIST_COLLECTION = 'waitlist';

class WaitlistAdminService {
  async getAllWaitlistEntries(filters: WaitlistFilters = {}): Promise<WaitlistAdminEntry[]> {
    const baseQuery = query(collection(db, WAITLIST_COLLECTION), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(baseQuery);

    const entries: WaitlistAdminEntry[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown> & Partial<WaitlistEntry>;
      return {
        ...(data as Record<string, unknown>),
        id: docSnap.id,
        email: (data.email as string) || '',
        timestamp: this.asDate(data.timestamp) ?? new Date(0),
        invitedAt: this.asDate((data as any).invitedAt) ?? null,
        convertedAt: this.asDate((data as any).convertedAt) ?? null,
        status: (data.status as WaitlistAdminEntry['status']) || undefined,
        convertedRole: (data.convertedRole as UserRole) || undefined,
        convertedBy: (data.convertedBy as string) || null,
        convertedUserId: (data.convertedUserId as string) || null,
      } as WaitlistAdminEntry;
    });

    return this.applyFilters(entries, filters);
  }

  async convertToUser(entryId: string, role: UserRole): Promise<ConversionResult> {
    try {
      const entryRef = doc(db, WAITLIST_COLLECTION, entryId);
      const entrySnap = await getDoc(entryRef);

      if (!entrySnap.exists()) {
        return { entryId, success: false, message: 'Entry not found' };
      }

      const entry = entrySnap.data() as WaitlistAdminEntry;
      const email = entry.email;
      const adminProfile = await authService.getCurrentProfile();

      await authService.convertWaitlistUser(email);

      await updateDoc(entryRef, {
        status: 'converted',
        converted: true,
        convertedAt: serverTimestamp(),
        convertedRole: role,
        convertedBy: adminProfile?.uid || null,
      });

      await this.logAdminAction('convert_user', [entryId], { role });

      return { entryId, success: true };
    } catch (error) {
      await this.logAdminAction('convert_user', [entryId], { error: (error as Error).message }, false);
      return { entryId, success: false, message: (error as Error).message };
    }
  }

  async bulkConvert(entryIds: string[], role: UserRole): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const entryId of entryIds) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.convertToUser(entryId, role);
      results.push(result);
    }

    return results;
  }

  async sendInvitation(entryId: string, customMessage?: string): Promise<void> {
    const entryRef = doc(db, WAITLIST_COLLECTION, entryId);
    const updatePayload: Record<string, unknown> = {
      status: 'invited',
      invitedAt: serverTimestamp(),
    };

    if (customMessage) {
      updatePayload.invitationMessages = arrayUnion(customMessage);
    }

    await updateDoc(entryRef, updatePayload);

    await this.logAdminAction('send_invitation', [entryId], { customMessage });
  }

  async exportToCSV(): Promise<Blob> {
    const entries = await this.getAllWaitlistEntries();
    const headers = [
      'id',
      'email',
      'name',
      'role',
      'source',
      'status',
      'timestamp',
      'convertedAt',
      'convertedRole',
    ];

    const rows = entries.map((entry) => {
      const extra = entry as unknown as Record<string, unknown>;
      const rowValues = [
        entry.id,
        entry.email,
        typeof extra.name === 'string' ? extra.name : '',
        typeof extra.role === 'string' ? extra.role : '',
        entry.source || '',
        entry.status || (entry.converted ? 'converted' : 'pending'),
        entry.timestamp.toISOString(),
        entry.convertedAt ? entry.convertedAt.toISOString() : '',
        entry.convertedRole || '',
      ];

      return rowValues.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    await this.logAdminAction('export_data', entries.map((entry) => entry.id));
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private applyFilters(entries: WaitlistAdminEntry[], filters: WaitlistFilters): WaitlistAdminEntry[] {
    return entries.filter((entry) => {
      if (filters.status && (entry.status || (entry.converted ? 'converted' : 'pending')) !== filters.status) {
        return false;
      }

      if (filters.source && entry.source !== filters.source) {
        return false;
      }

      if (filters.startDate && entry.timestamp && entry.timestamp < filters.startDate) {
        return false;
      }

      if (filters.endDate && entry.timestamp && entry.timestamp > filters.endDate) {
        return false;
      }

      if (filters.search) {
        const queryText = filters.search.toLowerCase();
        return [entry.email, (entry as any).name, entry.source]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(queryText));
      }

      return true;
    });
  }

  private async logAdminAction(
    action: 'convert_user' | 'bulk_convert' | 'send_invitation' | 'export_data',
    targetIds: string[],
    metadata: Record<string, unknown> = {},
    success = true,
  ): Promise<void> {
    const profile = await authService.getCurrentProfile();
    const adminId = profile?.uid || 'unknown';

    await auditLogger.log({
      action,
      resource: 'waitlist_admin',
      userId: adminId,
      userEmail: profile?.email,
      details: {
        targetIds,
        ...metadata,
      },
      severity: success ? 'medium' : 'high',
      success,
    });
  }

  private asDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
      return (value as any).toDate();
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return undefined;
  }
}

export const waitlistAdminService = new WaitlistAdminService();
export type { WaitlistAdminService };
