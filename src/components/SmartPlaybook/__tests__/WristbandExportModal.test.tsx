import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WristbandExportModal from '../components/WristbandExportModal';

// Mock jsPDF to prevent actual PDF generation
class MockJsPDF {
  save = jest.fn();
  text = jest.fn();
  rect = jest.fn();
  circle = jest.fn();
  line = jest.fn();
  addPage = jest.fn();
  setFontSize = jest.fn();
  setTextColor = jest.fn();
  setDrawColor = jest.fn();
  setFillColor = jest.fn();
  setLineWidth = jest.fn();
}

jest.mock('jspdf', () => ({
  __esModule: true,
  default: MockJsPDF,
  jsPDF: MockJsPDF,
}));

const makePlays = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `play-${i}`,
    name: `Play ${i + 1}`,
    phase: 'offense',
    type: 'pass',
    players: [{ id: `p${i}`, x: 100, y: 150, position: 'WR', number: i + 1 }],
    routes: [{ id: `r${i}`, playerId: `p${i}`, points: [{ x: 100, y: 150 }], type: 'go', color: '#f00' }],
  }));

describe('WristbandExportModal', () => {
  it('pre-selects first 16 plays on open', () => {
    render(<WristbandExportModal savedPlays={makePlays(20)} onClose={jest.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    // First 16 checked, last 4 unchecked
    const checkedCount = checkboxes.filter((cb: HTMLInputElement) => cb.checked).length;
    expect(checkedCount).toBe(16);
  });

  it('shows warning when more than 16 plays selected', () => {
    render(<WristbandExportModal savedPlays={makePlays(20)} onClose={jest.fn()} />);
    // Initially 16 selected, no warning
    expect(screen.queryByTestId('multi-card-warning')).not.toBeInTheDocument();

    // Select all to get 20
    fireEvent.click(screen.getByText('All'));

    expect(screen.getByTestId('multi-card-warning')).toBeInTheDocument();
  });

  it('renders export button', () => {
    render(<WristbandExportModal savedPlays={makePlays(5)} onClose={jest.fn()} />);
    expect(screen.getByText('Export PDF')).toBeInTheDocument();
  });

  it('shows no plays message when savedPlays is empty', () => {
    render(<WristbandExportModal savedPlays={[]} onClose={jest.fn()} />);
    expect(screen.getByText('No saved plays yet.')).toBeInTheDocument();
  });
});
