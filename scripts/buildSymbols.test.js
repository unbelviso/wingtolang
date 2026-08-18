import { describe, it, expect, beforeAll } from 'vitest';
import { buildSymbolMap } from './buildSymbols.js';

describe('buildSymbolMap', () => {
  it('parses a cho row into a shape recipe', () => {
    const rows = [['구분', '자모', '기호'], ['초성', 'ㄱ', 'circle']];
    const map = buildSymbolMap(rows);
    expect(map.cho['ㄱ']).toEqual({ shape: 'circle' });
  });

  it('parses a parameterized shape recipe', () => {
    const rows = [['구분', '자모', '기호'], ['초성', 'ㄴ', 'heartPeaks:2']];
    const map = buildSymbolMap(rows);
    expect(map.cho['ㄴ']).toEqual({ shape: 'heartPeaks', count: 2 });
  });

  it('parses a modifier suffix', () => {
    const rows = [['구분', '자모', '기호'], ['쌍자음', 'ㄲ', 'circle+centerDot']];
    const map = buildSymbolMap(rows);
    expect(map.cho['ㄲ']).toEqual({ shape: 'circle', modifier: 'centerDot' });
  });

  it('parses a jung line mark', () => {
    const rows = [['구분', '자모', '기호'], ['중성', 'ㅏ', 'line:right:1']];
    const map = buildSymbolMap(rows);
    expect(map.jung['ㅏ']).toEqual({ mark: 'line', position: 'right', count: 1 });
  });

  it('parses a jung dot mark with multiple positions', () => {
    const rows = [['구분', '자모', '기호'], ['중성', 'ㅢ', 'dot:right,bottom']];
    const map = buildSymbolMap(rows);
    expect(map.jung['ㅢ']).toEqual({ mark: 'dot', positions: ['right', 'bottom'] });
  });

  it('parses a jung combo mark', () => {
    const rows = [['구분', '자모', '기호'], ['이중모음', 'ㅘ', 'combo:line:top:1+line:right:1']];
    const map = buildSymbolMap(rows);
    expect(map.jung['ㅘ']).toEqual({
      mark: 'combo',
      marks: [
        { mark: 'line', position: 'top', count: 1 },
        { mark: 'line', position: 'right', count: 1 },
      ],
    });
  });

  it('parses a digit shape', () => {
    const rows = [['구분', '자모', '기호'], ['숫자', '6', 'archChainDot:1']];
    const map = buildSymbolMap(rows);
    expect(map.digit['6']).toEqual({ shape: 'archChainDot', count: 1 });
  });

  it('parses a special-char shape', () => {
    const rows = [['구분', '자모', '기호'], ['특수문자', '?', 'spiral']];
    const map = buildSymbolMap(rows);
    expect(map.special['?']).toEqual({ shape: 'spiral' });
  });

  it('falls back to a cycling placeholder when 기호 is blank', () => {
    const rows = [
      ['구분', '자모', '기호'],
      ['초성', 'ㄱ', ''],
      ['초성', 'ㄴ', ''],
      ['초성', 'ㄷ', ''],
      ['초성', 'ㄹ', ''],
      ['초성', 'ㅁ', ''],
    ];
    const map = buildSymbolMap(rows);
    expect(map.cho['ㄱ']).toEqual({ shape: 'placeholderCircle' });
    expect(map.cho['ㄴ']).toEqual({ shape: 'placeholderTriangle' });
    expect(map.cho['ㄷ']).toEqual({ shape: 'placeholderSquare' });
    expect(map.cho['ㄹ']).toEqual({ shape: 'placeholderHeart' });
    expect(map.cho['ㅁ']).toEqual({ shape: 'placeholderCircle' });
  });
});
