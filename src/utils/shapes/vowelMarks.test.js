import { describe, it, expect, vi } from 'vitest';
import { drawLineMark, drawDotMark, drawPinMark, drawComboMark } from './vowelMarks.js';

function mockRc() {
  return { circle: vi.fn(), line: vi.fn() };
}

const box = { cx: 35, cy: 25, r: 18 };

describe('drawLineMark', () => {
  it('draws 1 line to the right of the box for position=right, count=1', () => {
    const rc = mockRc();
    drawLineMark(rc, box, 'right', 1, {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    const [x1, , x2] = rc.line.mock.calls[0];
    expect(Math.max(x1, x2)).toBeGreaterThan(box.cx + box.r); // reaches outside the circle, to the right
  });

  it('draws 2 parallel lines for count=2', () => {
    const rc = mockRc();
    drawLineMark(rc, box, 'top', 2, {});
    expect(rc.line).toHaveBeenCalledTimes(2);
  });

  it('draws above the box for position=top', () => {
    const rc = mockRc();
    drawLineMark(rc, box, 'top', 1, {});
    const [, y1, , y2] = rc.line.mock.calls[0];
    expect(Math.min(y1, y2)).toBeLessThan(box.cy - box.r); // reaches outside the circle, above
  });

  it('uses a height-specific flower boundary for each left-side parallel line', () => {
    const rc = mockRc();
    const flowerBox = {
      cx: 35,
      cy: 25,
      r: 18,
      attachLeft: 18,
      markAttachAt: vi.fn((position, offsetY) => position === 'left' ? 30 + offsetY : null),
    };
    drawLineMark(rc, flowerBox, 'left', 2, {});
    expect(rc.line).toHaveBeenCalledTimes(2);
    expect(flowerBox.markAttachAt).toHaveBeenCalledWith('left', -18 * 0.21);
    expect(flowerBox.markAttachAt).toHaveBeenCalledWith('left', 18 * 0.21);
    expect(rc.line.mock.calls[0][0]).toBeCloseTo(35 - (30 - 18 * 0.21));
    expect(rc.line.mock.calls[1][0]).toBeCloseTo(35 - (30 + 18 * 0.21));
  });

  it('uses a height-specific flower boundary for a bottom-facing line', () => {
    const rc = mockRc();
    const flowerBox = {
      cx: 35,
      cy: 25,
      r: 18,
      attachBottom: 18,
      markAttachAt: vi.fn((position, offsetX) => position === 'bottom' ? 28 + offsetX : null),
    };
    drawLineMark(rc, flowerBox, 'bottom', 1, {});
    expect(flowerBox.markAttachAt).toHaveBeenCalledWith('bottom', 0);
    expect(rc.line.mock.calls[0][1]).toBeCloseTo(25 + 28);
  });
});

describe('drawDotMark', () => {
  it('draws one filled dot per position', () => {
    const rc = mockRc();
    drawDotMark(rc, box, ['right', 'bottom'], {});
    expect(rc.circle).toHaveBeenCalledTimes(2);
  });
});

describe('drawPinMark', () => {
  it('mid variant draws one line and one circle centered on the line', () => {
    const rc = mockRc();
    drawPinMark(rc, box, 'right', 'mid', {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('endDouble variant draws one line and two side-by-side circles at one end', () => {
    const rc = mockRc();
    drawPinMark(rc, box, 'left', 'endDouble', {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(2);
    const y1 = rc.circle.mock.calls[0][1];
    const y2 = rc.circle.mock.calls[1][1];
    expect(y1).toBe(y2); // side-by-side means same y
  });
});

describe('drawComboMark', () => {
  it('dispatches each mark entry to the right drawer', () => {
    const rc = mockRc();
    drawComboMark(rc, box, [
      { mark: 'line', position: 'top', count: 1 },
      { mark: 'dot', positions: ['right'] },
    ], {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('dispatches a pin entry inside a combo (ㅙ/ㅞ)', () => {
    const rc = mockRc();
    drawComboMark(rc, box, [
      { mark: 'line', position: 'top', count: 1 },
      { mark: 'pin', position: 'right' },
    ], {});
    expect(rc.line).toHaveBeenCalledTimes(2); // 1 from line mark + 1 from pin's own line
    expect(rc.circle).toHaveBeenCalledTimes(1); // pin's circle
  });
});
