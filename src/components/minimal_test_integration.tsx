import * as React from "react";
import { createContext, useContext, useState, ReactNode } from "react";
import { useEffect } from "react";

// Mock team data and context for demonstration
type Team = {
  id: string;
  name: string;
  joinCode: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  sport?: string;
  ageGroup?: string;
  season?: string;
  description?: string;
  settings?: {
    isPublic?: boolean;
    allowPlayerJoin?: boolean;
    maxMembers?: number;
  };
};

type TeamContextType = {
  currentTeam: Team | null;
  userTeams: Team[];
  loading: boolean;
  error: string | null;
  createTeam: (teamData: Partial<Team>) => Promise<string>;
  joinTeam: (joinCode: string) => Promise<void>;
};

const TeamContext = createContext<TeamContextType | undefined>(undefined);

const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
};

// Mock TeamProvider for demonstration
const TeamProvider = ({ children }: { children: ReactNode }) => {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createTeam = async (teamData: Partial<Team>): Promise<string> => {
    setLoading(true);
    setError(null);
    // Simulate API call
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    try {
      const newTeam: Team = {
        id: `team_${Date.now()}`,
        name: teamData.name || 'Unnamed Team',
        joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdBy: 'current-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        sport: teamData.sport,
        ageGroup: teamData.ageGroup,
        season: teamData.season,
        description: teamData.description,
        settings: teamData.settings,
      };
      setUserTeams((prev: Team[]) => [...prev, newTeam]);
      setCurrentTeam(newTeam);
      setLoading(false);
      return newTeam.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      throw err;
    }
  };

  const joinTeam = async (joinCode: string): Promise<void> => {
    setLoading(true);
    setError(null);
    // Simulate API call
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    try {
      // Mock finding team by join code
      const foundTeam: Team = {
        id: `team_${Date.now()}`,
        name: `Team ${joinCode}`,
        sport: 'football',
        ageGroup: 'high_school',
        season: '2024',
        joinCode: joinCode,
        createdBy: 'other-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setUserTeams((prev: Team[]) => [...prev, foundTeam]);
      setCurrentTeam(foundTeam);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      throw err;
    }
  };

  const value = {
    currentTeam,
    userTeams,
    loading,
    error,
    createTeam,
    joinTeam
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
};
// Simple test component to verify team management works
const TeamTestComponent = () => {
  const { 
    currentTeam, 
    userTeams, 
    loading, 
    error, 
    createTeam, 
    joinTeam 
  } = useTeam();

  const [testStatus, setTestStatus] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [showJoinForm, setShowJoinForm] = useState<boolean>(false);

  const runCreateTeamTest = async (): Promise<void> => {
    try {
      setTestStatus('Testing team creation...');
      // Test creating a team
      const teamId = await createTeam({
        name: 'Test Team',
        sport: 'football',
        ageGroup: 'high_school',
        season: '2024',
        description: 'Test team for integration',
        settings: {
          isPublic: false,
          allowPlayerJoin: true,
          maxMembers: 50
        }
      });
      setTestStatus(`✅ Team created successfully! ID: ${teamId}`);
    } catch (error) {
      setTestStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const runJoinTeamTest = async (): Promise<void> => {
    if (!joinCode.trim()) {
      setTestStatus('❌ Please enter a join code');
      return;
    }
    try {
      setTestStatus('Testing team joining...');
      await joinTeam(joinCode.trim().toUpperCase());
      setTestStatus(`✅ Successfully joined team with code: ${joinCode}`);
      setShowJoinForm(false);
      setJoinCode('');
    } catch (error) {
      setTestStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading team data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Team Management Test</h2>
      
      {/* Current Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          <strong>Status:</strong> {error ? `Error - ${error}` : 'Ready'}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Teams:</strong> {userTeams.length}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Current Team:</strong> {currentTeam?.name || 'None'}
        </p>
      </div>

      {/* Current Team Display */}
      {currentTeam && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="font-medium text-green-800">Current Team:</p>
          <p className="text-sm text-green-700">{currentTeam.name}</p>
          <p className="text-xs text-green-600">
            Join Code: <span className="font-mono font-bold">{currentTeam.joinCode}</span>
          </p>
          <p className="text-xs text-gray-500">
            {currentTeam.sport} • {currentTeam.ageGroup} • {currentTeam.season}
          </p>
        </div>
      )}

      {/* Test Actions */}
      <div className="space-y-3">
        <button
          onClick={runCreateTeamTest}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Test Create Team'}
        </button>

        {!showJoinForm ? (
          <button
            onClick={() => setShowJoinForm(true)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Join Team
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter join code (e.g., ABC123)"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              maxLength={6}
            />
            <div className="flex space-x-2">
              <button
                onClick={runJoinTeamTest}
                disabled={loading || joinCode.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Joining...' : 'Join'}
              </button>
              <button
                onClick={() => {
                  setShowJoinForm(false);
                  setJoinCode('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Quick test with the current team's join code */}
        {currentTeam && !showJoinForm && (
          <button
            onClick={() => {
              setJoinCode(currentTeam.joinCode);
              setShowJoinForm(true);
            }}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
          >
            Test Join with Current Team Code
          </button>
        )}
      </div>

      {/* Teams List */}
      {userTeams.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-gray-900 mb-2">Your Teams:</h3>
          <div className="space-y-2">
            {userTeams.map((team) => (
              <div 
                key={team.id}
                className={`p-2 border rounded text-sm ${
                  currentTeam?.id === team.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="font-medium">{team.name}</div>
                <div className="text-xs text-gray-500">
                  Code: {team.joinCode} • {team.sport}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Status */}
      {testStatus && (
        <div className="mt-4 p-3 bg-gray-50 border rounded">
          <p className="text-sm">{testStatus}</p>
        </div>
      )}
    </div>
  );
};

// Main test app
const TeamManagementTest = () => {
  const [user, setUser] = useState<{ email: string; uid: string } | null>({ email: 'demo@coachcore.ai', uid: 'demo-user' });
  const [authLoading, setAuthLoading] = useState(false);

  // Simulate authentication for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <h1 className="text-2xl font-bold mb-4">Team Management Test</h1>
          <p className="text-gray-600 mb-4">Please sign in to test team management</p>
          <button
            onClick={() => setUser({ email: 'demo@coachcore.ai', uid: 'demo-user' })}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Sign In (Demo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Coach Core AI</h1>
          <p className="text-gray-600">Team Management Integration Test</p>
          <p className="text-sm text-gray-500">
            Signed in as: {user.email}
          </p>
          <button
            onClick={() => setUser(null)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
          >
            Sign Out
          </button>
        </div>

        <TeamProvider>
          <TeamTestComponent />
          
          {/* Instructions */}
          <div className="mt-8 max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Test Instructions:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Click "Test Create Team" to create a team</li>
              <li>Note the generated join code</li>
              <li>Click "Test Join Team" and enter a code</li>
              <li>Or use "Test Join with Current Team Code" for quick testing</li>
              <li>Watch how teams are managed and switched</li>
            </ol>
            <p className="text-xs text-blue-600 mt-3">
              This demonstrates the team management functionality you'll integrate into your actual app.
            </p>
          </div>
        </TeamProvider>
      </div>
    </div>
  );
};

export default TeamManagementTest;