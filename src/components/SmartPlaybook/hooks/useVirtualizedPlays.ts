import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

interface Play {
  id: string;
  name: string;
  players: Array<{
    id: string;
    x: number;
    y: number;
    number: string;
    position: string;
    color: string;
    selected: boolean;
  }>;
  routes: Array<{
    id: string;
    playerId: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    type: string;
  }>;
  formation: string;
  phase: string;
  type: string;
  createdAt: Date;
  thumbnail?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  description?: string;
}

interface FilterState {
  phase: string[];
  type: string[];
  difficulty: string[];
  formation: string[];
  tags: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

interface SortState {
  field: keyof Play;
  direction: 'asc' | 'desc';
}

interface VirtualizedPlaysState {
  plays: Play[];
  filteredPlays: Play[];
  searchQuery: string;
  filters: FilterState;
  sorting: SortState;
  selectedPlayId: string | null;
  loadedItems: Set<number>;
  expandedItems: Set<number>;
  isLoading: boolean;
  error: string | null;
}

interface UseVirtualizedPlaysOptions {
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enableCaching?: boolean;
  maxItems?: number;
  debounceMs?: number;
}

export const useVirtualizedPlays = (
  initialPlays: Play[],
  options: UseVirtualizedPlaysOptions = {}
) => {
  const {
    enableSearch = true,
    enableFiltering = true,
    enableSorting = true,
    enableCaching = true,
    maxItems = 1000,
    debounceMs = 300
  } = options;

  // State
  const [state, setState] = useState<VirtualizedPlaysState>({
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterCacheRef = useRef<Map<string, Play[]>>(new Map());
  const performanceMetricsRef = useRef({
    filterCount: 0,
    searchCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    lastFilterTime: 0,
    averageFilterTime: 0
  });

  // Memoized filtered and sorted plays with caching
  const filteredPlays = useMemo(() => {
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
        result = result.filter(play => 
          state.filters.difficulty.includes(play.difficulty || 'intermediate')
        );
      }
      if (state.filters.formation.length > 0) {
        result = result.filter(play => state.filters.formation.includes(play.formation));
      }
      if (state.filters.tags.length > 0) {
        result = result.filter(play => 
          play.tags?.some(tag => state.filters.tags.includes(tag))
        );
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
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filteredPlays
    }));
  }, [filteredPlays]);

  // Search handler with debouncing
  const setSearchQuery = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        searchQuery: query
      }));
      performanceMetricsRef.current.searchCount++;
    }, debounceMs);
  }, [debounceMs]);

  // Filter handlers
  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  }, []);

  const updateFilter = useCallback((filterType: keyof FilterState, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  }, []);

  // Sort handler
  const setSorting = useCallback((newSorting: SortState) => {
    setState(prev => ({
      ...prev,
      sorting: newSorting
    }));
  }, []);

  const updateSorting = useCallback((field: keyof Play) => {
    setState(prev => ({
      ...prev,
      sorting: {
        field,
        direction: prev.sorting.field === field && prev.sorting.direction === 'asc' ? 'desc' : 'asc'
      }
    }));
  }, []);

  // Selection handlers
  const setSelectedPlayId = useCallback((playId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedPlayId: playId
    }));
  }, []);

  // Item loading handlers
  const markItemLoaded = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      loadedItems: new Set([...prev.loadedItems, index])
    }));
  }, []);

  const markItemExpanded = useCallback((index: number, expanded: boolean) => {
    setState(prev => {
      const newExpandedItems = new Set(prev.expandedItems);
      if (expanded) {
        newExpandedItems.add(index);
      } else {
        newExpandedItems.delete(index);
      }
      return {
        ...prev,
        expandedItems: newExpandedItems
      };
    });
  }, []);

  // Play management
  const addPlay = useCallback((play: Play) => {
    setState(prev => ({
      ...prev,
      plays: [play, ...prev.plays]
    }));
  }, []);

  const updatePlay = useCallback((playId: string, updates: Partial<Play>) => {
    setState(prev => ({
      ...prev,
      plays: prev.plays.map(play => 
        play.id === playId ? { ...play, ...updates } : play
      )
    }));
  }, []);

  const removePlay = useCallback((playId: string) => {
    setState(prev => ({
      ...prev,
      plays: prev.plays.filter(play => play.id !== playId),
      selectedPlayId: prev.selectedPlayId === playId ? null : prev.selectedPlayId
    }));
  }, []);

  // Reset functions
  const resetFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {
        phase: [],
        type: [],
        difficulty: [],
        formation: [],
        tags: [],
        dateRange: { start: null, end: null }
      },
      searchQuery: '',
      sorting: { field: 'createdAt', direction: 'desc' }
    }));
  }, []);

  const resetSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedPlayId: null
    }));
  }, []);

  const clearCache = useCallback(() => {
    filterCacheRef.current.clear();
  }, []);

  // Loading state management
  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error
    }));
  }, []);

  // Available filters calculation
  const availableFilters = useMemo(() => {
    const phases = [...new Set(state.plays.map(p => p.phase))];
    const types = [...new Set(state.plays.map(p => p.type))];
    const difficulties = [...new Set(state.plays.map(p => p.difficulty || 'intermediate'))];
    const formations = [...new Set(state.plays.map(p => p.formation))];
    const tags = [...new Set(state.plays.flatMap(p => p.tags || []))];

    return { phases, types, difficulties, formations, tags };
  }, [state.plays]);

  // Performance metrics
  const getPerformanceMetrics = useCallback(() => ({
    ...performanceMetricsRef.current,
    cacheSize: filterCacheRef.current.size,
    cacheHitRate: performanceMetricsRef.current.cacheHits / 
      (performanceMetricsRef.current.cacheHits + performanceMetricsRef.current.cacheMisses)
  }), []);

  // Cleanup on unmount
  useEffect(() => {
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