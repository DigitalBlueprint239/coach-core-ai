import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AppShell from './AppShell';

// Identity visibility (2026-10-15): account, active team (or an explicit
// no-team state) and the sample-preview distinction are always rendered.
const shell = (props: Partial<React.ComponentProps<typeof AppShell>> = {}) => render(
  <AppShell active="overview" onNavigate={() => {}} email="coach@example.test" onSignOut={() => {}} {...props}>
    <p>content</p>
  </AppShell>,
);

describe('AppShell identity', () => {
  it('shows the signed-in account and the active team, with accessible names', () => {
    shell({ teamName: 'Alpha Eagles' });
    const header = screen.getByRole('banner');
    expect(within(header).getByText('Welcome, coach@example.test')).toBeInTheDocument();
    expect(within(header).getByText('Welcome, coach@example.test')).toHaveAttribute('title', 'coach@example.test');
    // Screen readers hear "Active team: Alpha Eagles".
    expect(header).toHaveTextContent('Active team: Alpha Eagles');
    expect(within(header).queryByText(/Sample preview/)).not.toBeInTheDocument();
  });

  it('states explicitly when no team is selected', () => {
    shell();
    expect(screen.getByRole('banner')).toHaveTextContent('Active team: No team selected');
  });

  it('marks sample data as not saved only while sample preview is on screen', () => {
    const { rerender } = shell({ teamName: 'Alpha Eagles', samplePreview: true });
    expect(within(screen.getByRole('banner')).getByText('Sample preview · not saved')).toBeInTheDocument();
    rerender(<AppShell active="overview" onNavigate={() => {}} email="coach@example.test" teamName="Alpha Eagles" samplePreview={false}><p>content</p></AppShell>);
    expect(within(screen.getByRole('banner')).queryByText(/Sample preview/)).not.toBeInTheDocument();
  });

  it('exposes only the coach\'s own email (no uid or claims)', () => {
    shell({ teamName: 'Alpha Eagles' });
    const text = screen.getByRole('banner').textContent || '';
    expect(text).not.toMatch(/uid|beta|claim/i);
  });
});
