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
exports.MigrationBanner = void 0;
const react_1 = __importStar(require("react"));
const useFirestore_1 = require("../hooks/useFirestore");
const TeamContext_1 = require("../contexts/TeamContext");
const ToastManager_1 = require("./ToastManager");
const MigrationBanner = () => {
    const { currentTeam } = (0, TeamContext_1.useTeam)();
    const { hasLocalData, isMigrating, migrateData } = (0, useFirestore_1.useMigration)(currentTeam === null || currentTeam === void 0 ? void 0 : currentTeam.id);
    const { showToast } = (0, ToastManager_1.useToast)();
    const [isVisible, setIsVisible] = (0, react_1.useState)(true);
    if (!hasLocalData || !currentTeam || !isVisible) {
        return null;
    }
    const handleMigrate = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            yield migrateData();
            showToast('Data migrated successfully!', 'success');
            setIsVisible(false);
        }
        catch (error) {
            showToast('Failed to migrate data. Please try again.', 'error');
        }
    });
    const handleDismiss = () => {
        setIsVisible(false);
    };
    return (react_1.default.createElement("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" },
        react_1.default.createElement("div", { className: "flex items-start justify-between" },
            react_1.default.createElement("div", { className: "flex items-start space-x-3" },
                react_1.default.createElement("div", { className: "flex-shrink-0" },
                    react_1.default.createElement("svg", { className: "w-5 h-5 text-blue-600", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }))),
                react_1.default.createElement("div", { className: "flex-1" },
                    react_1.default.createElement("h3", { className: "text-sm font-medium text-blue-900" }, "Migrate Your Data"),
                    react_1.default.createElement("p", { className: "text-sm text-blue-700 mt-1" },
                        "We found existing practice plans and plays in your browser. Would you like to migrate them to your current team \"",
                        currentTeam.name,
                        "\"?"))),
            react_1.default.createElement("button", { onClick: handleDismiss, className: "text-blue-400 hover:text-blue-600 transition-colors" },
                react_1.default.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                    react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" })))),
        react_1.default.createElement("div", { className: "mt-4 flex items-center space-x-3" },
            react_1.default.createElement("button", { onClick: handleMigrate, disabled: isMigrating, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" }, isMigrating ? (react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                react_1.default.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }),
                react_1.default.createElement("span", null, "Migrating..."))) : ('Migrate Now')),
            react_1.default.createElement("button", { onClick: handleDismiss, className: "px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors" }, "Maybe Later"))));
};
exports.MigrationBanner = MigrationBanner;
