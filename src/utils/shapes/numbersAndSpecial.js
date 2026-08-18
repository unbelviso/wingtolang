import { drawCircle } from './primitives.js';

// 1–5: rounded U-bowls that feel like one quick handwritten gesture. The
// full chain is constrained to a cell, with a positive gap, so 4 and 5 never
// collapse into one another.
function chainMetrics(size, count) {
  const gap = size * 0.04;
  const targetWidth = Math.min(size * 1.16, count * size * 0.52);
  const unitW = (targetWidth - gap * (count - 1)) / count;
  return { gap, unitW, totalW: targetWidth };
}

export function drawUChain(rc, cx, cy, size, count, options) {
  const { gap, unitW, totalW } = chainMetrics(size, count);
  let x = cx - totalW / 2;
  for (let i = 0; i < count; i++) {
    const left = x;
    const right = x + unitW;
    const topLeft = cy - size * (0.29 - (i % 2) * 0.014);
    const topRight = cy - size * (0.27 + (i % 3) * 0.01);
    const bowlY = cy + size * (0.29 + (i % 2) * 0.012);
    rc.path(
      `M${left},${topLeft} C${left - unitW * 0.08},${bowlY - size * 0.03} ${right + unitW * 0.07},${bowlY + size * 0.02} ${right},${topRight}`,
      { ...options, roughness: 0.5, bowing: 0.48 },
    );
    x += unitW + gap;
  }
}

// 6–9: the same rounded handwriting, upside down, with a small hollow end
// circle. A deliberate tiny gap keeps the arch stroke outside that empty circle.
export function drawArchChainDot(rc, cx, cy, size, count, options) {
  const { gap, unitW, totalW } = chainMetrics(size, count);
  let x = cx - totalW / 2;
  let lastRight = 0, lastBottomY = 0;
  for (let i = 0; i < count; i++) {
    const left = x;
    const right = x + unitW;
    const bottomLeft = cy + size * (0.29 - (i % 2) * 0.012);
    const bottomRight = cy + size * (0.27 + (i % 3) * 0.01);
    const archY = cy - size * (0.29 + (i % 2) * 0.012);
    rc.path(
      `M${left},${bottomLeft} C${left - unitW * 0.08},${archY + size * 0.03} ${right + unitW * 0.07},${archY - size * 0.02} ${right},${bottomRight}`,
      { ...options, roughness: 0.5, bowing: 0.48 },
    );
    lastRight = right;
    lastBottomY = bottomRight;
    x += unitW + gap;
  }
  const endCircleR = size * 0.15;
  const endGap = size * 0.055;
  drawCircle(rc, lastRight + endGap + endCircleR, lastBottomY, endCircleR, options);
}

// 0: a 5-pointed star, drawn as a single 10-point polygon alternating
// between outer tips and inner concave points.
export function drawStar(rc, cx, cy, r, options) {
  const points = [];
  const innerR = r * 0.42;
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : innerR;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  rc.polygon(points, options);
}

// ?: a smooth Archimedean-spiral approximation: sample points at 30° steps
// with linearly shrinking radius, then join them with quadratic beziers
// through each segment's midpoint (avoids the faceted look of a polyline).
export function drawSpiral(rc, cx, cy, r, options) {
  const steps = 30;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const angle = ((30 * i) % 360) * (Math.PI / 180);
    const radius = r - (r * 0.9 * i) / steps;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const mx = (px + x) / 2, my = (py + y) / 2;
    d += ` Q${px},${py} ${mx},${my}`;
  }
  rc.path(d, options);
}

// !: four distinct lightning/grass peaks. Uneven widths and heights make it
// read like a quick hand-drawn mark rather than a mechanically even sawtooth.
export function drawZigzag4(rc, cx, cy, size, options) {
  const points = [
    [cx - size * 0.49, cy + size * 0.38],
    [cx - size * 0.38, cy - size * 0.29],
    [cx - size * 0.24, cy + size * 0.34],
    [cx - size * 0.10, cy - size * 0.45],
    [cx + size * 0.05, cy + size * 0.37],
    [cx + size * 0.18, cy - size * 0.32],
    [cx + size * 0.33, cy + size * 0.41],
    [cx + size * 0.47, cy - size * 0.40],
    [cx + size * 0.53, cy + size * 0.30],
  ];
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  rc.path(d, { ...options, roughness: 0.62, bowing: 0.56 });
}
