import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Coach Core heading', () => {
  render(<App />);
  expect(screen.getByText(/Coach Core/i)).toBeInTheDocument();
});
