// src/components/AIMonitoringDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useEnhancedAIService } from '../hooks/useEnhancedAIService';
import { EnhancedAIServiceConfig } from '../services/ai-service-enhanced';

interface AIMonitoringDashboardProps {
  config: EnhancedAIServiceConfig;
  userId: string;
}

export const AIMonitoringDashboard: React.FC<AIMonitoringDashboardProps> = ({ 
  config, 
  userId 
}) => {
  const { 
    metrics, 
    alerts, 
    getUserQuota, 
    resetUserQuota, 
    getCacheStats,
    clearCache 
  } = useEnhancedAIService(config);

  const [userQuota, setUserQuota] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  // Update data periodically
  useEffect(() => {
    const updateData = () => {
      setUserQuota(getUserQuota(userId));
      setCacheStats(getCacheStats());
    };

    updateData();
    const interval = setInterval(updateData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [getUserQuota, getCacheStats, userId]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 border-red-300 text-red-800';
      case 'HIGH': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'LOW': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.95) return 'text-green-600';
    if (rate >= 0.9) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeColor = (time: number) => {
    if (time < 2000) return 'text-green-600';
    if (time < 5000) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Service Monitoring Dashboard
        </h1>
        <p className="text-gray-600">
          Real-time monitoring of AI service performance, usage, and alerts
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics ? formatNumber(metrics.requestCount) : '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Success Rate</p>
              <p className={`text-2xl font-semibold ${getSuccessRateColor(metrics?.successRate || 1)}`}>
                {metrics ? `${(metrics.successRate * 100).toFixed(1)}%` : '100%'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">⚡</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
              <p className={`text-2xl font-semibold ${getResponseTimeColor(metrics?.averageResponseTime || 0)}`}>
                {metrics ? formatDuration(metrics.averageResponseTime) : '0ms'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Cost</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics ? formatCurrency(metrics.totalCost) : '$0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Quota and Cache Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Quota */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Quota</h2>
          {userQuota ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Requests Today</span>
                  <span className="font-medium">
                    {userQuota.requestsToday} / {config.rateLimit?.requestsPerDay}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(userQuota.requestsToday / (config.rateLimit?.requestsPerDay || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Requests This Hour</span>
                  <span className="font-medium">
                    {userQuota.requestsThisHour} / {config.rateLimit?.requestsPerHour}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${(userQuota.requestsThisHour / (config.rateLimit?.requestsPerHour || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Requests This Minute</span>
                  <span className="font-medium">
                    {userQuota.requestsThisMinute} / {config.rateLimit?.requestsPerMinute}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-600 h-2 rounded-full" 
                    style={{ width: `${(userQuota.requestsThisMinute / (config.rateLimit?.requestsPerMinute || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost</span>
                  <span className="font-medium">{formatCurrency(userQuota.totalCost)}</span>
                </div>
              </div>

              <button
                onClick={() => resetUserQuota(userId)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Reset Quota
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No quota data available</p>
          )}
        </div>

        {/* Cache Stats */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cache Statistics</h2>
          {cacheStats ? (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Cache Size</span>
                <span className="font-medium">{cacheStats.size} items</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Memory Usage</span>
                <span className="font-medium">~{(cacheStats.size * 0.1).toFixed(1)} MB</span>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Cached Keys:</span>
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {cacheStats.keys.slice(0, 10).map((key: string, index: number) => (
                    <div key={index} className="text-xs text-gray-500 font-mono bg-gray-50 p-1 rounded mb-1">
                      {key.length > 50 ? key.substring(0, 50) + '...' : key}
                    </div>
                  ))}
                  {cacheStats.keys.length > 10 && (
                    <div className="text-xs text-gray-400">
                      ... and {cacheStats.keys.length - 10} more
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={clearCache}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
              >
                Clear Cache
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No cache data available</p>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
          <span className="text-sm text-gray-500">
            {alerts?.length || 0} active alerts
          </span>
        </div>

        {alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-4 border rounded-lg ${getAlertSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-medium mr-2">
                        {alert.type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                        alert.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                        alert.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                        'bg-blue-200 text-blue-800'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {!alert.acknowledged && (
                    <button className="ml-4 text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No active alerts
          </p>
        )}
      </div>

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h2>
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            {(['1h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedTimeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">
            Performance chart for {selectedTimeRange} would be displayed here
          </p>
        </div>
      </div>
    </div>
  );
}; 