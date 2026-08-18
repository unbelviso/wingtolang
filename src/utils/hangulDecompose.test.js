import { describe, it, expect } from 'vitest';
import { decomposeText } from './hangulDecompose.js';

describe('decomposeText', () => {
  it('decomposes a simple syllable with no batchim', () => {
    const [[unit]] = decomposeText('가');
    expect(unit).toEqual({ type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null });
  });

  it('decomposes a syllable with a simple (single-jamo) batchim', () => {
    const [[unit]] = decomposeText('간');
    expect(unit).toEqual({ type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: ['ㄴ'] });
  });

  it('splits a double batchim into its two component consonants (닭 -> ㄹ+ㄱ)', () => {
    const [[unit]] = decomposeText('닭');
    expect(unit).toEqual({ type: 'syllable', cho: 'ㄷ', jung: 'ㅏ', jong: ['ㄹ', 'ㄱ'] });
  });

  it('splits every double-batchim type correctly', () => {
    const cases = {
      '앉': ['ㄴ', 'ㅈ'], '않': ['ㄴ', 'ㅎ'], '값': ['ㅂ', 'ㅅ'],
      '넋': ['ㄱ', 'ㅅ'], '삶': ['ㄹ', 'ㅁ'], '넓': ['ㄹ', 'ㅂ'],
    };
    for (const [syllable, expected] of Object.entries(cases)) {
      const [[unit]] = decomposeText(syllable);
      expect(unit.jong).toEqual(expected);
    }
  });

  it('maps digits to type "digit"', () => {
    const [[unit]] = decomposeText('7');
    expect(unit).toEqual({ type: 'digit', char: '7' });
  });

  it('maps ? and ! to type "special"', () => {
    const [units] = decomposeText('?!');
    expect(units).toEqual([
      { type: 'special', char: '?' },
      { type: 'special', char: '!' },
    ]);
  });

  it('maps a standalone consonant jamo (ㅋㅋㅋ) to type "jamoCho"', () => {
    const [units] = decomposeText('ㅋㅋㅋ');
    expect(units).toEqual([
      { type: 'jamoCho', char: 'ㅋ' },
      { type: 'jamoCho', char: 'ㅋ' },
      { type: 'jamoCho', char: 'ㅋ' },
    ]);
  });

  it('maps a standalone vowel jamo (ㅠㅠ) to type "jamoJung"', () => {
    const [units] = decomposeText('ㅠㅠ');
    expect(units).toEqual([
      { type: 'jamoJung', char: 'ㅠ' },
      { type: 'jamoJung', char: 'ㅠ' },
    ]);
  });

  it('passes non-Hangul characters through unchanged', () => {
    const [units] = decomposeText('A b');
    expect(units).toEqual([
      { type: 'passthrough', char: 'A' },
      { type: 'passthrough', char: ' ' },
      { type: 'passthrough', char: 'b' },
    ]);
  });

  it('handles mixed Korean/English/number text in order', () => {
    const [units] = decomposeText('안5A');
    expect(units.map((u) => u.type)).toEqual(['syllable', 'digit', 'passthrough']);
  });

  it('splits on newlines into separate lines', () => {
    const lines = decomposeText('가\n나');
    expect(lines).toHaveLength(2);
    expect(lines[0][0].cho).toBe('ㄱ');
    expect(lines[1][0].cho).toBe('ㄴ');
  });

  it('returns an empty lines array for empty input', () => {
    expect(decomposeText('')).toEqual([[]]);
  });
});
