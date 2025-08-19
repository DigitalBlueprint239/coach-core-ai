"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ProgressAnalytics = ({ userId, metricType, timeRange }) => {
    return (react_1.default.createElement("div", { className: "bg-white p-6 rounded-lg shadow-sm border" },
        react_1.default.createElement("h3", { className: "text-lg font-semibold mb-4" }, "Progress Analytics"),
        react_1.default.createElement("div", { className: "space-y-4" },
            react_1.default.createElement("div", { className: "flex justify-between items-center" },
                react_1.default.createElement("span", { className: "text-gray-600" }, "User ID:"),
                react_1.default.createElement("span", { className: "font-mono text-sm" }, userId)),
            react_1.default.createElement("div", { className: "flex justify-between items-center" },
                react_1.default.createElement("span", { className: "text-gray-600" }, "Metric:"),
                react_1.default.createElement("span", { className: "capitalize" }, metricType)),
            react_1.default.createElement("div", { className: "flex justify-between items-center" },
                react_1.default.createElement("span", { className: "text-gray-600" }, "Time Range:"),
                react_1.default.createElement("span", { className: "text-sm" },
                    timeRange.start.toLocaleDateString(),
                    " - ",
                    timeRange.end.toLocaleDateString())),
            react_1.default.createElement("div", { className: "mt-4 p-4 bg-gray-50 rounded" },
                react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Analytics data will be displayed here once the feature is fully implemented.")))));
};
exports.default = ProgressAnalytics;
