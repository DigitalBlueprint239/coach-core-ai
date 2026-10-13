import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../services/firebase';

// Types
export interface Team {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  memberIds: string[];
  memberDetails: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'coach' | 'member';
  joinedAt: Date;
}

interface TeamContextType {
  currentTeam: Team | null;
  userTeams: Team[];
  loading: boolean;
  error: string | null;
  createTeam: (name: string) => Promise<string>;
  joinTeam: (code: string) => Promise<void>;
  switchTeam: (teamId: string) => void;
  leaveTeam: (teamId: string) => Promise<void>;
  updateTeamMember: (teamId: string, memberId: string, updates: Partial<TeamMember>) => Promise<void>;
  removeTeamMember: (teamId: string, memberId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Team display code. Private beta: owner-only teams, so the code is a label,
  // not an access credential (invites are disabled; see joinTeam).
  const generateTeamCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  };

  // Create a new team
  const createTeam = async (name: string): Promise<string> => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('User must be authenticated');

      // Querying other teams' codes is denied by the security rules, so no
      // uniqueness lookup; 8 random characters make collisions negligible.
      const code = generateTeamCode();

      const teamData = {
        name,
        code,
        ownerId: user.uid,
        memberIds: [user.uid],
        memberDetails: [{
          id: user.uid,
          email: user.email || '',
          role: 'owner' as const,
          joinedAt: new Date()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'teams'), teamData);
      return docRef.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team';
      setError(errorMessage);
      throw err;
    }
  };

  // Join a team using a code
  const joinTeam = async (code: string): Promise<void> => {
    // Private beta: teams are owner-only. Joining by code is disabled until a
    // server-side invite flow exists (Day 1 F-08); rules would deny it anyway.
    const message = 'Joining teams is not available during the private beta.';
    setError(message);
    if (message) throw new Error(message);
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('User must be authenticated');

      // Find team by code
      const teamQuery = query(collection(db, 'teams'), where('code', '==', code));
      const teamSnapshot = await getDocs(teamQuery);
      
      if (teamSnapshot.empty) {
        throw new Error('Invalid team code');
      }

      const teamDoc = teamSnapshot.docs[0];
      const teamData = teamDoc.data() as Team;
      const teamId = teamDoc.id;

      // Check if user is already a member
      const isAlreadyMember = teamData.memberIds.includes(user.uid);
      if (isAlreadyMember) {
        throw new Error('You are already a member of this team');
      }

      // Add user to team
      const newMember: TeamMember = {
        id: user.uid,
        email: user.email || '',
        role: 'member',
        joinedAt: new Date()
      };

      const updatedMemberIds = [...teamData.memberIds, user.uid];
      const updatedMemberDetails = [...teamData.memberDetails, newMember];
      await updateDoc(doc(db, 'teams', teamId), {
        memberIds: updatedMemberIds,
        memberDetails: updatedMemberDetails,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join team';
      setError(errorMessage);
      throw err;
    }
  };

  // Switch to a different team
  const switchTeam = (teamId: string) => {
    const team = userTeams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
      localStorage.setItem('currentTeamId', teamId);
    }
  };

  // Leave a team
  const leaveTeam = async (teamId: string): Promise<void> => {
    try {
      setError(null);
      const user = auth.currentUser;
      if (!user) throw new Error('User must be authenticated');

      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) {
        throw new Error('Team not found');
      }

      const teamData = teamDoc.data() as Team;
      const updatedMemberIds = teamData.memberIds.filter(id => id !== user.uid);
      const updatedMemberDetails = teamData.memberDetails.filter(member => member.id !== user.uid);

      if (updatedMemberIds.length === 0) {
        // If no members left, delete the team
        await deleteDoc(doc(db, 'teams', teamId));
      } else {
        // Update team with remaining members
        await updateDoc(doc(db, 'teams', teamId), {
          memberIds: updatedMemberIds,
          memberDetails: updatedMemberDetails,
          updatedAt: serverTimestamp()
        });
      }

      // If leaving current team, switch to first available team
      if (currentTeam?.id === teamId) {
        const remainingTeams = userTeams.filter(t => t.id !== teamId);
        if (remainingTeams.length > 0) {
          switchTeam(remainingTeams[0].id);
        } else {
          setCurrentTeam(null);
          localStorage.removeItem('currentTeamId');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave team';
      setError(errorMessage);
      throw err;
    }
  };

  // Update team member
  const updateTeamMember = async (teamId: string, memberId: string, updates: Partial<TeamMember>): Promise<void> => {
    try {
      setError(null);
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) {
        throw new Error('Team not found');
      }

      const teamData = teamDoc.data() as Team;
      const updatedMemberDetails = teamData.memberDetails.map(member => 
        member.id === memberId ? { ...member, ...updates } : member
      );

      await updateDoc(doc(db, 'teams', teamId), {
        memberDetails: updatedMemberDetails,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update team member';
      setError(errorMessage);
      throw err;
    }
  };

  // Remove team member
  const removeTeamMember = async (teamId: string, memberId: string): Promise<void> => {
    try {
      setError(null);
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (!teamDoc.exists()) {
        throw new Error('Team not found');
      }

      const teamData = teamDoc.data() as Team;
      const updatedMemberIds = teamData.memberIds.filter(id => id !== memberId);
      const updatedMemberDetails = teamData.memberDetails.filter(member => member.id !== memberId);

      if (updatedMemberIds.length === 0) {
        // If no members left, delete the team
        await deleteDoc(doc(db, 'teams', teamId));
      } else {
        // Update team with remaining members
        await updateDoc(doc(db, 'teams', teamId), {
          memberIds: updatedMemberIds,
          memberDetails: updatedMemberDetails,
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove team member';
      setError(errorMessage);
      throw err;
    }
  };

  // Load user's teams
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      // Owner-only tenancy: the rules allow listing only the caller's own teams.
      query(collection(db, 'teams'), where('ownerId', '==', user.uid)),
      (snapshot) => {
        const teams: Team[] = [];
        snapshot.forEach((doc) => {
          teams.push({ id: doc.id, ...doc.data() } as Team);
        });
        setUserTeams(teams);

        // Set current team if not already set
        if (!currentTeam && teams.length > 0) {
          const savedTeamId = localStorage.getItem('currentTeamId');
          const teamToSet = savedTeamId 
            ? teams.find(t => t.id === savedTeamId) 
            : teams[0];
          
          if (teamToSet) {
            setCurrentTeam(teamToSet);
            localStorage.setItem('currentTeamId', teamToSet.id);
          }
        }

        setLoading(false);
      },
      (err) => {
        console.error('Error loading teams:', err);
        setError('Failed to load teams');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentTeam]);

  const value: TeamContextType = {
    currentTeam,
    userTeams,
    loading,
    error,
    createTeam,
    joinTeam,
    switchTeam,
    leaveTeam,
    updateTeamMember,
    removeTeamMember
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}; 