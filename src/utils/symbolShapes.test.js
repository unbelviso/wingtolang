import { describe, it, expect, vi } from 'vitest';
import { drawChoShape, drawJungMark, drawDigitOrSpecialShape } from './symbolShapes.js';

function mockRc() {
  return { circle: vi.fn(), path: vi.fn(), polygon: vi.fn(), line: vi.fn() };
}

describe('drawChoShape', () => {
  it('dispatches shape:"circle" to a single rc.circle call', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'circle' });
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('dispatches shape:"heartPeaks" with count to drawHeartPeaks', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'heartPeaks', count: 3 });
    expect(rc.path).toHaveBeenCalledTimes(1);
  });

  it('dispatches shape:"saturn" with split upper ring segments and one lower ring', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'saturn' });
    expect(rc.path).toHaveBeenCalledTimes(3);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('applies the centerDot modifier as one extra hollow circle', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'circle', modifier: 'centerDot' });
    expect(rc.circle).toHaveBeenCalledTimes(2); // base circle + modifier dot
  });

  it('fills only the consonant body when a fill color is selected', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'circle', modifier: 'centerDot' }, { stroke: '#111111' }, '#F9E296');
    expect(rc.circle.mock.calls[0][3]).toMatchObject({ fill: '#F9E296', fillStyle: 'solid' });
    expect(rc.circle.mock.calls[1][3]).not.toHaveProperty('fill');
  });

  it('fills the ㅈ·ㅊ triangle and all stacked circles together when selected', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'triangleDots', count: 2 }, { stroke: '#111111' }, '#F9E296');
    expect(rc.polygon.mock.calls[0][1]).toMatchObject({ fill: '#F9E296', fillStyle: 'solid' });
    expect(rc.circle).toHaveBeenCalledTimes(2);
    rc.circle.mock.calls.forEach((call) => expect(call[3]).toMatchObject({ fill: '#F9E296', fillStyle: 'solid' }));
  });

  it('does not force a white fill for the saturn consonant by default', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'saturn' }, { stroke: '#111111' });
    expect(rc.circle.mock.calls[0][3]).not.toHaveProperty('fill');
  });

  it('falls back to a plain circle for an unrecognized shape name', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'nonsense-typo' });
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });
});

describe('drawJungMark', () => {
  const box = { cx: 35, cy: 25, r: 18 };

  it('dispatches mark:"line"', () => {
    const rc = mockRc();
    drawJungMark(rc, box, { mark: 'line', position: 'right', count: 1 });
    expect(rc.line).toHaveBeenCalledTimes(1);
  });

  it('dispatches mark:"combo"', () => {
    const rc = mockRc();
    drawJungMark(rc, box, {
      mark: 'combo',
      marks: [{ mark: 'line', position: 'top', count: 1 }, { mark: 'dot', positions: ['right'] }],
    });
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });
});

describe('drawDigitOrSpecialShape', () => {
  it('dispatches shape:"star"', () => {
    const rc = mockRc();
    drawDigitOrSpecialShape(rc, 20, 20, 36, { shape: 'star' });
    expect(rc.polygon).toHaveBeenCalledTimes(1);
  });

  it('dispatches shape:"spiral"', () => {
    const rc = mockRc();
    drawDigitOrSpecialShape(rc, 20, 20, 36, { shape: 'spiral' });
    expect(rc.path).toHaveBeenCalledTimes(1);
  });
});
