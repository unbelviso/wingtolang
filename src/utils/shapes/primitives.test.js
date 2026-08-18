import { describe, it, expect, vi } from 'vitest';
import { drawCircle, drawTriangle } from './primitives.js';
import { BASE_OPTIONS } from '../roughOptions.js';

describe('primitives', () => {
  it('drawCircle calls rc.circle with diameter (2*r) and given options', () => {
    const rc = { circle: vi.fn() };
    drawCircle(rc, 10, 20, 15, BASE_OPTIONS);
    expect(rc.circle).toHaveBeenCalledWith(10, 20, 30, BASE_OPTIONS);
  });

  it('drawTriangle calls rc.polygon with the three points', () => {
    const rc = { polygon: vi.fn() };
    const points = [[23, 2], [2, 40], [44, 40]];
    drawTriangle(rc, points, BASE_OPTIONS);
    expect(rc.polygon).toHaveBeenCalledWith(points, BASE_OPTIONS);
  });
});
