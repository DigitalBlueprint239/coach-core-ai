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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoachCoreIntegration = exports.AIBrainSetup = void 0;
// Core Services
__exportStar(require("./ai/ai-brain-mvp-setup"), exports);
__exportStar(require("./firebase/config"), exports);
// export * from './auth/authService'; // File does not exist
// Integration Services  
__exportStar(require("../integration/coach-core-integration"), exports);
// Default exports for backward compatibility
var ai_brain_mvp_setup_1 = require("./ai/ai-brain-mvp-setup");
Object.defineProperty(exports, "AIBrainSetup", { enumerable: true, get: function () { return __importDefault(ai_brain_mvp_setup_1).default; } });
var coach_core_integration_1 = require("../integration/coach-core-integration");
Object.defineProperty(exports, "CoachCoreIntegration", { enumerable: true, get: function () { return __importDefault(coach_core_integration_1).default; } });
