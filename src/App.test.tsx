import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

test('renders Coach Core heading', () => {
  const { getByText } = render(<App />);
  expect(getByText(/Coach Core/i)).toBeInTheDocument();
});
