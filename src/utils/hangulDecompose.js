const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const DOUBLE_JONG = {
  'ㄳ': ['ㄱ', 'ㅅ'], 'ㄵ': ['ㄴ', 'ㅈ'], 'ㄶ': ['ㄴ', 'ㅎ'],
  'ㄺ': ['ㄹ', 'ㄱ'], 'ㄻ': ['ㄹ', 'ㅁ'], 'ㄼ': ['ㄹ', 'ㅂ'],
  'ㄽ': ['ㄹ', 'ㅅ'], 'ㄾ': ['ㄹ', 'ㅌ'], 'ㄿ': ['ㄹ', 'ㅍ'],
  'ㅀ': ['ㄹ', 'ㅎ'], 'ㅄ': ['ㅂ', 'ㅅ'],
};

const SPECIAL_CHARS = new Set(['?', '!']);
const CHO_SET = new Set(CHO);
const JUNG_SET = new Set(JUNG);

function decomposeSyllable(char) {
  const code = char.codePointAt(0) - 0xAC00;
  const choIndex = Math.floor(code / (21 * 28));
  const jungIndex = Math.floor((code % (21 * 28)) / 28);
  const jongIndex = code % 28;
  const jongJamo = JONG[jongIndex];
  let jong = null;
  if (jongJamo !== '') {
    jong = DOUBLE_JONG[jongJamo] ? [...DOUBLE_JONG[jongJamo]] : [jongJamo];
  }
  return { type: 'syllable', cho: CHO[choIndex], jung: JUNG[jungIndex], jong };
}

function classifyChar(char) {
  const code = char.codePointAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) return decomposeSyllable(char);
  if (char >= '0' && char <= '9') return { type: 'digit', char };
  if (SPECIAL_CHARS.has(char)) return { type: 'special', char };
  // A jamo typed on its own (ㅋㅋㅋ, ㅇㅇ, ㅠㅠ) rather than as part of a
  // combined syllable block — draw it as that jamo's own symbol directly.
  if (CHO_SET.has(char)) return { type: 'jamoCho', char };
  if (JUNG_SET.has(char)) return { type: 'jamoJung', char };
  return { type: 'passthrough', char };
}

export function decomposeText(text) {
  return text.split('\n').map((line) => Array.from(line).map(classifyChar));
}
