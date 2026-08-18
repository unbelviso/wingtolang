import { useEffect, useRef } from 'react';
import rough from 'roughjs';
import { drawChoShape, drawJungMark, drawDigitOrSpecialShape } from '../utils/symbolShapes.js';
import { drawCircle } from '../utils/shapes/primitives.js';
import { BASE_OPTIONS } from '../utils/roughOptions.js';
import { createVowelMarkBox } from '../utils/vowelLayout.js';

const SIZE = 60;
const CENTER = SIZE / 2;
// Shapes' actual rendered bounding box can be much bigger than the nominal
// "size" passed in — e.g. uChain count=5 (digit 5) spans ~2.8x its size,
// saturn's ring ~1.7x. This fraction is sized so the widest case (the
// 5-wide uChain) still fits inside the canvas with margin.
const DRAW_SIZE = SIZE * 0.3;

export function SymbolPreview({
  category,
  recipe,
  strokeColor = BASE_OPTIONS.stroke,
  fillConsonants = false,
  consonantFillColor = '#F9E296',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);
    const rc = rough.canvas(canvas);
    const previewOptions = { ...BASE_OPTIONS, stroke: strokeColor, strokeWidth: 1.2 };

    if (category === 'cho') {
      drawChoShape(
        rc,
        CENTER,
        CENTER,
        DRAW_SIZE,
        recipe,
        previewOptions,
        fillConsonants ? consonantFillColor : null,
      );
    } else if (category === 'digit' || category === 'special') {
      drawDigitOrSpecialShape(rc, CENTER, CENTER, DRAW_SIZE, recipe, previewOptions);
    } else if (category === 'jung') {
      // Vowel marks attach to a consonant — show them on a neutral outline
      // circle so their placement stays visible without applying cho fill.
      const baseR = SIZE * 0.22;
      drawCircle(rc, CENTER, CENTER, baseR, previewOptions);
      drawJungMark(rc, createVowelMarkBox(CENTER, CENTER, baseR * 2, { shape: 'circle' }), recipe, previewOptions);
    }
  }, [category, recipe, strokeColor, fillConsonants, consonantFillColor]);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} className="shrink-0" />;
}
