import rough from 'roughjs';
import { decomposeText } from './hangulDecompose.js';
import { drawChoShape, drawJungMark, drawDigitOrSpecialShape } from './symbolShapes.js';
import { drawCircle } from './shapes/primitives.js';
import { choShapeBoundary } from './shapes/consonants.js';
import { BASE_OPTIONS } from './roughOptions.js';
import { symbolMap } from '../data/symbolMap.js';
import { BACKGROUND_STYLES, DEFAULT_BACKGROUND } from './backgroundStyles.js';
import { createVowelMarkBox } from './vowelLayout.js';

renderToCanvas.__symbolMap = symbolMap;

const DEFAULT_LAYOUT = {
  cellSize: 90,      // bounding box per syllable/char cell
  choSize: 60,       // base consonant shape size within a cell
  jongScale: 0.42,   // batchim shrink factor
  cellGap: 64,        // wider gap so an outward vowel never looks attached to a neighboring syllable
  lineGap: 40,        // vertical gap between lines — must clear a batchim's
                       // lowest reach plus the next line's own tallest cho
  padding: 24,
  maxWidth: 900,      // wrap once a line would exceed this
};

const COMPACT_PUNCTUATION = new Set(['.', ',', ';', ':', '…', '·', '、', '。', '?', '!']);
const BOTTOM_FINAL_VOWELS = new Set(['ㅜ', 'ㅠ', 'ㅝ', 'ㅞ', 'ㅟ']);
const PETAL_CONSONANTS = new Set(['ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']);

function isCompactPunctuation(unit) {
  if (unit.type === 'special') return true;
  // All ordinary punctuation and symbolic characters — including straight and
  // curly quotes, brackets, dashes and operators — use the compact advance.
  return unit.type === 'passthrough'
    && (COMPACT_PUNCTUATION.has(unit.char) || /[\p{P}\p{S}]/u.test(unit.char));
}

function compactDrawSize(layout) {
  return layout.choSize * 0.58;
}

function isWordSpace(unit) {
  return unit.type === 'passthrough' && /^\s$/.test(unit.char);
}

function unitAdvance(unit, layout) {
  if (isWordSpace(unit)) {
    // A real Korean word break should read as a modest space, not as a full
    // syllable-sized blank cell.
    return Math.max(layout.choSize * 0.54, layout.cellSize * 0.30);
  }
  if (isCompactPunctuation(unit)) {
    const punctuationGap = Math.max(2, Math.min(Math.max(layout.cellGap, 0) * 0.25, 10));
    return compactDrawSize(layout) + punctuationGap;
  }
  // Negative tracking is useful for a notebook-like compact setting, but a
  // vowel can extend outside its base shape. Keep enough room for that
  // overhang so adjacent symbols never touch.
  return Math.max(layout.choSize * 1.65, layout.cellSize + layout.cellGap);
}

function hasBottomVowelFinal(unit) {
  return unit.type === 'syllable' && Boolean(unit.jong?.length) && BOTTOM_FINAL_VOWELS.has(unit.jung);
}

function hasPetalFinal(unit) {
  return unit.type === 'syllable'
    && PETAL_CONSONANTS.has(unit.cho)
    && Boolean(unit.jong?.length);
}

export function bottomLineEndY(box, jungRecipe) {
  const marks = jungRecipe?.mark === 'combo' ? jungRecipe.marks : [jungRecipe];
  let endY = null;
  for (const mark of marks) {
    if (mark?.mark !== 'line' || mark.position !== 'bottom') continue;
    const count = mark.count || 1;
    const gap = box.r * 0.42;
    for (let index = 0; index < count; index += 1) {
      const offset = (index - (count - 1) / 2) * gap;
      const attach = box.markAttachAt?.('bottom', offset) ?? box.attachBottom ?? box.r;
      const lineEnd = box.cy + attach + box.r * 1.04;
      endY = Math.max(endY ?? -Infinity, lineEnd);
    }
  }
  return endY;
}

export function calculateJongPlacement(cy, choRecipe, jungRecipe, vowelBox, layout) {
  const jongSize = layout.choSize * layout.jongScale;
  const hasBottomVowelMark = jungRecipe?.position === 'bottom'
    || jungRecipe?.marks?.some((mark) => mark.position === 'bottom');
  const defaultBaseY = cy + layout.choSize * (hasBottomVowelMark ? 1.30 : 0.82);
  const petalBoundary = choRecipe.shape === 'circlePetals'
    ? choShapeBoundary(choRecipe, layout.choSize)
    : null;
  const petalSafeBaseY = petalBoundary
    ? cy + petalBoundary.bottom + jongSize / 2 + layout.choSize * 0.045
    : defaultBaseY;
  const vowelLineEnd = hasBottomVowelMark ? bottomLineEndY(vowelBox, jungRecipe) : null;
  const bottomVowelSafeBaseY = vowelLineEnd == null
    ? defaultBaseY
    : vowelLineEnd + jongSize / 2 + layout.choSize * 0.055;

  return {
    jongSize,
    baseY: Math.max(defaultBaseY, petalSafeBaseY, bottomVowelSafeBaseY),
    vowelLineEnd,
    petalBoundary,
  };
}

// This is deliberately based on a normal Hangul syllable. Spaces and
// punctuation use their own narrower widths, so the result is guidance rather
// than a hard character-count limit.
export function estimateSyllablesPerLine(layoutOverrides = {}, renderOptions = {}) {
  const layout = createRenderLayout(layoutOverrides, renderOptions);
  const normalSyllable = { type: 'syllable', cho: 'ㅇ', jung: 'ㅏ', jong: null };
  const usableWidth = Math.max(1, layout.maxWidth - layout.padding * 2);
  return Math.max(1, Math.floor(usableWidth / unitAdvance(normalSyllable, layout)));
}

function wrapLines(lines, layout) {
  const wrapped = [];
  for (const line of lines) {
    let current = [];
    let currentWidth = layout.padding * 2;
    for (const unit of line) {
      const advance = unitAdvance(unit, layout);
      if (currentWidth + advance > layout.maxWidth && current.length > 0) {
        wrapped.push(current);
        current = [];
        currentWidth = layout.padding * 2;
      }
      current.push(unit);
      currentWidth += advance;
    }
    wrapped.push(current);
  }
  return wrapped;
}

export function computeCanvasSize(lines, layoutOverrides = {}) {
  const layout = { ...DEFAULT_LAYOUT, ...layoutOverrides };
  const wrapped = wrapLines(lines, layout);
  const widestLine = Math.max(0, ...wrapped.map((line) => line.reduce((width, unit) => width + unitAdvance(unit, layout), 0)));
  const contentWidth = Math.max(layout.cellSize + layout.padding * 2, widestLine + layout.padding * 2);
  // A chosen PNG width is a real canvas width, not merely a wrapping hint.
  // This gives short text the requested breathing room while long text wraps.
  const width = Math.max(contentWidth, layout.outputWidth || 0);
  const containsBottomVowelFinal = wrapped.some((line) => line.some(hasBottomVowelFinal));
  const containsPetalFinal = wrapped.some((line) => line.some(hasPetalFinal));
  const bottomFinalClearance = Math.max(
    containsBottomVowelFinal ? layout.choSize * 0.6 : 0,
    containsPetalFinal ? layout.choSize * 0.45 : 0,
  );
  const hasDeepFinal = containsBottomVowelFinal || containsPetalFinal;
  // Negative line spacing is allowed, but the line pitch never becomes small
  // enough for the symbol bodies or lower finals to collide.
  const minimumLinePitch = layout.choSize * (hasDeepFinal ? 2.05 : 1.05);
  const linePitch = Math.max(minimumLinePitch, layout.cellSize + layout.lineGap + bottomFinalClearance);
  const firstLineHeight = layout.cellSize + bottomFinalClearance;
  const height = firstLineHeight + Math.max(0, wrapped.length - 1) * linePitch + layout.padding * 2;
  return { width, height, wrapped, layout: { ...layout, linePitch, bottomFinalClearance } };
}

function drawUnit(rc, ctx, unit, cx, cy, layout, options, consonantFillColor, drawSize = layout.choSize) {
  if (unit.type === 'digit') {
    return drawDigitOrSpecialShape(rc, cx, cy, layout.choSize, unit.__recipe, options);
  }
  if (unit.type === 'special') {
    return drawDigitOrSpecialShape(rc, cx, cy, drawSize, unit.__recipe, options);
  }
  if (unit.type === 'passthrough') {
    ctx.font = `${drawSize * 0.72}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.stroke;
    ctx.fillText(unit.char, cx, cy);
    return;
  }
  if (unit.type === 'jamoCho') {
    return drawChoShape(rc, cx, cy, layout.choSize, unit.__recipe, options, consonantFillColor);
  }
  if (unit.type === 'jamoJung') {
    // A vowel typed on its own has no consonant to attach to — give it a
    // plain neutral circle as a minimal base, same size a real syllable's
    // consonant would use, so the mark reads the same either way.
    const r = layout.choSize / 2;
    drawCircle(rc, cx, cy, r, options);
    return drawJungMark(rc, createVowelMarkBox(cx, cy, layout.choSize, { shape: 'circle' }), unit.__recipe, options);
  }
  // syllable
  const choRecipe = unit.__choRecipe;
  drawChoShape(rc, cx, cy, layout.choSize, choRecipe, options, consonantFillColor);
  const vowelBox = unit.__jungRecipe
    ? createVowelMarkBox(cx, cy, layout.choSize, choRecipe)
    : null;
  if (vowelBox) drawJungMark(rc, vowelBox, unit.__jungRecipe, options);
  if (unit.jong && unit.__jongRecipes) {
    // Keep finals close while clearing both any lower flower petal and the
    // true end of a bottom-facing vowel stroke.
    const { jongSize, baseY } = calculateJongPlacement(
      cy,
      choRecipe,
      unit.__jungRecipe,
      vowelBox,
      layout,
    );
    const gap = jongSize * 0.15;
    const count = unit.__jongRecipes.length;
    const totalWidth = count * jongSize + (count - 1) * gap;
    let jx = cx - totalWidth / 2 + jongSize / 2;
    unit.__jongRecipes.forEach((recipe) => {
      drawChoShape(rc, jx, baseY, jongSize, recipe, options, consonantFillColor);
      jx += jongSize + gap;
    });
  }
}

function attachRecipes(unit, symbolMapData) {
  if (unit.type === 'digit') return { ...unit, __recipe: symbolMapData.digit[unit.char] };
  if (unit.type === 'special') return { ...unit, __recipe: symbolMapData.special[unit.char] };
  if (unit.type === 'jamoCho') return { ...unit, __recipe: symbolMapData.cho[unit.char] };
  if (unit.type === 'jamoJung') return { ...unit, __recipe: symbolMapData.jung[unit.char] };
  if (unit.type === 'passthrough') return unit;
  return {
    ...unit,
    __choRecipe: symbolMapData.cho[unit.cho],
    __jungRecipe: symbolMapData.jung[unit.jung],
    __jongRecipes: unit.jong ? unit.jong.map((j) => symbolMapData.cho[j]) : null,
  };
}

function positiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function createRenderLayout(layoutOverrides, renderOptions) {
  const baseLayout = { ...DEFAULT_LAYOUT, ...layoutOverrides };
  const symbolScale = positiveNumber(renderOptions.symbolScale, 1);
  const letterSpacing = finiteNumber(renderOptions.letterSpacing, baseLayout.cellGap);
  const lineSpacing = finiteNumber(renderOptions.lineSpacing, baseLayout.lineGap);
  const outputWidth = positiveNumber(renderOptions.outputWidth, baseLayout.maxWidth);

  return {
    ...baseLayout,
    choSize: baseLayout.choSize * symbolScale,
    cellGap: letterSpacing,
    lineGap: lineSpacing,
    maxWidth: outputWidth,
    outputWidth,
  };
}

export function renderToCanvas(canvasEl, text, layoutOverrides = {}, renderOptions = {}) {
  const symbolMapData = renderToCanvas.__symbolMap;
  const lines = decomposeText(text);
  const renderLayout = createRenderLayout(layoutOverrides, renderOptions);
  const { width, height, wrapped, layout } = computeCanvasSize(lines, renderLayout);

  // Keep the requested PNG dimensions intact while drawing into a 2× temporary
  // canvas. The final high-quality downsample makes curved roughjs strokes
  // noticeably cleaner without turning the selected PNG width into a different value.
  canvasEl.width = width;
  canvasEl.height = height;
  const outputContext = canvasEl.getContext('2d');
  const supersampleScale = 2;
  let drawingCanvas = canvasEl;
  let ctx = outputContext;
  let supersampleCanvas = null;

  if (outputContext && typeof outputContext.drawImage === 'function'
    && typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const candidate = document.createElement('canvas');
    candidate.width = width * supersampleScale;
    candidate.height = height * supersampleScale;
    const candidateContext = candidate.getContext('2d');
    if (candidateContext) {
      candidateContext.scale(supersampleScale, supersampleScale);
      drawingCanvas = candidate;
      ctx = candidateContext;
      supersampleCanvas = candidate;
    }
  }

  ctx.clearRect(0, 0, width, height);

  const bgStyle = BACKGROUND_STYLES[renderOptions.background] || BACKGROUND_STYLES[DEFAULT_BACKGROUND];
  bgStyle.draw(ctx, width, height, renderOptions.tint, renderOptions.customBackgroundColor);

  const strokeWidth = positiveNumber(renderOptions.strokeWidth, BASE_OPTIONS.strokeWidth);
  const options = {
    ...BASE_OPTIONS,
    ...(renderOptions.strokeColor ? { stroke: renderOptions.strokeColor } : {}),
    strokeWidth,
  };
  const rc = rough.canvas(drawingCanvas);
  const consonantFillColor = renderOptions.fillConsonants
    ? renderOptions.consonantFillColor || '#F9E296'
    : null;

  wrapped.forEach((line, lineIndex) => {
    const cy = layout.padding + layout.cellSize / 2 + lineIndex * layout.linePitch;
    let cursorX = layout.padding;
    line.forEach((rawUnit) => {
      const unit = attachRecipes(rawUnit, symbolMapData);
      const compact = isCompactPunctuation(rawUnit);
      const space = isWordSpace(rawUnit);
      const drawSize = compact ? compactDrawSize(layout) : layout.choSize;
      const cx = cursorX + (compact ? drawSize / 2 : layout.cellSize / 2);
      if (!space) drawUnit(rc, ctx, unit, cx, cy, layout, options, consonantFillColor, drawSize);
      cursorX += unitAdvance(rawUnit, layout);
    });
  });

  if (supersampleCanvas && outputContext) {
    outputContext.clearRect(0, 0, width, height);
    outputContext.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in outputContext) outputContext.imageSmoothingQuality = 'high';
    outputContext.drawImage(supersampleCanvas, 0, 0, width, height);
  }
}
