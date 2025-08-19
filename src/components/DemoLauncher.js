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
const index_1 = require("./index");
const DemoLauncher = () => {
    const [selectedFeature, setSelectedFeature] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const { showSuccess, showError } = (0, index_1.useToast)();
    const demoFeatures = [
        {
            id: 'dashboard',
            title: 'Dashboard Overview',
            description: 'Main coaching dashboard with team overview and quick actions',
            icon: '',
            component: () => react_1.default.createElement("div", null, "Dashboard Component")
        },
        {
            id: 'practice-planner',
            title: 'AI Practice Planner',
            description: 'Generate intelligent practice plans with AI assistance',
            icon: '',
            component: () => react_1.default.createElement("div", null, "Practice Planner Component")
        },
        {
            id: 'team-roster',
            title: 'Team Roster Management',
            description: 'Manage player information, positions, and team structure',
            icon: '',
            component: () => react_1.default.createElement("div", null, "Team Roster Component")
        },
        {
            id: 'drill-library',
            title: 'Drill Library',
            description: 'Browse and search through hundreds of coaching drills',
            icon: '',
            component: () => react_1.default.createElement("div", null, "Drill Library Component")
        },
        {
            id: 'smart-playbook',
            title: 'Smart Playbook',
            description: 'Design plays with drag-and-drop interface and AI suggestions',
            icon: '',
            component: () => react_1.default.createElement("div", null, "Smart Playbook Component")
        },
        {
            id: 'analytics',
            title: 'Analytics & Progress',
            description: 'Track player progress and team performance metrics',
            icon: '',
            component: () => react_1.default.createElement("div", null, "Analytics Component")
        }
    ];
    const handleFeatureSelect = (featureId) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        setLoading(true);
        try {
            // Simulate loading
            yield new Promise(resolve => setTimeout(resolve, 1000));
            setSelectedFeature(featureId);
            showSuccess(`Loading ${(_a = demoFeatures.find(f => f.id === featureId)) === null || _a === void 0 ? void 0 : _a.title}...`);
        }
        catch (error) {
            showError('Failed to load feature');
        }
        finally {
            setLoading(false);
        }
    });
    const handleBackToMenu = () => {
        setSelectedFeature(null);
    };
    if (loading) {
        return (react_1.default.createElement("div", { className: "min-h-screen flex items-center justify-center" },
            react_1.default.createElement(index_1.LoadingSpinner, { text: "Preparing demo..." })));
    }
    if (selectedFeature) {
        const feature = demoFeatures.find(f => f.id === selectedFeature);
        const Component = feature === null || feature === void 0 ? void 0 : feature.component;
        return (react_1.default.createElement("div", { className: "min-h-screen bg-gray-50" },
            react_1.default.createElement("div", { className: "bg-white shadow-sm border-b" },
                react_1.default.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" },
                    react_1.default.createElement("div", { className: "flex items-center justify-between h-16" },
                        react_1.default.createElement("div", { className: "flex items-center space-x-4" },
                            react_1.default.createElement("button", { onClick: handleBackToMenu, className: "text-gray-600 hover:text-gray-900" }, "\u2190 Back to Demo Menu"),
                            react_1.default.createElement("span", { className: "text-lg font-semibold" }, feature === null || feature === void 0 ? void 0 : feature.title)),
                        react_1.default.createElement("div", { className: "text-sm text-gray-500" }, "Demo Mode")))),
            react_1.default.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" }, Component && react_1.default.createElement(Component, null))));
    }
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" },
        react_1.default.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" },
            react_1.default.createElement("div", { className: "text-center mb-12" },
                react_1.default.createElement("div", { className: "flex items-center justify-center space-x-3 mb-6" },
                    react_1.default.createElement("div", { className: "w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center" },
                        react_1.default.createElement("span", { className: "text-3xl" })),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h1", { className: "text-4xl font-bold text-gray-900" }, "Coach Core AI"),
                        react_1.default.createElement("p", { className: "text-xl text-gray-600" }, "The Ultimate Sports Coaching Platform"))),
                react_1.default.createElement("p", { className: "text-lg text-gray-600 max-w-2xl mx-auto" }, "Experience the future of sports coaching with AI-powered practice planning, intelligent play design, and comprehensive team management.")),
            react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12" }, demoFeatures.map((feature) => (react_1.default.createElement("div", { key: feature.id, className: "bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer", onClick: () => handleFeatureSelect(feature.id) },
                react_1.default.createElement("div", { className: "p-6" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4 mb-4" },
                        react_1.default.createElement("div", { className: "w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center" },
                            react_1.default.createElement("span", { className: "text-2xl" }, feature.icon)),
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900" }, feature.title),
                            react_1.default.createElement("p", { className: "text-sm text-gray-600" }, feature.description))),
                    react_1.default.createElement("div", { className: "flex items-center justify-between" },
                        react_1.default.createElement("span", { className: "text-sm text-blue-600 font-medium" }, "Try Demo"),
                        react_1.default.createElement("svg", { className: "w-5 h-5 text-gray-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                            react_1.default.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 5l7 7-7 7" })))))))),
            react_1.default.createElement("div", { className: "bg-white rounded-xl shadow-lg p-8" },
                react_1.default.createElement("h2", { className: "text-2xl font-bold text-gray-900 mb-4" }, "Demo Information"),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" },
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-2" }, "What's Included"),
                        react_1.default.createElement("ul", { className: "space-y-2 text-gray-600" },
                            react_1.default.createElement("li", null, "\u2022 AI-powered practice plan generation"),
                            react_1.default.createElement("li", null, "\u2022 Interactive playbook design"),
                            react_1.default.createElement("li", null, "\u2022 Team roster management"),
                            react_1.default.createElement("li", null, "\u2022 Comprehensive drill library"),
                            react_1.default.createElement("li", null, "\u2022 Performance analytics"),
                            react_1.default.createElement("li", null, "\u2022 Mobile-responsive design"))),
                    react_1.default.createElement("div", null,
                        react_1.default.createElement("h3", { className: "text-lg font-semibold text-gray-900 mb-2" }, "Technical Features"),
                        react_1.default.createElement("ul", { className: "space-y-2 text-gray-600" },
                            react_1.default.createElement("li", null, "\u2022 React 19 + TypeScript"),
                            react_1.default.createElement("li", null, "\u2022 Firebase backend integration"),
                            react_1.default.createElement("li", null, "\u2022 OpenAI GPT-4 integration"),
                            react_1.default.createElement("li", null, "\u2022 PWA capabilities"),
                            react_1.default.createElement("li", null, "\u2022 Real-time updates"),
                            react_1.default.createElement("li", null, "\u2022 Offline functionality"))))))));
};
exports.default = DemoLauncher;
