import { drawCircle } from './primitives.js';

// The point exactly on the base shape's boundary, on the given side. Marks
// extend OUTWARD from this point (never inward, so they never cut into the
// shape's interior).
//
// `box.r` is the base shape's *nominal* radius, used everywhere below for
// mark length/dot size — marks stay a consistent size regardless of which
// consonant they're attached to. Attachment *position* is separate and can
// differ per side: a plain circle is the same distance out on every side,
// but e.g. ㅇ's saturn ring reaches much further out on left/right than
// top/bottom, and ㅅ/ㅈ/ㅊ's triangle is far narrower side-to-side than it
// is tall. Callers pass `attachLeft`/`attachRight`/`attachTop`/`attachBottom`
// (see choShapeBoundary) to place the edge point at each shape's true
// boundary; any side left unspecified falls back to `r`.
function edgePoint(box, position) {
  const { cx, cy, r } = box;
  switch (position) {
    case 'right': return { x: cx + (box.attachRight ?? r), y: cy };
    case 'left': return { x: cx - (box.attachLeft ?? r), y: cy };
    case 'top': return { x: cx, y: cy - (box.attachTop ?? r) };
    case 'bottom': return { x: cx, y: cy + (box.attachBottom ?? r) };
    default: throw new Error(`unknown position: ${position}`);
  }
}

const isHorizontalMark = (position) => position === 'top' || position === 'bottom';
const outwardSign = (position) => (position === 'right' || position === 'bottom' ? 1 : -1);

// How far the mark's attachment point (see edgePoint) already sits from the
// shape's center on this side.
function attachDistance(box, position) {
  switch (position) {
    case 'right': return box.attachRight ?? box.r;
    case 'left': return box.attachLeft ?? box.r;
    case 'top': return box.attachTop ?? box.r;
    case 'bottom': return box.attachBottom ?? box.r;
    default: throw new Error(`unknown position: ${position}`);
  }
}

// Every basic vowel uses the same clearly legible outward stroke. Cell
// spacing is handled by the layout, so wide consonants such as ㅇ no longer
// force a vowel line to become too short to read.
function lineMarkLen(box, position) {
  return box.r * 1.04;
}

export function drawLineMark(rc, box, position, count, options) {
  const { x, y } = edgePoint(box, position);
  const len = lineMarkLen(box, position);
  const gap = box.r * 0.42;
  const horizontal = isHorizontalMark(position); // top/bottom marks are vertical strokes; left/right are horizontal strokes
  const dir = outwardSign(position);
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * gap;
    const attachDistanceAtLine = box.markAttachAt?.(position, offset);
    if (horizontal) {
      const lineX = x + offset;
      const lineY = attachDistanceAtLine == null ? y : box.cy + dir * attachDistanceAtLine;
      rc.line(lineX, lineY, lineX, lineY + dir * len, options);
    } else {
      const lineX = attachDistanceAtLine == null ? x : box.cx + dir * attachDistanceAtLine;
      const lineY = y + offset;
      rc.line(lineX, lineY, lineX + dir * len, lineY, options);
    }
  }
}

export function drawDotMark(rc, box, positions, options) {
  const dotR = box.r * 0.14;
  for (const position of positions) {
    const { x, y } = edgePoint(box, position);
    const dir = outwardSign(position);
    const horizontal = isHorizontalMark(position);
    const cx = horizontal ? x : x + dir * dotR;
    const cy = horizontal ? y + dir * dotR : y;
    drawCircle(rc, cx, cy, dotR, { ...options, fill: options.stroke || '#4A4A4A', fillStyle: 'solid' });
  }
}

// ㅐㅒㅔㅖ: a long vertical line with 1-2 hollow circles either centered on
// it (mid/midDouble) or at one end (end/endDouble). Only used with
// position 'left'/'right' — the line sits exactly at the base shape's
// boundary (not pushed inward) and is centered vertically on it.
export function drawPinMark(rc, box, position, variant, options) {
  const pinBox = {
    ...box,
    attachLeft: box.pinAttachLeft ?? box.attachLeft,
    attachRight: box.pinAttachRight ?? box.attachRight,
  };
  const { x, y } = edgePoint(pinBox, position);
  const lineLen = box.r * 1.4;
  // Keep the hollow circles visibly secondary to the long vertical line.
  // Larger circles made ㅐ·ㅒ·ㅔ·ㅖ read as another base consonant.
  // Small enough to stay a secondary vowel mark, but large enough that the
  // white interior remains visible at both guide and sentence scales.
  const circleR = box.r * 0.19;
  const top = y - lineLen / 2;
  const bottom = y + lineLen / 2;
  rc.line(x, top, x, bottom, options);

  if (variant === 'mid') {
    drawCircle(rc, x, y, circleR, options);
  } else if (variant === 'midDouble') {
    drawCircle(rc, x, y - circleR, circleR, options);
    drawCircle(rc, x, y + circleR, circleR, options);
  } else if (variant === 'end') {
    drawCircle(rc, x, top, circleR, options);
  } else if (variant === 'endDouble') {
    drawCircle(rc, x - circleR, top, circleR, options);
    drawCircle(rc, x + circleR, top, circleR, options);
  } else {
    throw new Error(`unknown pin variant: ${variant}`);
  }
}

export function drawComboMark(rc, box, marks, options) {
  for (const entry of marks) {
    if (entry.mark === 'line') drawLineMark(rc, box, entry.position, entry.count, options);
    else if (entry.mark === 'dot') drawDotMark(rc, box, entry.positions, options);
    else if (entry.mark === 'pin') drawPinMark(rc, box, entry.position, 'mid', options);
    else throw new Error(`unknown combo mark type: ${entry.mark}`);
  }
}
