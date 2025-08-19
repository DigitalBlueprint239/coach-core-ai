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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const PlayLibraryVirtualized_1 = __importDefault(require("./PlayLibraryVirtualized"));
const PlayLibraryPerformance_1 = __importDefault(require("./PlayLibraryPerformance"));
const useVirtualizedPlays_1 = require("./hooks/useVirtualizedPlays");
const thumbnailGenerator_1 = __importDefault(require("./utils/thumbnailGenerator"));
// Sample play data generator
const generateSamplePlays = (count) => {
    const phases = ['Offense', 'Defense', 'Special Teams'];
    const types = ['Passing', 'Running', 'Blocking', 'Tackling'];
    const formations = ['I-Formation', 'Shotgun', 'Spread', 'Wishbone', 'Pro Set'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const tags = ['redzone', 'goal-line', 'hail-mary', 'screen', 'draw', 'counter', 'sweep'];
    const plays = [];
    for (let i = 1; i <= count; i++) {
        const play = {
            id: `play-${i}`,
            name: `Play ${i}: ${formations[Math.floor(Math.random() * formations.length)]} ${types[Math.floor(Math.random() * types.length)]}`,
            players: Array.from({ length: Math.floor(Math.random() * 5) + 5 }, (_, j) => ({
                id: `player-${i}-${j}`,
                x: Math.random() * 600,
                y: Math.random() * 300,
                number: (Math.floor(Math.random() * 99) + 1).toString(),
                position: ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'][Math.floor(Math.random() * 9)],
                color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
                selected: false
            })),
            routes: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
                id: `route-${i}-${j}`,
                playerId: `player-${i}-${j}`,
                points: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, k) => ({
                    x: Math.random() * 600,
                    y: Math.random() * 300
                })),
                color: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
                type: ['slant', 'post', 'corner', 'out', 'in', 'hitch', 'go'][Math.floor(Math.random() * 7)]
            })),
            formation: formations[Math.floor(Math.random() * formations.length)],
            phase: phases[Math.floor(Math.random() * phases.length)],
            type: types[Math.floor(Math.random() * types.length)],
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
            difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
            tags: tags.slice(0, Math.floor(Math.random() * 3) + 1).sort(() => Math.random() - 0.5),
            description: `This is a detailed description of play ${i}. It includes information about the formation, player positions, and execution strategy. The play is designed for ${difficulties[Math.floor(Math.random() * difficulties.length)]} level players and focuses on ${types[Math.floor(Math.random() * types.length)]} techniques.`
        };
        plays.push(play);
    }
    return plays;
};
const PlayLibraryDemo = () => {
    const [playCount, setPlayCount] = (0, react_1.useState)(100);
    const [generatedPlays, setGeneratedPlays] = (0, react_1.useState)([]);
    const [isGenerating, setIsGenerating] = (0, react_1.useState)(false);
    const [showPerformance, setShowPerformance] = (0, react_1.useState)(true);
    const [performanceMetrics, setPerformanceMetrics] = (0, react_1.useState)({
        renderCount: 0,
        filterCount: 0,
        searchCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        lastFilterTime: 0,
        averageFilterTime: 0,
        cacheSize: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        fps: 60,
        scrollEvents: 0,
        thumbnailLoads: 0,
        thumbnailErrors: 0
    });
    // Initialize virtualized plays hook
    const virtualizedPlays = (0, useVirtualizedPlays_1.useVirtualizedPlays)(generatedPlays, {
        enableSearch: true,
        enableFiltering: true,
        enableSorting: true,
        enableCaching: true,
        maxItems: 1000,
        debounceMs: 300
    });
    // Generate sample plays
    const generatePlays = (0, react_1.useCallback)((count) => __awaiter(void 0, void 0, void 0, function* () {
        setIsGenerating(true);
        // Simulate generation delay
        yield new Promise(resolve => setTimeout(resolve, 100));
        const plays = generateSamplePlays(count);
        setGeneratedPlays(plays);
        // Preload thumbnails for first 20 plays
        const firstPlays = plays.slice(0, 20);
        try {
            yield thumbnailGenerator_1.default.preloadThumbnails(firstPlays);
        }
        catch (error) {
            console.warn('Failed to preload thumbnails:', error);
        }
        setIsGenerating(false);
    }), []);
    // Initialize with sample data
    (0, react_1.useEffect)(() => {
        generatePlays(playCount);
    }, [playCount, generatePlays]);
    // Update performance metrics
    (0, react_1.useEffect)(() => {
        const interval = setInterval(() => {
            const metrics = virtualizedPlays.getPerformanceMetrics();
            const cacheStats = thumbnailGenerator_1.default.getCacheStats();
            setPerformanceMetrics(prev => (Object.assign(Object.assign(Object.assign({}, prev), metrics), { cacheSize: cacheStats.size, memoryUsage: cacheStats.memoryUsage / (1024 * 1024), fps: prev.fps // Keep existing FPS
             })));
        }, 1000);
        return () => clearInterval(interval);
    }, [virtualizedPlays]);
    // Handle play actions
    const handleLoadPlay = (0, react_1.useCallback)((play) => {
        console.log('Loading play:', play.name);
        // In a real app, this would load the play into the editor
    }, []);
    const handleDeletePlay = (0, react_1.useCallback)((playId) => {
        console.log('Deleting play:', playId);
        virtualizedPlays.removePlay(playId);
    }, [virtualizedPlays]);
    const handleExportPlay = (0, react_1.useCallback)((play) => {
        console.log('Exporting play:', play.name);
        // In a real app, this would export the play data
    }, []);
    const handlePreviewPlay = (0, react_1.useCallback)((play) => {
        console.log('Previewing play:', play.name);
        // In a real app, this would show a preview modal
    }, []);
    const handleClearCache = (0, react_1.useCallback)(() => {
        virtualizedPlays.clearCache();
        thumbnailGenerator_1.default.clearCache();
    }, [virtualizedPlays]);
    const handleOptimize = (0, react_1.useCallback)(() => {
        // Optimize performance by reducing cache size and clearing old data
        thumbnailGenerator_1.default.setMaxCacheSize(50);
        virtualizedPlays.clearCache();
    }, [virtualizedPlays]);
    return (react_1.default.createElement("div", { className: "min-h-screen bg-gray-100 p-6" },
        react_1.default.createElement("div", { className: "max-w-7xl mx-auto" },
            react_1.default.createElement("div", { className: "mb-6" },
                react_1.default.createElement("h1", { className: "text-3xl font-bold text-gray-900 mb-2" }, "Virtualized Play Library Demo"),
                react_1.default.createElement("p", { className: "text-gray-600" }, "Demonstrating react-window virtualization for handling 100+ plays with smooth scrolling and optimal performance.")),
            react_1.default.createElement("div", { className: "bg-white rounded-lg shadow-sm p-6 mb-6" },
                react_1.default.createElement("div", { className: "flex flex-wrap items-center justify-between gap-4" },
                    react_1.default.createElement("div", { className: "flex items-center space-x-4" },
                        react_1.default.createElement("div", null,
                            react_1.default.createElement("label", { className: "block text-sm font-medium text-gray-700 mb-1" }, "Number of Plays"),
                            react_1.default.createElement("input", { type: "range", min: "10", max: "1000", step: "10", value: playCount, onChange: (e) => setPlayCount(Number(e.target.value)), className: "w-32" }),
                            react_1.default.createElement("span", { className: "text-sm text-gray-600 ml-2" }, playCount)),
                        react_1.default.createElement("button", { onClick: () => generatePlays(playCount), disabled: isGenerating, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" }, isGenerating ? 'Generating...' : 'Regenerate Plays')),
                    react_1.default.createElement("div", { className: "flex items-center space-x-4" },
                        react_1.default.createElement("label", { className: "flex items-center space-x-2" },
                            react_1.default.createElement("input", { type: "checkbox", checked: showPerformance, onChange: (e) => setShowPerformance(e.target.checked), className: "rounded" }),
                            react_1.default.createElement("span", { className: "text-sm text-gray-700" }, "Show Performance Monitor")))),
                react_1.default.createElement("div", { className: "mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm" },
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-blue-600" }, generatedPlays.length),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "Total Plays")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-green-600" }, virtualizedPlays.filteredPlays.length),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "Filtered Plays")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-purple-600" }, virtualizedPlays.loadedItems.size),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "Loaded Items")),
                    react_1.default.createElement("div", { className: "text-center" },
                        react_1.default.createElement("div", { className: "text-2xl font-bold text-orange-600" }, thumbnailGenerator_1.default.getCacheStats().size),
                        react_1.default.createElement("div", { className: "text-gray-600" }, "Cached Thumbnails")))),
            react_1.default.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-4 gap-6" },
                showPerformance && (react_1.default.createElement("div", { className: "lg:col-span-1" },
                    react_1.default.createElement(PlayLibraryPerformance_1.default, { metrics: performanceMetrics, onClearCache: handleClearCache, onOptimize: handleOptimize, showDetails: true }))),
                react_1.default.createElement("div", { className: `${showPerformance ? 'lg:col-span-3' : 'lg:col-span-4'}` },
                    react_1.default.createElement(PlayLibraryVirtualized_1.default, { plays: virtualizedPlays.filteredPlays, onLoadPlay: handleLoadPlay, onDeletePlay: handleDeletePlay, onExportPlay: handleExportPlay, onPreviewPlay: handlePreviewPlay, height: 600, width: showPerformance ? 800 : 1000, itemHeight: 120, enableInfiniteScroll: true, enableLazyLoading: true, enableSearch: true, enableFiltering: true, enableSorting: true, maxItems: 1000 }))),
            react_1.default.createElement("div", { className: "mt-8 bg-white rounded-lg shadow-sm p-6" },
                react_1.default.createElement("h2", { className: "text-xl font-semibold text-gray-900 mb-4" }, "Features"),
                react_1.default.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" },
                    react_1.default.createElement("div", { className: "p-4 border border-gray-200 rounded-lg" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "\uD83D\uDE80 Virtualization"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Only renders visible items, maintaining 60fps with 1000+ plays")),
                    react_1.default.createElement("div", { className: "p-4 border border-gray-200 rounded-lg" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "\uD83D\uDD0D Smart Search"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Debounced search across play names, descriptions, and tags")),
                    react_1.default.createElement("div", { className: "p-4 border border-gray-200 rounded-lg" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "\uD83C\uDFA8 Lazy Thumbnails"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Canvas-generated thumbnails with LRU caching")),
                    react_1.default.createElement("div", { className: "p-4 border border-gray-200 rounded-lg" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "\u26A1 Performance"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Memory usage under 50MB for 1000 plays with monitoring")),
                    react_1.default.createElement("div", { className: "p-4 border border-gray-200 rounded-lg" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "\uD83D\uDCF1 Responsive"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Grid and list views with dynamic row heights")),
                    react_1.default.createElement("div", { className: "p-4 border border-gray-200 rounded-lg" },
                        react_1.default.createElement("h3", { className: "font-medium text-gray-900 mb-2" }, "\uD83D\uDD04 Infinite Scroll"),
                        react_1.default.createElement("p", { className: "text-sm text-gray-600" }, "Smooth infinite scrolling with preloading")))),
            react_1.default.createElement("div", { className: "mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4" },
                react_1.default.createElement("h3", { className: "font-medium text-blue-900 mb-2" }, "How to Use"),
                react_1.default.createElement("ul", { className: "text-sm text-blue-800 space-y-1" },
                    react_1.default.createElement("li", null, "\u2022 Adjust the slider to generate different numbers of plays"),
                    react_1.default.createElement("li", null, "\u2022 Use the search bar to filter plays by name, description, or tags"),
                    react_1.default.createElement("li", null, "\u2022 Apply filters by phase, type, difficulty, or formation"),
                    react_1.default.createElement("li", null, "\u2022 Sort plays by name, date, or other criteria"),
                    react_1.default.createElement("li", null, "\u2022 Switch between grid and list views"),
                    react_1.default.createElement("li", null, "\u2022 Monitor performance metrics in real-time"),
                    react_1.default.createElement("li", null, "\u2022 Clear cache or optimize when needed"))))));
};
exports.default = PlayLibraryDemo;
