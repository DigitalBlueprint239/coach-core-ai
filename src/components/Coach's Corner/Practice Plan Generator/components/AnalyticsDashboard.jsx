import React, { useState, useEffect } from "react";
import { useAPI } from "../services/api";

const AnalyticsDashboard = ({ teamId, dateRange = "30d" }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("overview");
  const apiService = useAPI();

  useEffect(() => {
    fetchAnalytics();
  }, [teamId, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getPracticeAnalytics(teamId, { range: dateRange });
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error loading analytics: {error}</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Practice Analytics</h3>
            <p className="text-gray-600">Insights and performance metrics</p>
          </div>
          <div className="flex space-x-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metric Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <nav className="flex space-x-4">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "drills", label: "Drill Performance", icon: "🎯" },
            { id: "players", label: "Player Progress", icon: "👥" },
            { id: "trends", label: "Trends", icon: "📈" },
            { id: "comparisons", label: "Comparisons", icon: "⚖️" }
          ].map((metric) => (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                selectedMetric === metric.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <span>{metric.icon}</span>
              <span>{metric.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Dashboard */}
      {selectedMetric === "overview" && (
        <OverviewMetrics analytics={analytics} />
      )}

      {/* Drill Performance */}
      {selectedMetric === "drills" && (
        <DrillPerformance analytics={analytics} />
      )}

      {/* Player Progress */}
      {selectedMetric === "players" && (
        <PlayerProgress analytics={analytics} />
      )}

      {/* Trends */}
      {selectedMetric === "trends" && (
        <TrendsAnalysis analytics={analytics} />
      )}

      {/* Comparisons */}
      {selectedMetric === "comparisons" && (
        <Comparisons analytics={analytics} />
      )}
    </div>
  );
};

// Overview Metrics Component
const OverviewMetrics = ({ analytics }) => {
  const { summary, recentPractices, topDrills } = analytics;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Practices"
          value={summary.totalPractices}
          change={summary.practiceChange}
          icon="📅"
          color="blue"
        />
        <MetricCard
          title="Avg Duration"
          value={`${summary.avgDuration}min`}
          change={summary.durationChange}
          icon="⏱️"
          color="green"
        />
        <MetricCard
          title="Drills Completed"
          value={summary.totalDrills}
          change={summary.drillChange}
          icon="🎯"
          color="purple"
        />
        <MetricCard
          title="Team Rating"
          value={`${summary.teamRating}/5`}
          change={summary.ratingChange}
          icon="⭐"
          color="yellow"
        />
      </div>

      {/* Recent Practices */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Recent Practices</h4>
        <div className="space-y-3">
          {recentPractices.map((practice, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-lg">{practice.emoji}</div>
                <div>
                  <div className="font-medium text-gray-800">{practice.name}</div>
                  <div className="text-sm text-gray-600">{practice.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-800">{practice.duration}min</div>
                <div className="text-sm text-gray-600">{practice.drills} drills</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Drills */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Top Performing Drills</h4>
        <div className="space-y-3">
          {topDrills.map((drill, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-lg">{index + 1}</div>
                <div>
                  <div className="font-medium text-gray-800">{drill.name}</div>
                  <div className="text-sm text-gray-600">{drill.category}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-800">{drill.rating}/5</div>
                <div className="text-sm text-gray-600">{drill.usage} times</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Drill Performance Component
const DrillPerformance = ({ analytics }) => {
  const { drillEffectiveness, drillCategories, drillTrends } = analytics;

  return (
    <div className="space-y-6">
      {/* Drill Effectiveness Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Drill Effectiveness</h4>
        <div className="space-y-4">
          {drillEffectiveness.map((drill, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-800">{drill.name}</span>
                <span className="text-sm text-gray-600">{drill.rating}/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(drill.rating / 5) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{drill.usage} uses</span>
                <span>{drill.successRate}% success</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drill Categories Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Category Performance</h4>
          <div className="space-y-3">
            {drillCategories.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium text-gray-800">{category.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{category.avgRating}/5</div>
                  <div className="text-sm text-gray-600">{category.totalDrills} drills</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Drill Trends</h4>
          <div className="space-y-3">
            {drillTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{trend.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm ${
                    trend.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {trend.change > 0 ? '↗' : '↘'} {Math.abs(trend.change)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Player Progress Component
const PlayerProgress = ({ analytics }) => {
  const { playerProgress, positionPerformance, individualStats } = analytics;

  return (
    <div className="space-y-6">
      {/* Player Progress Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Player Progress</h4>
        <div className="space-y-4">
          {playerProgress.map((player, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="font-medium text-blue-600">{player.name.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-800">{player.name}</div>
                  <div className="text-sm text-gray-600">{player.position}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-800">{player.attendance}% attendance</div>
                <div className="text-sm text-gray-600">{player.rating}/5 avg rating</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Position Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Position Performance</h4>
          <div className="space-y-3">
            {positionPerformance.map((position, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{position.name}</span>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{position.avgRating}/5</div>
                  <div className="text-sm text-gray-600">{position.players} players</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Individual Stats</h4>
          <div className="space-y-3">
            {individualStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{stat.name}</span>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Trends Analysis Component
const TrendsAnalysis = ({ analytics }) => {
  const { weeklyTrends, monthlyTrends, seasonalPatterns } = analytics;

  return (
    <div className="space-y-6">
      {/* Weekly Trends */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Weekly Trends</h4>
        <div className="space-y-4">
          {weeklyTrends.map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-lg">{trend.icon}</div>
                <div>
                  <div className="font-medium text-gray-800">{trend.metric}</div>
                  <div className="text-sm text-gray-600">{trend.period}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-800">{trend.value}</div>
                <div className={`text-sm ${
                  trend.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.change > 0 ? '↗' : '↘'} {Math.abs(trend.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Monthly Performance</h4>
          <div className="space-y-3">
            {monthlyTrends.map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{month.name}</span>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{month.practices} practices</div>
                  <div className="text-sm text-gray-600">{month.avgRating}/5 rating</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Seasonal Patterns</h4>
          <div className="space-y-3">
            {seasonalPatterns.map((pattern, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{pattern.season}</span>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{pattern.focus}</div>
                  <div className="text-sm text-gray-600">{pattern.effectiveness}% effective</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Comparisons Component
const Comparisons = ({ analytics }) => {
  const { teamComparisons, drillComparisons, timeComparisons } = analytics;

  return (
    <div className="space-y-6">
      {/* Team Comparisons */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-semibold text-gray-800 mb-4">Team Comparisons</h4>
        <div className="space-y-4">
          {teamComparisons.map((comparison, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-lg">{comparison.icon}</div>
                <div>
                  <div className="font-medium text-gray-800">{comparison.metric}</div>
                  <div className="text-sm text-gray-600">vs {comparison.baseline}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-800">{comparison.current}</div>
                <div className={`text-sm ${
                  comparison.change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {comparison.change > 0 ? '↗' : '↘'} {Math.abs(comparison.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drill Comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Drill Comparisons</h4>
          <div className="space-y-3">
            {drillComparisons.map((comparison, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{comparison.drill}</span>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{comparison.rating}/5</div>
                  <div className="text-sm text-gray-600">vs {comparison.baseline}/5</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="font-semibold text-gray-800 mb-4">Time Comparisons</h4>
          <div className="space-y-3">
            {timeComparisons.map((comparison, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{comparison.timeframe}</span>
                <div className="text-right">
                  <div className="font-medium text-gray-800">{comparison.duration}min</div>
                  <div className="text-sm text-gray-600">{comparison.efficiency}% efficient</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, change, icon, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-green-50 border-green-200 text-green-600",
    purple: "bg-purple-50 border-purple-200 text-purple-600",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full border ${colorClasses[color]}`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
      {change && (
        <div className="mt-4">
          <span className={`text-sm ${
            change > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {change > 0 ? '↗' : '↘'} {Math.abs(change)}%
          </span>
          <span className="text-sm text-gray-600 ml-1">from last period</span>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard; 