import { EnginePlay } from '../types/playbook';

// Mock jsPDF
const mockSave = jest.fn();
const mockText = jest.fn();
const mockRect = jest.fn();
const mockCircle = jest.fn();
const mockLine = jest.fn();
const mockAddPage = jest.fn();
const mockSetFontSize = jest.fn();
const mockSetTextColor = jest.fn();
const mockSetDrawColor = jest.fn();
const mockSetFillColor = jest.fn();
const mockSetLineWidth = jest.fn();

class MockJsPDF {
  save = mockSave;
  text = mockText;
  rect = mockRect;
  circle = mockCircle;
  line = mockLine;
  addPage = mockAddPage;
  setFontSize = mockSetFontSize;
  setTextColor = mockSetTextColor;
  setDrawColor = mockSetDrawColor;
  setFillColor = mockSetFillColor;
  setLineWidth = mockSetLineWidth;
}

jest.mock('jspdf', () => ({
  __esModule: true,
  default: MockJsPDF,
  jsPDF: MockJsPDF,
}));

// Import AFTER mock
import { exportWristbandPDF } from './exportService';

function makePlays(count: number): EnginePlay[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `play-${i}`,
    name: `Play ${i + 1}`,
    formation: 'Shotgun',
    players: [
      { id: `p1-${i}`, x: 20, y: 30, position: 'WR', assignedRoute: 'go' as const, routeWaypoints: [{ dx: 0, dy: 20 }] },
      { id: `p2-${i}`, x: 33, y: 30, position: 'QB' },
    ],
  }));
}

describe('exportWristbandPDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates PDF and calls save', async () => {
    await exportWristbandPDF({ plays: makePlays(4), format: 'wristband-standard', colorMode: 'color', playsPerCard: 8 });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('generates correct number of pages for play count', async () => {
    // 16 plays at 16/card = 1 page, addPage should NOT be called
    await exportWristbandPDF({ plays: makePlays(16), format: 'wristband-standard', colorMode: 'color', playsPerCard: 16 });
    expect(mockAddPage).not.toHaveBeenCalled();

    jest.clearAllMocks();
    // 17 plays at 16/card = 2 pages, addPage called once
    await exportWristbandPDF({ plays: makePlays(17), format: 'wristband-standard', colorMode: 'color', playsPerCard: 16 });
    expect(mockAddPage).toHaveBeenCalledTimes(1);
  });

  it('handles empty plays array without throwing', async () => {
    await expect(
      exportWristbandPDF({ plays: [], format: 'wristband-standard', colorMode: 'color', playsPerCard: 8 }),
    ).resolves.toBeUndefined();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('blackwhite mode does not call setFillColor with green', async () => {
    await exportWristbandPDF({ plays: makePlays(1), format: 'wristband-standard', colorMode: 'blackwhite', playsPerCard: 8 });
    const greenCalls = mockSetFillColor.mock.calls.filter(
      (args: number[]) => args[0] === 34 && args[1] === 139 && args[2] === 34,
    );
    expect(greenCalls).toHaveLength(0);
  });

  it('saves with team name in filename', async () => {
    await exportWristbandPDF({ plays: makePlays(1), teamName: 'Eagles', format: 'wristband-standard', colorMode: 'color', playsPerCard: 8 });
    expect(mockSave).toHaveBeenCalledWith('Eagles-wristband.pdf');
  });

  it('defaults filename to playbook when no team name', async () => {
    await exportWristbandPDF({ plays: makePlays(1), format: 'wristband-standard', colorMode: 'color', playsPerCard: 8 });
    expect(mockSave).toHaveBeenCalledWith('playbook-wristband.pdf');
  });
});
