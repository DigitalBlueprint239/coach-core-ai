import React, { useState, useEffect, useRef } from "react";
import { initialTemplates, drillLibrary } from "./planUtils";
import Timeline from "./components/Timeline";
import DrillLibrary from "./components/DrillLibrary";
import CopilotInput from "./components/CopilotInput";
import ExportPanel from "./components/ExportPanel";
import FeedbackPanel from "./components/FeedbackPanel";

const PracticePlanGenerator = ({ 
  userRole = "coach",
  sportProgram = "Football",
  rosterDetails = [],
  practiceSchedule = []
}) => {
  const [plan, setPlan] = useState([]);
  const [template, setTemplate] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [drills, setDrills] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [feedback, setFeedback] = useState({});
  const [safetyAlerts, setSafetyAlerts] = useState([]);
  const [hydrationReminders, setHydrationReminders] = useState([]);

  // Initialize with default template
  useEffect(() => {
    if (plan.length === 0) {
      setPlan(initialTemplates[0].periods);
    }
  }, []);

  // AI-powered plan generation
  const generatePlanFromAI = async (prompt) => {
    // Simulate AI processing
    const suggestions = await processAIPrompt(prompt, sportProgram, rosterDetails, practiceSchedule);
    setAiSuggestions(suggestions);
  };

  // Process AI prompt and generate suggestions
  const processAIPrompt = async (prompt, sport, roster, schedule) => {
    // This would integrate with actual AI service
    // For now, return mock suggestions based on input
    const suggestions = [];
    
    if (prompt.toLowerCase().includes("warm")) {
      suggestions.push({
        type: "warmup",
        drills: ["Dynamic Stretching", "Light Jogging", "Position-Specific Warmup"],
        duration: 15
      });
    }
    
    if (prompt.toLowerCase().includes("skill")) {
      suggestions.push({
        type: "skill",
        drills: ["Passing Drills", "Catching Practice", "Route Running"],
        duration: 20
      });
    }
    
    if (prompt.toLowerCase().includes("team")) {
      suggestions.push({
        type: "team",
        drills: ["7-on-7 Scrimmage", "Team Drills", "Game Situations"],
        duration: 25
      });
    }
    
    return suggestions;
  };

  // Save/Load logic (localStorage)
  const savePlan = () => {
    const name = prompt("Save this plan as:");
    if (name && name.trim()) {
      const saved = JSON.parse(localStorage.getItem("practicePlans") || "[]");
      const planData = {
        name,
        periods: plan,
        drills,
        timestamp: new Date().toISOString(),
        sportProgram,
        rosterDetails
      };
      localStorage.setItem(
        "practicePlans",
        JSON.stringify([...saved, planData])
      );
      alert("Practice plan saved!");
    }
  };

  const loadPlan = () => {
    const saved = JSON.parse(localStorage.getItem("practicePlans") || "[]");
    if (!saved.length) {
      alert("No saved plans.");
      return;
    }
    setShowModal(true);
  };

  const applyTemplate = (templateName) => {
    const tmpl = initialTemplates.find((t) => t.name === templateName);
    if (tmpl) setPlan(tmpl.periods);
    setTemplate(templateName);
  };

  const handlePeriodChange = (i, field, value) => {
    setPlan((prev) =>
      prev.map((period, idx) =>
        idx === i ? { ...period, [field]: value } : period
      )
    );
  };

  const addPeriod = () => setPlan([...plan, { name: "", minutes: 15 }]);

  const removePeriod = (i) => setPlan(plan.filter((_, idx) => idx !== i));

  const addDrillToTimeline = (drill, timeSlot) => {
    setDrills([...drills, { ...drill, timeSlot, id: Date.now() }]);
  };

  const updateDrillDuration = (drillId, newDuration) => {
    setDrills(drills.map(drill => 
      drill.id === drillId ? { ...drill, duration: newDuration } : drill
    ));
  };

  const removeDrill = (drillId) => {
    setDrills(drills.filter(drill => drill.id !== drillId));
  };

  const addFeedback = (drillId, rating, notes) => {
    setFeedback({
      ...feedback,
      [drillId]: { rating, notes, timestamp: new Date().toISOString() }
    });
  };

  // Safety monitoring
  useEffect(() => {
    const totalMinutes = drills.reduce((sum, drill) => sum + (drill.duration || 0), 0);
    const alerts = [];
    
    if (totalMinutes > 120) {
      alerts.push("Practice duration exceeds recommended 2-hour limit");
    }
    
    const highIntensityDrills = drills.filter(drill => 
      drill.intensity === "high"
    ).length;
    
    if (highIntensityDrills > 3) {
      alerts.push("Too many high-intensity drills - consider adding recovery periods");
    }
    
    setSafetyAlerts(alerts);
  }, [drills]);

  // Hydration reminders
  useEffect(() => {
    const totalMinutes = drills.reduce((sum, drill) => sum + (drill.duration || 0), 0);
    const reminders = [];
    
    if (totalMinutes > 60) {
      reminders.push("Schedule water break at 30-minute mark");
    }
    
    if (totalMinutes > 90) {
      reminders.push("Schedule second water break at 60-minute mark");
    }
    
    setHydrationReminders(reminders);
  }, [drills]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <h1 className="text-3xl font-bold mb-2">Practice Plan Generator</h1>
            <p className="text-blue-100">
              Create, edit, and share practice plans with AI assistance
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: "timeline", label: "Timeline", icon: "📅" },
                { id: "copilot", label: "AI Copilot", icon: "🤖" },
                { id: "library", label: "Drill Library", icon: "📚" },
                { id: "feedback", label: "Feedback", icon: "💬" },
                { id: "export", label: "Export", icon: "📤" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {/* Templates Section */}
            <div className="mb-6">
              <label className="font-medium mb-2 block text-gray-700">Quick Start Templates:</label>
              <select
                className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={template}
                onChange={(e) => applyTemplate(e.target.value)}
              >
                <option value="">— Choose a template —</option>
                {initialTemplates.map((tmpl) => (
                  <option key={tmpl.name} value={tmpl.name}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tab Content */}
            {activeTab === "timeline" && (
              <Timeline
                plan={plan}
                drills={drills}
                onPlanChange={setPlan}
                onDrillAdd={addDrillToTimeline}
                onDrillUpdate={updateDrillDuration}
                onDrillRemove={removeDrill}
                onPeriodChange={handlePeriodChange}
                onAddPeriod={addPeriod}
                onRemovePeriod={removePeriod}
                safetyAlerts={safetyAlerts}
                hydrationReminders={hydrationReminders}
              />
            )}

            {activeTab === "copilot" && (
              <CopilotInput
                onGeneratePlan={generatePlanFromAI}
                suggestions={aiSuggestions}
                sportProgram={sportProgram}
                rosterDetails={rosterDetails}
                practiceSchedule={practiceSchedule}
                onApplySuggestion={(suggestion) => {
                  // Apply AI suggestion to timeline
                  const newDrills = suggestion.drills.map(drill => ({
                    name: drill,
                    duration: suggestion.duration / suggestion.drills.length,
                    type: suggestion.type,
                    id: Date.now() + Math.random()
                  }));
                  setDrills([...drills, ...newDrills]);
                }}
              />
            )}

            {activeTab === "library" && (
              <DrillLibrary
                drills={drillLibrary}
                onAddDrill={addDrillToTimeline}
                userRole={userRole}
              />
            )}

            {activeTab === "feedback" && (
              <FeedbackPanel
                drills={drills}
                feedback={feedback}
                onAddFeedback={addFeedback}
              />
            )}

            {activeTab === "export" && (
              <ExportPanel
                plan={plan}
                drills={drills}
                feedback={feedback}
                sportProgram={sportProgram}
                rosterDetails={rosterDetails}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="flex space-x-3">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={savePlan}
              >
                💾 Save Plan
              </button>
              <button
                className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                onClick={loadPlan}
              >
                📂 Load Plan
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              Total Duration: {drills.reduce((sum, drill) => sum + (drill.duration || 0), 0)} minutes
            </div>
          </div>
        </div>
      </div>

      {/* Load Modal */}
      {showModal && (
        <SavedPlansModal
          onClose={() => setShowModal(false)}
          onLoadPlan={(planData) => {
            setPlan(planData.periods || []);
            setDrills(planData.drills || []);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
};

export default PracticePlanGenerator;

// Modal for loading plans
function SavedPlansModal({ onClose, onLoadPlan }) {
  const saved = JSON.parse(localStorage.getItem("practicePlans") || "[]");
  
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Saved Practice Plans</h3>
        {saved.length ? (
          <ul className="mb-4 space-y-2">
            {saved.map((plan, i) => (
              <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(plan.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => onLoadPlan(plan)}
                >
                  Load
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No saved plans.</p>
        )}
        <button
          className="w-full mt-4 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
} 