import React, { useState } from "react";

const FeedbackPanel = ({ drills, feedback, onAddFeedback }) => {
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [showAddFeedback, setShowAddFeedback] = useState(false);

  const emojis = ["😞", "😐", "🙂", "😊", "🤩"];
  const ratingLabels = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmitFeedback = () => {
    if (selectedDrill && rating > 0) {
      onAddFeedback(selectedDrill.id, rating, notes);
      setSelectedDrill(null);
      setRating(0);
      setNotes("");
      setShowAddFeedback(false);
    }
  };

  const getAverageRating = (drillId) => {
    const drillFeedback = feedback[drillId];
    if (!drillFeedback) return 0;
    return drillFeedback.rating;
  };

  const getFeedbackStats = () => {
    const totalDrills = drills.length;
    const drillsWithFeedback = Object.keys(feedback).length;
    const averageRating = Object.values(feedback).reduce((sum, f) => sum + f.rating, 0) / drillsWithFeedback || 0;
    
    return {
      totalDrills,
      drillsWithFeedback,
      averageRating: averageRating.toFixed(1),
      completionRate: totalDrills > 0 ? Math.round((drillsWithFeedback / totalDrills) * 100) : 0
    };
  };

  const stats = getFeedbackStats();

  return (
    <div className="space-y-6">
      {/* Feedback Header */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="text-2xl">💬</div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Practice Feedback</h3>
            <p className="text-gray-600">Rate drills and leave notes after practice sessions</p>
          </div>
        </div>
        
        {/* Feedback Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Total Drills</div>
            <div className="text-lg font-semibold text-blue-600">{stats.totalDrills}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">With Feedback</div>
            <div className="text-lg font-semibold text-green-600">{stats.drillsWithFeedback}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Avg Rating</div>
            <div className="text-lg font-semibold text-yellow-600">{stats.averageRating}</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="text-sm font-medium text-gray-700">Completion</div>
            <div className="text-lg font-semibold text-purple-600">{stats.completionRate}%</div>
          </div>
        </div>
      </div>

      {/* Add Feedback Button */}
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-medium text-gray-800">Drill Feedback</h4>
        <button
          onClick={() => setShowAddFeedback(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>➕</span>
          <span>Add Feedback</span>
        </button>
      </div>

      {/* Drills List */}
      <div className="space-y-4">
        {drills.map((drill) => {
          const drillFeedback = feedback[drill.id];
          const hasFeedback = !!drillFeedback;
          
          return (
            <div
              key={drill.id}
              className={`bg-white border rounded-lg p-4 transition-colors ${
                hasFeedback ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="font-medium text-gray-800">{drill.name}</h5>
                    {hasFeedback && (
                      <span className="text-green-600 text-sm font-medium">✓ Rated</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Duration: {drill.duration} min</span>
                    {drill.category && <span>Category: {drill.category}</span>}
                    {drill.intensity && <span>Intensity: {drill.intensity}</span>}
                  </div>

                  {hasFeedback && (
                    <div className="mt-3 p-3 bg-white rounded border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{emojis[drillFeedback.rating - 1]}</span>
                        <span className="font-medium text-gray-800">
                          {ratingLabels[drillFeedback.rating - 1]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(drillFeedback.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      {drillFeedback.notes && (
                        <p className="text-sm text-gray-700">{drillFeedback.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {hasFeedback ? (
                    <button
                      onClick={() => {
                        setSelectedDrill(drill);
                        setRating(drillFeedback.rating);
                        setNotes(drillFeedback.notes || "");
                        setShowAddFeedback(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDrill(drill);
                        setRating(0);
                        setNotes("");
                        setShowAddFeedback(true);
                      }}
                      className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      Rate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {drills.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No drills to rate</h3>
          <p className="text-gray-600">Add drills to your practice plan to start collecting feedback</p>
        </div>
      )}

      {/* Feedback Summary */}
      {Object.keys(feedback).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-800 mb-4">Feedback Summary</h4>
          <div className="space-y-3">
            {Object.entries(feedback).map(([drillId, feedbackData]) => {
              const drill = drills.find(d => d.id === parseInt(drillId));
              if (!drill) return null;
              
              return (
                <div key={drillId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{emojis[feedbackData.rating - 1]}</span>
                    <div>
                      <div className="font-medium text-gray-800">{drill.name}</div>
                      <div className="text-sm text-gray-600">
                        {ratingLabels[feedbackData.rating - 1]} • {new Date(feedbackData.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {feedbackData.notes && (
                    <div className="text-sm text-gray-600 max-w-xs truncate">
                      "{feedbackData.notes}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Feedback Modal */}
      {showAddFeedback && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-semibold mb-4">
              {selectedDrill ? `Rate: ${selectedDrill.name}` : 'Add Feedback'}
            </h3>
            
            {selectedDrill && (
              <div className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
                  <div className="flex justify-center space-x-4">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => setRating(index + 1)}
                        className={`text-3xl transition-transform ${
                          rating === index + 1 ? 'scale-110' : 'hover:scale-105'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <div className="text-center mt-2 text-sm font-medium text-gray-700">
                      {ratingLabels[rating - 1]}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Share your thoughts about this drill..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={rating === 0}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Save Feedback
                  </button>
                  <button
                    onClick={() => {
                      setShowAddFeedback(false);
                      setSelectedDrill(null);
                      setRating(0);
                      setNotes("");
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel; 