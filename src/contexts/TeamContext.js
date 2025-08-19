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
exports.TeamProvider = exports.useTeam = void 0;
const react_1 = __importStar(require("react"));
const TeamContext = (0, react_1.createContext)(undefined);
const useTeam = () => {
    const context = (0, react_1.useContext)(TeamContext);
    if (context === undefined) {
        throw new Error('useTeam must be used within a TeamProvider');
    }
    return context;
};
exports.useTeam = useTeam;
const TeamProvider = ({ children }) => {
    const [currentTeam, setCurrentTeam] = (0, react_1.useState)({
        id: 'demo-team',
        name: 'Demo Team',
        sport: 'football',
        level: 'varsity',
        code: 'DEMO123',
        memberIds: ['user1', 'user2']
    });
    const [teams] = (0, react_1.useState)([
        {
            id: 'demo-team',
            name: 'Demo Team',
            sport: 'football',
            level: 'varsity',
            code: 'DEMO123',
            memberIds: ['user1', 'user2']
        }
    ]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const addTeam = (team) => {
        // Implementation for adding teams
    };
    const createTeam = (teamData) => __awaiter(void 0, void 0, void 0, function* () {
        // Implementation for creating teams
        const newTeam = {
            id: `team-${Date.now()}`,
            name: teamData.name || 'New Team',
            sport: teamData.sport || 'football',
            level: teamData.level || 'varsity',
            code: teamData.code || `CODE${Date.now()}`,
            memberIds: teamData.memberIds || []
        };
        return newTeam;
    });
    const joinTeam = (teamCode) => __awaiter(void 0, void 0, void 0, function* () {
        // Implementation for joining teams
        return true;
    });
    const switchTeam = (teamId) => {
        const team = teams.find(t => t.id === teamId);
        if (team) {
            setCurrentTeam(team);
        }
    };
    const leaveTeam = (teamId) => {
        // Implementation for leaving teams
    };
    const value = {
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
    return (react_1.default.createElement(TeamContext.Provider, { value: value }, children));
};
exports.TeamProvider = TeamProvider;
