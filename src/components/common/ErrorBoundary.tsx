import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Coach Core AI crashed:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI — dark/athletic theme matching Coach Core
      return (
        <div
          className="error-boundary-container"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: '2.5rem',
              textAlign: 'center',
              boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 1.5rem',
                background: '#dc2626',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="32" height="32" fill="none" stroke="#fff" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h2 style={{ color: '#f1f5f9', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Coach Core encountered an unexpected error. Your saved plays are safe.
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#2563eb',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '0.625rem 1.5rem',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => { (e.target as HTMLButtonElement).style.background = '#1d4ed8'; }}
              onMouseOut={(e) => { (e.target as HTMLButtonElement).style.background = '#2563eb'; }}
            >
              Reload
            </button>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <summary style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                  Error Details (Development Only)
                </summary>
                <div style={{ marginTop: 8, color: '#cbd5e1', fontSize: '0.75rem' }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, overflow: 'auto', fontSize: '0.625rem', color: '#94a3b8' }}>
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre style={{ background: '#0f172a', padding: 12, borderRadius: 8, overflow: 'auto', fontSize: '0.625rem', color: '#94a3b8', marginTop: 8 }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;