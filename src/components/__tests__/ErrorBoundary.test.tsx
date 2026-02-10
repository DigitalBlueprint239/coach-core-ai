import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { clearBreadcrumbs } from '../../utils/breadcrumbs';

const Boom = () => {
  throw new Error('boom');
};

describe('ErrorBoundary context reporting', () => {
  beforeEach(() => {
    clearBreadcrumbs();
    localStorage.setItem('user', JSON.stringify({ id: 'u-1' }));
    localStorage.setItem('currentTeam', JSON.stringify({ teamId: 't-9' }));
    vi.spyOn(window, 'fetch').mockResolvedValue({ ok: true } as any);
  });

  it('captures route and ids in report payload', async () => {
    render(<ErrorBoundary errorReporting={true}><Boom /></ErrorBoundary>);

    await waitFor(() => expect(window.fetch).toHaveBeenCalled());
    const body = JSON.parse((window.fetch as any).mock.calls[0][1].body);
    expect(body.context.routeName).toBe(window.location.pathname);
    expect(body.userInfo.userId).toBe('u-1');
    expect(body.context.teamId).toBe('t-9');
  });
});
