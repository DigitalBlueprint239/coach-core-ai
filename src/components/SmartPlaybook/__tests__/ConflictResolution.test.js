"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_2 = require("@testing-library/react");
const EnhancedPlayEditor_1 = require("../EnhancedPlayEditor");
const ConflictResolutionDialog_1 = require("../ConflictResolutionDialog");
const firestore_1 = require("../../../services/firestore");
const useAuth_1 = require("../../../hooks/useAuth");
// Mock dependencies
jest.mock('../../../services/firestore');
jest.mock('../../../hooks/useAuth');
const mockUpdatePlay = firestore_1.updatePlay;
const mockGetPlays = firestore_1.getPlays;
const mockUseAuth = useAuth_1.useAuth;
describe('Conflict Resolution Tests', () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    const mockPlay = {
        id: 'play123',
        teamId: 'team123',
        name: 'Test Play',
        formation: '4-3-3',
        description: 'Test description',
        difficulty: 'beginner',
        tags: ['test'],
        version: 1,
        lastModifiedBy: 'user123',
        lastModifiedAt: { seconds: 1234567890 },
        createdBy: 'user123',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
    });
    describe('EnhancedPlayEditor', () => {
        it('should handle successful save without conflicts', () => __awaiter(void 0, void 0, void 0, function* () {
            mockGetPlays.mockResolvedValue([mockPlay]);
            mockUpdatePlay.mockResolvedValue();
            const onSave = jest.fn();
            const onError = jest.fn();
            (0, react_2.render)(react_1.default.createElement(EnhancedPlayEditor_1.EnhancedPlayEditor, { teamId: "team123", playId: "play123", onSave: onSave, onError: onError }));
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByDisplayValue('Test Play')).toBeInTheDocument();
            });
            const saveButton = react_2.screen.getByText('Save Changes');
            react_2.fireEvent.click(saveButton);
            yield (0, react_2.waitFor)(() => {
                expect(mockUpdatePlay).toHaveBeenCalledWith('team123', 'play123', expect.objectContaining({
                    name: 'Test Play',
                    version: 1
                }));
                expect(onSave).toHaveBeenCalled();
                expect(onError).not.toHaveBeenCalled();
            });
        }));
        it('should show conflict dialog when version conflict occurs', () => __awaiter(void 0, void 0, void 0, function* () {
            mockGetPlays.mockResolvedValue([mockPlay]);
            mockUpdatePlay.mockRejectedValue(new Error('Play has been modified by another user'));
            const onSave = jest.fn();
            const onError = jest.fn();
            (0, react_2.render)(react_1.default.createElement(EnhancedPlayEditor_1.EnhancedPlayEditor, { teamId: "team123", playId: "play123", onSave: onSave, onError: onError }));
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByDisplayValue('Test Play')).toBeInTheDocument();
            });
            const saveButton = react_2.screen.getByText('Save Changes');
            react_2.fireEvent.click(saveButton);
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByText('Conflict Detected')).toBeInTheDocument();
                expect(react_2.screen.getByText('Discard My Changes')).toBeInTheDocument();
                expect(react_2.screen.getByText('Merge Changes')).toBeInTheDocument();
                expect(react_2.screen.getByText('Overwrite Server Version')).toBeInTheDocument();
            });
        }));
        it('should handle retry logic for network errors', () => __awaiter(void 0, void 0, void 0, function* () {
            mockGetPlays.mockResolvedValue([mockPlay]);
            mockUpdatePlay
                .mockRejectedValueOnce(new Error('network error'))
                .mockRejectedValueOnce(new Error('network error'))
                .mockResolvedValueOnce();
            const onSave = jest.fn();
            const onError = jest.fn();
            (0, react_2.render)(react_1.default.createElement(EnhancedPlayEditor_1.EnhancedPlayEditor, { teamId: "team123", playId: "play123", onSave: onSave, onError: onError }));
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByDisplayValue('Test Play')).toBeInTheDocument();
            });
            const saveButton = react_2.screen.getByText('Save Changes');
            react_2.fireEvent.click(saveButton);
            yield (0, react_2.waitFor)(() => {
                expect(mockUpdatePlay).toHaveBeenCalledTimes(3);
                expect(onSave).toHaveBeenCalled();
            });
        }));
        it('should handle deleted play error', () => __awaiter(void 0, void 0, void 0, function* () {
            mockGetPlays.mockResolvedValue([]);
            mockUpdatePlay.mockRejectedValue(new Error('Play not found or has been deleted'));
            const onSave = jest.fn();
            const onError = jest.fn();
            (0, react_2.render)(react_1.default.createElement(EnhancedPlayEditor_1.EnhancedPlayEditor, { teamId: "team123", playId: "play123", onSave: onSave, onError: onError }));
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByText('Play not found')).toBeInTheDocument();
            });
        }));
        it('should debounce rapid input changes', () => __awaiter(void 0, void 0, void 0, function* () {
            jest.useFakeTimers();
            mockGetPlays.mockResolvedValue([mockPlay]);
            (0, react_2.render)(react_1.default.createElement(EnhancedPlayEditor_1.EnhancedPlayEditor, { teamId: "team123", playId: "play123" }));
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByDisplayValue('Test Play')).toBeInTheDocument();
            });
            const nameInput = react_2.screen.getByDisplayValue('Test Play');
            // Rapid changes
            react_2.fireEvent.change(nameInput, { target: { value: 'New Name 1' } });
            react_2.fireEvent.change(nameInput, { target: { value: 'New Name 2' } });
            react_2.fireEvent.change(nameInput, { target: { value: 'New Name 3' } });
            // Fast-forward timers to trigger debounced save
            jest.runAllTimers();
            yield (0, react_2.waitFor)(() => {
                expect(nameInput).toHaveValue('New Name 3');
            });
            jest.useRealTimers();
        }));
    });
    describe('ConflictResolutionDialog', () => {
        const mockConflictState = {
            isOpen: true,
            localChanges: {
                name: 'My Version',
                description: 'My description'
            },
            serverVersion: Object.assign(Object.assign({}, mockPlay), { name: 'Server Version', description: 'Server description' }),
            conflictingFields: ['name', 'description'],
            lastModifiedBy: 'otheruser',
            lastModifiedAt: new Date('2023-01-01T12:00:00Z')
        };
        it('should display conflict information correctly', () => {
            const onResolve = jest.fn();
            const onClose = jest.fn();
            (0, react_2.render)(react_1.default.createElement(ConflictResolutionDialog_1.ConflictResolutionDialog, { isOpen: true, onClose: onClose, onResolve: onResolve, localChanges: mockConflictState.localChanges, serverVersion: mockConflictState.serverVersion, conflictDetails: {
                    conflictingFields: mockConflictState.conflictingFields,
                    lastModifiedBy: mockConflictState.lastModifiedBy,
                    lastModifiedAt: mockConflictState.lastModifiedAt
                } }));
            expect(react_2.screen.getByText('Conflict Detected')).toBeInTheDocument();
            expect(react_2.screen.getByText(/modified by otheruser/)).toBeInTheDocument();
            expect(react_2.screen.getByText('Your version:')).toBeInTheDocument();
            expect(react_2.screen.getByText('Server version:')).toBeInTheDocument();
        });
        it('should handle discard action', () => __awaiter(void 0, void 0, void 0, function* () {
            const onResolve = jest.fn();
            const onClose = jest.fn();
            (0, react_2.render)(react_1.default.createElement(ConflictResolutionDialog_1.ConflictResolutionDialog, { isOpen: true, onClose: onClose, onResolve: onResolve, localChanges: mockConflictState.localChanges, serverVersion: mockConflictState.serverVersion, conflictDetails: {
                    conflictingFields: mockConflictState.conflictingFields,
                    lastModifiedBy: mockConflictState.lastModifiedBy,
                    lastModifiedAt: mockConflictState.lastModifiedAt
                } }));
            const discardButton = react_2.screen.getByText('Discard My Changes');
            react_2.fireEvent.click(discardButton);
            expect(onResolve).toHaveBeenCalledWith('discard');
        }));
        it('should handle merge action', () => __awaiter(void 0, void 0, void 0, function* () {
            const onResolve = jest.fn();
            const onClose = jest.fn();
            (0, react_2.render)(react_1.default.createElement(ConflictResolutionDialog_1.ConflictResolutionDialog, { isOpen: true, onClose: onClose, onResolve: onResolve, localChanges: mockConflictState.localChanges, serverVersion: mockConflictState.serverVersion, conflictDetails: {
                    conflictingFields: mockConflictState.conflictingFields,
                    lastModifiedBy: mockConflictState.lastModifiedBy,
                    lastModifiedAt: mockConflictState.lastModifiedAt
                } }));
            const mergeButton = react_2.screen.getByText('Merge Changes');
            react_2.fireEvent.click(mergeButton);
            expect(onResolve).toHaveBeenCalledWith('merge');
        }));
        it('should show overwrite warning and handle confirmation', () => __awaiter(void 0, void 0, void 0, function* () {
            const onResolve = jest.fn();
            const onClose = jest.fn();
            (0, react_2.render)(react_1.default.createElement(ConflictResolutionDialog_1.ConflictResolutionDialog, { isOpen: true, onClose: onClose, onResolve: onResolve, localChanges: mockConflictState.localChanges, serverVersion: mockConflictState.serverVersion, conflictDetails: {
                    conflictingFields: mockConflictState.conflictingFields,
                    lastModifiedBy: mockConflictState.lastModifiedBy,
                    lastModifiedAt: mockConflictState.lastModifiedAt
                } }));
            const overwriteButton = react_2.screen.getByText('Overwrite Server Version');
            react_2.fireEvent.click(overwriteButton);
            // Should show warning modal
            yield (0, react_2.waitFor)(() => {
                expect(react_2.screen.getByText('Warning')).toBeInTheDocument();
                expect(react_2.screen.getByText(/You're about to overwrite changes/)).toBeInTheDocument();
            });
            const confirmButton = react_2.screen.getByText('Overwrite Anyway');
            react_2.fireEvent.click(confirmButton);
            expect(onResolve).toHaveBeenCalledWith('overwrite');
        }));
        it('should handle array field conflicts correctly', () => {
            const arrayConflictState = Object.assign(Object.assign({}, mockConflictState), { localChanges: {
                    tags: ['tag1', 'tag2']
                }, serverVersion: Object.assign(Object.assign({}, mockPlay), { tags: ['tag2', 'tag3'] }), conflictingFields: ['tags'] });
            const onResolve = jest.fn();
            const onClose = jest.fn();
            (0, react_2.render)(react_1.default.createElement(ConflictResolutionDialog_1.ConflictResolutionDialog, { isOpen: true, onClose: onClose, onResolve: onResolve, localChanges: arrayConflictState.localChanges, serverVersion: arrayConflictState.serverVersion, conflictDetails: {
                    conflictingFields: arrayConflictState.conflictingFields,
                    lastModifiedBy: arrayConflictState.lastModifiedBy,
                    lastModifiedAt: arrayConflictState.lastModifiedAt
                } }));
            expect(react_2.screen.getByText('tag1, tag2')).toBeInTheDocument();
            expect(react_2.screen.getByText('tag2, tag3')).toBeInTheDocument();
        });
    });
    describe('Merge Logic Tests', () => {
        it('should merge name fields correctly', () => {
            const local = { name: 'My Name' };
            const server = Object.assign(Object.assign({}, mockPlay), { name: '' });
            // Test that non-empty local name is preferred
            const merged = mergeChanges(local, server);
            expect(merged.name).toBe('My Name');
        });
        it('should merge difficulty levels correctly', () => {
            const local = { difficulty: 'advanced' };
            const server = Object.assign(Object.assign({}, mockPlay), { difficulty: 'beginner' });
            // Test that higher difficulty is preferred
            const merged = mergeChanges(local, server);
            expect(merged.difficulty).toBe('advanced');
        });
        it('should merge tags correctly', () => {
            const local = { tags: ['tag1', 'tag2'] };
            const server = Object.assign(Object.assign({}, mockPlay), { tags: ['tag2', 'tag3'] });
            // Test that unique tags are combined
            const merged = mergeChanges(local, server);
            expect(merged.tags).toEqual(['tag2', 'tag3', 'tag1']);
        });
        it('should merge descriptions correctly', () => {
            const local = { description: 'My additions' };
            const server = Object.assign(Object.assign({}, mockPlay), { description: 'Original description' });
            // Test that descriptions are combined
            const merged = mergeChanges(local, server);
            expect(merged.description).toContain('Original description');
            expect(merged.description).toContain('My additions');
        });
    });
});
// Helper function for merge logic testing
function mergeChanges(local, server) {
    const merged = Object.assign({}, server);
    if (local.name && local.name.trim()) {
        merged.name = local.name;
    }
    if (local.formation && local.formation.trim()) {
        merged.formation = local.formation;
    }
    if (local.description && local.description !== server.description) {
        merged.description = `${server.description}\n\n--- Your additions ---\n${local.description}`;
    }
    const difficultyLevels = { beginner: 1, intermediate: 2, advanced: 3 };
    const localLevel = difficultyLevels[local.difficulty || 'beginner'];
    const serverLevel = difficultyLevels[server.difficulty];
    merged.difficulty = localLevel >= serverLevel ? local.difficulty : server.difficulty;
    const localTags = local.tags || [];
    const serverTags = server.tags || [];
    merged.tags = [...new Set([...serverTags, ...localTags])];
    return merged;
}
