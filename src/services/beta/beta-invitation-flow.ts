import dayjs from 'dayjs';
import { waitlistAdminService, WaitlistAdminEntry } from '../waitlist/waitlist-admin-service';
import { BetaProgramService } from './beta-program.service';

export interface SelectionCriteria {
  cohortId: string;
  maxInvites?: number;
  since?: Date;
  prioritizeReferrals?: boolean;
}

export interface WaitlistUser extends WaitlistAdminEntry {}

const betaProgramService = new BetaProgramService();

export const BetaInvitationFlow = {
  async selectBetaUsers(criteria: SelectionCriteria): Promise<WaitlistUser[]> {
    const { maxInvites = 50, since, prioritizeReferrals } = criteria;
    const allEntries = await waitlistAdminService.getAllWaitlistEntries({ status: 'pending' });

    let filtered = allEntries.filter((entry) => {
      if (since && entry.timestamp < since) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const dateDiff = dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf();
      if (!prioritizeReferrals) return dateDiff;
      const aReferral = Boolean((a as Record<string, unknown>).referralSource);
      const bReferral = Boolean((b as Record<string, unknown>).referralSource);
      if (aReferral !== bReferral) {
        return aReferral ? -1 : 1;
      }
      return dateDiff;
    });

    return filtered.slice(0, maxInvites);
  },

  async sendInvitations(users: WaitlistUser[], cohortId: string): Promise<void> {
    await Promise.all(
      users.map((user) => betaProgramService.inviteBetaUser(user.email, cohortId))
    );
  },

  async trackAcceptance(cohortId: string) {
    const invites = await betaProgramService.getBetaMetrics(cohortId);
    return {
      invitesSent: invites.invitesSent,
      acceptedInvites: invites.acceptedInvites,
      activationRate: invites.invitesSent
        ? Math.round((invites.acceptedInvites / invites.invitesSent) * 100) / 100
        : 0,
      onboardingRate: invites.acceptedInvites
        ? Math.round((invites.onboardingCompleted / invites.acceptedInvites) * 100) / 100
        : 0,
    };
  },
};
