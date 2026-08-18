import XLSX from 'xlsx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 구분 | 자모 | 기호 — 기호 values are shape-recipe keywords (see spec §3.3),
// not filenames. Empty 기호 cells fall back to a cycling placeholder shape.
const rows = [
  ['구분', '자모', '기호'],
  ['초성', 'ㄱ', 'circle'],
  ['초성', 'ㄴ', 'heartPeaks:2'],
  ['초성', 'ㄷ', 'heartPeaks:3'],
  ['초성', 'ㄹ', 'heartPeaks:4'],
  ['초성', 'ㅁ', 'circleLines:1'],
  ['초성', 'ㅂ', 'circleLines:2'],
  ['초성', 'ㅅ', 'triangle'],
  ['초성', 'ㅇ', 'saturn'],
  ['초성', 'ㅈ', 'triangleDots:1'],
  ['초성', 'ㅊ', 'triangleDots:2'],
  ['초성', 'ㅋ', 'circlePetals:1'],
  ['초성', 'ㅌ', 'circlePetals:2'],
  ['초성', 'ㅍ', 'circlePetals:3'],
  ['초성', 'ㅎ', 'circlePetals:4'],
  ['쌍자음', 'ㄲ', 'circle+centerDot'],
  ['쌍자음', 'ㄸ', 'heartPeaks:2+centerDot'],
  ['쌍자음', 'ㅃ', 'circleLines:2+centerDot'],
  ['쌍자음', 'ㅆ', 'triangle+centerDot'],
  ['쌍자음', 'ㅉ', 'triangleDots:1+centerDot'],
  ['중성', 'ㅏ', 'line:right:1'],
  ['중성', 'ㅑ', 'line:right:2'],
  ['중성', 'ㅓ', 'line:left:1'],
  ['중성', 'ㅕ', 'line:left:2'],
  ['중성', 'ㅗ', 'line:top:1'],
  ['중성', 'ㅛ', 'line:top:2'],
  ['중성', 'ㅜ', 'line:bottom:1'],
  ['중성', 'ㅠ', 'line:bottom:2'],
  ['중성', 'ㅡ', 'dot:bottom'],
  ['중성', 'ㅣ', 'dot:right'],
  ['이중모음', 'ㅐ', 'pinMid:right'],
  ['이중모음', 'ㅒ', 'pinMidDouble:right'],
  ['이중모음', 'ㅔ', 'pinEnd:right'],
  ['이중모음', 'ㅖ', 'pinEndDouble:right'],
  ['이중모음', 'ㅘ', 'combo:line:top:1+line:right:1'],
  ['이중모음', 'ㅙ', 'combo:line:top:1+pin:right'],
  ['이중모음', 'ㅚ', 'combo:line:top:1+dot:right'],
  ['이중모음', 'ㅝ', 'combo:line:bottom:1+line:left:1'],
  ['이중모음', 'ㅞ', 'combo:line:bottom:1+pin:right'],
  ['이중모음', 'ㅟ', 'combo:line:bottom:1+dot:right'],
  ['이중모음', 'ㅢ', 'dot:right,bottom'],
  ['숫자', '1', 'uChain:1'],
  ['숫자', '2', 'uChain:2'],
  ['숫자', '3', 'uChain:3'],
  ['숫자', '4', 'uChain:4'],
  ['숫자', '5', 'uChain:5'],
  ['숫자', '6', 'archChainDot:1'],
  ['숫자', '7', 'archChainDot:2'],
  ['숫자', '8', 'archChainDot:3'],
  ['숫자', '9', 'archChainDot:4'],
  ['숫자', '0', 'star'],
  ['특수문자', '?', 'spiral'],
  ['특수문자', '!', 'zigzag4'],
];

const sheet = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, sheet, '자모기호');
XLSX.writeFile(wb, path.join(__dirname, 'jamo-symbols.xlsx'));
console.log('Wrote scripts/jamo-symbols.xlsx');
