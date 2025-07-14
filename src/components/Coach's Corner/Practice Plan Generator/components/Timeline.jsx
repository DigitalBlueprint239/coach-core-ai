import React, { useState, useEffect, useRef } from "react";
import { validatePracticePlan, getValidationSummary } from "../utils/validation";

const Timeline = ({
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
  const dragRef = useRef(null);

  // Generate 15-minute time slots from 0 to 180 minutes (3 hours)
  const timeSlots = [];
  for (let i = 0; i <= 180; i += 15) {
    timeSlots.push(i);
  }

  // Validate plan whenever drills change
  useEffect(() => {
    if (drills.length > 0) {
      const result = validatePracticePlan(plan, drills, sportProgram, rosterDetails, practiceSchedule);
      setValidationResult(result);
    }
  }, [drills, plan, sportProgram, rosterDetails, practiceSchedule]);

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e, drill) => {
    setDraggedDrill(drill);
    e.dataTransfer.effectAllowed = "move";
    
    // Create custom drag image
    if (dragRef.current) {
      e.dataTransfer.setDragImage(dragRef.current, 0, 0);
    }
  };

  const handleDragOver = (e, timeSlot) => {
    e.preventDefault();
    setDragOverSlot(timeSlot);
  };

  const handleDrop = (e, timeSlot) => {
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
  };

  const checkTimeConflicts = (drill, timeSlot) => {
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
  };

  const scheduleBreaksAroundDrill = (drill, timeSlot) => {
    const drillEnd = timeSlot + (drill.duration || 15);
    
    // Add water break after high-intensity drills
    if (drill.intensity === 'high') {
      const breakTime = drillEnd;
      const breakDrill = {
        id: Date.now() + Math.random(),
        name: "Water Break",
        duration: 5,
        category: "recovery",
        intensity: "low",
        timeSlot: breakTime,
        isBreak: true
      };
      onDrillAdd(breakDrill);
    }
  };

  const getDrillsForTimeSlot = (timeSlot) => {
    return drills.filter(drill => drill.timeSlot === timeSlot);
  };

  const getDrillColor = (drill) => {
    if (drill.isBreak) return 'bg-blue-100 text-blue-800';
    
    switch (drill.category) {
      case 'warmup': return 'bg-green-100 text-green-800';
      case 'skills': return 'bg-blue-100 text-blue-800';
      case 'team': return 'bg-purple-100 text-purple-800';
      case 'conditioning': return 'bg-red-100 text-red-800';
      case 'special teams': return 'bg-yellow-100 text-yellow-800';
      case 'recovery': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDrillIntensity = (drill) => {
    switch (drill.intensity) {
      case 'low': return '🟢';
      case 'moderate': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  const totalDuration = drills.reduce((sum, drill) => sum + (drill.duration || 0), 0);

  const autoScheduleAllBreaks = () => {
    const sortedDrills = [...drills].sort((a, b) => (a.timeSlot || 0) - (b.timeSlot || 0));
    let currentTime = 0;
    const newBreaks = [];

    sortedDrills.forEach(drill => {
      if (drill.timeSlot !== undefined) {
        // Add break before drill if there's a gap
        if (drill.timeSlot - currentTime > 15) {
          newBreaks.push({
            id: Date.now() + Math.random(),
            name: "Break",
            duration: 5,
            category: "recovery",
            intensity: "low",
            timeSlot: currentTime + 10,
            isBreak: true
          });
        }
        currentTime = drill.timeSlot + (drill.duration || 15);
      }
    });

    newBreaks.forEach(breakDrill => onDrillAdd(breakDrill));
  };

  const optimizeSchedule = () => {
    // Sort drills by intensity for better progression
    const sortedDrills = [...drills].sort((a, b) => {
      const intensityOrder = { low: 1, moderate: 2, high: 3 };
      return intensityOrder[a.intensity || 'moderate'] - intensityOrder[b.intensity || 'moderate'];
    });

    // Clear existing time slots
    const clearedDrills = drills.map(drill => ({ ...drill, timeSlot: undefined }));
    
    // Reschedule with optimal progression
    let currentTime = 0;
    const rescheduledDrills = clearedDrills.map(drill => {
      const rescheduled = { ...drill, timeSlot: currentTime };
      currentTime += drill.duration || 15;
      return rescheduled;
    });

    // Update all drills
    rescheduledDrills.forEach(drill => onDrillUpdate(drill.id, drill));
  };

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
              onClick={autoScheduleAllBreaks}
              className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              🚰 Auto Breaks
            </button>
            <button
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Time Conflict Detected</h3>
            <p className="text-gray-600 mb-4">
              This drill conflicts with existing drills. Please choose an action:
            </p>
            <div className="space-y-3">
              <button
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
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
    </div>
  );
};

export default Timeline; 