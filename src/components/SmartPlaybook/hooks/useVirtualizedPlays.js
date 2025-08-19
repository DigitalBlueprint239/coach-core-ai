"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVirtualizedPlays = void 0;
const react_1 = require("react");
const useVirtualizedPlays = (initialPlays, options = {}) => {
    const { enableSearch = true, enableFiltering = true, enableSorting = true, enableCaching = true, maxItems = 1000, debounceMs = 300 } = options;
    // State
    const [state, setState] = (0, react_1.useState)({
        plays: initialPlays,
        filteredPlays: initialPlays,
        searchQuery: '',
        filters: {
            phase: [],
            type: [],
            difficulty: [],
            formation: [],
            tags: [],
            dateRange: { start: null, end: null }
        },
        sorting: {
            field: 'createdAt',
            direction: 'desc'
        },
        selectedPlayId: null,
        loadedItems: new Set(),
        expandedItems: new Set(),
        isLoading: false,
        error: null
    });
    // Refs for performance optimization
    const searchTimeoutRef = (0, react_1.useRef)(null);
    const filterCacheRef = (0, react_1.useRef)(new Map());
    const performanceMetricsRef = (0, react_1.useRef)({
        filterCount: 0,
        searchCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        lastFilterTime: 0,
        averageFilterTime: 0
    });
    // Memoized filtered and sorted plays with caching
    const filteredPlays = (0, react_1.useMemo)(() => {
        const startTime = performance.now();
        performanceMetricsRef.current.filterCount++;
        // Create cache key
        const cacheKey = enableCaching ? JSON.stringify({
            searchQuery: state.searchQuery,
            filters: state.filters,
            sorting: state.sorting,
            playCount: state.plays.length
        }) : null;
        // Check cache first
        if (enableCaching && cacheKey && filterCacheRef.current.has(cacheKey)) {
            performanceMetricsRef.current.cacheHits++;
            const cached = filterCacheRef.current.get(cacheKey);
            if (cached) {
                const endTime = performance.now();
                performanceMetricsRef.current.lastFilterTime = endTime - startTime;
                return cached.slice(0, maxItems);
            }
        }
        performanceMetricsRef.current.cacheMisses++;
        let result = state.plays;
        // Apply search filter
        if (enableSearch && state.searchQuery.trim()) {
            const query = state.searchQuery.toLowerCase();
            const searchTerms = query.split(' ').filter(term => term.length > 0);
            result = result.filter(play => {
                const searchableText = [
                    play.name,
                    play.description,
                    play.formation,
                    play.phase,
                    play.type,
                    ...(play.tags || [])
                ].join(' ').toLowerCase();
                return searchTerms.every(term => searchableText.includes(term));
            });
        }
        // Apply filters
        if (enableFiltering) {
            if (state.filters.phase.length > 0) {
                result = result.filter(play => state.filters.phase.includes(play.phase));
            }
            if (state.filters.type.length > 0) {
                result = result.filter(play => state.filters.type.includes(play.type));
            }
            if (state.filters.difficulty.length > 0) {
                result = result.filter(play => state.filters.difficulty.includes(play.difficulty || 'intermediate'));
            }
            if (state.filters.formation.length > 0) {
                result = result.filter(play => state.filters.formation.includes(play.formation));
            }
            if (state.filters.tags.length > 0) {
                result = result.filter(play => { var _a; return (_a = play.tags) === null || _a === void 0 ? void 0 : _a.some(tag => state.filters.tags.includes(tag)); });
            }
            if (state.filters.dateRange.start || state.filters.dateRange.end) {
                result = result.filter(play => {
                    const playDate = new Date(play.createdAt);
                    if (state.filters.dateRange.start && playDate < state.filters.dateRange.start) {
                        return false;
                    }
                    if (state.filters.dateRange.end && playDate > state.filters.dateRange.end) {
                        return false;
                    }
                    return true;
                });
            }
        }
        // Apply sorting
        if (enableSorting) {
            result.sort((a, b) => {
                const aValue = a[state.sorting.field];
                const bValue = b[state.sorting.field];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return state.sorting.direction === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }
                if (aValue instanceof Date && bValue instanceof Date) {
                    return state.sorting.direction === 'asc'
                        ? aValue.getTime() - bValue.getTime()
                        : bValue.getTime() - aValue.getTime();
                }
                return 0;
            });
        }
        // Cache result
        if (enableCaching && cacheKey) {
            filterCacheRef.current.set(cacheKey, result);
            // Limit cache size
            if (filterCacheRef.current.size > 100) {
                const firstKey = filterCacheRef.current.keys().next().value;
                filterCacheRef.current.delete(firstKey);
            }
        }
        const endTime = performance.now();
        performanceMetricsRef.current.lastFilterTime = endTime - startTime;
        performanceMetricsRef.current.averageFilterTime =
            (performanceMetricsRef.current.averageFilterTime * (performanceMetricsRef.current.filterCount - 1) +
                performanceMetricsRef.current.lastFilterTime) / performanceMetricsRef.current.filterCount;
        return result.slice(0, maxItems);
    }, [
        state.plays,
        state.searchQuery,
        state.filters,
        state.sorting,
        enableSearch,
        enableFiltering,
        enableSorting,
        enableCaching,
        maxItems
    ]);
    // Update filtered plays in state
    (0, react_1.useEffect)(() => {
        setState(prev => (Object.assign(Object.assign({}, prev), { filteredPlays })));
    }, [filteredPlays]);
    // Search handler with debouncing
    const setSearchQuery = (0, react_1.useCallback)((query) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        searchTimeoutRef.current = setTimeout(() => {
            setState(prev => (Object.assign(Object.assign({}, prev), { searchQuery: query })));
            performanceMetricsRef.current.searchCount++;
        }, debounceMs);
    }, [debounceMs]);
    // Filter handlers
    const setFilters = (0, react_1.useCallback)((newFilters) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { filters: Object.assign(Object.assign({}, prev.filters), newFilters) })));
    }, []);
    const updateFilter = (0, react_1.useCallback)((filterType, value) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { filters: Object.assign(Object.assign({}, prev.filters), { [filterType]: value }) })));
    }, []);
    // Sort handler
    const setSorting = (0, react_1.useCallback)((newSorting) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { sorting: newSorting })));
    }, []);
    const updateSorting = (0, react_1.useCallback)((field) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { sorting: {
                field,
                direction: prev.sorting.field === field && prev.sorting.direction === 'asc' ? 'desc' : 'asc'
            } })));
    }, []);
    // Selection handlers
    const setSelectedPlayId = (0, react_1.useCallback)((playId) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { selectedPlayId: playId })));
    }, []);
    // Item loading handlers
    const markItemLoaded = (0, react_1.useCallback)((index) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { loadedItems: new Set([...prev.loadedItems, index]) })));
    }, []);
    const markItemExpanded = (0, react_1.useCallback)((index, expanded) => {
        setState(prev => {
            const newExpandedItems = new Set(prev.expandedItems);
            if (expanded) {
                newExpandedItems.add(index);
            }
            else {
                newExpandedItems.delete(index);
            }
            return Object.assign(Object.assign({}, prev), { expandedItems: newExpandedItems });
        });
    }, []);
    // Play management
    const addPlay = (0, react_1.useCallback)((play) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { plays: [play, ...prev.plays] })));
    }, []);
    const updatePlay = (0, react_1.useCallback)((playId, updates) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { plays: prev.plays.map(play => play.id === playId ? Object.assign(Object.assign({}, play), updates) : play) })));
    }, []);
    const removePlay = (0, react_1.useCallback)((playId) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { plays: prev.plays.filter(play => play.id !== playId), selectedPlayId: prev.selectedPlayId === playId ? null : prev.selectedPlayId })));
    }, []);
    // Reset functions
    const resetFilters = (0, react_1.useCallback)(() => {
        setState(prev => (Object.assign(Object.assign({}, prev), { filters: {
                phase: [],
                type: [],
                difficulty: [],
                formation: [],
                tags: [],
                dateRange: { start: null, end: null }
            }, searchQuery: '', sorting: { field: 'createdAt', direction: 'desc' } })));
    }, []);
    const resetSelection = (0, react_1.useCallback)(() => {
        setState(prev => (Object.assign(Object.assign({}, prev), { selectedPlayId: null })));
    }, []);
    const clearCache = (0, react_1.useCallback)(() => {
        filterCacheRef.current.clear();
    }, []);
    // Loading state management
    const setLoading = (0, react_1.useCallback)((loading) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { isLoading: loading })));
    }, []);
    const setError = (0, react_1.useCallback)((error) => {
        setState(prev => (Object.assign(Object.assign({}, prev), { error })));
    }, []);
    // Available filters calculation
    const availableFilters = (0, react_1.useMemo)(() => {
        const phases = [...new Set(state.plays.map(p => p.phase))];
        const types = [...new Set(state.plays.map(p => p.type))];
        const difficulties = [...new Set(state.plays.map(p => p.difficulty || 'intermediate'))];
        const formations = [...new Set(state.plays.map(p => p.formation))];
        const tags = [...new Set(state.plays.flatMap(p => p.tags || []))];
        return { phases, types, difficulties, formations, tags };
    }, [state.plays]);
    // Performance metrics
    const getPerformanceMetrics = (0, react_1.useCallback)(() => (Object.assign(Object.assign({}, performanceMetricsRef.current), { cacheSize: filterCacheRef.current.size, cacheHitRate: performanceMetricsRef.current.cacheHits /
            (performanceMetricsRef.current.cacheHits + performanceMetricsRef.current.cacheMisses) })), []);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);
    return {
        // State
        plays: state.plays,
        filteredPlays: state.filteredPlays,
        searchQuery: state.searchQuery,
        filters: state.filters,
        sorting: state.sorting,
        selectedPlayId: state.selectedPlayId,
        loadedItems: state.loadedItems,
        expandedItems: state.expandedItems,
        isLoading: state.isLoading,
        error: state.error,
        availableFilters,
        // Actions
        setSearchQuery,
        setFilters,
        updateFilter,
        setSorting,
        updateSorting,
        setSelectedPlayId,
        markItemLoaded,
        markItemExpanded,
        addPlay,
        updatePlay,
        removePlay,
        resetFilters,
        resetSelection,
        setLoading,
        setError,
        clearCache,
        // Performance
        getPerformanceMetrics
    };
};
exports.useVirtualizedPlays = useVirtualizedPlays;
