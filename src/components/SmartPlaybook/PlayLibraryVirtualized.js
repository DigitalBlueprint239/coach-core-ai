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
const react_window_1 = require("react-window");
const react_window_infinite_loader_1 = __importDefault(require("react-window-infinite-loader"));
const lucide_react_1 = require("lucide-react");
const PlayLibraryVirtualized = ({ plays, onLoadPlay, onDeletePlay, onExportPlay, onPreviewPlay, height = 600, width = 400, itemHeight = 120, enableInfiniteScroll = true, enableLazyLoading = true, enableSearch = true, enableFiltering = true, enableSorting = true, maxItems = 1000 }) => {
    // State management
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [viewMode, setViewMode] = (0, react_1.useState)('list');
    const [selectedPlayId, setSelectedPlayId] = (0, react_1.useState)(null);
    const [filters, setFilters] = (0, react_1.useState)({
        phase: [],
        type: [],
        difficulty: [],
        formation: [],
        tags: [],
        dateRange: { start: null, end: null }
    });
    const [sorting, setSorting] = (0, react_1.useState)({
        field: 'createdAt',
        direction: 'desc'
    });
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [loadedItems, setLoadedItems] = (0, react_1.useState)(new Set());
    const [expandedItems, setExpandedItems] = (0, react_1.useState)(new Set());
    // Refs
    const listRef = (0, react_1.useRef)(null);
    const variableListRef = (0, react_1.useRef)(null);
    const searchInputRef = (0, react_1.useRef)(null);
    const filterTimeoutRef = (0, react_1.useRef)(null);
    // Performance monitoring
    const performanceMetrics = (0, react_1.useRef)({
        renderCount: 0,
        filterCount: 0,
        searchCount: 0,
        lastRenderTime: 0,
        averageRenderTime: 0
    });
    // Memoized filtered and sorted plays
    const filteredPlays = (0, react_1.useMemo)(() => {
        const startTime = performance.now();
        performanceMetrics.current.filterCount++;
        let result = plays;
        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(play => {
                var _a, _b;
                return play.name.toLowerCase().includes(query) ||
                    ((_a = play.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(query)) ||
                    ((_b = play.tags) === null || _b === void 0 ? void 0 : _b.some(tag => tag.toLowerCase().includes(query))) ||
                    play.formation.toLowerCase().includes(query) ||
                    play.phase.toLowerCase().includes(query) ||
                    play.type.toLowerCase().includes(query);
            });
        }
        // Apply filters
        if (filters.phase.length > 0) {
            result = result.filter(play => filters.phase.includes(play.phase));
        }
        if (filters.type.length > 0) {
            result = result.filter(play => filters.type.includes(play.type));
        }
        if (filters.difficulty.length > 0) {
            result = result.filter(play => filters.difficulty.includes(play.difficulty || 'intermediate'));
        }
        if (filters.formation.length > 0) {
            result = result.filter(play => filters.formation.includes(play.formation));
        }
        if (filters.tags.length > 0) {
            result = result.filter(play => { var _a; return (_a = play.tags) === null || _a === void 0 ? void 0 : _a.some(tag => filters.tags.includes(tag)); });
        }
        if (filters.dateRange.start || filters.dateRange.end) {
            result = result.filter(play => {
                const playDate = new Date(play.createdAt);
                if (filters.dateRange.start && playDate < filters.dateRange.start)
                    return false;
                if (filters.dateRange.end && playDate > filters.dateRange.end)
                    return false;
                return true;
            });
        }
        // Apply sorting
        result.sort((a, b) => {
            const aValue = a[sorting.field];
            const bValue = b[sorting.field];
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sorting.direction === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            if (aValue instanceof Date && bValue instanceof Date) {
                return sorting.direction === 'asc'
                    ? aValue.getTime() - bValue.getTime()
                    : bValue.getTime() - aValue.getTime();
            }
            return 0;
        });
        const endTime = performance.now();
        performanceMetrics.current.lastRenderTime = endTime - startTime;
        performanceMetrics.current.averageRenderTime =
            (performanceMetrics.current.averageRenderTime * (performanceMetrics.current.filterCount - 1) +
                performanceMetrics.current.lastRenderTime) / performanceMetrics.current.filterCount;
        return result.slice(0, maxItems);
    }, [plays, searchQuery, filters, sorting, maxItems]);
    // Dynamic row height calculation
    const getRowHeight = (0, react_1.useCallback)((index) => {
        const play = filteredPlays[index];
        if (!play)
            return itemHeight;
        // Base height
        let height = itemHeight;
        // Add height for expanded description
        if (expandedItems.has(index) && play.description) {
            height += Math.ceil(play.description.length / 50) * 20; // Approximate line height
        }
        // Add height for tags
        if (play.tags && play.tags.length > 0) {
            height += 30;
        }
        return height;
    }, [filteredPlays, expandedItems, itemHeight]);
    // Lazy loading for thumbnails
    const loadThumbnail = (0, react_1.useCallback)((play, index) => __awaiter(void 0, void 0, void 0, function* () {
        if (!enableLazyLoading || loadedItems.has(index))
            return;
        setIsLoading(true);
        try {
            // Simulate thumbnail generation/loading
            yield new Promise(resolve => setTimeout(resolve, 100));
            // Generate thumbnail from play data
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 120;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Draw field background
                ctx.fillStyle = '#15803d';
                ctx.fillRect(0, 0, 200, 120);
                // Draw players
                play.players.forEach(player => {
                    const x = (player.x / 600) * 200; // Scale from field coordinates
                    const y = (player.y / 300) * 120;
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    ctx.fillStyle = player.color;
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                });
                // Draw routes
                play.routes.forEach(route => {
                    if (route.points.length > 1) {
                        ctx.strokeStyle = route.color;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        route.points.forEach((point, i) => {
                            const x = (point.x / 600) * 200;
                            const y = (point.y / 300) * 120;
                            if (i === 0) {
                                ctx.moveTo(x, y);
                            }
                            else {
                                ctx.lineTo(x, y);
                            }
                        });
                        ctx.stroke();
                    }
                });
            }
            const thumbnail = canvas.toDataURL();
            play.thumbnail = thumbnail;
            setLoadedItems(prev => new Set([...prev, index]));
        }
        catch (error) {
            console.error('Error loading thumbnail:', error);
        }
        finally {
            setIsLoading(false);
        }
    }), [enableLazyLoading, loadedItems]);
    // Infinite scroll handler
    const loadMoreItems = (0, react_1.useCallback)((startIndex, stopIndex) => {
        return new Promise((resolve) => {
            // Simulate loading more items
            setTimeout(() => {
                // Load thumbnails for visible items
                for (let i = startIndex; i <= stopIndex; i++) {
                    const play = filteredPlays[i];
                    if (play) {
                        loadThumbnail(play, i);
                    }
                }
                resolve();
            }, 100);
        });
    }, [filteredPlays, loadThumbnail]);
    // Row renderer for list view
    const renderListItem = (0, react_1.useCallback)(({ index, style }) => {
        const play = filteredPlays[index];
        if (!play)
            return null;
        const isSelected = selectedPlayId === play.id;
        const isExpanded = expandedItems.has(index);
        return (react_1.default.createElement("div", { style: style, className: `p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-200' : ''}`, onClick: () => setSelectedPlayId(play.id) },
            react_1.default.createElement("div", { className: "flex items-start space-x-4" },
                react_1.default.createElement("div", { className: "flex-shrink-0" }, play.thumbnail ? (react_1.default.createElement("img", { src: play.thumbnail, alt: play.name, className: "w-16 h-12 rounded border object-cover", loading: "lazy" })) : (react_1.default.createElement("div", { className: "w-16 h-12 bg-gray-200 rounded border flex items-center justify-center" }, isLoading ? (react_1.default.createElement(lucide_react_1.Loader2, { className: "w-4 h-4 animate-spin" })) : (react_1.default.createElement(lucide_react_1.Eye, { className: "w-4 h-4 text-gray-400" }))))),
                react_1.default.createElement("div", { className: "flex-1 min-w-0" },
                    react_1.default.createElement("div", { className: "flex items-center justify-between" },
                        react_1.default.createElement("h3", { className: "font-semibold text-gray-900 truncate" }, play.name),
                        react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                            onPreviewPlay && (react_1.default.createElement("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    onPreviewPlay(play);
                                }, className: "p-1 text-gray-400 hover:text-blue-600 transition-colors", title: "Preview" },
                                react_1.default.createElement(lucide_react_1.Eye, { className: "w-4 h-4" }))),
                            onExportPlay && (react_1.default.createElement("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    onExportPlay(play);
                                }, className: "p-1 text-gray-400 hover:text-green-600 transition-colors", title: "Export" },
                                react_1.default.createElement(lucide_react_1.Download, { className: "w-4 h-4" }))),
                            react_1.default.createElement("button", { onClick: (e) => {
                                    e.stopPropagation();
                                    onDeletePlay(play.id);
                                }, className: "p-1 text-gray-400 hover:text-red-600 transition-colors", title: "Delete" },
                                react_1.default.createElement(lucide_react_1.Trash2, { className: "w-4 h-4" })))),
                    react_1.default.createElement("div", { className: "flex items-center space-x-2 mt-1" },
                        react_1.default.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" }, play.phase),
                        react_1.default.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" }, play.type),
                        react_1.default.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800" }, play.formation),
                        play.difficulty && (react_1.default.createElement("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${play.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                                play.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'}` }, play.difficulty))),
                    react_1.default.createElement("div", { className: "flex items-center justify-between mt-2" },
                        react_1.default.createElement("div", { className: "text-sm text-gray-500" },
                            play.players.length,
                            " players \u2022 ",
                            play.routes.length,
                            " routes"),
                        react_1.default.createElement("div", { className: "text-sm text-gray-500" }, new Date(play.createdAt).toLocaleDateString())),
                    play.tags && play.tags.length > 0 && (react_1.default.createElement("div", { className: "flex flex-wrap gap-1 mt-2" },
                        play.tags.slice(0, 3).map((tag, tagIndex) => (react_1.default.createElement("span", { key: tagIndex, className: "inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800" }, tag))),
                        play.tags.length > 3 && (react_1.default.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800" },
                            "+",
                            play.tags.length - 3)))),
                    play.description && (react_1.default.createElement("div", { className: "mt-2" },
                        react_1.default.createElement("button", { onClick: (e) => {
                                e.stopPropagation();
                                setExpandedItems(prev => {
                                    const newSet = new Set(prev);
                                    if (isExpanded) {
                                        newSet.delete(index);
                                    }
                                    else {
                                        newSet.add(index);
                                    }
                                    return newSet;
                                });
                            }, className: "text-sm text-blue-600 hover:text-blue-800" }, isExpanded ? 'Show less' : 'Show more'),
                        isExpanded && (react_1.default.createElement("p", { className: "text-sm text-gray-600 mt-1" }, play.description)))))),
            react_1.default.createElement("div", { className: "flex justify-end space-x-2 mt-3" },
                react_1.default.createElement("button", { onClick: (e) => {
                        e.stopPropagation();
                        onLoadPlay(play);
                    }, className: "px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors" }, "Load Play"))));
    }, [filteredPlays, selectedPlayId, expandedItems, isLoading, onLoadPlay, onDeletePlay, onPreviewPlay, onExportPlay]);
    // Grid item renderer
    const renderGridItem = (0, react_1.useCallback)(({ index, style }) => {
        const play = filteredPlays[index];
        if (!play)
            return null;
        const isSelected = selectedPlayId === play.id;
        return (react_1.default.createElement("div", { style: style, className: `p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}`, onClick: () => setSelectedPlayId(play.id) },
            react_1.default.createElement("div", { className: "aspect-video mb-3 rounded overflow-hidden" }, play.thumbnail ? (react_1.default.createElement("img", { src: play.thumbnail, alt: play.name, className: "w-full h-full object-cover", loading: "lazy" })) : (react_1.default.createElement("div", { className: "w-full h-full bg-gray-200 flex items-center justify-center" }, isLoading ? (react_1.default.createElement(lucide_react_1.Loader2, { className: "w-6 h-6 animate-spin" })) : (react_1.default.createElement(lucide_react_1.Eye, { className: "w-6 h-6 text-gray-400" }))))),
            react_1.default.createElement("h3", { className: "font-semibold text-gray-900 text-sm mb-2 truncate" }, play.name),
            react_1.default.createElement("div", { className: "flex flex-wrap gap-1 mb-2" },
                react_1.default.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800" }, play.phase),
                react_1.default.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" }, play.type)),
            react_1.default.createElement("div", { className: "text-xs text-gray-500 mb-3" },
                play.players.length,
                " players \u2022 ",
                new Date(play.createdAt).toLocaleDateString()),
            react_1.default.createElement("div", { className: "flex justify-between items-center" },
                react_1.default.createElement("button", { onClick: (e) => {
                        e.stopPropagation();
                        onLoadPlay(play);
                    }, className: "px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors" }, "Load"),
                react_1.default.createElement("div", { className: "flex space-x-1" },
                    onPreviewPlay && (react_1.default.createElement("button", { onClick: (e) => {
                            e.stopPropagation();
                            onPreviewPlay(play);
                        }, className: "p-1 text-gray-400 hover:text-blue-600 transition-colors", title: "Preview" },
                        react_1.default.createElement(lucide_react_1.Eye, { className: "w-3 h-3" }))),
                    react_1.default.createElement("button", { onClick: (e) => {
                            e.stopPropagation();
                            onDeletePlay(play.id);
                        }, className: "p-1 text-gray-400 hover:text-red-600 transition-colors", title: "Delete" },
                        react_1.default.createElement(lucide_react_1.Trash2, { className: "w-3 h-3" }))))));
    }, [filteredPlays, selectedPlayId, isLoading, onLoadPlay, onDeletePlay, onPreviewPlay]);
    // Search handler with debouncing
    const handleSearch = (0, react_1.useCallback)((query) => {
        if (filterTimeoutRef.current) {
            clearTimeout(filterTimeoutRef.current);
        }
        filterTimeoutRef.current = setTimeout(() => {
            setSearchQuery(query);
            performanceMetrics.current.searchCount++;
        }, 300);
    }, []);
    // Filter handlers
    const handleFilterChange = (0, react_1.useCallback)((filterType, value) => {
        setFilters(prev => (Object.assign(Object.assign({}, prev), { [filterType]: value })));
    }, []);
    // Sort handler
    const handleSortChange = (0, react_1.useCallback)((field) => {
        setSorting(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    }, []);
    // Reset filters
    const resetFilters = (0, react_1.useCallback)(() => {
        setFilters({
            phase: [],
            type: [],
            difficulty: [],
            formation: [],
            tags: [],
            dateRange: { start: null, end: null }
        });
        setSearchQuery('');
        setSorting({ field: 'createdAt', direction: 'desc' });
    }, []);
    // Scroll to top
    const scrollToTop = (0, react_1.useCallback)(() => {
        if (listRef.current) {
            listRef.current.scrollTo(0);
        }
        if (variableListRef.current) {
            variableListRef.current.scrollTo(0);
        }
    }, []);
    // Performance monitoring effect
    (0, react_1.useEffect)(() => {
        performanceMetrics.current.renderCount++;
    });
    // Auto-focus search input
    (0, react_1.useEffect)(() => {
        if (searchInputRef.current && enableSearch) {
            searchInputRef.current.focus();
        }
    }, [enableSearch]);
    // Calculate available filters
    const availableFilters = (0, react_1.useMemo)(() => {
        const phases = [...new Set(plays.map(p => p.phase))];
        const types = [...new Set(plays.map(p => p.type))];
        const difficulties = [...new Set(plays.map(p => p.difficulty || 'intermediate'))];
        const formations = [...new Set(plays.map(p => p.formation))];
        const tags = [...new Set(plays.flatMap(p => p.tags || []))];
        return { phases, types, difficulties, formations, tags };
    }, [plays]);
    return (react_1.default.createElement("div", { className: "flex flex-col h-full bg-white rounded-lg shadow-sm" },
        react_1.default.createElement("div", { className: "p-4 border-b border-gray-200" },
            react_1.default.createElement("div", { className: "flex items-center justify-between mb-4" },
                react_1.default.createElement("h2", { className: "text-lg font-semibold text-gray-900" }, "Play Library"),
                react_1.default.createElement("div", { className: "flex items-center space-x-2" },
                    react_1.default.createElement("button", { onClick: () => setViewMode('list'), className: `p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`, title: "List View" },
                        react_1.default.createElement(lucide_react_1.List, { className: "w-4 h-4" })),
                    react_1.default.createElement("button", { onClick: () => setViewMode('grid'), className: `p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`, title: "Grid View" },
                        react_1.default.createElement(lucide_react_1.Grid, { className: "w-4 h-4" })))),
            enableSearch && (react_1.default.createElement("div", { className: "relative mb-4" },
                react_1.default.createElement(lucide_react_1.Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" }),
                react_1.default.createElement("input", { ref: searchInputRef, type: "text", placeholder: "Search plays...", className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", onChange: (e) => handleSearch(e.target.value) }))),
            enableFiltering && (react_1.default.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                react_1.default.createElement("select", { value: filters.phase[0] || '', onChange: (e) => handleFilterChange('phase', e.target.value ? [e.target.value] : []), className: "px-3 py-1 border border-gray-300 rounded text-sm" },
                    react_1.default.createElement("option", { value: "" }, "All Phases"),
                    availableFilters.phases.map(phase => (react_1.default.createElement("option", { key: phase, value: phase }, phase)))),
                react_1.default.createElement("select", { value: filters.type[0] || '', onChange: (e) => handleFilterChange('type', e.target.value ? [e.target.value] : []), className: "px-3 py-1 border border-gray-300 rounded text-sm" },
                    react_1.default.createElement("option", { value: "" }, "All Types"),
                    availableFilters.types.map(type => (react_1.default.createElement("option", { key: type, value: type }, type)))),
                react_1.default.createElement("select", { value: filters.difficulty[0] || '', onChange: (e) => handleFilterChange('difficulty', e.target.value ? [e.target.value] : []), className: "px-3 py-1 border border-gray-300 rounded text-sm" },
                    react_1.default.createElement("option", { value: "" }, "All Difficulties"),
                    availableFilters.difficulties.map(difficulty => (react_1.default.createElement("option", { key: difficulty, value: difficulty }, difficulty)))),
                react_1.default.createElement("button", { onClick: resetFilters, className: "px-3 py-1 text-sm text-gray-600 hover:text-gray-800" }, "Clear Filters"))),
            react_1.default.createElement("div", { className: "flex items-center justify-between text-sm text-gray-600" },
                react_1.default.createElement("span", null,
                    filteredPlays.length,
                    " of ",
                    plays.length,
                    " plays"),
                enableSorting && (react_1.default.createElement("select", { value: `${sorting.field}-${sorting.direction}`, onChange: (e) => {
                        const [field, direction] = e.target.value.split('-');
                        setSorting({ field: field, direction: direction });
                    }, className: "px-2 py-1 border border-gray-300 rounded text-sm" },
                    react_1.default.createElement("option", { value: "createdAt-desc" }, "Newest First"),
                    react_1.default.createElement("option", { value: "createdAt-asc" }, "Oldest First"),
                    react_1.default.createElement("option", { value: "name-asc" }, "Name A-Z"),
                    react_1.default.createElement("option", { value: "name-desc" }, "Name Z-A"))))),
        react_1.default.createElement("div", { className: "flex-1 overflow-hidden" }, filteredPlays.length === 0 ? (react_1.default.createElement("div", { className: "flex items-center justify-center h-full text-gray-500" },
            react_1.default.createElement("div", { className: "text-center" },
                react_1.default.createElement(lucide_react_1.Search, { className: "w-12 h-12 mx-auto mb-4 text-gray-300" }),
                react_1.default.createElement("p", null, "No plays found"),
                react_1.default.createElement("p", { className: "text-sm" }, "Try adjusting your search or filters")))) : (react_1.default.createElement(react_window_infinite_loader_1.default, { isItemLoaded: (index) => !enableInfiniteScroll || index < filteredPlays.length, itemCount: enableInfiniteScroll ? filteredPlays.length + 1 : filteredPlays.length, loadMoreItems: enableInfiniteScroll ? loadMoreItems : () => Promise.resolve() }, ({ onItemsRendered, ref }) => (viewMode === 'list' ? (react_1.default.createElement(react_window_1.VariableSizeList, { ref: listRef || ref, height: height - 200, width: width, itemCount: filteredPlays.length, itemSize: getRowHeight, onItemsRendered: onItemsRendered, overscanCount: 5 }, renderListItem)) : (react_1.default.createElement(react_window_1.FixedSizeList, { ref: listRef || ref, height: height - 200, width: width, itemCount: Math.ceil(filteredPlays.length / 2), itemSize: 200, onItemsRendered: onItemsRendered, overscanCount: 5 }, ({ index, style }) => {
            const startIndex = index * 2;
            return (react_1.default.createElement("div", { style: style, className: "flex space-x-2" },
                renderGridItem({ index: startIndex, style: { width: '50%' } }),
                startIndex + 1 < filteredPlays.length &&
                    renderGridItem({ index: startIndex + 1, style: { width: '50%' } })));
        })))))),
        react_1.default.createElement("div", { className: "p-4 border-t border-gray-200 bg-gray-50" },
            react_1.default.createElement("div", { className: "flex items-center justify-between text-sm text-gray-600" },
                react_1.default.createElement("div", null,
                    "Memory usage: ",
                    Math.round(performanceMetrics.current.averageRenderTime),
                    "ms avg render"),
                react_1.default.createElement("div", { className: "flex space-x-2" },
                    react_1.default.createElement("button", { onClick: scrollToTop, className: "px-3 py-1 text-sm text-gray-600 hover:text-gray-800" }, "\u2191 Top"))))));
};
exports.default = PlayLibraryVirtualized;
