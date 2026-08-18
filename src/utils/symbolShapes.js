import { drawCircle, drawTriangle } from './shapes/primitives.js';
import {
  drawHeartPeaks, drawCircleLines, drawTriangleDots, drawCirclePetals, drawSaturn, drawCenterDotModifier,
  trianglePoints,
} from './shapes/consonants.js';
import { drawLineMark, drawDotMark, drawPinMark, drawComboMark } from './shapes/vowelMarks.js';
import { drawUChain, drawArchChainDot, drawStar, drawSpiral, drawZigzag4 } from './shapes/numbersAndSpecial.js';
import { BASE_OPTIONS } from './roughOptions.js';

const CHO_DRAWERS = {
  circle: (rc, cx, cy, size, recipe, options) => drawCircle(rc, cx, cy, size / 2, options),
  heartPeaks: (rc, cx, cy, size, recipe, options) => drawHeartPeaks(rc, cx, cy, size, recipe.count, options),
  circleLines: (rc, cx, cy, size, recipe, options) => drawCircleLines(rc, cx, cy, size / 2, recipe.count, options),
  triangle: (rc, cx, cy, size, recipe, options) => drawTriangle(rc, trianglePoints(cx, cy - size / 2, size), options),
  triangleDots: (rc, cx, cy, size, recipe, options, markerOptions) => drawTriangleDots(rc, cx, cy - size / 2, size, recipe.count, options, markerOptions),
  circlePetals: (rc, cx, cy, size, recipe, options) => drawCirclePetals(rc, cx, cy, size / 2, recipe.count, options),
  saturn: (rc, cx, cy, size, recipe, options) => drawSaturn(rc, cx, cy, size / 2, options),
  placeholderCircle: (rc, cx, cy, size, recipe, options) => drawCircle(rc, cx, cy, size / 2, options),
  placeholderTriangle: (rc, cx, cy, size, recipe, options) => drawTriangle(rc, trianglePoints(cx, cy - size / 2, size), options),
  placeholderSquare: (rc, cx, cy, size, recipe, options) => rc.rectangle(cx - size / 2, cy - size / 2, size, size, options),
  placeholderHeart: (rc, cx, cy, size, recipe, options) => drawHeartPeaks(rc, cx, cy, size, 2, options),
};

// `fillColor` is deliberately handled only here so vowels, digits and
// punctuation keep their approved appearance. ㅈ·ㅊ's stacked circles are
// part of their consonant body, so they fill together with the triangle;
// separate 쌍자음 center-dot modifiers remain hollow.
export function drawChoShape(rc, cx, cy, size, recipe, options = BASE_OPTIONS, fillColor = null) {
  const { fill: ignoredFill, fillStyle: ignoredFillStyle, ...outlineOptions } = options;
  const shapeOptions = fillColor
    ? { ...outlineOptions, fill: fillColor, fillStyle: 'solid' }
    : outlineOptions;
  const markerOptions = fillColor && recipe.shape === 'triangleDots'
    ? shapeOptions
    : outlineOptions;
  const draw = CHO_DRAWERS[recipe.shape] || CHO_DRAWERS.circle;
  draw(rc, cx, cy, size, recipe, shapeOptions, markerOptions);
  if (recipe.modifier === 'centerDot') {
    drawCenterDotModifier(rc, cx, cy, size, outlineOptions);
  }
}

export function drawJungMark(rc, box, recipe, options = BASE_OPTIONS) {
  switch (recipe.mark) {
    case 'line': return drawLineMark(rc, box, recipe.position, recipe.count, options);
    case 'dot': return drawDotMark(rc, box, recipe.positions, options);
    case 'pinMid': return drawPinMark(rc, box, recipe.position, 'mid', options);
    case 'pinMidDouble': return drawPinMark(rc, box, recipe.position, 'midDouble', options);
    case 'pinEnd': return drawPinMark(rc, box, recipe.position, 'end', options);
    case 'pinEndDouble': return drawPinMark(rc, box, recipe.position, 'endDouble', options);
    case 'combo': return drawComboMark(rc, box, recipe.marks, options);
    default: throw new Error(`unknown jung mark: ${recipe.mark}`);
  }
}

const DIGIT_SPECIAL_DRAWERS = {
  uChain: (rc, cx, cy, size, recipe, options) => drawUChain(rc, cx, cy, size, recipe.count, options),
  archChainDot: (rc, cx, cy, size, recipe, options) => drawArchChainDot(rc, cx, cy, size, recipe.count, options),
  star: (rc, cx, cy, size, recipe, options) => drawStar(rc, cx, cy, size / 2, options),
  spiral: (rc, cx, cy, size, recipe, options) => drawSpiral(rc, cx, cy, size / 2, options),
  zigzag4: (rc, cx, cy, size, recipe, options) => drawZigzag4(rc, cx, cy, size, options),
};

export function drawDigitOrSpecialShape(rc, cx, cy, size, recipe, options = BASE_OPTIONS) {
  const draw = DIGIT_SPECIAL_DRAWERS[recipe.shape];
  if (!draw) throw new Error(`unknown digit/special shape: ${recipe.shape}`);
  draw(rc, cx, cy, size, recipe, options);
}
