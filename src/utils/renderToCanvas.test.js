import { describe, it, expect, vi } from 'vitest';
import { calculateJongPlacement, computeCanvasSize, renderToCanvas } from './renderToCanvas.js';
import { createVowelMarkBox } from './vowelLayout.js';
import { choShapeBoundary } from './shapes/consonants.js';
import { symbolMap } from '../data/symbolMap.js';

vi.mock('roughjs', () => ({
  default: { canvas: () => ({ circle: vi.fn(), path: vi.fn(), polygon: vi.fn(), line: vi.fn(), rectangle: vi.fn(), arc: vi.fn() }) },
}));

function fakeCanvas(width = 800, height = 400) {
  return {
    width, height,
    getContext: () => ({ clearRect: vi.fn(), fillText: vi.fn(), font: '', textAlign: '', textBaseline: '', fillStyle: '' }),
  };
}

describe('computeCanvasSize', () => {
  it('grows width with the longest line and height with the number of lines', () => {
    const oneLine = decomposeLines(['가']);
    const twoLines = decomposeLines(['가', '나']);
    const wideLine = decomposeLines(['가나다라마바사']);

    const small = computeCanvasSize(oneLine);
    const tall = computeCanvasSize(twoLines);
    const wide = computeCanvasSize(wideLine);

    expect(tall.height).toBeGreaterThan(small.height);
    expect(wide.width).toBeGreaterThan(small.width);
  });

  it('returns a non-zero minimum size for empty input', () => {
    const size = computeCanvasSize([[]]);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });

  it('uses a compact advance for punctuation instead of a full syllable cell', () => {
    const syllable = { type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null };
    const punctuationLine = [[syllable, { type: 'passthrough', char: ',' }, syllable]];
    const allSyllables = [[syllable, syllable, syllable]];
    const compact = computeCanvasSize(punctuationLine, { maxWidth: 1000 });
    const regular = computeCanvasSize(allSyllables, { maxWidth: 1000 });
    expect(compact.width).toBeLessThan(regular.width);
  });

  it('uses a modest word-space width instead of a full symbol cell', () => {
    const syllable = { type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null };
    const withSpace = computeCanvasSize([[syllable, { type: 'passthrough', char: ' ' }, syllable]], { maxWidth: 1000 });
    const allSyllables = computeCanvasSize([[syllable, syllable, syllable]], { maxWidth: 1000 });
    expect(withSpace.width).toBeLessThan(allSyllables.width);
  });

  it('uses compact advances for quotes and other ordinary symbols', () => {
    const syllable = { type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null };
    const quoted = computeCanvasSize([[syllable, { type: 'passthrough', char: '“' }, syllable]], { maxWidth: 1000 });
    const bracketed = computeCanvasSize([[syllable, { type: 'passthrough', char: '(' }, syllable]], { maxWidth: 1000 });
    const allSyllables = computeCanvasSize([[syllable, syllable, syllable]], { maxWidth: 1000 });
    expect(quoted.width).toBeLessThan(allSyllables.width);
    expect(bracketed.width).toBeLessThan(allSyllables.width);
  });
});

describe('flower consonant geometry', () => {
  it('keeps every flower consonant, vowel, and final combination separated', () => {
    const layout = { choSize: 60, jongScale: 0.42 };
    const cy = 80;
    const flowerInitials = ['ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const vowelEntries = Object.entries(symbolMap.jung);
    const finalEntries = Object.entries(symbolMap.cho);

    for (const initial of flowerInitials) {
      const choRecipe = symbolMap.cho[initial];
      const boundary = choShapeBoundary(choRecipe, layout.choSize);
      for (const [, jungRecipe] of vowelEntries) {
        const box = createVowelMarkBox(100, cy, layout.choSize, choRecipe);
        const marks = jungRecipe.mark === 'combo' ? jungRecipe.marks : [jungRecipe];
        for (const mark of marks) {
          if (mark.mark !== 'line') continue;
          const count = mark.count || 1;
          for (let index = 0; index < count; index += 1) {
            const offset = (index - (count - 1) / 2) * box.r * 0.42;
            expect(box.markAttachAt(mark.position, offset)).toBeGreaterThan(0);
          }
        }

        for (const [, finalRecipe] of finalEntries) {
          expect(finalRecipe).toBeDefined();
          const placement = calculateJongPlacement(cy, choRecipe, jungRecipe, box, layout);
          const finalTop = placement.baseY - placement.jongSize / 2;
          expect(finalTop).toBeGreaterThan(cy + boundary.bottom);
          if (placement.vowelLineEnd != null) {
            expect(finalTop).toBeGreaterThan(placement.vowelLineEnd);
          }
        }
      }
    }
  });
});

describe('renderToCanvas', () => {
  it('does not throw for a syllable with no batchim', () => {
    const canvas = fakeCanvas();
    expect(() => renderToCanvas(canvas, '가')).not.toThrow();
  });

  it('does not throw for a syllable with a double batchim', () => {
    const canvas = fakeCanvas();
    expect(() => renderToCanvas(canvas, '닭')).not.toThrow();
  });

  it('does not throw for mixed Korean/digit/special/passthrough text', () => {
    const canvas = fakeCanvas();
    expect(() => renderToCanvas(canvas, '안녕 5?!A')).not.toThrow();
  });

  it('does not throw and produces a minimum-size canvas for empty text', () => {
    const canvas = fakeCanvas();
    expect(() => renderToCanvas(canvas, '')).not.toThrow();
  });

  it('resizes the canvas element to the computed size before drawing', () => {
    const canvas = fakeCanvas(10, 10);
    renderToCanvas(canvas, '가나다');
    expect(canvas.width).toBeGreaterThan(10);
  });

  it('keeps compact letter spacing when 0px is selected', () => {
    const compact = fakeCanvas();
    const spacious = fakeCanvas();
    renderToCanvas(compact, '가나다', {}, { letterSpacing: 0, outputWidth: 400 });
    renderToCanvas(spacious, '가나다', {}, { letterSpacing: 88, outputWidth: 400 });
    expect(compact.height).toBeLessThan(spacious.height);
  });

  it('keeps a minimum visual advance even with a strongly negative tracking value', () => {
    const syllable = { type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null };
    const size = computeCanvasSize([[syllable, syllable, syllable]], {
      cellSize: 76,
      choSize: 16,
      cellGap: -60,
      maxWidth: 1000,
    });
    expect(size.width).toBeGreaterThan(120);
  });

  it('changes multi-line output height when line spacing is adjusted', () => {
    const tight = fakeCanvas();
    const loose = fakeCanvas();
    renderToCanvas(tight, '가\n나', {}, { lineSpacing: 0, outputWidth: 720 });
    renderToCanvas(loose, '가\n나', {}, { lineSpacing: 120, outputWidth: 720 });
    expect(tight.height).toBeLessThan(loose.height);
  });

  it('supports a negative line spacing setting without collapsing lines', () => {
    const compact = fakeCanvas();
    const normal = fakeCanvas();
    renderToCanvas(compact, '가\n나', {}, { lineSpacing: -80, outputWidth: 720 });
    renderToCanvas(normal, '가\n나', {}, { lineSpacing: 0, outputWidth: 720 });
    expect(compact.height).toBeLessThan(normal.height);
    expect(compact.height).toBeGreaterThan(160);
  });

  it('uses the selected PNG output width as the canvas width', () => {
    const canvas = fakeCanvas();
    renderToCanvas(canvas, '가나다', {}, { outputWidth: 960 });
    expect(canvas.width).toBe(960);
  });

  it('renders every precomposed Hangul syllable and supported standalone jamo', () => {
    const completeHangul = Array.from({ length: 11172 }, (_, index) => String.fromCodePoint(0xAC00 + index)).join('');
    const standalone = 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㄲㄸㅃㅆㅉ ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣㅒㅖ';
    const canvas = fakeCanvas();
    expect(() => renderToCanvas(canvas, `${completeHangul}\n${standalone}`, {}, { outputWidth: 720 })).not.toThrow();
    expect(canvas.width).toBe(720);
    expect(canvas.height).toBeGreaterThan(720);
  });
});

// local helper duplicating decomposeText's line-splitting shape, so this
// test file doesn't need to import the real decomposer just to build fixtures
function decomposeLines(strings) {
  return strings.map((s) => Array.from(s).map((char) => ({ type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null })));
}
