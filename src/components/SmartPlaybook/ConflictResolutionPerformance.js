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
exports.ConflictResolutionPerformance = void 0;
const react_1 = __importStar(require("react"));
const firestore_1 = require("../../../services/firestore");
const useAuth_1 = require("../../../hooks/useAuth");
const ConflictResolutionPerformance = () => {
    const { user } = (0, useAuth_1.useAuth)();
    const [metrics, setMetrics] = (0, react_1.useState)(null);
    const [running, setRunning] = (0, react_1.useState)(false);
    const [testResults, setTestResults] = (0, react_1.useState)([]);
    const generateTestPlay = (index) => ({
        name: `Performance Test Play ${index}`,
        formation: '4-3-3',
        description: `Test description for play ${index}`,
        routes: [],
        players: [],
        tags: [`test-${index}`, 'performance'],
        difficulty: 'intermediate',
        sport: 'football',
        level: 'varsity'
    });
    const performanceTests = [
        {
            name: 'Single Update Performance',
            description: 'Measure time for a single play update without conflicts',
            runTest: () => __awaiter(void 0, void 0, void 0, function* () {
                const startTime = performance.now();
                let totalOperations = 0;
                let conflictsDetected = 0;
                // Create a test play
                const playData = generateTestPlay(1);
                const playId = yield (0, firestore_1.savePlay)('test-team', playData);
                // Perform multiple updates
                for (let i = 0; i < 10; i++) {
                    const updateStart = performance.now();
                    try {
                        yield (0, firestore_1.updatePlay)('test-team', playId, {
                            name: `Updated Play ${i}`,
                            description: `Updated description ${i}`
                        });
                        totalOperations++;
                    }
                    catch (error) {
                        if (error instanceof Error && error.message.includes('modified by another user')) {
                            conflictsDetected++;
                        }
                    }
                    const updateEnd = performance.now();
                }
                const endTime = performance.now();
                const totalTime = endTime - startTime;
                return {
                    transactionTime: totalTime / totalOperations,
                    conflictDetectionTime: 0,
                    mergeTime: 0,
                    totalOperations,
                    conflictsDetected,
                    averageResponseTime: totalTime / totalOperations
                };
            })
        },
        {
            name: 'Concurrent Update Simulation',
            description: 'Simulate concurrent updates to measure conflict detection performance',
            runTest: () => __awaiter(void 0, void 0, void 0, function* () {
                const startTime = performance.now();
                let totalOperations = 0;
                let conflictsDetected = 0;
                let conflictDetectionTime = 0;
                let mergeTime = 0;
                // Create a test play
                const playData = generateTestPlay(2);
                const playId = yield (0, firestore_1.savePlay)('test-team', playData);
                // Simulate concurrent updates
                const promises = Array.from({ length: 5 }, (_, i) => __awaiter(void 0, void 0, void 0, function* () {
                    const updateStart = performance.now();
                    try {
                        yield (0, firestore_1.updatePlay)('test-team', playId, {
                            name: `Concurrent Update ${i}`,
                            description: `Concurrent description ${i}`
                        });
                        totalOperations++;
                    }
                    catch (error) {
                        if (error instanceof Error && error.message.includes('modified by another user')) {
                            conflictsDetected++;
                            const conflictStart = performance.now();
                            // Simulate conflict resolution time
                            yield new Promise(resolve => setTimeout(resolve, 50));
                            const conflictEnd = performance.now();
                            conflictDetectionTime += conflictEnd - conflictStart;
                        }
                    }
                    const updateEnd = performance.now();
                }));
                yield Promise.all(promises);
                const endTime = performance.now();
                const totalTime = endTime - startTime;
                return {
                    transactionTime: totalTime / totalOperations,
                    conflictDetectionTime: conflictDetectionTime / conflictsDetected || 0,
                    mergeTime: mergeTime / conflictsDetected || 0,
                    totalOperations,
                    conflictsDetected,
                    averageResponseTime: totalTime / totalOperations
                };
            })
        },
        {
            name: 'Bulk Operations Performance',
            description: 'Test performance with multiple plays and operations',
            runTest: () => __awaiter(void 0, void 0, void 0, function* () {
                const startTime = performance.now();
                let totalOperations = 0;
                let conflictsDetected = 0;
                // Create multiple test plays
                const playIds = [];
                for (let i = 0; i < 5; i++) {
                    const playData = generateTestPlay(i + 3);
                    const playId = yield (0, firestore_1.savePlay)('test-team', playData);
                    playIds.push(playId);
                }
                // Perform bulk operations
                const operations = playIds.flatMap(playId => Array.from({ length: 3 }, (_, i) => ({
                    playId,
                    update: {
                        name: `Bulk Update ${i}`,
                        description: `Bulk description ${i}`
                    }
                })));
                for (const operation of operations) {
                    try {
                        yield (0, firestore_1.updatePlay)('test-team', operation.playId, operation.update);
                        totalOperations++;
                    }
                    catch (error) {
                        if (error instanceof Error && error.message.includes('modified by another user')) {
                            conflictsDetected++;
                        }
                    }
                }
                const endTime = performance.now();
                const totalTime = endTime - startTime;
                return {
                    transactionTime: totalTime / totalOperations,
                    conflictDetectionTime: 0,
                    mergeTime: 0,
                    totalOperations,
                    conflictsDetected,
                    averageResponseTime: totalTime / totalOperations
                };
            })
        },
        {
            name: 'Merge Performance Test',
            description: 'Test performance of merge operations with complex data',
            runTest: () => __awaiter(void 0, void 0, void 0, function* () {
                const startTime = performance.now();
                let totalOperations = 0;
                let conflictsDetected = 0;
                let mergeTime = 0;
                // Create a test play with complex data
                const playData = generateTestPlay(8);
                const playId = yield (0, firestore_1.savePlay)('test-team', playData);
                // Simulate complex merge scenarios
                for (let i = 0; i < 10; i++) {
                    const mergeStart = performance.now();
                    try {
                        yield (0, firestore_1.updatePlay)('test-team', playId, {
                            name: `Merge Test ${i}`,
                            description: `Complex description with lots of text ${i}`.repeat(10),
                            tags: Array.from({ length: 20 }, (_, j) => `tag-${i}-${j}`),
                            difficulty: i % 2 === 0 ? 'beginner' : 'advanced'
                        });
                        totalOperations++;
                    }
                    catch (error) {
                        if (error instanceof Error && error.message.includes('modified by another user')) {
                            conflictsDetected++;
                            // Simulate merge operation time
                            yield new Promise(resolve => setTimeout(resolve, 100));
                            const mergeEnd = performance.now();
                            mergeTime += mergeEnd - mergeStart;
                        }
                    }
                }
                const endTime = performance.now();
                const totalTime = endTime - startTime;
                return {
                    transactionTime: totalTime / totalOperations,
                    conflictDetectionTime: 0,
                    mergeTime: mergeTime / conflictsDetected || 0,
                    totalOperations,
                    conflictsDetected,
                    averageResponseTime: totalTime / totalOperations
                };
            })
        }
    ];
    const runAllTests = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user)
            return;
        setRunning(true);
        setTestResults([]);
        const results = [];
        for (const test of performanceTests) {
            try {
                console.log(`Running test: ${test.name}`);
                const metrics = yield test.runTest();
                results.push({ test: test.name, metrics });
                setTestResults([...results]);
            }
            catch (error) {
                console.error(`Test failed: ${test.name}`, error);
            }
        }
        setRunning(false);
    });
    const runSingleTest = (test) => __awaiter(void 0, void 0, void 0, function* () {
        if (!user)
            return;
        setRunning(true);
        try {
            const metrics = yield test.runTest();
            setMetrics(metrics);
            setTestResults([{ test: test.name, metrics }]);
        }
        catch (error) {
            console.error(`Test failed: ${test.name}`, error);
        }
        setRunning(false);
    });
    const formatTime = (ms) => {
        if (ms < 1)
            return `${(ms * 1000).toFixed(2)}μs`;
        if (ms < 1000)
            return `${ms.toFixed(2)}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };
    return (react_1.default.createElement("div", { className: "max-w-6xl mx-auto p-6" },
        react_1.default.createElement("div", { className: "mb-8" },
            react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-4" }, "Conflict Resolution Performance Testing"),
            react_1.default.createElement("p", { className: "text-gray-600 mb-6" }, "This utility measures the performance of the conflict resolution system and provides benchmarks for different scenarios.")),
        react_1.default.createElement("div", { className: "mb-8" },
            react_1.default.createElement("div", { className: "flex space-x-4 mb-4" },
                react_1.default.createElement("button", { onClick: runAllTests, disabled: running || !user, className: "px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50" }, running ? 'Running Tests...' : 'Run All Tests')),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, performanceTests.map((test, index) => (react_1.default.createElement("div", { key: index, className: "border border-gray-200 rounded-lg p-4" },
                react_1.default.createElement("h3", { className: "font-semibold text-gray-900 mb-2" }, test.name),
                react_1.default.createElement("p", { className: "text-sm text-gray-600 mb-3" }, test.description),
                react_1.default.createElement("button", { onClick: () => runSingleTest(test), disabled: running || !user, className: "px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 text-sm" }, "Run Test")))))),
        testResults.length > 0 && (react_1.default.createElement("div", { className: "space-y-6" },
            react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900" }, "Test Results"),
            testResults.map((result, index) => (react_1.default.createElement("div", { key: index, className: "bg-white border border-gray-200 rounded-lg p-6" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-4" }, result.test),
                react_1.default.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4" },
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-blue-600" }, formatTime(result.metrics.averageResponseTime)),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" }, "Avg Response Time")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-green-600" }, result.metrics.totalOperations),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" }, "Total Operations")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-red-600" }, result.metrics.conflictsDetected),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" }, "Conflicts Detected")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-purple-600" }, formatTime(result.metrics.transactionTime)),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" }, "Transaction Time"))),
                result.metrics.conflictsDetected > 0 && (react_1.default.createElement("div", { className: "mt-4 grid grid-cols-2 gap-4" },
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-lg font-semibold text-orange-600" }, formatTime(result.metrics.conflictDetectionTime)),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" }, "Conflict Detection Time")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-lg font-semibold text-indigo-600" }, formatTime(result.metrics.mergeTime)),
                        react_1.default.createElement("div", { className: "text-sm text-gray-600" }, "Merge Operation Time"))))))))),
        react_1.default.createElement("div", { className: "mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-blue-900 mb-3" }, "Performance Guidelines"),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800" },
                react_1.default.createElement("div", null,
                    react_1.default.createElement("h4", { className: "font-medium mb-2" }, "Target Metrics:"),
                    react_1.default.createElement("ul", { className: "space-y-1" },
                        react_1.default.createElement("li", null, "\u2022 Average response time: < 200ms"),
                        react_1.default.createElement("li", null, "\u2022 Transaction time: < 100ms"),
                        react_1.default.createElement("li", null, "\u2022 Conflict detection: < 50ms"),
                        react_1.default.createElement("li", null, "\u2022 Merge operations: < 150ms"))),
                react_1.default.createElement("div", null,
                    react_1.default.createElement("h4", { className: "font-medium mb-2" }, "Optimization Tips:"),
                    react_1.default.createElement("ul", { className: "space-y-1" },
                        react_1.default.createElement("li", null, "\u2022 Use debouncing for rapid updates"),
                        react_1.default.createElement("li", null, "\u2022 Implement retry logic for network issues"),
                        react_1.default.createElement("li", null, "\u2022 Cache frequently accessed data"),
                        react_1.default.createElement("li", null, "\u2022 Monitor transaction overhead")))))));
};
exports.ConflictResolutionPerformance = ConflictResolutionPerformance;
exports.default = exports.ConflictResolutionPerformance;
