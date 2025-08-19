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
const react_1 = __importStar(require("react"));
const useFirestore_1 = require("../hooks/useFirestore");
const index_1 = require("./index");
const firestore_1 = require("../services/firestore");
const FirebaseTest = () => {
    const [teamId] = (0, react_1.useState)('test-team-123');
    const [user, setUser] = (0, react_1.useState)(null);
    const [authLoading, setAuthLoading] = (0, react_1.useState)(true);
    const isAuthenticated = !!user;
    const { plans, loading: plansLoading, error, createPlan } = (0, useFirestore_1.usePracticePlans)(teamId);
    const { showSuccess, showError, showInfo } = (0, index_1.useToast)();
    (0, react_1.useEffect)(() => {
        const unsubscribe = (0, firestore_1.onAuthStateChange)((currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return unsubscribe;
    }, []);
    const handleTestCreate = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const testPlan = {
                name: 'Test Practice Plan',
                date: new Date().toISOString().split('T')[0],
                duration: 90,
                periods: [
                    {
                        id: '1',
                        name: 'Warm-up',
                        duration: 15,
                        drills: [],
                        intensity: 1
                    }
                ],
                goals: ['Test the system'],
                notes: 'This is a test plan'
            };
            yield createPlan(testPlan);
            showSuccess('Practice plan created successfully!');
        }
        catch (err) {
            showError(err.message || 'Failed to create practice plan');
        }
    });
    const handleTestToast = () => {
        showInfo('This is a test notification');
    };
    if (authLoading) {
        return (react_1.default.createElement("div", { className: "p-8" },
            react_1.default.createElement(index_1.LoadingSpinner, { text: "Checking authentication..." })));
    }
    if (!isAuthenticated) {
        return (react_1.default.createElement("div", { className: "p-8" },
            react_1.default.createElement("div", { className: "bg-yellow-50 border border-yellow-200 rounded-md p-4" },
                react_1.default.createElement("h3", { className: "text-lg font-medium text-yellow-800" }, "Authentication Required"),
                react_1.default.createElement("p", { className: "text-yellow-700" }, "Please sign in to test the Firebase functionality."))));
    }
    return (react_1.default.createElement("div", { className: "p-8 max-w-4xl mx-auto" },
        react_1.default.createElement("h2", { className: "text-2xl font-bold mb-6" }, "Firebase Integration Test"),
        react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
            react_1.default.createElement("div", { className: "bg-white p-6 rounded-lg shadow" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold mb-4" }, "Authentication Status"),
                react_1.default.createElement("div", { className: "space-y-2" },
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "User ID:"),
                        " ", user === null || user === void 0 ? void 0 :
                        user.uid),
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "Email:"),
                        " ", user === null || user === void 0 ? void 0 :
                        user.email),
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "Authenticated:"),
                        " ",
                        isAuthenticated ? 'Yes' : 'No'))),
            react_1.default.createElement("div", { className: "bg-white p-6 rounded-lg shadow" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold mb-4" }, "Practice Plans"),
                plansLoading ? (react_1.default.createElement(index_1.LoadingSpinner, { text: "Loading plans..." })) : error ? (react_1.default.createElement("div", { className: "text-red-600" }, error)) : (react_1.default.createElement("div", null,
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "Count:"),
                        " ",
                        plans.length),
                    react_1.default.createElement("button", { onClick: handleTestCreate, className: "mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" }, "Create Test Plan")))),
            react_1.default.createElement("div", { className: "bg-white p-6 rounded-lg shadow" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold mb-4" }, "Toast Notifications"),
                react_1.default.createElement("div", { className: "space-y-2" },
                    react_1.default.createElement("button", { onClick: () => showSuccess('Success message!'), className: "w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" }, "Show Success"),
                    react_1.default.createElement("button", { onClick: () => showError('Error message!'), className: "w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600" }, "Show Error"),
                    react_1.default.createElement("button", { onClick: handleTestToast, className: "w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" }, "Show Info"))),
            react_1.default.createElement("div", { className: "bg-white p-6 rounded-lg shadow" },
                react_1.default.createElement("h3", { className: "text-lg font-semibold mb-4" }, "Connection Status"),
                react_1.default.createElement("div", { className: "space-y-2" },
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "Online:"),
                        " ",
                        navigator.onLine ? 'Yes' : 'No'),
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "Environment:"),
                        " ",
                        process.env.NODE_ENV),
                    react_1.default.createElement("p", null,
                        react_1.default.createElement("strong", null, "Firebase Project:"),
                        " ",
                        process.env.REACT_APP_FIREBASE_PROJECT_ID))))));
};
exports.default = FirebaseTest;
