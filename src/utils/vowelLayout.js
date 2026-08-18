import { choShapeBoundary } from './shapes/consonants.js';

// The guide and the sentence renderer must use the exact same attachment
// geometry. The small shape-specific inset makes a mark look joined to a
// consonant without cutting across that consonant's outline.
const VOWEL_ATTACH_INSET = {
  circle:       { left: 2.5, right: 2.5, top: 1.5, bottom: 1.5 },
  circleLines:  { left: 3.0, right: 3.0, top: 1.5, bottom: 1.5 },
  saturn:       { left: 4.0, right: 4.0, top: 2.0, bottom: 1.5 },
  heartPeaks:   { left: 3.0, right: 3.0, top: 1.0, bottom: 1.0 },
  triangle:     { left: 1.5, right: 1.5, top: 2.0, bottom: 1.0 },
  triangleDots: { left: 1.5, right: 1.5, top: 2.0, bottom: 1.0 },
  // Left-side vowels such as ㅓ need a small clear gap from the flower
  // petals; unlike a plain circle they cannot begin inside the outer arc.
  circlePetals: { left: -1.5, right: 2.5, top: 2.0, bottom: 2.0 },
};

// ㅐ·ㅒ·ㅔ·ㅖ place a vertical pin at the side of the base shape. A triangle
// needs a slight outward adjustment so that the pin never looks inside it.
const PIN_ATTACH_OUTSET = {
  triangle: { left: 5, right: 5 },
  triangleDots: { left: 5, right: 5 },
};

// A barely perceptible right-side breathing space prevents ㅏ·ㅑ·ㅣ and
// right-side pin marks from visually fusing with the consonant outline.
const RIGHT_ATTACH_GAP = 1.25;

// A flower consonant's visible edge changes with the height of the mark.
// Use the true edge at each horizontal or vertical stroke, so ㅏ·ㅓ·ㅕ and
// ㅗ·ㅜ·ㅠ can stay close without running through a petal or floating away.
function createCirclePetalMarkAttach(size, recipe) {
  const r = size / 2;
  const count = recipe.count || 1;
  const petalR = r * (0.75 - count * 0.03);
  const dist = r + petalR * 0.65;
  const stepDeg = 360 / count;
  const startDeg = -45;
  const circles = [{ x: 0, y: 0, r }];

  for (let index = 0; index < count; index += 1) {
    const angle = ((startDeg + index * stepDeg) * Math.PI) / 180;
    circles.push({ x: dist * Math.cos(angle), y: dist * Math.sin(angle), r: petalR });
  }

  return (position, offset) => {
    const horizontalStroke = position === 'left' || position === 'right';
    const verticalStroke = position === 'top' || position === 'bottom';
    if (!horizontalStroke && !verticalStroke) return null;

    let negative = r;
    let positive = r;
    for (const circle of circles) {
      const perpendicularDistance = horizontalStroke ? offset - circle.y : offset - circle.x;
      if (Math.abs(perpendicularDistance) > circle.r) continue;
      const halfChord = Math.sqrt(circle.r ** 2 - perpendicularDistance ** 2);
      if (horizontalStroke) {
        negative = Math.max(negative, -circle.x + halfChord);
        positive = Math.max(positive, circle.x + halfChord);
      } else {
        negative = Math.max(negative, -circle.y + halfChord);
        positive = Math.max(positive, circle.y + halfChord);
      }
    }
    // Keep the stroke visibly attached while starting just outside the petal.
    const clearGap = Math.max(0.75, size * 0.018);
    return position === 'left' || position === 'top'
      ? negative + clearGap
      : positive + clearGap;
  };
}

export function createVowelMarkBox(cx, cy, size, choRecipe = { shape: 'circle' }) {
  const r = size / 2;
  const boundary = choShapeBoundary(choRecipe, size);
  const scale = size / 60;
  const baseInset = VOWEL_ATTACH_INSET[choRecipe.shape] || VOWEL_ATTACH_INSET.circle;
  const basePinOutset = PIN_ATTACH_OUTSET[choRecipe.shape] || { left: 0, right: 0 };
  const inset = Object.fromEntries(Object.entries(baseInset).map(([side, value]) => [side, value * scale]));
  const pinOutset = Object.fromEntries(Object.entries(basePinOutset).map(([side, value]) => [side, value * scale]));
  const attachLeft = Math.max(0, boundary.left - inset.left);
  const attachRight = Math.max(0, boundary.right - inset.right + RIGHT_ATTACH_GAP * scale);

  return {
    cx,
    cy,
    r,
    markAttachAt: choRecipe.shape === 'circlePetals'
      ? createCirclePetalMarkAttach(size, choRecipe)
      : null,
    attachLeft,
    attachRight,
    attachTop: Math.max(0, boundary.top - inset.top),
    attachBottom: Math.max(0, boundary.bottom - inset.bottom),
    pinAttachLeft: attachLeft + pinOutset.left,
    pinAttachRight: attachRight + pinOutset.right,
  };
}

export const GUIDE_RESULT_LAYOUT = {
  // Use the same relative symbol scale as the guide, with only enough extra
  // room between syllables to keep an outward vowel visually unambiguous.
  cellSize: 76,
  choSize: 46,
  cellGap: 42,
  lineGap: 36,
  maxWidth: 700,
};
