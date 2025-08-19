"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12'
    };
    return (react_1.default.createElement("div", { className: "flex items-center justify-center space-x-2" },
        react_1.default.createElement("div", { className: `${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600` }),
        text && (react_1.default.createElement("span", { className: "text-sm text-gray-600" }, text))));
};
exports.default = LoadingSpinner;
