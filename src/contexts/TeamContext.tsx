import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Team {
  id: string;
  name: string;
  sport: string;
  level: string;
  code: string;
  memberIds: string[];
}

interface TeamContextType {
  currentTeam: Team | null;
  teams: Team[];
  userTeams: Team[];
  loading: boolean;
  setCurrentTeam: (team: Team | null) => void;
  switchTeam: (teamId: string) => void;
  addTeam: (team: Team) => void;
  createTeam: (teamData: Partial<Team>) => Promise<Team | null>;
  joinTeam: (teamCode: string) => Promise<boolean>;
  leaveTeam: (teamId: string) => void;
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
  const [currentTeam, setCurrentTeam] = useState<Team | null>({
    id: 'demo-team',
    name: 'Demo Team',
    sport: 'football',
    level: 'varsity',
    code: 'DEMO123',
    memberIds: ['user1', 'user2']
  });
  const [teams] = useState<Team[]>([
    {
      id: 'demo-team',
      name: 'Demo Team',
      sport: 'football',
      level: 'varsity',
      code: 'DEMO123',
      memberIds: ['user1', 'user2']
    }
  ]);
  const [loading, setLoading] = useState(false);

  const addTeam = (team: Team) => {
    // Implementation for adding teams
  };

  const createTeam = async (teamData: Partial<Team>): Promise<Team | null> => {
    // Implementation for creating teams
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: teamData.name || 'New Team',
      sport: teamData.sport || 'football',
      level: teamData.level || 'varsity',
      code: teamData.code || `CODE${Date.now()}`,
      memberIds: teamData.memberIds || []
    };
    return newTeam;
  };

  const joinTeam = async (teamCode: string): Promise<boolean> => {
    // Implementation for joining teams
    return true;
  };

  const switchTeam = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setCurrentTeam(team);
    }
  };

  const leaveTeam = (teamId: string) => {
    // Implementation for leaving teams
  };

  const value: TeamContextType = {
    currentTeam,
    teams,
    userTeams: teams, // For now, use teams as userTeams
    loading,
    setCurrentTeam,
    switchTeam,
    addTeam,
    createTeam,
    joinTeam,
    leaveTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}; 