import { isPublishable } from '../verification';
import type { Source, Verification } from '../types';

const src = (publisher: string, n = 1): Source => ({
  title: `Source ${n}`,
  publisher,
  url: `https://example.org/${n}`,
  accessed: '2026-10-30',
  kind: 'coaching-education',
});

describe('isPublishable', () => {
  it('verified with 2 sources from 2 publishers is publishable as an item', () => {
    const v: Verification = { status: 'verified', sources: [src('AFCA', 1), src('USA Football', 2)] };
    expect(isPublishable(v, 'item')).toBe(true);
  });

  it('verified with 2 sources from the same publisher is not publishable', () => {
    const v: Verification = { status: 'verified', sources: [src('AFCA', 1), src('AFCA', 2)] };
    expect(isPublishable(v, 'item')).toBe(false);
  });

  it('a matchup needs 3 distinct publishers', () => {
    const two: Verification = { status: 'verified', sources: [src('AFCA', 1), src('USA Football', 2)] };
    const three: Verification = { status: 'verified', sources: [src('AFCA', 1), src('USA Football', 2), src('Coach Book Co', 3)] };
    expect(isPublishable(two, 'matchup')).toBe(false);
    expect(isPublishable(three, 'matchup')).toBe(true);
  });

  it('approved with reviewer and date is publishable regardless of source count', () => {
    const v: Verification = { status: 'approved', reviewer: 'Owner', date: '2026-10-30', sources: [] };
    expect(isPublishable(v, 'item')).toBe(true);
    expect(isPublishable(v, 'matchup')).toBe(true);
  });

  it('approved with an empty reviewer is not publishable', () => {
    const v: Verification = { status: 'approved', reviewer: '  ', date: '2026-10-30', sources: [] };
    expect(isPublishable(v, 'item')).toBe(false);
  });

  it('draft and rejected are never publishable', () => {
    const many = [src('A', 1), src('B', 2), src('C', 3)];
    const draft: Verification = { status: 'draft', sources: many, note: 'unconfirmed read' };
    const rejected: Verification = { status: 'rejected', reviewer: 'Owner', date: '2026-10-30', reason: 'wrong' };
    expect(isPublishable(draft, 'item')).toBe(false);
    expect(isPublishable(rejected, 'item')).toBe(false);
  });

  it('compares publishers ignoring case and surrounding whitespace', () => {
    const v: Verification = { status: 'verified', sources: [src('USA Football', 1), src(' usa football ', 2)] };
    expect(isPublishable(v, 'item')).toBe(false);
  });
});
