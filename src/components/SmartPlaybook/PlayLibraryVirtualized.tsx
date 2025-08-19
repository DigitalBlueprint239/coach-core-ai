import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FixedSizeList as List, VariableSizeList as VariableList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Search, Filter, Grid, List as ListIcon, Loader2, Trash2, Eye, Download } from 'lucide-react';

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

interface PlayLibraryVirtualizedProps {
  plays: Play[];
  onLoadPlay: (play: Play) => void;
  onDeletePlay: (playId: string) => void;
  onExportPlay?: (play: Play) => void;
  onPreviewPlay?: (play: Play) => void;
  height?: number;
  width?: number;
  itemHeight?: number;
  enableInfiniteScroll?: boolean;
  enableLazyLoading?: boolean;
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  maxItems?: number;
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

const PlayLibraryVirtualized: React.FC<PlayLibraryVirtualizedProps> = ({
  plays,
  onLoadPlay,
  onDeletePlay,
  onExportPlay,
  onPreviewPlay,
  height = 600,
  width = 400,
  itemHeight = 120,
  enableInfiniteScroll = true,
  enableLazyLoading = true,
  enableSearch = true,
  enableFiltering = true,
  enableSorting = true,
  maxItems = 1000
}) => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    phase: [],
    type: [],
    difficulty: [],
    formation: [],
    tags: [],
    dateRange: { start: null, end: null }
  });
  const [sorting, setSorting] = useState<SortState>({
    field: 'createdAt',
    direction: 'desc'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadedItems, setLoadedItems] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Refs
  const listRef = useRef<List>(null);
  const variableListRef = useRef<VariableList>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Performance monitoring
  const performanceMetrics = useRef({
    renderCount: 0,
    filterCount: 0,
    searchCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0
  });

  // Memoized filtered and sorted plays
  const filteredPlays = useMemo(() => {
    const startTime = performance.now();
    performanceMetrics.current.filterCount++;

    let result = plays;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(play => 
        play.name.toLowerCase().includes(query) ||
        play.description?.toLowerCase().includes(query) ||
        play.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        play.formation.toLowerCase().includes(query) ||
        play.phase.toLowerCase().includes(query) ||
        play.type.toLowerCase().includes(query)
      );
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
      result = result.filter(play => 
        play.tags?.some(tag => filters.tags.includes(tag))
      );
    }
    if (filters.dateRange.start || filters.dateRange.end) {
      result = result.filter(play => {
        const playDate = new Date(play.createdAt);
        if (filters.dateRange.start && playDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && playDate > filters.dateRange.end) return false;
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
  const getRowHeight = useCallback((index: number) => {
    const play = filteredPlays[index];
    if (!play) return itemHeight;

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
  const loadThumbnail = useCallback(async (play: Play, index: number) => {
    if (!enableLazyLoading || loadedItems.has(index)) return;

    setIsLoading(true);
    try {
      // Simulate thumbnail generation/loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
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
              } else {
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
    } catch (error) {
      console.error('Error loading thumbnail:', error);
    } finally {
      setIsLoading(false);
    }
  }, [enableLazyLoading, loadedItems]);

  // Infinite scroll handler
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    return new Promise<void>((resolve) => {
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
  const renderListItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const play = filteredPlays[index];
    if (!play) return null;

    const isSelected = selectedPlayId === play.id;
    const isExpanded = expandedItems.has(index);

    return (
      <div
        style={style}
        className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer ${
          isSelected ? 'bg-blue-50 border-blue-200' : ''
        }`}
        onClick={() => setSelectedPlayId(play.id)}
      >
        <div className="flex items-start space-x-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {play.thumbnail ? (
              <img
                src={play.thumbnail}
                alt={play.name}
                className="w-16 h-12 rounded border object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-400" />
                )}
              </div>
            )}
          </div>

          {/* Play Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">{play.name}</h3>
              <div className="flex items-center space-x-2">
                {onPreviewPlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewPlay(play);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                {onExportPlay && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportPlay(play);
                    }}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="Export"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePlay(play.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {play.phase}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {play.type}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {play.formation}
              </span>
              {play.difficulty && (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  play.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                  play.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {play.difficulty}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="text-sm text-gray-500">
                {play.players.length} players • {play.routes.length} routes
              </div>
              <div className="text-sm text-gray-500">
                {new Date(play.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Tags */}
            {play.tags && play.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {play.tags.slice(0, 3).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
                {play.tags.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    +{play.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            {play.description && (
              <div className="mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedItems(prev => {
                      const newSet = new Set(prev);
                      if (isExpanded) {
                        newSet.delete(index);
                      } else {
                        newSet.add(index);
                      }
                      return newSet;
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {isExpanded ? 'Show less' : 'Show more'}
                </button>
                {isExpanded && (
                  <p className="text-sm text-gray-600 mt-1">{play.description}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLoadPlay(play);
            }}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Load Play
          </button>
        </div>
      </div>
    );
  }, [filteredPlays, selectedPlayId, expandedItems, isLoading, onLoadPlay, onDeletePlay, onPreviewPlay, onExportPlay]);

  // Grid item renderer
  const renderGridItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const play = filteredPlays[index];
    if (!play) return null;

    const isSelected = selectedPlayId === play.id;

    return (
      <div
        style={style}
        className={`p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
        }`}
        onClick={() => setSelectedPlayId(play.id)}
      >
        {/* Thumbnail */}
        <div className="aspect-video mb-3 rounded overflow-hidden">
          {play.thumbnail ? (
            <img
              src={play.thumbnail}
              alt={play.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Eye className="w-6 h-6 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Play Info */}
        <h3 className="font-semibold text-gray-900 text-sm mb-2 truncate">{play.name}</h3>
        
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {play.phase}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {play.type}
          </span>
        </div>

        <div className="text-xs text-gray-500 mb-3">
          {play.players.length} players • {new Date(play.createdAt).toLocaleDateString()}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLoadPlay(play);
            }}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
          >
            Load
          </button>
          <div className="flex space-x-1">
            {onPreviewPlay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewPlay(play);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Preview"
              >
                <Eye className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlay(play.id);
              }}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }, [filteredPlays, selectedPlayId, isLoading, onLoadPlay, onDeletePlay, onPreviewPlay]);

  // Search handler with debouncing
  const handleSearch = useCallback((query: string) => {
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    filterTimeoutRef.current = setTimeout(() => {
      setSearchQuery(query);
      performanceMetrics.current.searchCount++;
    }, 300);
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback((filterType: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  // Sort handler
  const handleSortChange = useCallback((field: keyof Play) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
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
  const scrollToTop = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
    if (variableListRef.current) {
      variableListRef.current.scrollTo(0);
    }
  }, []);

  // Performance monitoring effect
  useEffect(() => {
    performanceMetrics.current.renderCount++;
  });

  // Auto-focus search input
  useEffect(() => {
    if (searchInputRef.current && enableSearch) {
      searchInputRef.current.focus();
    }
  }, [enableSearch]);

  // Calculate available filters
  const availableFilters = useMemo(() => {
    const phases = [...new Set(plays.map(p => p.phase))];
    const types = [...new Set(plays.map(p => p.type))];
    const difficulties = [...new Set(plays.map(p => p.difficulty || 'intermediate'))];
    const formations = [...new Set(plays.map(p => p.formation))];
    const tags = [...new Set(plays.flatMap(p => p.tags || []))];

    return { phases, types, difficulties, formations, tags };
  }, [plays]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Play Library</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {enableSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search plays..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        )}

        {/* Filters */}
        {enableFiltering && (
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={filters.phase[0] || ''}
              onChange={(e) => handleFilterChange('phase', e.target.value ? [e.target.value] : [])}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">All Phases</option>
              {availableFilters.phases.map(phase => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>

            <select
              value={filters.type[0] || ''}
              onChange={(e) => handleFilterChange('type', e.target.value ? [e.target.value] : [])}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">All Types</option>
              {availableFilters.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={filters.difficulty[0] || ''}
              onChange={(e) => handleFilterChange('difficulty', e.target.value ? [e.target.value] : [])}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="">All Difficulties</option>
              {availableFilters.difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Results Info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredPlays.length} of {plays.length} plays
          </span>
          {enableSorting && (
            <select
              value={`${sorting.field}-${sorting.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSorting({ field: field as keyof Play, direction: direction as 'asc' | 'desc' });
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          )}
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 overflow-hidden">
        {filteredPlays.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No plays found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </div>
        ) : (
          <InfiniteLoader
            isItemLoaded={(index) => !enableInfiniteScroll || index < filteredPlays.length}
            itemCount={enableInfiniteScroll ? filteredPlays.length + 1 : filteredPlays.length}
            loadMoreItems={enableInfiniteScroll ? loadMoreItems : () => Promise.resolve()}
          >
            {({ onItemsRendered, ref }) => (
              viewMode === 'list' ? (
                <VariableList
                  ref={(listRef as any) || ref}
                  height={height - 200} // Account for header
                  width={width}
                  itemCount={filteredPlays.length}
                  itemSize={getRowHeight}
                  onItemsRendered={onItemsRendered}
                  overscanCount={5}
                >
                  {renderListItem}
                </VariableList>
              ) : (
                <List
                  ref={(listRef as any) || ref}
                  height={height - 200}
                  width={width}
                  itemCount={Math.ceil(filteredPlays.length / 2)} // 2 items per row
                  itemSize={200} // Fixed height for grid items
                  onItemsRendered={onItemsRendered}
                  overscanCount={5}
                >
                  {({ index, style }) => {
                    const startIndex = index * 2;
                    return (
                      <div style={style} className="flex space-x-2">
                        {renderGridItem({ index: startIndex, style: { width: '50%' } })}
                        {startIndex + 1 < filteredPlays.length && 
                         renderGridItem({ index: startIndex + 1, style: { width: '50%' } })}
                      </div>
                    );
                  }}
                </List>
              )
            )}
          </InfiniteLoader>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Memory usage: {Math.round(performanceMetrics.current.averageRenderTime)}ms avg render
          </div>
          <div className="flex space-x-2">
            <button
              onClick={scrollToTop}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              ↑ Top
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayLibraryVirtualized; 