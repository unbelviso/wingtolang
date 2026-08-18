import { drawCircle } from './primitives.js';

function splitShapeOptions(options) {
  const { fill, fillStyle, ...outlineOptions } = options;
  const fillOnlyOptions = fill
    ? { ...outlineOptions, stroke: 'transparent', strokeWidth: 0, fill, fillStyle: 'solid' }
    : null;
  return { outlineOptions, fillOnlyOptions };
}

// ㄴㄷㄹ family: flat-ish bottom, `count` rounded bumps on top, corners
// slightly rounded (not sharp). Scaled from the brainstorm-validated
// 52-wide/40-tall 2-bump reference; each extra bump adds one 20-wide lobe.
export function drawHeartPeaks(rc, cx, cy, size, count, options) {
  const bumpR = size / 5.2; // matches the 10-radius-in-52-wide reference ratio
  const cornerR = bumpR * 0.4;
  const top = cy - size * 0.28;
  const bottom = cy + size * 0.28;
  const left = cx - (bumpR * 2 * count) / 2 - cornerR;
  const bumpStart = left + cornerR;

  let d = `M${bumpStart + cornerR},${bottom} A${cornerR},${cornerR} 0 0 1 ${bumpStart},${bottom - cornerR} L${bumpStart},${top}`;
  let x = bumpStart;
  for (let i = 0; i < count; i++) {
    const nextX = x + bumpR * 2;
    d += ` A${bumpR},${bumpR} 0 0 1 ${nextX},${top}`;
    x = nextX;
  }
  const right = x;
  d += ` L${right},${bottom - cornerR} A${cornerR},${cornerR} 0 0 1 ${right - cornerR},${bottom} Z`;

  rc.path(d, options);
}

// ㅁ/ㅂ: circle with `count` horizontal lines through the middle.
export function drawCircleLines(rc, cx, cy, r, count, options) {
  drawCircle(rc, cx, cy, r, options);
  const gap = r * 0.5;
  const startY = cy - (gap * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    const y = startY + i * gap;
    rc.line(cx - r * 0.9, y, cx + r * 0.9, y, options);
  }
}

// ㅅ base triangle used directly for ㅅ, and as the base of ㅈ/ㅊ below.
export function trianglePoints(cx, apexY, size) {
  const halfBase = size / 2;
  const baseY = apexY + size * 0.87;
  return [[cx, apexY], [cx - halfBase, baseY], [cx + halfBase, baseY]];
}

// ㅈㅊ: the base triangle may use an optional fill, while the stacked
// modifier circles always stay hollow as required by the symbol rule.
export function drawTriangleDots(rc, cx, apexY, size, count, options, markerOptions = options) {
  const points = trianglePoints(cx, apexY, size);
  rc.polygon(points, options);
  const dotR = size * 0.13;
  for (let i = 0; i < count; i++) {
    const cy = apexY - dotR - i * dotR * 2;
    drawCircle(rc, cx, cy, dotR, markerOptions);
  }
}

// ㅋㅌㅍㅎ: draw the petal portions outside the center only. The segments
// that would fall inside the center circle are omitted, so no extra line
// appears inside the consonant while its outer flower silhouette remains.
export function drawCirclePetals(rc, cx, cy, r, count, options) {
  const { outlineOptions, fillOnlyOptions } = splitShapeOptions(options);
  const petalR = r * (0.75 - count * 0.03);
  const dist = r + petalR * 0.65;
  const stepDeg = 360 / count;
  const startDeg = -45;
  const petals = Array.from({ length: count }, (_, index) => {
    const angle = ((startDeg + index * stepDeg) * Math.PI) / 180;
    return { angle, x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  });

  if (fillOnlyOptions) {
    petals.forEach((petal) => drawCircle(rc, petal.x, petal.y, petalR, fillOnlyOptions));
    drawCircle(rc, cx, cy, r, fillOnlyOptions);
  }

  drawCircle(rc, cx, cy, r, outlineOptions);
  const overlapCosine = Math.max(-1, Math.min(1, (r ** 2 - dist ** 2 - petalR ** 2) / (2 * dist * petalR)));
  const visibleHalfAngle = Math.acos(overlapCosine);
  petals.forEach((petal) => {
    rc.arc(
      petal.x,
      petal.y,
      petalR * 2,
      petalR * 2,
      petal.angle - visibleHalfAngle,
      petal.angle + visibleHalfAngle,
      false,
      outlineOptions,
    );
  });
}

// ㅇ: keep the lower ring in front, but split the upper ring at the center
// circle boundary. This removes only the upper line that used to be visible
// inside the circle, without filling the consonant with white.
export function drawSaturn(rc, cx, cy, r, options) {
  const { outlineOptions, fillOnlyOptions } = splitShapeOptions(options);
  const rx = r * 1.7, ry = r * 0.44;
  const left = cx - rx, right = cx + rx;
  const intersectionOffset = Math.sqrt((r ** 2 - ry ** 2) / (1 - (ry ** 2 / rx ** 2)));
  const leftIntersection = cx - intersectionOffset;
  const rightIntersection = cx + intersectionOffset;
  const intersectionY = cy - ry * Math.sqrt(1 - ((intersectionOffset ** 2) / (rx ** 2)));

  rc.path(`M${left},${cy} A${rx},${ry} 0 0,1 ${leftIntersection},${intersectionY}`, outlineOptions);
  rc.path(`M${rightIntersection},${intersectionY} A${rx},${ry} 0 0,1 ${right},${cy}`, outlineOptions);
  if (fillOnlyOptions) drawCircle(rc, cx, cy, r, fillOnlyOptions);
  drawCircle(rc, cx, cy, r, outlineOptions);
  rc.path(`M${right},${cy} A${rx},${ry} 0 0,1 ${left},${cy}`, outlineOptions);
}

// 쌍자음 marker: small hollow circle at the exact center of the base shape.
export function drawCenterDotModifier(rc, cx, cy, baseSize, options) {
  drawCircle(rc, cx, cy, baseSize * 0.1, options);
}

// Each cho shape's true extent from its own center, per cardinal direction
// — a plain circle, a narrow triangle, and a wide saturn ring don't share
// one radius. Vowel marks attach relative to *this*, not a single generic
// r, so the gap between a consonant and its attached vowel reads the same
// regardless of which consonant it is (previously every shape used the
// same r, so marks floated away from narrow shapes like ㅅ/ㅈ/ㅊ and sat
// inside wide ones like ㅇ). Mirrors the geometry each draw* function above
// actually renders.
export function choShapeBoundary(recipe, size) {
  const r = size / 2;
  switch (recipe.shape) {
    case 'saturn':
      return { top: r, bottom: r, left: r * 1.7, right: r * 1.7 };
    case 'heartPeaks': {
      const bumpR = size / 5.2;
      const cornerR = bumpR * 0.4;
      const halfWidth = (bumpR * 2 * recipe.count) / 2 + cornerR;
      return { top: size * 0.28 + bumpR, bottom: size * 0.28, left: halfWidth, right: halfWidth };
    }
    case 'triangle': {
      const halfWidthAtCenter = size * 0.2874; // triangle's half-width at y=cy (see trianglePoints)
      return { top: r, bottom: size * 0.37, left: halfWidthAtCenter, right: halfWidthAtCenter };
    }
    case 'triangleDots': {
      const dotR = size * 0.13;
      const halfWidthAtCenter = size * 0.2874;
      return { top: r + 2 * dotR * recipe.count, bottom: size * 0.37, left: halfWidthAtCenter, right: halfWidthAtCenter };
    }
    case 'circlePetals': {
      // The petals can extend far beyond the center circle. Calculate their
      // real extents so left/right vowels attach outside the flower outline.
      const count = recipe.count || 1;
      const petalR = r * (0.75 - count * 0.03);
      const dist = r + petalR * 0.65;
      const stepDeg = 360 / count;
      const startDeg = -45;
      let left = r;
      let right = r;
      let top = r;
      let bottom = r;
      for (let index = 0; index < count; index += 1) {
        const angle = ((startDeg + index * stepDeg) * Math.PI) / 180;
        const offsetX = dist * Math.cos(angle);
        const offsetY = dist * Math.sin(angle);
        left = Math.max(left, -offsetX + petalR);
        right = Math.max(right, offsetX + petalR);
        top = Math.max(top, -offsetY + petalR);
        bottom = Math.max(bottom, offsetY + petalR);
      }
      return { top, bottom, left, right };
    }
    default:
      return { top: r, bottom: r, left: r, right: r };
  }
}
