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
exports.useTeam = exports.TeamManagement = exports.JoinTeamModal = exports.CreateTeamModal = exports.TeamSelector = void 0;
const react_1 = __importStar(require("react"));
const TeamContext_1 = require("../contexts/TeamContext");
Object.defineProperty(exports, "useTeam", { enumerable: true, get: function () { return TeamContext_1.useTeam; } });
const ToastManager_1 = require("./ToastManager");
const TeamSelector = () => {
    const { currentTeam, userTeams, switchTeam, loading } = (0, TeamContext_1.useTeam)();
    const { showToast } = (0, ToastManager_1.useToast)();
    const [showDropdown, setShowDropdown] = (0, react_1.useState)(false);
    const [showCreateModal, setShowCreateModal] = (0, react_1.useState)(false);
    const [showJoinModal, setShowJoinModal] = (0, react_1.useState)(false);
    if (loading) {
        return (react_1.default.createElement("div", { className: "flex items-center space-x-2 text-sm text-gray-600" },
            react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" }),
            react_1.default.createElement("span", null, "Loading teams...")));
    }
    if (userTeams.length === 0) {
        return (react_1.default.createElement("div", { className: "flex items-center space-x-2" },
            react_1.default.createElement("div", { className: "text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md" }, "No teams available")));
    }
    return (react_1.default.createElement("div", { className: "relative" },
        react_1.default.createElement("div", { className: "flex items-center space-x-2" },
            react_1.default.createElement("div", { className: "flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:border-gray-400 transition-colors" },
                react_1.default.createElement("div", { className: "w-2 h-2 bg-green-500 rounded-full" }),
                react_1.default.createElement("span", { className: "text-sm font-medium text-gray-900" }, (currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.name) || 'Select Team'),
                react_1.default.createElement("button", { onClick: () => setShowDropdown(!showDropdown), className: "ml-2 text-gray-400 hover:text-gray-600 transition-colors" },
                    react_1.default.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" }))))),
        showDropdown && (react_1.default.createElement("div", { className: "absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50" },
            react_1.default.createElement("div", { className: "p-2" },
                react_1.default.createElement("div", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2" }, "Your Teams"),
                userTeams.map((team) => (react_1.default.createElement("button", { key: team.id, onClick: () => {
                        switchTeam(team.id);
                        setShowDropdown(false);
                    }, className: `w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${(currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.id) === team.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700'}` },
                    react_1.default.createElement("div", { className: "flex items-center justify-between" },
                        react_1.default.createElement("span", { className: "font-medium" }, team.name),
                        (currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.id) === team.id && (react_1.default.createElement("svg", { className: "w-4 h-4 text-blue-600", fill: "currentColor", viewBox: "0 0 20 20" },
                            react_1.default.createElement("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" })))),
                    react_1.default.createElement("div", { className: "text-xs text-gray-500 mt-1" },
                        "Code: ",
                        team.code,
                        " \u2022 ",
                        team.memberIds.length,
                        " member",
                        team.memberIds.length !== 1 ? 's' : '')))),
                react_1.default.createElement("div", { className: "border-t border-gray-200 mt-2 pt-2" },
                    react_1.default.createElement("div", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2" }, "Quick Actions"),
                    react_1.default.createElement("button", { onClick: () => {
                            setShowCreateModal(true);
                            setShowDropdown(false);
                        }, className: "w-full text-left px-3 py-2 rounded-md text-sm text-blue-600 hover:bg-blue-50 transition-colors" },
                        react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                            react_1.default.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 6v6m0 0v6m0-6h6m-6 0H6" })),
                            react_1.default.createElement("span", null, "Create New Team"))),
                    react_1.default.createElement("button", { onClick: () => {
                            setShowJoinModal(true);
                            setShowDropdown(false);
                        }, className: "w-full text-left px-3 py-2 rounded-md text-sm text-green-600 hover:bg-green-50 transition-colors" },
                        react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                            react_1.default.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                                react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" })),
                            react_1.default.createElement("span", null, "Join Team"))))))),
        react_1.default.createElement(exports.CreateTeamModal, { isOpen: showCreateModal, onClose: () => setShowCreateModal(false) }),
        react_1.default.createElement(exports.JoinTeamModal, { isOpen: showJoinModal, onClose: () => setShowJoinModal(false) }),
        showDropdown && (react_1.default.createElement("div", { className: "fixed inset-0 z-40", onClick: () => setShowDropdown(false) }))));
};
exports.TeamSelector = TeamSelector;
const CreateTeamModal = ({ isOpen, onClose }) => {
    const [teamName, setTeamName] = (0, react_1.useState)('');
    const [isCreating, setIsCreating] = (0, react_1.useState)(false);
    const { createTeam } = (0, TeamContext_1.useTeam)();
    const { showToast } = (0, ToastManager_1.useToast)();
    const handleSubmit = (e) => __awaiter(void 0, void 0, void 0, function* () {
        e.preventDefault();
        if (!teamName.trim())
            return;
        setIsCreating(true);
        try {
            yield createTeam({ name: teamName.trim() });
            showToast('Team created successfully!', 'success');
            setTeamName('');
            onClose();
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to create team', 'error');
        }
        finally {
            setIsCreating(false);
        }
    });
    if (!isOpen)
        return null;
    return (react_1.default.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" },
        react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out" },
            react_1.default.createElement("div", { className: "p-6" },
                react_1.default.createElement("div", { className: "flex items-center justify-between mb-6" },
                    react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900" }, "Create New Team"),
                    react_1.default.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition-colors" },
                        react_1.default.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))),
                react_1.default.createElement("form", { onSubmit: handleSubmit },
                    react_1.default.createElement("div", { className: "mb-6" },
                        react_1.default.createElement("label", { htmlFor: "team-name", className: "block text-sm font-medium text-gray-700 mb-2" }, "Team Name"),
                        react_1.default.createElement("input", { type: "text", id: "team-name", value: teamName, onChange: (e) => setTeamName(e.target.value), className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors", placeholder: "Enter your team name", required: true, autoFocus: true })),
                    react_1.default.createElement("div", { className: "flex justify-end space-x-3" },
                        react_1.default.createElement("button", { type: "button", onClick: onClose, className: "px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors" }, "Cancel"),
                        react_1.default.createElement("button", { type: "submit", disabled: isCreating || !teamName.trim(), className: "px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" }, isCreating ? (react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                            react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }),
                            react_1.default.createElement("span", null, "Creating..."))) : ('Create Team'))))))));
};
exports.CreateTeamModal = CreateTeamModal;
const JoinTeamModal = ({ isOpen, onClose }) => {
    const [teamCode, setTeamCode] = (0, react_1.useState)('');
    const [isJoining, setIsJoining] = (0, react_1.useState)(false);
    const { joinTeam } = (0, TeamContext_1.useTeam)();
    const { showToast } = (0, ToastManager_1.useToast)();
    const handleSubmit = (e) => __awaiter(void 0, void 0, void 0, function* () {
        e.preventDefault();
        if (!teamCode.trim())
            return;
        setIsJoining(true);
        try {
            yield joinTeam(teamCode.trim().toUpperCase());
            showToast('Successfully joined team!', 'success');
            setTeamCode('');
            onClose();
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to join team', 'error');
        }
        finally {
            setIsJoining(false);
        }
    });
    if (!isOpen)
        return null;
    return (react_1.default.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" },
        react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out" },
            react_1.default.createElement("div", { className: "p-6" },
                react_1.default.createElement("div", { className: "flex items-center justify-between mb-6" },
                    react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900" }, "Join Team"),
                    react_1.default.createElement("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition-colors" },
                        react_1.default.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))),
                react_1.default.createElement("form", { onSubmit: handleSubmit },
                    react_1.default.createElement("div", { className: "mb-6" },
                        react_1.default.createElement("label", { htmlFor: "team-code", className: "block text-sm font-medium text-gray-700 mb-2" }, "Team Code"),
                        react_1.default.createElement("input", { type: "text", id: "team-code", value: teamCode, onChange: (e) => setTeamCode(e.target.value.toUpperCase()), className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-xl font-mono tracking-widest transition-colors", placeholder: "ABC123", maxLength: 6, required: true, autoFocus: true }),
                        react_1.default.createElement("p", { className: "text-xs text-gray-500 mt-2 text-center" }, "Enter the 6-character team code provided by your coach")),
                    react_1.default.createElement("div", { className: "flex justify-end space-x-3" },
                        react_1.default.createElement("button", { type: "button", onClick: onClose, className: "px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors" }, "Cancel"),
                        react_1.default.createElement("button", { type: "submit", disabled: isJoining || !teamCode.trim(), className: "px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" }, isJoining ? (react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                            react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }),
                            react_1.default.createElement("span", null, "Joining..."))) : ('Join Team'))))))));
};
exports.JoinTeamModal = JoinTeamModal;
const TeamManagement = () => {
    const [showCreateModal, setShowCreateModal] = (0, react_1.useState)(false);
    const [showJoinModal, setShowJoinModal] = (0, react_1.useState)(false);
    const { currentTeam, userTeams, leaveTeam, switchTeam } = (0, TeamContext_1.useTeam)();
    const { showToast } = (0, ToastManager_1.useToast)();
    const handleLeaveTeam = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!currentTeam)
            return;
        if (userTeams.length === 1) {
            showToast('You must be a member of at least one team', 'error');
            return;
        }
        try {
            yield leaveTeam(currentTeam.id);
            showToast('Successfully left team', 'success');
        }
        catch (error) {
            showToast(error instanceof Error ? error.message : 'Failed to leave team', 'error');
        }
    });
    return (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow p-6" },
        react_1.default.createElement("div", { className: "flex items-center justify-between mb-6" },
            react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900" }, "Team Management"),
            react_1.default.createElement("div", { className: "flex space-x-2" },
                react_1.default.createElement("button", { onClick: () => setShowCreateModal(true), className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500" }, "Create Team"),
                react_1.default.createElement("button", { onClick: () => setShowJoinModal(true), className: "px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500" }, "Join Team"))),
        react_1.default.createElement("div", { className: "space-y-4" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "Current Team"),
                currentTeam ? (react_1.default.createElement("div", { className: "bg-gray-50 rounded-lg p-4" },
                    react_1.default.createElement("div", { className: "flex items-center justify-between" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h4", { className: "font-medium text-gray-900" }, currentTeam.name),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" },
                                "Code: ",
                                currentTeam.code),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" },
                                currentTeam.memberIds.length,
                                " member",
                                currentTeam.memberIds.length !== 1 ? 's' : '')),
                        userTeams.length > 1 && (react_1.default.createElement("button", { onClick: handleLeaveTeam, className: "px-3 py-1 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500" }, "Leave Team"))))) : (react_1.default.createElement("p", { className: "text-gray-500" }, "No team selected"))),
            userTeams.length > 1 && (react_1.default.createElement("div", null,
                react_1.default.createElement("h3", { className: "text-lg font-medium text-gray-900 mb-2" }, "Your Teams"),
                react_1.default.createElement("div", { className: "space-y-2" }, userTeams.map((team) => (react_1.default.createElement("div", { key: team.id, className: `flex items-center justify-between p-3 rounded-lg border ${(currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.id) === team.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white'}` },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h4", { className: "font-medium text-gray-900" }, team.name),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" },
                            "Code: ",
                            team.code)),
                    (currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.id) !== team.id && (react_1.default.createElement("button", { onClick: () => switchTeam(team.id), className: "px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500" }, "Switch to"))))))))),
        react_1.default.createElement(exports.CreateTeamModal, { isOpen: showCreateModal, onClose: () => setShowCreateModal(false) }),
        react_1.default.createElement(exports.JoinTeamModal, { isOpen: showJoinModal, onClose: () => setShowJoinModal(false) })));
};
exports.TeamManagement = TeamManagement;
