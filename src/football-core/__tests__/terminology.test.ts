import { applyTerminology, labelFor } from '../terminology';

describe('applyTerminology', () => {
  it('renames whole words only', () => {
    expect(applyTerminology('Throw H on the sail. Hit the hash.', { H: 'F' })).toBe('Throw F on the sail. Hit the hash.');
  });

  it('longer terms win over the words inside them', () => {
    expect(applyTerminology('Four verticals', { 'Four verticals': 'All Go', Four: '4' })).toBe('All Go');
  });

  it('never re-replaces a replacement', () => {
    expect(applyTerminology('H and Y', { H: 'Y', Y: 'H' })).toBe('Y and H');
  });

  it('treats terms literally, even with regex characters', () => {
    expect(applyTerminology('Run 3x1 (trips) today', { '(trips)': '(bunch)' })).toBe('Run 3x1 (bunch) today');
  });

  it('leaves text alone when there is no terminology', () => {
    expect(applyTerminology('Eyes on SS.', {})).toBe('Eyes on SS.');
  });
});

describe('labelFor', () => {
  it('falls back to the baseline label', () => {
    expect(labelFor('QB', {})).toBe('QB');
    expect(labelFor('TE', { TE: 'Sniffer' })).toBe('Sniffer');
    expect(labelFor('SS', { SS: 'Rover' })).toBe('Rover');
  });
});
