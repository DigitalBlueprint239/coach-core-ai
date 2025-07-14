import React from 'react';
import PracticePlanGenerator from './PracticePlanGenerator';

// Demo data for the Practice Plan Generator
const demoRosterDetails = [
  { name: "John Smith", position: "QB", grade: "Senior" },
  { name: "Mike Johnson", position: "RB", grade: "Junior" },
  { name: "David Wilson", position: "WR", grade: "Senior" },
  { name: "Chris Davis", position: "WR", grade: "Sophomore" },
  { name: "Tom Brown", position: "TE", grade: "Junior" },
  { name: "Alex Martinez", position: "OL", grade: "Senior" },
  { name: "Ryan Garcia", position: "OL", grade: "Junior" },
  { name: "James Lee", position: "DL", grade: "Senior" },
  { name: "Kevin Chen", position: "LB", grade: "Junior" },
  { name: "Marcus Thompson", position: "DB", grade: "Senior" },
  { name: "Jake Williams", position: "K", grade: "Junior" },
  { name: "Sam Rodriguez", position: "P", grade: "Senior" }
];

const demoPracticeSchedule = [
  { date: "2024-01-15", time: "3:00 PM", duration: 90, type: "Regular Practice" },
  { date: "2024-01-17", time: "3:00 PM", duration: 90, type: "Regular Practice" },
  { date: "2024-01-19", time: "10:00 AM", duration: 120, type: "Game Day Prep" },
  { date: "2024-01-20", time: "2:00 PM", duration: 60, type: "Walk-through" }
];

// Demo component showing how to use the Practice Plan Generator
function PracticePlanGeneratorDemo() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Coach Core AI</h1>
              <p className="text-gray-600">Practice Plan Generator Demo</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Demo Mode</div>
              <div className="text-sm font-medium text-blue-600">Football Team</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <PracticePlanGenerator
        userRole="coach"
        sportProgram="Football"
        rosterDetails={demoRosterDetails}
        practiceSchedule={demoPracticeSchedule}
      />

      {/* Demo Instructions */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Demo Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Try These Features:</h4>
              <ul className="space-y-2 text-sm text-blue-600">
                <li>• <strong>Timeline Tab:</strong> Drag drills to schedule them</li>
                <li>• <strong>AI Copilot Tab:</strong> Describe practice goals for AI suggestions</li>
                <li>• <strong>Drill Library Tab:</strong> Browse and add custom drills</li>
                <li>• <strong>Feedback Tab:</strong> Rate drills after practice</li>
                <li>• <strong>Export Tab:</strong> Share plans in multiple formats</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Sample AI Prompts:</h4>
              <ul className="space-y-2 text-sm text-blue-600">
                <li>• "Focus on quarterback accuracy and receiver routes"</li>
                <li>• "High-intensity conditioning with team drills"</li>
                <li>• "Special teams practice with field goals and punting"</li>
                <li>• "Game day preparation with light warmup"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PracticePlanGeneratorDemo;

// Alternative usage with minimal props
export function SimplePracticePlanGenerator() {
  return (
    <PracticePlanGenerator
      userRole="coach"
      sportProgram="Football"
    />
  );
}

// Usage with custom data
export function CustomPracticePlanGenerator({ sport, roster, schedule }) {
  return (
    <PracticePlanGenerator
      userRole="coach"
      sportProgram={sport || "Football"}
      rosterDetails={roster || []}
      practiceSchedule={schedule || []}
    />
  );
} 