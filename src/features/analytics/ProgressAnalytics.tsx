import React from 'react';

interface ProgressAnalyticsProps {
  userId: string;
  metricType: string;
  timeRange: {
    start: Date;
    end: Date;
  };
}

const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  userId,
  metricType,
  timeRange,
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4">Progress Analytics</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">User ID:</span>
          <span className="font-mono text-sm">{userId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Metric:</span>
          <span className="capitalize">{metricType}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Time Range:</span>
          <span className="text-sm">
            {timeRange.start.toLocaleDateString()} -{' '}
            {timeRange.end.toLocaleDateString()}
          </span>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Analytics data will be displayed here once the feature is fully
            implemented.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgressAnalytics;
