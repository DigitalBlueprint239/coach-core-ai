// src/components/ui/MobileDrillSelector.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TouchableOpacity } from './TouchableOpacity';
import { SwipeGesture } from './SwipeGesture';
// Optional haptics import for mobile devices
let Haptics: any = null;
try {
  Haptics = require('@capacitor/haptics').Haptics;
} catch (e) {
  // Haptics not available, will use fallback
  Haptics = {
    impact: () => Promise.resolve(),
    selection: () => Promise.resolve(),
    notification: () => Promise.resolve()
  };
}

interface Drill {
  id: string;
  name: string;
  description: string;
  category: 'warmup' | 'skill' | 'tactical' | 'conditioning';
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment: string[];
  instructions: string[];
  thumbnail?: string;
}

interface MobileDrillSelectorProps {
  drills: Drill[];
  selectedDrills: string[];
  onDrillSelect: (drillId: string) => void;
  onDrillDeselect: (drillId: string) => void;
  onDrillAdd: (drill: Drill) => void;
  onDrillDelete: (drillId: string) => void;
  onDrillEdit: (drill: Drill) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const MobileDrillSelector: React.FC<MobileDrillSelectorProps> = ({
  drills,
  selectedDrills,
  onDrillSelect,
  onDrillDeselect,
  onDrillAdd,
  onDrillDelete,
  onDrillEdit,
  className = '',
  style = {},
}) => {
  const [activeCategory, setActiveCategory] =
    useState<Drill['category']>('warmup');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [showDrillDetails, setShowDrillDetails] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    drillId: string | null;
  }>({
    isDragging: false,
    drillId: null,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // FILTERED DRILLS
  // ============================================

  const filteredDrills = drills.filter(drill => {
    const matchesCategory = drill.category === activeCategory;
    const matchesSearch =
      drill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories: Drill['category'][] = [
    'warmup',
    'skill',
    'tactical',
    'conditioning',
  ];

  // ============================================
  // HAPTIC FEEDBACK
  // ============================================

  const triggerHapticFeedback = useCallback(
    async (type: 'light' | 'medium' | 'success' | 'error') => {
      try {
        switch (type) {
          case 'light':
            await Haptics.impact({ style: 'light' });
            break;
          case 'medium':
            await Haptics.impact({ style: 'medium' });
            break;
          case 'success':
            await Haptics.notification({ type: 'success' });
            break;
          case 'error':
            await Haptics.notification({ type: 'error' });
            break;
        }
      } catch (error) {
        console.warn('Haptic feedback not available:', error);
      }
    },
    []
  );

  // ============================================
  // DRILL SELECTION HANDLERS
  // ============================================

  const handleDrillToggle = useCallback(
    (drillId: string) => {
      if (selectedDrills.includes(drillId)) {
        onDrillDeselect(drillId);
        triggerHapticFeedback('light');
      } else {
        onDrillSelect(drillId);
        triggerHapticFeedback('success');
      }
    },
    [selectedDrills, onDrillSelect, onDrillDeselect, triggerHapticFeedback]
  );

  const handleDrillLongPress = useCallback(
    (drillId: string) => {
      setShowDrillDetails(drillId);
      triggerHapticFeedback('medium');
    },
    [triggerHapticFeedback]
  );

  const handleDrillDelete = useCallback(
    (drillId: string) => {
      onDrillDelete(drillId);
      setShowDrillDetails(null);
      triggerHapticFeedback('success');
    },
    [onDrillDelete, triggerHapticFeedback]
  );

  const handleDrillEdit = useCallback(
    (drill: Drill) => {
      onDrillEdit(drill);
      setShowDrillDetails(null);
      triggerHapticFeedback('light');
    },
    [onDrillEdit, triggerHapticFeedback]
  );

  // ============================================
  // CATEGORY NAVIGATION
  // ============================================

  const handleCategoryChange = useCallback(
    (category: Drill['category']) => {
      setActiveCategory(category);
      triggerHapticFeedback('light');
    },
    [triggerHapticFeedback]
  );

  const handleSwipeCategory = useCallback(
    (direction: 'left' | 'right') => {
      const currentIndex = categories.indexOf(activeCategory);
      let newIndex: number;

      if (direction === 'left') {
        newIndex = (currentIndex + 1) % categories.length;
      } else {
        newIndex = (currentIndex - 1 + categories.length) % categories.length;
      }

      setActiveCategory(categories[newIndex]);
      triggerHapticFeedback('light');
    },
    [activeCategory, categories, triggerHapticFeedback]
  );

  // ============================================
  // SEARCH HANDLERS
  // ============================================

  const handleSearchFocus = useCallback(() => {
    triggerHapticFeedback('light');
  }, [triggerHapticFeedback]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    []
  );

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
    triggerHapticFeedback('light');
  }, [triggerHapticFeedback]);

  // ============================================
  // ADD DRILL HANDLERS
  // ============================================

  const handleAddDrill = useCallback(() => {
    setShowAddDrill(true);
    triggerHapticFeedback('light');
  }, [triggerHapticFeedback]);

  const handleCreateDrill = useCallback(
    (drillData: Partial<Drill>) => {
      const newDrill: Drill = {
        id: `drill_${Date.now()}`,
        name: drillData.name || 'New Drill',
        description: drillData.description || '',
        category: drillData.category || 'warmup',
        duration: drillData.duration || 10,
        difficulty: drillData.difficulty || 'beginner',
        equipment: drillData.equipment || [],
        instructions: drillData.instructions || [],
        ...drillData,
      };

      onDrillAdd(newDrill);
      setShowAddDrill(false);
      triggerHapticFeedback('success');
    },
    [onDrillAdd, triggerHapticFeedback]
  );

  // ============================================
  // PULL TO REFRESH
  // ============================================

  const handlePullToRefresh = useCallback(async () => {
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    triggerHapticFeedback('success');
  }, [triggerHapticFeedback]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getCategoryIcon = useCallback((category: Drill['category']) => {
    switch (category) {
      case 'warmup':
        return '🔥';
      case 'skill':
        return '⚽';
      case 'tactical':
        return '🎯';
      case 'conditioning':
        return '💪';
      default:
        return '🏈';
    }
  }, []);

  const getDifficultyColor = useCallback((difficulty: Drill['difficulty']) => {
    switch (difficulty) {
      case 'beginner':
        return '#34C759';
      case 'intermediate':
        return '#FF9500';
      case 'advanced':
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  }, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div
      ref={containerRef}
      className={`mobile-drill-selector ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#F8F9FA',
        ...style,
      }}
    >
      {/* Header */}
      <div
        className="drill-selector-header"
        style={{
          backgroundColor: '#FFFFFF',
          padding: '16px',
          borderBottom: '1px solid #E5E5E7',
        }}
      >
        {/* Search Bar */}
        <div
          className="search-container"
          style={{
            position: 'relative',
            marginBottom: '12px',
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search drills..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            style={{
              width: '100%',
              padding: '12px 40px 12px 16px',
              border: '1px solid #E5E5E7',
              borderRadius: '8px',
              fontSize: '16px',
              backgroundColor: '#F8F9FA',
            }}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={handleSearchClear}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                borderRadius: '10px',
                backgroundColor: '#C7C7CC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '12px',
              }}
              hapticFeedback="light"
            >
              ×
            </TouchableOpacity>
          )}
        </div>

        {/* Category Tabs */}
        <SwipeGesture
          onSwipeLeft={() => handleSwipeCategory('left')}
          onSwipeRight={() => handleSwipeCategory('right')}
          enableSwipeNavigation={true}
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              onPress={() => handleCategoryChange(category)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor:
                  activeCategory === category ? '#007AFF' : '#F0F0F0',
                color: activeCategory === category ? '#FFFFFF' : '#000000',
                fontSize: '14px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              hapticFeedback="light"
            >
              <span>{getCategoryIcon(category)}</span>
              <span style={{ textTransform: 'capitalize' }}>{category}</span>
            </TouchableOpacity>
          ))}
        </SwipeGesture>
      </div>

      {/* Drill List */}
      <SwipeGesture
        onPullToRefresh={handlePullToRefresh}
        enablePullToRefresh={true}
        style={{
          flex: 1,
          overflowY: 'auto',
        }}
      >
        <div
          className="drill-list"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {filteredDrills.map(drill => (
            <TouchableOpacity
              key={drill.id}
              onPress={() => handleDrillToggle(drill.id)}
              onLongPress={() => handleDrillLongPress(drill.id)}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '16px',
                border: selectedDrills.includes(drill.id)
                  ? '2px solid #007AFF'
                  : '1px solid #E5E5E7',
                position: 'relative',
                overflow: 'hidden',
              }}
              hapticFeedback={
                selectedDrills.includes(drill.id) ? 'success' : 'light'
              }
            >
              {/* Selection Indicator */}
              {selectedDrills.includes(drill.id) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '12px',
                    backgroundColor: '#007AFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                >
                  ✓
                </div>
              )}

              {/* Drill Content */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {/* Thumbnail */}
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    backgroundColor: '#F0F0F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  {drill.thumbnail ? (
                    <img
                      src={drill.thumbnail}
                      alt={drill.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                    />
                  ) : (
                    getCategoryIcon(drill.category)
                  )}
                </div>

                {/* Drill Info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <h3
                      style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}
                    >
                      {drill.name}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getDifficultyColor(drill.difficulty),
                        color: '#FFFFFF',
                      }}
                    >
                      {drill.difficulty}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      color: '#666666',
                      marginBottom: '8px',
                    }}
                  >
                    {drill.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#666666' }}>
                      ⏱️ {drill.duration} min
                    </span>
                    {drill.equipment.length > 0 && (
                      <span style={{ fontSize: '12px', color: '#666666' }}>
                        🏈 {drill.equipment.length} items
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TouchableOpacity>
          ))}

          {/* Add Drill Button */}
          <TouchableOpacity
            onPress={handleAddDrill}
            style={{
              backgroundColor: '#F0F0F0',
              borderRadius: '12px',
              padding: '20px',
              border: '2px dashed #C7C7CC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#666666',
              fontSize: '16px',
              fontWeight: '500',
            }}
            hapticFeedback="light"
          >
            <span style={{ fontSize: '20px' }}>+</span>
            <span>Add New Drill</span>
          </TouchableOpacity>
        </div>
      </SwipeGesture>

      {/* Drill Details Modal */}
      {showDrillDetails && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              margin: '20px',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Drill Options
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <TouchableOpacity
                onPress={() =>
                  handleDrillEdit(drills.find(d => d.id === showDrillDetails)!)
                }
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#007AFF',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}
                hapticFeedback="light"
              >
                Edit Drill
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDrillDelete(showDrillDetails)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FF3B30',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}
                hapticFeedback="medium"
              >
                Delete Drill
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDrillDetails(null)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F0F0',
                  color: '#000000',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}
                hapticFeedback="light"
              >
                Cancel
              </TouchableOpacity>
            </div>
          </div>
        </div>
      )}

      {/* Add Drill Modal */}
      {showAddDrill && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              margin: '20px',
              maxWidth: '400px',
              width: '100%',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              Create New Drill
            </h3>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <input
                type="text"
                placeholder="Drill name"
                style={{
                  padding: '12px 16px',
                  border: '1px solid #E5E5E7',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
              <textarea
                placeholder="Description"
                style={{
                  padding: '12px 16px',
                  border: '1px solid #E5E5E7',
                  borderRadius: '8px',
                  fontSize: '16px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
              <TouchableOpacity
                onPress={() =>
                  handleCreateDrill({
                    name: 'New Drill',
                    description: 'Drill description',
                  })
                }
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#007AFF',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}
                hapticFeedback="success"
              >
                Create Drill
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddDrill(false)}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F0F0F0',
                  color: '#000000',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  textAlign: 'center',
                }}
                hapticFeedback="light"
              >
                Cancel
              </TouchableOpacity>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// EXPORT
// ============================================

export default MobileDrillSelector;
