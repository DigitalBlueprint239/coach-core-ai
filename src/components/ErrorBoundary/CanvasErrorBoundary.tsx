/**
 * Canvas Error Boundary
 * 
 * Specialized error boundary for canvas-related components:
 * - SmartPlaybook (canvas crashes)
 * - WebGL errors
 * - Canvas context failures
 * - Memory issues
 * - Touch/pointer events
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import BaseErrorBoundary, { ErrorBoundaryProps, ErrorBoundaryState } from './BaseErrorBoundary';
import { isCanvasError } from './BaseErrorBoundary';

export interface CanvasErrorBoundaryProps extends ErrorBoundaryProps {
  canvasType?: '2d' | 'webgl' | 'webgl2';
  onCanvasReset?: () => void;
  onContextLost?: () => void;
  enableWebGLFallback?: boolean;
}

export interface CanvasErrorBoundaryState extends ErrorBoundaryState {
  contextLost: boolean;
  webglSupported: boolean;
  fallbackMode: boolean;
}

export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  private canvasRef: React.RefObject<HTMLCanvasElement> = React.createRef();

  constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = {
      ...this.state,
      contextLost: false,
      webglSupported: this.checkWebGLSupport(),
      fallbackMode: false
    };
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      return false;
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Check if it's a canvas-specific error
    if (isCanvasError(error)) {
      this.handleCanvasError(error, errorInfo);
    } else {
      super.componentDidCatch(error, errorInfo);
    }
  }

  private handleCanvasError(error: Error, errorInfo: ErrorInfo): void {
    console.error('Canvas error detected:', error);

    // Check for context lost
    if (error.message.includes('context') || error.message.includes('lost')) {
      this.setState({ contextLost: true });
    }

    // Check for WebGL errors
    if (error.message.includes('webgl') && this.props.enableWebGLFallback) {
      this.setState({ fallbackMode: true });
    }

    // Call parent error handler
    super.componentDidCatch(error, errorInfo);
  }

  private handleCanvasReset = (): void => {
    this.setState({
      contextLost: false,
      fallbackMode: false,
      hasError: false,
      error: null,
      errorInfo: null
    });

    if (this.props.onCanvasReset) {
      this.props.onCanvasReset();
    }
  };

  private handleContextRecovery = (): void => {
    this.setState({ contextLost: false });
    
    if (this.props.onContextLost) {
      this.props.onContextLost();
    }
  };

  private handleWebGLFallback = (): void => {
    this.setState({ fallbackMode: true });
  };

  render(): ReactNode {
    const { children, fallback, ...props } = this.props;
    const { contextLost, webglSupported, fallbackMode } = this.state;

    // Custom fallback for canvas errors
    const canvasFallback = (error: Error, errorInfo: ErrorInfo, retry: () => void, reset: () => void) => (
      <div className="canvas-error-boundary">
        <div className="canvas-error-container">
          <div className="canvas-error-header">
            <div className="canvas-error-icon">🎨</div>
            <h2 className="canvas-error-title">Canvas Error</h2>
            <p className="canvas-error-message">
              {contextLost 
                ? 'The canvas context was lost. This can happen when the browser reclaims memory.'
                : fallbackMode
                ? 'WebGL is not supported or failed to initialize. Using fallback mode.'
                : 'There was an error with the canvas rendering. This might be due to memory issues or browser limitations.'
              }
            </p>
          </div>

          <div className="canvas-error-actions">
            {contextLost && (
              <button 
                className="canvas-error-button primary"
                onClick={this.handleContextRecovery}
              >
                Recover Context
              </button>
            )}
            
            {!webglSupported && !fallbackMode && (
              <button 
                className="canvas-error-button primary"
                onClick={this.handleWebGLFallback}
              >
                Use Fallback Mode
              </button>
            )}
            
            <button 
              className="canvas-error-button secondary"
              onClick={this.handleCanvasReset}
            >
              Reset Canvas
            </button>
            
            <button 
              className="canvas-error-button secondary"
              onClick={retry}
            >
              Try Again
            </button>
            
            <button 
              className="canvas-error-button secondary"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>

          <div className="canvas-error-info">
            <h3>Canvas Information</h3>
            <ul>
              <li><strong>WebGL Support:</strong> {webglSupported ? 'Yes' : 'No'}</li>
              <li><strong>Canvas Type:</strong> {props.canvasType || '2d'}</li>
              <li><strong>Context Lost:</strong> {contextLost ? 'Yes' : 'No'}</li>
              <li><strong>Fallback Mode:</strong> {fallbackMode ? 'Active' : 'Inactive'}</li>
            </ul>
          </div>

          <div className="canvas-error-help">
            <h3>Troubleshooting Tips</h3>
            <ul>
              <li>Try refreshing the page</li>
              <li>Close other browser tabs to free up memory</li>
              <li>Update your graphics drivers</li>
              <li>Try a different browser</li>
              <li>Disable browser extensions that might interfere</li>
            </ul>
          </div>
        </div>

        <style>{`
          .canvas-error-boundary {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          
          .canvas-error-container {
            max-width: 700px;
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
          }
          
          .canvas-error-header {
            margin-bottom: 32px;
          }
          
          .canvas-error-icon {
            font-size: 80px;
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
          }
          
          .canvas-error-title {
            font-size: 28px;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 12px 0;
          }
          
          .canvas-error-message {
            font-size: 18px;
            color: #6b7280;
            margin: 0;
            line-height: 1.6;
            max-width: 500px;
            margin: 0 auto;
          }
          
          .canvas-error-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
          }
          
          .canvas-error-button {
            padding: 14px 28px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 140px;
          }
          
          .canvas-error-button.primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
          
          .canvas-error-button.primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
          }
          
          .canvas-error-button.secondary {
            background-color: #f8fafc;
            color: #374151;
            border: 2px solid #e2e8f0;
          }
          
          .canvas-error-button.secondary:hover {
            background-color: #e2e8f0;
            border-color: #cbd5e1;
          }
          
          .canvas-error-info,
          .canvas-error-help {
            text-align: left;
            margin-top: 32px;
            padding: 24px;
            background-color: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          
          .canvas-error-info h3,
          .canvas-error-help h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin: 0 0 16px 0;
          }
          
          .canvas-error-info ul,
          .canvas-error-help ul {
            margin: 0;
            padding-left: 20px;
          }
          
          .canvas-error-info li,
          .canvas-error-help li {
            margin-bottom: 8px;
            color: #4b5563;
            line-height: 1.5;
          }
          
          .canvas-error-info strong {
            color: #1f2937;
          }
        `}</style>
      </div>
    );

    return (
      <BaseErrorBoundary
        {...props}
        fallback={fallback || canvasFallback}
        componentName={props.componentName || 'CanvasComponent'}
        context={{
          ...props.context,
          canvasType: props.canvasType,
          webglSupported: this.state.webglSupported,
          contextLost: this.state.contextLost,
          fallbackMode: this.state.fallbackMode
        }}
      >
        {children}
      </BaseErrorBoundary>
    );
  }
}

export default CanvasErrorBoundary; 