import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Coach Core heading', () => {
  render(<App />);
  // Multiple elements match "Coach Core" (nav + dashboard heading) — verify at least one is present.
  const elements = screen.getAllByText(/Coach Core/i);
  expect(elements.length).toBeGreaterThan(0);
});
