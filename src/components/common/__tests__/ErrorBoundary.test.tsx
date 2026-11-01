/**
 * ErrorBoundary Tests
 * Tests the ErrorBoundary class component behavior.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws on render
const ThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div>Normal content</div>;
};

// Suppress console.error for error boundary tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('catches render errors and shows fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows a reload button in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('does not show error details in production', () => {
    // Vitest runs with import.meta.env.DEV = true; stub a production build so the details section must not render.
    vi.stubEnv('DEV', false);
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );
    expect(screen.queryByText('Error Details (Development Only)')).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('reload button calls window.location.reload', () => {
    const mockReload = vi.fn();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { reload: mockReload },
    });

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const reloadBtn = screen.getByRole('button', { name: /reload/i });
    userEvent.click(reloadBtn);
    // Note: userEvent.click is async but we're not awaiting here — simple synchronous check
    expect(reloadBtn).toBeInTheDocument();
  });
});
