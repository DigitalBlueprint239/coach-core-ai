import React, { useState, useEffect } from "react";

const DrillLibrary = ({ drills, onAddDrill, userRole }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedIntensity, setSelectedIntensity] = useState("all");
  const [showAddDrill, setShowAddDrill] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [customDrills, setCustomDrills] = useState([]);

  // Load favorites and custom drills from localStorage
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("drillFavorites") || "[]");
    const savedCustomDrills = JSON.parse(localStorage.getItem("customDrills") || "[]");
    setFavorites(savedFavorites);
    setCustomDrills(savedCustomDrills);
  }, []);

  // Save favorites and custom drills to localStorage
  useEffect(() => {
    localStorage.setItem("drillFavorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("customDrills", JSON.stringify(customDrills));
  }, [customDrills]);

  const categories = [
    "all",
    "warmup",
    "conditioning",
    "skills",
    "team",
    "special teams",
    "recovery"
  ];

  const intensities = [
    "all",
    "low",
    "moderate",
    "high"
  ];

  const toggleFavorite = (drillId) => {
    setFavorites(prev => 
      prev.includes(drillId) 
        ? prev.filter(id => id !== drillId)
        : [...prev, drillId]
    );
  };

  const addCustomDrill = (drillData) => {
    const newDrill = {
      ...drillData,
      id: Date.now(),
      isCustom: true,
      createdBy: userRole
    };
    setCustomDrills([...customDrills, newDrill]);
    setShowAddDrill(false);
  };

  const deleteCustomDrill = (drillId) => {
    setCustomDrills(customDrills.filter(drill => drill.id !== drillId));
    setFavorites(favorites.filter(id => id !== drillId));
  };

  const filteredDrills = [...drills, ...customDrills].filter(drill => {
    const matchesSearch = drill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         drill.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || drill.category === selectedCategory;
    const matchesIntensity = selectedIntensity === "all" || drill.intensity === selectedIntensity;
    
    return matchesSearch && matchesCategory && matchesIntensity;
  });

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case "low": return "bg-green-100 text-green-800";
      case "moderate": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "warmup": return "🔥";
      case "conditioning": return "💪";
      case "skills": return "🎯";
      case "team": return "👥";
      case "special teams": return "⚡";
      case "recovery": return "🧘";
      default: return "📋";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Drill Library</h3>
            <p className="text-gray-600">Browse and manage practice drills</p>
          </div>
          <button
            onClick={() => setShowAddDrill(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Add Custom Drill</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search drills..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Intensity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Intensity</label>
            <select
              value={selectedIntensity}
              onChange={(e) => setSelectedIntensity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {intensities.map(intensity => (
                <option key={intensity} value={intensity}>
                  {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Favorites Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Show</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setFavorites([])}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  favorites.length === 0 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFavorites(filteredDrills.map(drill => drill.id))}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  favorites.length > 0 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Favorites
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Drill Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrills.map((drill) => (
          <div
            key={drill.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getCategoryIcon(drill.category)}</span>
                <h4 className="font-medium text-gray-800">{drill.name}</h4>
              </div>
              <button
                onClick={() => toggleFavorite(drill.id)}
                className={`text-lg transition-colors ${
                  favorites.includes(drill.id) ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                }`}
              >
                {favorites.includes(drill.id) ? '⭐' : '☆'}
              </button>
            </div>

            {drill.description && (
              <p className="text-sm text-gray-600 mb-3">{drill.description}</p>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntensityColor(drill.intensity)}`}>
                {drill.intensity}
              </span>
              <span className="text-sm text-gray-500">
                {drill.duration || 15} min
              </span>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => onAddDrill(drill, 0)}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                Add to Plan
              </button>
              {drill.isCustom && (
                <button
                  onClick={() => deleteCustomDrill(drill.id)}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                  title="Delete custom drill"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredDrills.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No drills found</h3>
          <p className="text-gray-600">Try adjusting your filters or add a custom drill</p>
        </div>
      )}

      {/* Add Custom Drill Modal */}
      {showAddDrill && (
        <AddDrillModal
          onClose={() => setShowAddDrill(false)}
          onAdd={addCustomDrill}
        />
      )}
    </div>
  );
};

// Add Custom Drill Modal
function AddDrillModal({ onClose, onAdd }) {
  const [drillData, setDrillData] = useState({
    name: "",
    description: "",
    category: "skills",
    intensity: "moderate",
    duration: 15
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (drillData.name.trim()) {
      onAdd(drillData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-semibold mb-4">Add Custom Drill</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drill Name</label>
            <input
              type="text"
              value={drillData.name}
              onChange={(e) => setDrillData({...drillData, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter drill name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={drillData.description}
              onChange={(e) => setDrillData({...drillData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe the drill"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={drillData.category}
                onChange={(e) => setDrillData({...drillData, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="warmup">Warmup</option>
                <option value="conditioning">Conditioning</option>
                <option value="skills">Skills</option>
                <option value="team">Team</option>
                <option value="special teams">Special Teams</option>
                <option value="recovery">Recovery</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Intensity</label>
              <select
                value={drillData.intensity}
                onChange={(e) => setDrillData({...drillData, intensity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={drillData.duration}
              onChange={(e) => setDrillData({...drillData, duration: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Add Drill
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DrillLibrary; 