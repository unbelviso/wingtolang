import { describe, it, expect, vi } from 'vitest';
import {
  drawHeartPeaks, drawCircleLines, drawTriangleDots, drawCirclePetals, drawSaturn, drawCenterDotModifier,
} from './consonants.js';

function mockRc() {
  return { circle: vi.fn(), path: vi.fn(), polygon: vi.fn(), line: vi.fn(), arc: vi.fn() };
}

describe('drawHeartPeaks', () => {
  // The path is: 1 rounded corner + `count` peak bumps + 1 rounded corner,
  // so the arc count in the path data is always count + 2.
  it('draws one path whose arc count is peakCount + 2 rounded corners', () => {
    const rc = mockRc();
    drawHeartPeaks(rc, 30, 30, 40, 2, { stroke: '#4A4A4A' });
    expect(rc.path).toHaveBeenCalledTimes(1);
    const [pathData] = rc.path.mock.calls[0];
    expect((pathData.match(/A\d/g) || []).length).toBe(4); // 2 peaks + 2 corners
  });

  it('scales the arc count with peak count for 3 and 4 peaks', () => {
    const rc = mockRc();
    drawHeartPeaks(rc, 30, 30, 40, 3, {});
    expect((rc.path.mock.calls[0][0].match(/A\d/g) || []).length).toBe(5); // 3 peaks + 2 corners
    drawHeartPeaks(rc, 30, 30, 40, 4, {});
    expect((rc.path.mock.calls[1][0].match(/A\d/g) || []).length).toBe(6); // 4 peaks + 2 corners
  });
});

describe('drawCircleLines', () => {
  it('draws the base circle then N horizontal lines', () => {
    const rc = mockRc();
    drawCircleLines(rc, 25, 25, 22, 1, {});
    expect(rc.circle).toHaveBeenCalledTimes(1);
    expect(rc.line).toHaveBeenCalledTimes(1);
  });

  it('draws 2 parallel lines for count=2', () => {
    const rc = mockRc();
    drawCircleLines(rc, 25, 25, 22, 2, {});
    expect(rc.line).toHaveBeenCalledTimes(2);
    const [y1a] = rc.line.mock.calls[0].slice(1, 2);
    const [y1b] = rc.line.mock.calls[1].slice(1, 2);
    expect(y1a).not.toBe(y1b);
  });
});

describe('drawTriangleDots', () => {
  it('draws the triangle plus N hollow circles touching the apex', () => {
    const rc = mockRc();
    drawTriangleDots(rc, 23, 20, 46, 1, {});
    expect(rc.polygon).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('stacks 2 circles above the apex for count=2', () => {
    const rc = mockRc();
    drawTriangleDots(rc, 23, 20, 46, 2, {});
    expect(rc.circle).toHaveBeenCalledTimes(2);
    const cy1 = rc.circle.mock.calls[0][1];
    const cy2 = rc.circle.mock.calls[1][1];
    expect(cy2).toBeLessThan(cy1); // second circle sits above the first
  });
});

describe('drawCirclePetals', () => {
  it('draws only outward petal arcs plus the center outline, leaving the center interior clear', () => {
    const rc = mockRc();
    drawCirclePetals(rc, 35, 38, 15, 3, {});
    expect(rc.circle).toHaveBeenCalledTimes(1); // center outline only
    expect(rc.arc).toHaveBeenCalledTimes(3); // one exposed arc per petal
    expect(rc.circle.mock.calls[0][2]).toBe(30); // center diameter: 15*2
  });

  it('fills petals and center only when a fill color is selected', () => {
    const rc = mockRc();
    drawCirclePetals(rc, 35, 38, 15, 2, { stroke: '#111111', fill: '#BBDAB9', fillStyle: 'solid' });
    expect(rc.circle).toHaveBeenCalledTimes(4); // 2 fill petals + fill center + center outline
    expect(rc.circle.mock.calls[0][3]).toMatchObject({ fill: '#BBDAB9', stroke: 'transparent' });
  });
});

describe('drawSaturn', () => {
  it('splits the upper ring outside the circle, then draws the lower front ring', () => {
    const rc = mockRc();
    drawSaturn(rc, 40, 52, 16, {});
    expect(rc.path).toHaveBeenCalledTimes(3); // left upper, right upper, lower front
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('the ring is level (arc rotation term is 0, not tilted)', () => {
    const rc = mockRc();
    drawSaturn(rc, 40, 52, 16, {});
    const [leftUpperPath] = rc.path.mock.calls[0];
    const [lowerFrontPath] = rc.path.mock.calls[2];
    expect(leftUpperPath).toMatch(/A[\d.]+,[\d.]+ 0 /);
    expect(lowerFrontPath).toMatch(/A[\d.]+,[\d.]+ 0 /);
  });
});

describe('drawCenterDotModifier', () => {
  it('draws one small hollow circle at the exact given center', () => {
    const rc = mockRc();
    drawCenterDotModifier(rc, 25, 25, 44, {});
    expect(rc.circle).toHaveBeenCalledTimes(1);
    expect(rc.circle.mock.calls[0][0]).toBe(25);
    expect(rc.circle.mock.calls[0][1]).toBe(25);
  });
});
