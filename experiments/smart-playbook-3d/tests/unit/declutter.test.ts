import { describe, expect, it } from 'vitest';
import { declutter, type LabelBox } from '../../src/view/declutter';

const box = (id: string, x: number, y = 0, w = 40, h = 16): LabelBox => ({ id, x, y, w, h });

describe('tag declutter', () => {
  it('keeps every label when none overlap', () => {
    const boxes = [box('a', 0), box('b', 50), box('c', 100)];
    expect([...declutter(boxes, ['a', 'b', 'c'])].sort()).toEqual(['a', 'b', 'c']);
  });

  it('drops the lower-priority label of an overlapping pair, whichever comes first in order wins', () => {
    const boxes = [box('a', 0), box('b', 20)];
    expect([...declutter(boxes, ['a', 'b'])]).toEqual(['a']);
    expect([...declutter(boxes, ['b', 'a'])]).toEqual(['b']);
  });

  it('lets a dropped label free space: a third label clear of the winner survives', () => {
    // a overlaps b; b overlaps c; a and c are clear of each other.
    const boxes = [box('a', 0), box('b', 30), box('c', 60)];
    expect([...declutter(boxes, ['a', 'b', 'c'])].sort()).toEqual(['a', 'c']);
  });

  it('treats vertically separated labels as clear', () => {
    const boxes = [box('a', 0, 0), box('b', 0, 20)];
    expect(declutter(boxes, ['a', 'b']).size).toBe(2);
  });

  it('applies the clearance padding and ignores ids without boxes', () => {
    const boxes = [box('a', 0), box('b', 41)]; // 1 px gap
    expect(declutter(boxes, ['a', 'b', 'missing'], 2).size).toBe(1);
    expect(declutter(boxes, ['a', 'b'], 0).size).toBe(2);
  });
});
