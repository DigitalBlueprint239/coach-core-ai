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
exports.CoachCoreIntegration = exports.IntegrationService = void 0;
const react_1 = __importStar(require("react"));
const react_2 = require("@chakra-ui/react");
// Mock Integration Service
class IntegrationService {
    constructor() {
        this.integrations = [
            {
                id: 'hudl',
                name: 'Hudl Video Analysis',
                type: 'video',
                status: 'mock',
                description: 'Video analysis and play breakdown'
            },
            {
                id: 'polar',
                name: 'Polar Heart Rate',
                type: 'wearable',
                status: 'mock',
                description: 'Player heart rate monitoring'
            },
            {
                id: 'gps-tracking',
                name: 'GPS Player Tracking',
                type: 'analytics',
                status: 'mock',
                description: 'Real-time player positioning'
            },
            {
                id: 'team-communication',
                name: 'Team Communication',
                type: 'communication',
                status: 'mock',
                description: 'Team messaging and notifications'
            }
        ];
    }
    getIntegrations() {
        return __awaiter(this, void 0, void 0, function* () {
            // Simulate API delay
            yield new Promise(resolve => setTimeout(resolve, 500));
            return this.integrations;
        });
    }
    connectIntegration(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, 1000));
            const integration = this.integrations.find(i => i.id === id);
            if (integration) {
                integration.status = 'connected';
                integration.lastSync = new Date();
                return true;
            }
            return false;
        });
    }
    disconnectIntegration(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise(resolve => setTimeout(resolve, 500));
            const integration = this.integrations.find(i => i.id === id);
            if (integration) {
                integration.status = 'disconnected';
                return true;
            }
            return false;
        });
    }
}
exports.IntegrationService = IntegrationService;
// Integration Card Component
const IntegrationCard = ({ integration, onToggle }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'connected': return 'green';
            case 'disconnected': return 'gray';
            case 'error': return 'red';
            case 'mock': return 'yellow';
            default: return 'gray';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'connected': return 'Connected';
            case 'disconnected': return 'Disconnected';
            case 'error': return 'Error';
            case 'mock': return 'Mock Mode';
            default: return 'Unknown';
        }
    };
    return (react_1.default.createElement(react_2.Box, { borderWidth: "1px", borderRadius: "lg", p: 4, boxShadow: "md" },
        react_1.default.createElement(react_2.Box, { pb: 2, fontWeight: "bold" },
            react_1.default.createElement(react_2.HStack, { justify: "space-between" },
                react_1.default.createElement(react_2.Text, null, integration.name),
                react_1.default.createElement(react_2.Badge, { colorScheme: getStatusColor(integration.status) }, getStatusText(integration.status)))),
        react_1.default.createElement(react_2.Box, { pt: 0 },
            react_1.default.createElement(react_2.Box, { mb: 3 },
                react_1.default.createElement(react_2.Text, { fontSize: "sm", color: "gray.600" }, integration.description),
                integration.lastSync && (react_1.default.createElement(react_2.Text, { fontSize: "xs", color: "gray.500" },
                    "Last sync: ",
                    integration.lastSync.toLocaleString())),
                react_1.default.createElement(react_2.Button, { size: "sm", colorScheme: integration.status === 'connected' ? 'red' : 'blue', onClick: () => onToggle(integration.id) }, integration.status === 'connected' ? 'Disconnect' : 'Connect')))));
};
// Main Integration Dashboard
const CoachCoreIntegration = () => {
    const [integrations, setIntegrations] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const integrationService = react_1.default.useMemo(() => new IntegrationService(), []);
    (0, react_1.useEffect)(() => {
        loadIntegrations();
    }, []);
    const loadIntegrations = () => __awaiter(void 0, void 0, void 0, function* () {
        setLoading(true);
        try {
            const data = yield integrationService.getIntegrations();
            setIntegrations(data);
        }
        catch (error) {
            console.error('Failed to load integrations:', error);
        }
        finally {
            setLoading(false);
        }
    });
    const handleToggleIntegration = (id) => __awaiter(void 0, void 0, void 0, function* () {
        const integration = integrations.find(i => i.id === id);
        if (!integration)
            return;
        try {
            if (integration.status === 'connected') {
                yield integrationService.disconnectIntegration(id);
            }
            else {
                yield integrationService.connectIntegration(id);
            }
            yield loadIntegrations();
        }
        catch (error) {
            console.error('Failed to toggle integration:', error);
        }
    });
    return (react_1.default.createElement(react_2.Box, { p: 4 },
        react_1.default.createElement(react_2.Box, { bg: "blue.50", border: "1px solid #bee3f8", color: "blue.800", borderRadius: "md", p: 4, mb: 4 }, "\u26A0\uFE0F Integrations are in recovery mode - all connections are simulated"),
        react_1.default.createElement(react_2.Text, { fontSize: "2xl", fontWeight: "bold" }, "Coach Core Integrations"),
        react_1.default.createElement(react_2.Box, { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }, integrations.map((integration) => (react_1.default.createElement(IntegrationCard, { key: integration.id, integration: integration, onToggle: handleToggleIntegration })))),
        loading && (react_1.default.createElement(react_2.Text, { textAlign: "center", color: "gray.500" }, "Loading integrations..."))));
};
exports.CoachCoreIntegration = CoachCoreIntegration;
exports.default = exports.CoachCoreIntegration;
