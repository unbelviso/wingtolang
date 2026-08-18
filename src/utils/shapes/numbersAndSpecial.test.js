import { describe, it, expect, vi } from 'vitest';
import { drawUChain, drawArchChainDot, drawStar, drawSpiral, drawZigzag4 } from './numbersAndSpecial.js';

function mockRc() {
  return { path: vi.fn(), polygon: vi.fn(), circle: vi.fn() };
}

describe('drawUChain', () => {
  it('draws `count` U-shaped paths side by side', () => {
    const rc = mockRc();
    drawUChain(rc, 20, 20, 20, 3, {});
    expect(rc.path).toHaveBeenCalledTimes(3);
  });
});

describe('drawArchChainDot', () => {
  it('draws `count` arch paths plus one hollow circle at the last leg', () => {
    const rc = mockRc();
    drawArchChainDot(rc, 20, 20, 20, 2, {});
    expect(rc.path).toHaveBeenCalledTimes(2);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('keeps a small gap before the hollow end circle so no line enters its interior', () => {
    const rc = mockRc();
    drawArchChainDot(rc, 20, 20, 20, 1, {});
    const archPath = rc.path.mock.calls[0][0];
    const lastX = Number(archPath.match(/(\d+(?:\.\d+)?),\d+(?:\.\d+)?$/)[1]);
    const [circleX, , diameter] = rc.circle.mock.calls[0];
    expect(circleX - diameter / 2).toBeGreaterThan(lastX);
  });
});

describe('drawStar', () => {
  it('draws a single 10-point polygon', () => {
    const rc = mockRc();
    drawStar(rc, 20, 20, 18, {});
    expect(rc.polygon).toHaveBeenCalledTimes(1);
    expect(rc.polygon.mock.calls[0][0]).toHaveLength(10);
  });
});

describe('drawSpiral', () => {
  it('draws a single smooth path (quadratic-curve command present)', () => {
    const rc = mockRc();
    drawSpiral(rc, 20, 20, 16, {});
    expect(rc.path).toHaveBeenCalledTimes(1);
    expect(rc.path.mock.calls[0][0]).toMatch(/Q/);
  });
});

describe('drawZigzag4', () => {
  it('draws a single polyline path with exactly 4 sharp peaks', () => {
    const rc = mockRc();
    drawZigzag4(rc, 20, 20, 32, {});
    expect(rc.path).toHaveBeenCalledTimes(1);
    const d = rc.path.mock.calls[0][0];
    const coords = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    // 9 points (x,y pairs) = 5 base touches + 4 peaks, alternating
    expect(coords.length).toBe(18);
  });
});
