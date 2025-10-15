import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  profileImage?: string;
  role: 'head-coach' | 'assistant-coach' | 'administrator' | 'parent-volunteer';
  teamId?: string;
  teamName?: string;
  bio?: string;
  phoneNumber?: string;
  emergencyContact?: string;
  preferences: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
      inApp: boolean;
    };
    privacy: {
      shareProfile: boolean;
      allowAnalytics: boolean;
      publicPlaybook: boolean;
    };
    coaching: {
      experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      focusAreas: string[];
      preferredDrills: string[];
      teamSize: 'small' | 'medium' | 'large';
    };
    ai: {
      autoSuggest: boolean;
      onDemandOnly: boolean;
      confidenceThreshold: number;
      learningEnabled: boolean;
    };
  };
  certifications: string[];
  experience: {
    yearsCoaching: number;
    sports: string[];
    ageGroups: string[];
    achievements: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
}

export interface TeamRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
}

class UserProfileService {
  /**
   * Get user profile from Firestore
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        return null;
      }
      return userDoc.data() as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Create or update user profile
   */
  async upsertUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!profile.uid) {
        throw new Error('User ID is required');
      }

      const userRef = doc(db, 'users', profile.uid);
      const now = new Date();

      const profileData: Partial<UserProfile> = {
        ...profile,
        updatedAt: now,
        lastLogin: now,
      };

      // If creating new profile, set creation date
      if (!profile.createdAt) {
        profileData.createdAt = now;
      }

      await setDoc(userRef, profileData, { merge: true });

      // Return the updated profile
      const updatedDoc = await getDoc(userRef);
      return updatedDoc.data() as UserProfile;
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile fields
   */
  async updateUserProfile(
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get available team roles
   */
  async getTeamRoles(): Promise<TeamRole[]> {
    try {
      const rolesQuery = query(collection(db, 'teamRoles'));
      const rolesSnapshot = await getDocs(rolesQuery);

      if (rolesSnapshot.empty) {
        // Return default roles if none exist
        return this.getDefaultTeamRoles();
      }

      return rolesSnapshot.docs.map(doc => doc.data() as TeamRole);
    } catch (error) {
      console.error('Error fetching team roles:', error);
      return this.getDefaultTeamRoles();
    }
  }

  /**
   * Get default team roles
   */
  private getDefaultTeamRoles(): TeamRole[] {
    return [
      {
        id: 'head-coach',
        name: 'Head Coach',
        description:
          'Primary coach responsible for team strategy and overall direction',
        permissions: [
          'manage_team',
          'create_practices',
          'manage_players',
          'view_analytics',
          'ai_access',
        ],
        isDefault: true,
      },
      {
        id: 'assistant-coach',
        name: 'Assistant Coach',
        description: 'Supporting coach with specific responsibilities',
        permissions: ['create_practices', 'manage_players', 'view_analytics'],
        isDefault: true,
      },
      {
        id: 'administrator',
        name: 'Administrator',
        description: 'Team administrator handling logistics and organization',
        permissions: ['manage_team', 'manage_players', 'view_analytics'],
        isDefault: true,
      },
      {
        id: 'parent-volunteer',
        name: 'Parent Volunteer',
        description: 'Parent helping with team activities',
        permissions: ['view_analytics'],
        isDefault: true,
      },
    ];
  }

  /**
   * Create default user profile from Firebase auth user
   */
  createDefaultProfile(firebaseUser: any): Partial<UserProfile> {
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || 'Coach',
      email: firebaseUser.email || '',
      profileImage: firebaseUser.photoURL || undefined,
      role: 'head-coach',
      preferences: {
        notifications: {
          email: true,
          sms: false,
          push: true,
          inApp: true,
        },
        privacy: {
          shareProfile: false,
          allowAnalytics: true,
          publicPlaybook: false,
        },
        coaching: {
          experienceLevel: 'intermediate',
          focusAreas: ['fundamentals', 'team-building'],
          preferredDrills: [],
          teamSize: 'medium',
        },
        ai: {
          autoSuggest: false,
          onDemandOnly: true,
          confidenceThreshold: 0.7,
          learningEnabled: true,
        },
      },
      certifications: [],
      experience: {
        yearsCoaching: 0,
        sports: ['football'],
        ageGroups: ['youth'],
        achievements: [],
      },
    };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    uid: string,
    preferences: Partial<UserProfile['preferences']>
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        preferences,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUserRole(uid: string, role: UserProfile['role']): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  /**
   * Associate user with a team
   */
  async associateUserWithTeam(
    uid: string,
    teamId: string,
    teamName: string,
    role: UserProfile['role']
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        teamId,
        teamName,
        role,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error associating user with team:', error);
      throw error;
    }
  }

  /**
   * Get user's team information
   */
  async getUserTeam(
    uid: string
  ): Promise<{ teamId: string; teamName: string } | null> {
    try {
      const profile = await this.getUserProfile(uid);
      if (!profile?.teamId || !profile?.teamName) {
        return null;
      }
      return {
        teamId: profile.teamId,
        teamName: profile.teamName,
      };
    } catch (error) {
      console.error('Error getting user team:', error);
      return null;
    }
  }

  /**
   * Search for users by role or team
   */
  async searchUsers(criteria: {
    role?: UserProfile['role'];
    teamId?: string;
    experienceLevel?: string;
  }): Promise<UserProfile[]> {
    try {
      let usersQuery = collection(db, 'users');

      if (criteria.role) {
        usersQuery = query(usersQuery, where('role', '==', criteria.role));
      }

      if (criteria.teamId) {
        usersQuery = query(usersQuery, where('teamId', '==', criteria.teamId));
      }

      const usersSnapshot = await getDocs(usersQuery);
      return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
}

export const userProfileService = new UserProfileService();
export default userProfileService;
