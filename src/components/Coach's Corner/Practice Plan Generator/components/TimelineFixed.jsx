import React, { useState, useEffect, useRef, useCallback } from "react";
import { validatePracticePlan, getValidationSummary } from "../utils/validation";

// Performance monitoring
const performanceMetrics = {
  renderCount: 0,
  dragCount: 0,
  validationCount: 0,
  lastRenderTime: 0,
  averageRenderTime: 0
};

// WeakMap for storing large objects to prevent memory leaks
const objectCache = new WeakMap();

const TimelineFixed = ({
  plan,
  drills,
  onPlanChange,
  onDrillAdd,
  onDrillUpdate,
  onDrillRemove,
  onPeriodChange,
  onAddPeriod,
  onRemovePeriod,
  safetyAlerts,
  hydrationReminders,
  sportProgram,
  rosterDetails,
  practiceSchedule
}) => {
  const [draggedDrill, setDraggedDrill] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [showConflicts, setShowConflicts] = useState(false);
  const [autoScheduleBreaks, setAutoScheduleBreaks] = useState(true);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [showDrillDetails, setShowDrillDetails] = useState(false);
  
  // Refs for cleanup
  const dragRef = useRef(null);
  const modalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const cleanupRef = useRef(new Set());

  // Generate 15-minute time slots from 0 to 180 minutes (3 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = 0; i <= 180; i += 15) {
      slots.push(i);
    }
    return slots;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    cleanupRef.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupRef.current.clear();
  }, []);

  // Add cleanup function to registry
  const addCleanup = useCallback((cleanupFn) => {
    cleanupRef.current.add(cleanupFn);
  }, []);

  // Validate plan whenever drills change
  useEffect(() => {
    if (drills.length > 0) {
      const startTime = performance.now();
      const result = validatePracticePlan(plan, drills, sportProgram, rosterDetails, practiceSchedule);
      setValidationResult(result);
      
      // Update performance metrics
      const endTime = performance.now();
      performanceMetrics.validationCount++;
      performanceMetrics.lastValidationTime = endTime - startTime;
    }
  }, [drills, plan, sportProgram, rosterDetails, practiceSchedule]);

  // Handle modal cleanup
  useEffect(() => {
    if (showConflicts || showDrillDetails) {
      const handleEscape = (event) => {
        if (event.key === 'Escape') {
          setShowConflicts(false);
          setShowDrillDetails(false);
          setSelectedDrill(null);
        }
      };

      const handleClickOutside = (event) => {
        if (modalRef.current && !modalRef.current.contains(event.target)) {
          setShowConflicts(false);
          setShowDrillDetails(false);
          setSelectedDrill(null);
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      addCleanup(() => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      });

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showConflicts, showDrillDetails, addCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cleanup]);

  const formatTime = useCallback((minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }, []);

  const handleDragStart = useCallback((e, drill) => {
    setDraggedDrill(drill);
    e.dataTransfer.effectAllowed = "move";
    
    // Create custom drag image
    if (dragRef.current) {
      e.dataTransfer.setDragImage(dragRef.current, 0, 0);
    }

    // Update performance metrics
    performanceMetrics.dragCount++;
  }, []);

  const handleDragOver = useCallback((e, timeSlot) => {
    e.preventDefault();
    setDragOverSlot(timeSlot);
  }, []);

  const handleDrop = useCallback((e, timeSlot) => {
    e.preventDefault();
    if (draggedDrill && timeSlot !== null) {
      // Check for conflicts before dropping
      const conflicts = checkTimeConflicts(draggedDrill, timeSlot);
      
      if (conflicts.length > 0) {
        setShowConflicts(true);
        return;
      }

      // Remove drill from current position
      onDrillRemove(draggedDrill.id);
      // Add drill to new position
      onDrillAdd({ ...draggedDrill, timeSlot });
      
      // Auto-schedule breaks if enabled
      if (autoScheduleBreaks) {
        scheduleBreaksAroundDrill(draggedDrill, timeSlot);
      }
    }
    setDraggedDrill(null);
    setDragOverSlot(null);
  }, [draggedDrill, autoScheduleBreaks, onDrillRemove, onDrillAdd]);

  const checkTimeConflicts = useCallback((drill, timeSlot) => {
    const drillEnd = timeSlot + (drill.duration || 15);
    const conflicts = [];

    drills.forEach(existingDrill => {
      if (existingDrill.id !== drill.id && existingDrill.timeSlot !== undefined) {
        const existingEnd = existingDrill.timeSlot + (existingDrill.duration || 15);
        
        if (timeSlot < existingEnd && drillEnd > existingDrill.timeSlot) {
          conflicts.push({
            drill: existingDrill.name,
            time: `${formatTime(existingDrill.timeSlot)} - ${formatTime(existingEnd)}`
          });
        }
      }
    });

    return conflicts;
  }, [drills, formatTime]);

  const scheduleBreaksAroundDrill = useCallback((drill, timeSlot) => {
    const drillEnd = timeSlot + (drill.duration || 15);
    
    // Check if we need a break before this drill
    const needsBreakBefore = drills.some(d => 
      d.id !== drill.id && 
      d.timeSlot !== undefined && 
      d.timeSlot + (d.duration || 15) === timeSlot
    );

    // Check if we need a break after this drill
    const needsBreakAfter = drills.some(d => 
      d.id !== drill.id && 
      d.timeSlot !== undefined && 
      d.timeSlot === drillEnd
    );

    if (needsBreakBefore) {
      const breakDrill = {
        id: `break-${Date.now()}-before`,
        name: 'Water Break',
        duration: 5,
        category: 'break',
        intensity: 'low',
        timeSlot: timeSlot - 5
      };
      onDrillAdd(breakDrill);
    }

    if (needsBreakAfter) {
      const breakDrill = {
        id: `break-${Date.now()}-after`,
        name: 'Water Break',
        duration: 5,
        category: 'break',
        intensity: 'low',
        timeSlot: drillEnd
      };
      onDrillAdd(breakDrill);
    }
  }, [drills, onDrillAdd]);

  const getDrillsForTimeSlot = useCallback((timeSlot) => {
    return drills.filter(drill => drill.timeSlot === timeSlot);
  }, [drills]);

  const getDrillColor = useCallback((drill) => {
    const colors = {
      warmup: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      skill: 'bg-blue-100 text-blue-800 border-blue-200',
      conditioning: 'bg-red-100 text-red-800 border-red-200',
      game: 'bg-green-100 text-green-800 border-green-200',
      break: 'bg-gray-100 text-gray-800 border-gray-200',
      default: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[drill.category] || colors.default;
  }, []);

  const getDrillIntensity = useCallback((drill) => {
    const intensity = drill.intensity || 'medium';
    const icons = {
      low: '🟢',
      medium: '🟡',
      high: '🔴'
    };
    return icons[intensity] || icons.medium;
  }, []);

  const autoScheduleAllBreaks = useCallback(() => {
    const sortedDrills = [...drills].sort((a, b) => (a.timeSlot || 0) - (b.timeSlot || 0));
    let currentTime = 0;
    const breakInterval = 30; // Add break every 30 minutes

    sortedDrills.forEach(drill => {
      if (drill.timeSlot !== undefined) {
        const drillEnd = drill.timeSlot + (drill.duration || 15);
        
        // Add break if needed
        while (currentTime + breakInterval <= drill.timeSlot) {
          const breakDrill = {
            id: `auto-break-${Date.now()}-${currentTime}`,
            name: 'Water Break',
            duration: 5,
            category: 'break',
            intensity: 'low',
            timeSlot: currentTime
          };
          onDrillAdd(breakDrill);
          currentTime += 5;
        }
        
        currentTime = drillEnd;
      }
    });
  }, [drills, onDrillAdd]);

  const optimizeSchedule = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Schedule optimization
    animationFrameRef.current = requestAnimationFrame(() => {
      const sortedDrills = [...drills].sort((a, b) => (a.timeSlot || 0) - (b.timeSlot || 0));
      let currentTime = 0;
      const rescheduledDrills = [];

      sortedDrills.forEach(drill => {
        if (drill.timeSlot !== undefined) {
          const optimizedDrill = { ...drill, timeSlot: currentTime };
          rescheduledDrills.push(optimizedDrill);
          currentTime += drill.duration || 15;
        }
      });

      // Update all drills
      rescheduledDrills.forEach(drill => onDrillUpdate(drill.id, drill));
    });
  }, [drills, onDrillUpdate]);

  // Calculate totals
  const totalDuration = drills.reduce((total, drill) => total + (drill.duration || 15), 0);

  // Performance monitoring
  const renderStartTime = performance.now();
  performanceMetrics.renderCount++;
  performanceMetrics.lastRenderTime = renderStartTime;

  return (
    <div className="space-y-6">
      {/* Validation Summary */}
      {validationResult && (
        <div className={`border rounded-lg p-4 ${
          validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-medium ${
                validationResult.isValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validationResult.isValid ? '✅ Plan Valid' : '⚠️ Plan Needs Attention'}
              </h3>
              <p className="text-sm text-gray-600">
                {getValidationSummary(validationResult).summary}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                validationResult.score >= 80 ? 'text-green-600' : 
                validationResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {validationResult.score}/100
              </div>
            </div>
          </div>
          
          {validationResult.errors.length > 0 && (
            <div className="mt-3">
              <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">
                    • {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Safety Alerts */}
      {safetyAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">⚠️ Safety Alerts</h3>
          <ul className="text-red-700 text-sm space-y-1">
            {safetyAlerts.map((alert, index) => (
              <li key={index}>• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Hydration Reminders */}
      {hydrationReminders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-800 font-medium mb-2">💧 Hydration Reminders</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            {hydrationReminders.map((reminder, index) => (
              <li key={index}>• {reminder}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Timeline Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Practice Timeline</h3>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={autoScheduleAllBreaks}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              🚰 Auto Breaks
            </button>
            <button
              type="button"
              onClick={optimizeSchedule}
              className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 transition-colors"
            >
              ⚡ Optimize
            </button>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoScheduleBreaks}
                onChange={(e) => setAutoScheduleBreaks(e.target.checked)}
                className="rounded"
              />
              <span>Auto breaks</span>
            </label>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Time Headers */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 bg-gray-50 p-3 border-r border-gray-200 font-medium text-gray-700">
                Time
              </div>
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className={`w-32 p-3 text-center border-r border-gray-200 text-sm font-medium ${
                    dragOverSlot === slot ? 'bg-blue-100' : 'bg-gray-50'
                  }`}
                >
                  {formatTime(slot)}
                </div>
              ))}
            </div>

            {/* Timeline Slots */}
            <div className="flex">
              <div className="w-32 bg-gray-50 border-r border-gray-200"></div>
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className={`w-32 min-h-20 border-r border-gray-200 p-2 ${
                    dragOverSlot === slot ? 'bg-blue-50' : 'bg-white'
                  }`}
                  onDragOver={(e) => handleDragOver(e, slot)}
                  onDrop={(e) => handleDrop(e, slot)}
                >
                  {getDrillsForTimeSlot(slot).map((drill) => (
                    <div
                      key={drill.id}
                      className={`mb-2 p-2 rounded text-xs cursor-move relative group ${
                        getDrillColor(drill)
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, drill)}
                      onClick={() => {
                        setSelectedDrill(drill);
                        setShowDrillDetails(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{drill.name}</div>
                        <div className="flex items-center space-x-1">
                          <span>{getDrillIntensity(drill)}</span>
                          <span className="text-xs opacity-75">{drill.duration}min</span>
                        </div>
                      </div>
                      
                      {/* Equipment indicator */}
                      {drill.equipment && drill.equipment.length > 0 && (
                        <div className="text-xs opacity-75 mt-1">
                          🛠️ {drill.equipment.join(', ')}
                        </div>
                      )}
                      
                      {/* Hover actions */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDrillRemove(drill.id);
                          }}
                          title="Remove drill"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Period Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-4">Practice Periods</h3>
        <div className="space-y-3">
          {plan.map((period, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
            >
              <input
                value={period.name}
                onChange={(e) => onPeriodChange(i, "name", e.target.value)}
                className="flex-1 px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={`Period ${i + 1} name`}
              />
              <input
                type="number"
                min={1}
                value={period.minutes}
                onChange={(e) => onPeriodChange(i, "minutes", Number(e.target.value))}
                className="w-20 px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Min"
              />
              <button
                type="button"
                className="text-red-600 hover:text-red-800 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                onClick={() => onRemovePeriod(i)}
                disabled={plan.length <= 1}
                title="Remove Period"
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            type="button"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            onClick={onAddPeriod}
          >
            ➕ Add Period
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Practice Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalDuration}</div>
            <div className="text-gray-600">Total Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{drills.length}</div>
            <div className="text-gray-600">Drills Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{plan.length}</div>
            <div className="text-gray-600">Practice Periods</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {Math.ceil(totalDuration / 60)}
            </div>
            <div className="text-gray-600">Hours</div>
          </div>
        </div>
      </div>

      {/* Conflict Modal */}
      {showConflicts && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Time Conflict Detected</h3>
            <p className="text-gray-600 mb-4">
              This drill conflicts with existing drills. Please choose an action:
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  // Force add despite conflicts
                  onDrillRemove(draggedDrill.id);
                  onDrillAdd({ ...draggedDrill, timeSlot: dragOverSlot });
                  setShowConflicts(false);
                  setDraggedDrill(null);
                  setDragOverSlot(null);
                }}
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Add Anyway (May cause conflicts)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConflicts(false);
                  setDraggedDrill(null);
                  setDragOverSlot(null);
                }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drill Details Modal */}
      {showDrillDetails && selectedDrill && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div ref={modalRef} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4">{selectedDrill.name}</h3>
            <div className="space-y-3">
              <div>
                <label className="font-medium text-gray-700">Duration:</label>
                <input
                  type="number"
                  value={selectedDrill.duration || 15}
                  onChange={(e) => onDrillUpdate(selectedDrill.id, { duration: Number(e.target.value) })}
                  className="ml-2 px-2 py-1 border border-gray-300 rounded"
                  min="1"
                  max="60"
                />
                <span className="ml-2 text-gray-600">minutes</span>
              </div>
              <div>
                <label className="font-medium text-gray-700">Category:</label>
                <span className="ml-2 text-gray-600 capitalize">{selectedDrill.category}</span>
              </div>
              <div>
                <label className="font-medium text-gray-700">Intensity:</label>
                <span className="ml-2 text-gray-600 capitalize">{selectedDrill.intensity}</span>
              </div>
              {selectedDrill.description && (
                <div>
                  <label className="font-medium text-gray-700">Description:</label>
                  <p className="mt-1 text-gray-600 text-sm">{selectedDrill.description}</p>
                </div>
              )}
              {selectedDrill.equipment && selectedDrill.equipment.length > 0 && (
                <div>
                  <label className="font-medium text-gray-700">Equipment:</label>
                  <p className="mt-1 text-gray-600 text-sm">{selectedDrill.equipment.join(', ')}</p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowDrillDetails(false)}
              className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hidden drag reference */}
      <div ref={dragRef} className="hidden">
        <div className="bg-blue-100 border border-blue-300 rounded p-2 text-sm">
          {draggedDrill?.name}
        </div>
      </div>

      {/* Performance Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          Renders: {performanceMetrics.renderCount} | 
          Drags: {performanceMetrics.dragCount} | 
          Validations: {performanceMetrics.validationCount} | 
          Avg Render: {performanceMetrics.averageRenderTime.toFixed(2)}ms
        </div>
      )}
    </div>
  );
};

export default TimelineFixed; 