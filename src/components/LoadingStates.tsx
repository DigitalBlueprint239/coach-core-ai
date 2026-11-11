// src/components/LoadingStates.tsx
import React, { useState, useEffect } from 'react';

// ============================================
// LOADING STATE TYPES
// ============================================

export interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'progress' | 'pulse' | 'shimmer' | 'dots' | 'bars';
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
  showProgress?: boolean;
  progress?: number;
  duration?: number;
  className?: string;
}

export interface SkeletonProps {
  type: 'text' | 'avatar' | 'button' | 'card' | 'table' | 'form';
  lines?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export interface ProgressProps {
  value: number;
  max?: number;
  type?: 'linear' | 'circular' | 'steps';
  color?: string;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

// ============================================
// MAIN LOADING COMPONENT
// ============================================

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = 'spinner',
  size = 'medium',
  color = '#3B82F6',
  text,
  showProgress = false,
  progress = 0,
  duration = 2000,
  className = ''
}) => {
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (showProgress && progress > 0) {
      const interval = setInterval(() => {
        setCurrentProgress(prev => {
          if (prev >= progress) return progress;
          return prev + 1;
        });
      }, duration / progress);

      return () => clearInterval(interval);
    }
  }, [showProgress, progress, duration]);

  const renderLoader = () => {
    switch (type) {
      case 'spinner':
        return <SpinnerLoader size={size} color={color} />;
      case 'skeleton':
        return <SkeletonLoader size={size} />;
      case 'progress':
        return <ProgressLoader value={currentProgress} color={color} />;
      case 'pulse':
        return <PulseLoader size={size} color={color} />;
      case 'shimmer':
        return <ShimmerLoader size={size} />;
      case 'dots':
        return <DotsLoader size={size} color={color} />;
      case 'bars':
        return <BarsLoader size={size} color={color} />;
      default:
        return <SpinnerLoader size={size} color={color} />;
    }
  };

  return (
    <div className={`loading-state loading-${type} loading-${size} ${className}`}>
      <div className="loading-content">
        {renderLoader()}
        {text && <div className="loading-text">{text}</div>}
        {showProgress && (
          <div className="loading-progress">
            <Progress value={currentProgress} max={100} type="linear" color={color} />
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SPINNER LOADER
// ============================================

const SpinnerLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const sizeMap = {
    small: '16px',
    medium: '32px',
    large: '48px'
  };

  return (
    <div 
      className="spinner-loader"
      style={{
        width: sizeMap[size as keyof typeof sizeMap],
        height: sizeMap[size as keyof typeof sizeMap],
        borderColor: color
      }}
    >
      <style>{`
        .spinner-loader {
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// SKELETON LOADER
// ============================================

const SkeletonLoader: React.FC<{ size: string }> = ({ size }) => {
  const sizeMap = {
    small: { width: '100px', height: '16px' },
    medium: { width: '200px', height: '24px' },
    large: { width: '300px', height: '32px' }
  };

  const dimensions = sizeMap[size as keyof typeof sizeMap];

  return (
    <div 
      className="skeleton-loader"
      style={dimensions}
    >
      <style>{`
        .skeleton-loader {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// PROGRESS LOADER
// ============================================

const ProgressLoader: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  return (
    <div className="progress-loader">
      <div 
        className="progress-bar"
        style={{ 
          width: `${value}%`,
          backgroundColor: color
        }}
      />
      <style>{`
        .progress-loader {
          width: 200px;
          height: 8px;
          background-color: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-bar {
          height: 100%;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
};

// ============================================
// PULSE LOADER
// ============================================

const PulseLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const sizeMap = {
    small: '16px',
    medium: '32px',
    large: '48px'
  };

  return (
    <div 
      className="pulse-loader"
      style={{
        width: sizeMap[size as keyof typeof sizeMap],
        height: sizeMap[size as keyof typeof sizeMap],
        backgroundColor: color
      }}
    >
      <style>{`
        .pulse-loader {
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// SHIMMER LOADER
// ============================================

const ShimmerLoader: React.FC<{ size: string }> = ({ size }) => {
  const sizeMap = {
    small: { width: '100px', height: '16px' },
    medium: { width: '200px', height: '24px' },
    large: { width: '300px', height: '32px' }
  };

  const dimensions = sizeMap[size as keyof typeof sizeMap];

  return (
    <div 
      className="shimmer-loader"
      style={dimensions}
    >
      <style>{`
        .shimmer-loader {
          background: linear-gradient(90deg, #f0f0f0 0%, #f8f8f8 50%, #f0f0f0 100%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
          border-radius: 4px;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

// ============================================
// DOTS LOADER
// ============================================

const DotsLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const sizeMap = {
    small: '4px',
    medium: '6px',
    large: '8px'
  };

  const dotSize = sizeMap[size as keyof typeof sizeMap];

  return (
    <div className="dots-loader">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="dot"
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            animationDelay: `${i * 0.2}s`
          }}
        />
      ))}
      <style>{`
        .dots-loader {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .dot {
          border-radius: 50%;
          animation: bounce 1.4s ease-in-out infinite both;
        }
        
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// BARS LOADER
// ============================================

const BarsLoader: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const sizeMap = {
    small: { width: '3px', height: '16px' },
    medium: { width: '4px', height: '24px' },
    large: { width: '6px', height: '32px' }
  };

  const dimensions = sizeMap[size as keyof typeof sizeMap];

  return (
    <div className="bars-loader">
      {[0, 1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="bar"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            backgroundColor: color,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
      <style>{`
        .bars-loader {
          display: flex;
          gap: 2px;
          align-items: center;
        }
        
        .bar {
          animation: bars 1.2s ease-in-out infinite;
        }
        
        @keyframes bars {
          0%, 40%, 100% { transform: scaleY(0.4); }
          20% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// SKELETON COMPONENTS
// ============================================

export const Skeleton: React.FC<SkeletonProps> = ({
  type,
  lines = 1,
  width,
  height,
  className = ''
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'text':
        return (
          <div className={`skeleton-text ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className="skeleton-line"
                style={{
                  width: width || (i === lines - 1 ? '60%' : '100%'),
                  height: height || '16px'
                }}
              />
            ))}
          </div>
        );
      
      case 'avatar':
        return (
          <div
            className={`skeleton-avatar ${className}`}
            style={{
              width: width || '40px',
              height: height || '40px'
            }}
          />
        );
      
      case 'button':
        return (
          <div
            className={`skeleton-button ${className}`}
            style={{
              width: width || '120px',
              height: height || '36px'
            }}
          />
        );
      
      case 'card':
        return (
          <div className={`skeleton-card ${className}`}>
            <div className="skeleton-card-header" style={{ height: height || '200px' }} />
            <div className="skeleton-card-content">
              <div className="skeleton-line" style={{ width: '80%', height: '16px' }} />
              <div className="skeleton-line" style={{ width: '60%', height: '16px' }} />
              <div className="skeleton-line" style={{ width: '40%', height: '16px' }} />
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div className={`skeleton-table ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-cell" style={{ width: '30%' }} />
                <div className="skeleton-cell" style={{ width: '40%' }} />
                <div className="skeleton-cell" style={{ width: '30%' }} />
              </div>
            ))}
          </div>
        );
      
      case 'form':
        return (
          <div className={`skeleton-form ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="skeleton-form-field">
                <div className="skeleton-label" style={{ width: '80px', height: '14px' }} />
                <div className="skeleton-input" style={{ width: '100%', height: '36px' }} />
              </div>
            ))}
          </div>
        );
      
      default:
        return <div className="skeleton-default" style={{ width, height }} />;
    }
  };

  return (
    <>
      {renderSkeleton()}
      <style>{`
        .skeleton-text {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skeleton-line {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        .skeleton-avatar {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 50%;
        }
        
        .skeleton-button {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }
        
        .skeleton-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .skeleton-card-header {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        
        .skeleton-card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skeleton-table {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skeleton-row {
          display: flex;
          gap: 8px;
        }
        
        .skeleton-cell {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
          height: 20px;
        }
        
        .skeleton-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .skeleton-form-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .skeleton-label {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 2px;
        }
        
        .skeleton-input {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 6px;
        }
        
        .skeleton-default {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 4px;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </>
  );
};

// ============================================
// PROGRESS COMPONENT
// ============================================

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  type = 'linear',
  color = '#3B82F6',
  showLabel = false,
  animated = true,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  const renderProgress = () => {
    switch (type) {
      case 'linear':
        return (
          <div className={`progress-linear ${className}`}>
            <div className="progress-track">
              <div
                className={`progress-fill ${animated ? 'animated' : ''}`}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
            {showLabel && <div className="progress-label">{Math.round(percentage)}%</div>}
          </div>
        );
      
      case 'circular':
        return (
          <div className={`progress-circular ${className}`}>
            <svg className="progress-svg" viewBox="0 0 36 36">
              <path
                className="progress-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`progress-fill ${animated ? 'animated' : ''}`}
                style={{ stroke: color }}
                strokeDasharray={`${percentage}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            {showLabel && <div className="progress-label">{Math.round(percentage)}%</div>}
          </div>
        );
      
      case 'steps':
        return (
          <div className={`progress-steps ${className}`}>
            {Array.from({ length: max }).map((_, i) => (
              <div
                key={i}
                className={`progress-step ${i < value ? 'completed' : ''}`}
                style={{ backgroundColor: i < value ? color : '#e5e7eb' }}
              />
            ))}
            {showLabel && <div className="progress-label">{value} / {max}</div>}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {renderProgress()}
      <style>{`
        .progress-linear {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .progress-track {
          flex: 1;
          height: 8px;
          background-color: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }
        
        .progress-fill.animated {
          transition: width 0.3s ease;
        }
        
        .progress-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          min-width: 40px;
          text-align: right;
        }
        
        .progress-circular {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .progress-svg {
          width: 36px;
          height: 36px;
          transform: rotate(-90deg);
        }
        
        .progress-bg {
          fill: none;
          stroke: #e5e7eb;
          stroke-width: 3;
        }
        
        .progress-fill {
          fill: none;
          stroke-width: 3;
          stroke-linecap: round;
          transition: stroke-dasharray 0.3s ease;
        }
        
        .progress-steps {
          display: flex;
          gap: 4px;
          align-items: center;
        }
        
        .progress-step {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: background-color 0.3s ease;
        }
        
        .progress-step.completed {
          background-color: currentColor;
        }
      `}</style>
    </>
  );
};

// ============================================
// LOADING WRAPPER COMPONENT
// ============================================

export const LoadingWrapper: React.FC<{
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}> = ({ loading, error, children, fallback, errorFallback }) => {
  if (error) {
    return errorFallback ? (
      <>{errorFallback}</>
    ) : (
      <div className="error-state">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{error}</div>
        <style>{`
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px;
            text-align: center;
          }
          
          .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          .error-message {
            color: #dc2626;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <LoadingState type="spinner" text="Loading..." />
    );
  }

  return <>{children}</>;
};

export default LoadingState; 