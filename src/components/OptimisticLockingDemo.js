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
exports.OptimisticLockingDemo = void 0;
// src/components/OptimisticLockingDemo.tsx
const react_1 = __importStar(require("react"));
const optimistic_locking_test_1 = require("../utils/optimistic-locking-test");
const useAuth_1 = require("../hooks/useAuth");
const OptimisticLockingDemo = ({ teamId }) => {
    const { user } = (0, useAuth_1.useAuth)();
    const [testResults, setTestResults] = (0, react_1.useState)([]);
    const [isRunning, setIsRunning] = (0, react_1.useState)(false);
    const [selectedEntityType, setSelectedEntityType] = (0, react_1.useState)('play');
    const [testReport, setTestReport] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const entityTypes = [
        { value: 'play', label: 'Play' },
        { value: 'practicePlan', label: 'Practice Plan' },
        { value: 'player', label: 'Player' },
        { value: 'team', label: 'Team' },
        { value: 'user', label: 'User Profile' }
    ];
    const runSingleEntityTest = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user) {
            setError('User must be authenticated to run tests');
            return;
        }
        setIsRunning(true);
        setError('');
        try {
            // Create a test entity first
            const testEntities = yield optimistic_locking_test_1.optimisticLockingTestManager['createTestEntities'](teamId);
            const entityId = testEntities[selectedEntityType];
            if (!entityId) {
                throw new Error(`Failed to create test ${selectedEntityType}`);
            }
            const result = yield optimistic_locking_test_1.optimisticLockingTestManager.testEntityOptimisticLocking(selectedEntityType, teamId, entityId);
            setTestResults([result]);
            setTestReport(optimistic_locking_test_1.optimisticLockingTestManager.generateTestReport());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setIsRunning(false);
        }
    });
    const runAllEntityTests = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user) {
            setError('User must be authenticated to run tests');
            return;
        }
        setIsRunning(true);
        setError('');
        try {
            const results = yield optimistic_locking_test_1.optimisticLockingTestManager.testAllEntities(teamId);
            setTestResults(results);
            setTestReport(optimistic_locking_test_1.optimisticLockingTestManager.generateTestReport());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setIsRunning(false);
        }
    });
    const runConflictResolutionTests = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user) {
            setError('User must be authenticated to run tests');
            return;
        }
        setIsRunning(true);
        setError('');
        try {
            const results = yield optimistic_locking_test_1.optimisticLockingTestManager.testConflictResolutionStrategies(teamId);
            setTestResults(results);
            setTestReport(optimistic_locking_test_1.optimisticLockingTestManager.generateTestReport());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setIsRunning(false);
        }
    });
    const clearResults = () => {
        setTestResults([]);
        setTestReport('');
        setError('');
        optimistic_locking_test_1.optimisticLockingTestManager.clearTestResults();
    };
    const getStatusColor = (success) => {
        return success ? 'text-green-600' : 'text-red-600';
    };
    const getStatusIcon = (success) => {
        return success ? '✅' : '❌';
    };
    return (react_1.default.createElement("div", { className: "max-w-6xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "mb-8" },
            react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-4" }, "Optimistic Locking Demo"),
            react_1.default.createElement("p", { className: "text-gray-600 mb-6" }, "This demo tests the optimistic locking implementation across all entity types. Optimistic locking prevents data loss when multiple users edit the same document simultaneously."),
            react_1.default.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" },
                react_1.default.createElement("h3", { className: "font-semibold text-blue-900 mb-2" }, "How Optimistic Locking Works:"),
                react_1.default.createElement("ul", { className: "text-blue-800 text-sm space-y-1" },
                    react_1.default.createElement("li", null, "\u2022 Each document has a version number that increments with each edit"),
                    react_1.default.createElement("li", null, "\u2022 When updating, the client must provide the expected version"),
                    react_1.default.createElement("li", null, "\u2022 If versions don't match, the update is rejected with a conflict error"),
                    react_1.default.createElement("li", null, "\u2022 This prevents silent overwrites of other users' changes"),
                    react_1.default.createElement("li", null, "\u2022 The system provides clear error messages for conflict resolution")))),
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6 mb-6" },
            react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Test Controls"),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-2" }, "Entity Type"),
                    react_1.default.createElement("select", { value: selectedEntityType, onChange: (e) => setSelectedEntityType(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", disabled: isRunning }, entityTypes.map(type => (react_1.default.createElement("option", { key: type.value, value: type.value }, type.label)))))),
            react_1.default.createElement("div", { className: "flex flex-wrap gap-4" },
                react_1.default.createElement("button", { onClick: runSingleEntityTest, disabled: isRunning, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" }, isRunning ? 'Running...' : 'Test Single Entity'),
                react_1.default.createElement("button", { onClick: runAllEntityTests, disabled: isRunning, className: "px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" }, isRunning ? 'Running...' : 'Test All Entities'),
                react_1.default.createElement("button", { onClick: runConflictResolutionTests, disabled: isRunning, className: "px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed" }, isRunning ? 'Running...' : 'Test Conflict Resolution'),
                react_1.default.createElement("button", { onClick: clearResults, disabled: isRunning, className: "px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed" }, "Clear Results"))),
        error && (react_1.default.createElement("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-6" },
            react_1.default.createElement("h3", { className: "font-semibold text-red-900 mb-2" }, "Error"),
            react_1.default.createElement("p", { className: "text-red-800" }, error))),
        testResults.length > 0 && (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6 mb-6" },
            react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Test Results"),
            react_1.default.createElement("div", { className: "space-y-4" }, testResults.map((result, index) => (react_1.default.createElement("div", { key: index, className: "border border-gray-200 rounded-lg p-4" },
                react_1.default.createElement("div", { className: "flex items-center justify-between mb-2" },
                    react_1.default.createElement("h3", { className: "font-medium text-gray-900" }, result.testName),
                    react_1.default.createElement("span", { className: `font-semibold ${getStatusColor(result.success)}` },
                        getStatusIcon(result.success),
                        " ",
                        result.success ? 'PASSED' : 'FAILED')),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-gray-700" }, "Duration:"),
                        " ",
                        result.duration,
                        "ms"),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-gray-700" }, "Entity Type:"),
                        " ",
                        result.details.entityType),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-gray-700" }, "Operation:"),
                        " ",
                        result.details.operation),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-gray-700" }, "Conflict Detected:"),
                        react_1.default.createElement("span", { className: result.details.conflictDetected ? 'text-green-600' : 'text-red-600' }, result.details.conflictDetected ? ' Yes' : ' No')),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("span", { className: "font-medium text-gray-700" }, "Resolution Strategy:"),
                        " ",
                        result.details.resolutionStrategy)),
                result.error && (react_1.default.createElement("div", { className: "mt-3 p-3 bg-red-50 border border-red-200 rounded" },
                    react_1.default.createElement("span", { className: "font-medium text-red-800" }, "Error:"),
                    " ",
                    result.error)))))))),
        testReport && (react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-md p-6" },
            react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Test Report"),
            react_1.default.createElement("pre", { className: "bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap" }, testReport))),
        react_1.default.createElement("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6" },
            react_1.default.createElement("h3", { className: "font-semibold text-yellow-900 mb-2" }, "Testing Instructions:"),
            react_1.default.createElement("ol", { className: "text-yellow-800 text-sm space-y-1 list-decimal list-inside" },
                react_1.default.createElement("li", null, "Select an entity type to test optimistic locking for that specific entity"),
                react_1.default.createElement("li", null, "Click \"Test Single Entity\" to test optimistic locking for the selected entity"),
                react_1.default.createElement("li", null, "Click \"Test All Entities\" to test optimistic locking across all entity types"),
                react_1.default.createElement("li", null, "Click \"Test Conflict Resolution\" to test different conflict resolution strategies"),
                react_1.default.createElement("li", null, "Review the test results to see how conflicts are detected and handled"),
                react_1.default.createElement("li", null, "Use \"Clear Results\" to reset the test state")))));
};
exports.OptimisticLockingDemo = OptimisticLockingDemo;
