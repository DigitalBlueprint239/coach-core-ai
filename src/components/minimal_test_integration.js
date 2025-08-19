"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const react_1 = require("react");
const react_2 = require("react");
const TeamContext = (0, react_1.createContext)(undefined);
const useTeam = () => {
    const context = (0, react_1.useContext)(TeamContext);
    if (!context) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
};
// Mock TeamProvider for demonstration
const TeamProvider = ({ children }) => {
    const [currentTeam, setCurrentTeam] = (0, react_1.useState)(null);
    const [userTeams, setUserTeams] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const createTeam = (teamData) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        // Simulate API call
        yield new Promise(resolve => setTimeout(resolve, 1000));
        try {
            const newTeam = {
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
            setUserTeams((prev) => [...prev, newTeam]);
            setCurrentTeam(newTeam);
            setLoading(false);
            return newTeam.id;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
            throw err;
        }
    });
    const joinTeam = (joinCode) => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        // Simulate API call
        yield new Promise(resolve => setTimeout(resolve, 1000));
        try {
            // Mock finding team by join code
            const foundTeam = {
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
            setUserTeams((prev) => [...prev, foundTeam]);
            setCurrentTeam(foundTeam);
            setLoading(false);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
            throw err;
        }
    });
    const value = {
        currentTeam,
        userTeams,
        loading,
        error,
        createTeam,
        joinTeam
    };
    return (React.createElement(TeamContext.Provider, { value: value }, children));
};
// Simple test component to verify team management works
const TeamTestComponent = () => {
    const { currentTeam, userTeams, loading, error, createTeam, joinTeam } = useTeam();
    const [testStatus, setTestStatus] = (0, react_1.useState)('');
    const [joinCode, setJoinCode] = (0, react_1.useState)('');
    const [showJoinForm, setShowJoinForm] = (0, react_1.useState)(false);
    const runCreateTeamTest = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            setTestStatus('Testing team creation...');
            // Test creating a team
            const teamId = yield createTeam({
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
        }
        catch (error) {
            setTestStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    const runJoinTeamTest = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!joinCode.trim()) {
            setTestStatus('❌ Please enter a join code');
            return;
        }
        try {
            setTestStatus('Testing team joining...');
            yield joinTeam(joinCode.trim().toUpperCase());
            setTestStatus(`✅ Successfully joined team with code: ${joinCode}`);
            setShowJoinForm(false);
            setJoinCode('');
        }
        catch (error) {
            setTestStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    if (loading) {
        return (React.createElement("div", { className: "p-4 text-center" },
            React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" }),
            React.createElement("p", null, "Loading team data...")));
    }
    return (React.createElement("div", { className: "p-6 max-w-md mx-auto bg-white rounded-lg shadow" },
        React.createElement("h2", { className: "text-xl font-bold mb-4" }, "Team Management Test"),
        React.createElement("div", { className: "mb-4 p-3 bg-gray-50 rounded" },
            React.createElement("p", { className: "text-sm text-gray-600" },
                React.createElement("strong", null, "Status:"),
                " ",
                error ? `Error - ${error}` : 'Ready'),
            React.createElement("p", { className: "text-sm text-gray-600" },
                React.createElement("strong", null, "Teams:"),
                " ",
                userTeams.length),
            React.createElement("p", { className: "text-sm text-gray-600" },
                React.createElement("strong", null, "Current Team:"),
                " ",
                (currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.name) || 'None')),
        currentTeam && (React.createElement("div", { className: "mb-4 p-3 bg-green-50 border border-green-200 rounded" },
            React.createElement("p", { className: "font-medium text-green-800" }, "Current Team:"),
            React.createElement("p", { className: "text-sm text-green-700" }, currentTeam.name),
            React.createElement("p", { className: "text-xs text-green-600" },
                "Join Code: ",
                React.createElement("span", { className: "font-mono font-bold" }, currentTeam.joinCode)),
            React.createElement("p", { className: "text-xs text-gray-500" },
                currentTeam.sport,
                " \u2022 ",
                currentTeam.ageGroup,
                " \u2022 ",
                currentTeam.season))),
        React.createElement("div", { className: "space-y-3" },
            React.createElement("button", { onClick: runCreateTeamTest, disabled: loading, className: "w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" }, loading ? 'Creating...' : 'Test Create Team'),
            !showJoinForm ? (React.createElement("button", { onClick: () => setShowJoinForm(true), className: "w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700" }, "Test Join Team")) : (React.createElement("div", { className: "space-y-2" },
                React.createElement("input", { type: "text", value: joinCode, onChange: (e) => setJoinCode(e.target.value.toUpperCase()), placeholder: "Enter join code (e.g., ABC123)", className: "w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500", maxLength: 6 }),
                React.createElement("div", { className: "flex space-x-2" },
                    React.createElement("button", { onClick: runJoinTeamTest, disabled: loading || joinCode.length === 0, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" }, loading ? 'Joining...' : 'Join'),
                    React.createElement("button", { onClick: () => {
                            setShowJoinForm(false);
                            setJoinCode('');
                        }, className: "px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400" }, "Cancel")))),
            currentTeam && !showJoinForm && (React.createElement("button", { onClick: () => {
                    setJoinCode(currentTeam.joinCode);
                    setShowJoinForm(true);
                }, className: "w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm" }, "Test Join with Current Team Code"))),
        userTeams.length > 0 && (React.createElement("div", { className: "mt-4" },
            React.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "Your Teams:"),
            React.createElement("div", { className: "space-y-2" }, userTeams.map((team) => (React.createElement("div", { key: team.id, className: `p-2 border rounded text-sm ${(currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.id) === team.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'}` },
                React.createElement("div", { className: "font-medium" }, team.name),
                React.createElement("div", { className: "text-xs text-gray-500" },
                    "Code: ",
                    team.joinCode,
                    " \u2022 ",
                    team.sport))))))),
        testStatus && (React.createElement("div", { className: "mt-4 p-3 bg-gray-50 border rounded" },
            React.createElement("p", { className: "text-sm" }, testStatus)))));
};
// Main test app
const TeamManagementTest = () => {
    const [user, setUser] = (0, react_1.useState)({ email: 'demo@coachcore.ai', uid: 'demo-user' });
    const [authLoading, setAuthLoading] = (0, react_1.useState)(false);
    // Simulate authentication for demo
    (0, react_2.useEffect)(() => {
        const timer = setTimeout(() => {
            setAuthLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);
    if (authLoading) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "text-center" },
                React.createElement("div", { className: "animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" }),
                React.createElement("p", null, "Loading authentication..."))));
    }
    if (!user) {
        return (React.createElement("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center" },
            React.createElement("div", { className: "bg-white p-8 rounded-lg shadow text-center" },
                React.createElement("h1", { className: "text-2xl font-bold mb-4" }, "Team Management Test"),
                React.createElement("p", { className: "text-gray-600 mb-4" }, "Please sign in to test team management"),
                React.createElement("button", { onClick: () => setUser({ email: 'demo@coachcore.ai', uid: 'demo-user' }), className: "px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" }, "Sign In (Demo)"))));
    }
    return (React.createElement("div", { className: "min-h-screen bg-gray-50" },
        React.createElement("div", { className: "container mx-auto py-8 px-4" },
            React.createElement("div", { className: "text-center mb-8" },
                React.createElement("h1", { className: "text-3xl font-bold text-gray-900" }, "Coach Core AI"),
                React.createElement("p", { className: "text-gray-600" }, "Team Management Integration Test"),
                React.createElement("p", { className: "text-sm text-gray-500" },
                    "Signed in as: ",
                    user.email),
                React.createElement("button", { onClick: () => setUser(null), className: "mt-2 text-sm text-blue-600 hover:text-blue-800" }, "Sign Out")),
            React.createElement(TeamProvider, null,
                React.createElement(TeamTestComponent, null),
                React.createElement("div", { className: "mt-8 max-w-md mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4" },
                    React.createElement("h3", { className: "font-medium text-blue-900 mb-2" }, "Test Instructions:"),
                    React.createElement("ol", { className: "text-sm text-blue-800 space-y-1 list-decimal list-inside" },
                        React.createElement("li", null, "Click \"Test Create Team\" to create a team"),
                        React.createElement("li", null, "Note the generated join code"),
                        React.createElement("li", null, "Click \"Test Join Team\" and enter a code"),
                        React.createElement("li", null, "Or use \"Test Join with Current Team Code\" for quick testing"),
                        React.createElement("li", null, "Watch how teams are managed and switched")),
                    React.createElement("p", { className: "text-xs text-blue-600 mt-3" }, "This demonstrates the team management functionality you'll integrate into your actual app."))))));
};
exports.default = TeamManagementTest;
