# 윙토언어 변환기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React+Vite SPA that decomposes Korean text into jamo, maps each jamo to a hand-drawn "wingto" symbol, renders the sequence to a canvas, and lets the user download it as a PNG.

**Architecture:** A one-way pipeline: `hangulDecompose.js` (pure function, text → jamo units) feeds `renderToCanvas.js` (composition: looks up each jamo in `symbolMap.js`, calls the matching drawing recipe in `symbolShapes.js`, which draws via `roughjs` for the hand-drawn look). `symbolMap.js` is generated from an Excel file by `scripts/buildSymbols.js`, keeping content (which jamo maps to which shape recipe) separate from code. React components are thin wrappers around this pipeline.

**Tech Stack:** React 19 + Vite 8, Tailwind CSS v4 (`@tailwindcss/vite` plugin), `xlsx` 0.18.5 (Excel parsing), `roughjs` 4.6.6 (hand-drawn canvas rendering), Vitest 4 + `@testing-library/react` (tests), `pretendard` npm package (body font), Gmarket Sans via CDN `@font-face` (title font).

**Spec:** `docs/superpowers/specs/2026-08-14-wingto-symbol-converter-design.md`

## Global Constraints

- Symbol strokes are monochrome: stroke `#4A4A4A`, no fill except the specific white occlusion fills called out in the spec (§3.4) — never introduce pastel fills on symbol shapes.
- All rough.js draw calls use this exact option set unless the step says otherwise: `{ roughness: 0.35, bowing: 0.3, disableMultiStroke: true, disableMultiStrokeFill: true, preserveVertices: true, stroke: '#4A4A4A', strokeWidth: 2.2 }` (defined once in `src/utils/roughOptions.js`, imported everywhere).
- UI colors (not symbols): background `#FFFFFF`, section/card accents `#FFE1EC` and `#DCF0FA`, buttons/emphasis `#FFB3D1` and `#A8DDF0`, body text `#4A4A4A`.
- Every `.jsx`/`.js` file this plan creates goes under `src/` per the folder layout in the spec (`src/components`, `src/data`, `src/utils`); the Excel-reading script goes in `scripts/`.
- `symbolMap.js` is a **generated file** (output of `npm run build-symbols`) — tasks that need it must run that command, never hand-edit the generated output.
- The spec's §11 lists 4 unresolved details (쌍자음 inner marker, ㅐㅒㅔㅖ attach side, ㅙㅞ combo, spiral curve). Tasks 5 and 6 implement the spec's current best-guess for these and flag them for a visual check against the running app before being considered final — do not silently "improve" them beyond what's written without checking with the user first.

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`
- Create: `vitest.config.js` (or merge into `vite.config.js`)

**Interfaces:**
- Produces: a running `npm run dev` server on the Vite default port, and `npm test` running Vitest.

- [ ] **Step 1: Scaffold Vite + React**

```bash
npm create vite@latest . -- --template react
```
(Run in `D:\2026배경화면\myapp\wingto`, which already has `.git`, `.gitignore`, and `docs/` — accept prompts to scaffold into the non-empty directory.)

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install xlsx roughjs pretendard
npm install -D tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Tailwind v4 via the Vite plugin**

Replace `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
```

Create `src/setupTests.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Replace `src/index.css`**

```css
@import "tailwindcss";
@import "pretendard/dist/web/static/pretendard.css";

@font-face {
  font-family: 'GmarketSansBold';
  src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.0/GmarketSansBold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@theme {
  --color-wingto-pink: #FFE1EC;
  --color-wingto-sky: #DCF0FA;
  --color-wingto-pink-dark: #FFB3D1;
  --color-wingto-sky-dark: #A8DDF0;
  --color-wingto-text: #4A4A4A;
  --font-title: 'GmarketSansBold', sans-serif;
  --font-body: 'Pretendard', sans-serif;
}

body {
  font-family: var(--font-body);
  color: var(--color-wingto-text);
}
```

- [ ] **Step 5: Add `npm test` script**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 6: Verify dev server and test runner both work**

Run: `npm run dev` (confirm it starts, then stop it) and `npm test` (confirm it runs with zero tests found, not an error).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Vite+React project with Tailwind v4, roughjs, xlsx, vitest"
```

---

## Task 2: Seed jamo data + `buildSymbols.js`

**Files:**
- Create: `scripts/generate-seed-excel.js` (one-off script, run once then can stay in repo for reproducibility)
- Create: `scripts/jamo-symbols.xlsx` (generated by the script above)
- Create: `scripts/buildSymbols.js`
- Create: `src/data/symbolMap.js` (generated output)
- Test: `scripts/buildSymbols.test.js`

**Interfaces:**
- Produces: `symbolMap.js` exporting `{ cho, jung, digit, special }` objects, keyed by jamo/character, each value `{ shape, count?, modifier? }` for `cho`/`digit`/`special`, or `{ mark, position?, positions?, count?, marks? }` for `jung`. This is the exact shape Tasks 3–6 and Task 8 read.

- [ ] **Step 1: Write the seed Excel generator**

`scripts/generate-seed-excel.js`:

```js
import XLSX from 'xlsx';

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
  ['이중모음', 'ㅔ', 'pinEnd:left'],
  ['이중모음', 'ㅖ', 'pinEndDouble:left'],
  ['이중모음', 'ㅘ', 'combo:line:top:1+line:right:1'],
  ['이중모음', 'ㅙ', 'combo:line:top:1+pin:right'],
  ['이중모음', 'ㅚ', 'combo:line:top:1+dot:right'],
  ['이중모음', 'ㅝ', 'combo:line:bottom:1+line:left:1'],
  ['이중모음', 'ㅞ', 'combo:line:bottom:1+pin:left'],
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
XLSX.writeFile(wb, new URL('./jamo-symbols.xlsx', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
console.log('Wrote scripts/jamo-symbols.xlsx');
```

- [ ] **Step 2: Run it once to produce the seed file**

```bash
node scripts/generate-seed-excel.js
```

Verify `scripts/jamo-symbols.xlsx` was created.

- [ ] **Step 3: Write the failing test for `buildSymbols.js`**

`scripts/buildSymbols.test.js`:

```js
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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run scripts/buildSymbols.test.js`
Expected: FAIL — `buildSymbols.js` does not exist yet.

- [ ] **Step 5: Implement `buildSymbols.js`**

```js
import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_CYCLE = ['placeholderCircle', 'placeholderTriangle', 'placeholderSquare', 'placeholderHeart'];
const CATEGORY_KEY = { '초성': 'cho', '쌍자음': 'cho', '중성': 'jung', '이중모음': 'jung', '숫자': 'digit', '특수문자': 'special' };

function parseMarkToken(token) {
  // "line:right:1" -> {mark:'line', position:'right', count:1}
  // "dot:right"    -> {mark:'dot', positions:['right']}
  // "dot:right,bottom" -> {mark:'dot', positions:['right','bottom']}
  // "pin:right"    -> {mark:'pin', position:'right'}
  const [mark, posPart, countPart] = token.split(':');
  if (mark === 'dot') {
    return { mark: 'dot', positions: posPart.split(',') };
  }
  if (mark === 'pin') {
    return { mark: 'pin', position: posPart };
  }
  return { mark: 'line', position: posPart, count: Number(countPart) };
}

function parseRecipe(category, raw) {
  if (category === '중성' || category === '이중모음') {
    if (raw.startsWith('combo:')) {
      const marksPart = raw.slice('combo:'.length);
      const marks = marksPart.split('+').map(parseMarkToken);
      return { mark: 'combo', marks };
    }
    if (raw.startsWith('pinMidDouble:')) return { mark: 'pinMidDouble', position: raw.split(':')[1] };
    if (raw.startsWith('pinEndDouble:')) return { mark: 'pinEndDouble', position: raw.split(':')[1] };
    if (raw.startsWith('pinMid:')) return { mark: 'pinMid', position: raw.split(':')[1] };
    if (raw.startsWith('pinEnd:')) return { mark: 'pinEnd', position: raw.split(':')[1] };
    return parseMarkToken(raw);
  }

  // cho / digit / special: "shape[:count][+modifier]"
  const [shapePart, modifier] = raw.split('+');
  const [shape, count] = shapePart.split(':');
  const recipe = { shape };
  if (count !== undefined) recipe.count = Number(count);
  if (modifier) recipe.modifier = modifier;
  return recipe;
}

export function buildSymbolMap(rows) {
  const map = { cho: {}, jung: {}, digit: {}, special: {} };
  const placeholderIndex = { cho: 0, jung: 0, digit: 0, special: 0 };

  for (const row of rows.slice(1)) {
    const [category, jamo, rawSymbol] = row;
    if (!category || !jamo) continue;
    const bucketKey = CATEGORY_KEY[category];
    if (!bucketKey) continue;

    const raw = (rawSymbol || '').trim();
    if (raw === '') {
      const shape = PLACEHOLDER_CYCLE[placeholderIndex[bucketKey] % PLACEHOLDER_CYCLE.length];
      placeholderIndex[bucketKey] += 1;
      map[bucketKey][jamo] = { shape };
      continue;
    }
    map[bucketKey][jamo] = parseRecipe(category, raw);
  }
  return map;
}

export function generateSymbolMapFile(excelPath, outPath) {
  const wb = XLSX.readFile(excelPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const map = buildSymbolMap(rows);
  const contents = `// AUTO-GENERATED by scripts/buildSymbols.js — do not hand-edit.\n// Regenerate with: npm run build-symbols\nexport const symbolMap = ${JSON.stringify(map, null, 2)};\n`;
  fs.writeFileSync(outPath, contents);
  return map;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const excelPath = path.join(__dirname, 'jamo-symbols.xlsx');
  const outPath = path.join(__dirname, '..', 'src', 'data', 'symbolMap.js');
  generateSymbolMapFile(excelPath, outPath);
  console.log(`Wrote ${outPath}`);
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run scripts/buildSymbols.test.js`
Expected: PASS (9 tests)

- [ ] **Step 7: Register the npm script and generate `symbolMap.js`**

In `package.json` `"scripts"`, add:

```json
"build-symbols": "node scripts/buildSymbols.js"
```

Run:

```bash
npm run build-symbols
```

Verify `src/data/symbolMap.js` was created and `map.cho['ㅇ']` reads `{ "shape": "saturn" }`.

- [ ] **Step 8: Commit**

```bash
git add scripts/ src/data/symbolMap.js package.json
git commit -m "Add Excel-driven symbol data pipeline (buildSymbols.js)"
```

---

## Task 3: `roughOptions.js` + base primitive shapes

**Files:**
- Create: `src/utils/roughOptions.js`
- Create: `src/utils/shapes/primitives.js`
- Test: `src/utils/shapes/primitives.test.js`

**Interfaces:**
- Consumes: nothing (first shapes module).
- Produces: `BASE_OPTIONS` (plain object), `OCCLUDE_OPTIONS` (`BASE_OPTIONS` + white solid fill), `drawCircle(rc, cx, cy, r, options)`, `drawTriangle(rc, points, options)` where `points` is `[[x,y],[x,y],[x,y]]`. Every later shape function in Tasks 4–6 imports `BASE_OPTIONS`/`OCCLUDE_OPTIONS` from this file and calls `rc.<method>` directly or composes these two functions.

- [ ] **Step 1: Write `roughOptions.js`**

```js
export const BASE_OPTIONS = {
  roughness: 0.35,
  bowing: 0.3,
  disableMultiStroke: true,
  disableMultiStrokeFill: true,
  preserveVertices: true,
  stroke: '#4A4A4A',
  strokeWidth: 2.2,
};

export const OCCLUDE_OPTIONS = {
  ...BASE_OPTIONS,
  fill: 'white',
  fillStyle: 'solid',
};
```

- [ ] **Step 2: Write the failing test for primitives**

`src/utils/shapes/primitives.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { drawCircle, drawTriangle } from './primitives.js';
import { BASE_OPTIONS } from '../roughOptions.js';

describe('primitives', () => {
  it('drawCircle calls rc.circle with diameter (2*r) and given options', () => {
    const rc = { circle: vi.fn() };
    drawCircle(rc, 10, 20, 15, BASE_OPTIONS);
    expect(rc.circle).toHaveBeenCalledWith(10, 20, 30, BASE_OPTIONS);
  });

  it('drawTriangle calls rc.polygon with the three points', () => {
    const rc = { polygon: vi.fn() };
    const points = [[23, 2], [2, 40], [44, 40]];
    drawTriangle(rc, points, BASE_OPTIONS);
    expect(rc.polygon).toHaveBeenCalledWith(points, BASE_OPTIONS);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/utils/shapes/primitives.test.js`
Expected: FAIL — module `./primitives.js` not found.

- [ ] **Step 4: Implement `primitives.js`**

```js
export function drawCircle(rc, cx, cy, r, options) {
  rc.circle(cx, cy, r * 2, options);
}

export function drawTriangle(rc, points, options) {
  rc.polygon(points, options);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/utils/shapes/primitives.test.js`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add src/utils/roughOptions.js src/utils/shapes/primitives.js src/utils/shapes/primitives.test.js
git commit -m "Add rough.js options and base circle/triangle primitives"
```

---

## Task 4: Consonant compound shapes

**Files:**
- Create: `src/utils/shapes/consonants.js`
- Test: `src/utils/shapes/consonants.test.js`

**Interfaces:**
- Consumes: `BASE_OPTIONS`, `OCCLUDE_OPTIONS` from `../roughOptions.js`; `drawCircle`, `drawTriangle` from `./primitives.js`.
- Produces: `drawHeartPeaks(rc, cx, cy, size, count, options)`, `drawCircleLines(rc, cx, cy, r, count, options)`, `drawTriangleDots(rc, cx, cy, size, count, options)`, `drawCirclePetals(rc, cx, cy, r, count, options)`, `drawSaturn(rc, cx, cy, r, options)`, `drawCenterDotModifier(rc, cx, cy, size, options)`. `renderToCanvas.js` (Task 8) and `symbolShapes.js` (Task 7) call these by name via a shape-name → function lookup table.

All coordinate math below reuses the exact geometry validated during brainstorming (spec §3.3), generalized to take a center `(cx, cy)` and a `size` (≈ bounding-box width) instead of the fixed brainstorm-mockup coordinates.

- [ ] **Step 1: Write the failing tests**

`src/utils/shapes/consonants.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import {
  drawHeartPeaks, drawCircleLines, drawTriangleDots, drawCirclePetals, drawSaturn, drawCenterDotModifier,
} from './consonants.js';

function mockRc() {
  return { circle: vi.fn(), path: vi.fn(), polygon: vi.fn(), line: vi.fn() };
}

describe('drawHeartPeaks', () => {
  // The path is: 1 rounded corner + `count` peak bumps + 1 rounded corner,
  // so the arc count in the path data is always count + 2.
  it('draws one path whose arc count is peakCount + 2 rounded corners', () => {
    const rc = mockRc();
    drawHeartPeaks(rc, 30, 30, 40, 2, { stroke: '#4A4A4A' });
    expect(rc.path).toHaveBeenCalledTimes(1);
    const [pathData] = rc.path.mock.calls[0];
    expect((pathData.match(/A\d/g) || []).length).toBe(4); // 2 peaks + 2 corners
  });

  it('scales the arc count with peak count for 3 and 4 peaks', () => {
    const rc = mockRc();
    drawHeartPeaks(rc, 30, 30, 40, 3, {});
    expect((rc.path.mock.calls[0][0].match(/A\d/g) || []).length).toBe(5); // 3 peaks + 2 corners
    drawHeartPeaks(rc, 30, 30, 40, 4, {});
    expect((rc.path.mock.calls[1][0].match(/A\d/g) || []).length).toBe(6); // 4 peaks + 2 corners
  });
});

describe('drawCircleLines', () => {
  it('draws the base circle then N horizontal lines', () => {
    const rc = mockRc();
    drawCircleLines(rc, 25, 25, 22, 1, {});
    expect(rc.circle).toHaveBeenCalledTimes(1);
    expect(rc.line).toHaveBeenCalledTimes(1);
  });

  it('draws 2 parallel lines for count=2', () => {
    const rc = mockRc();
    drawCircleLines(rc, 25, 25, 22, 2, {});
    expect(rc.line).toHaveBeenCalledTimes(2);
    const [y1a] = rc.line.mock.calls[0].slice(1, 2);
    const [y1b] = rc.line.mock.calls[1].slice(1, 2);
    expect(y1a).not.toBe(y1b);
  });
});

describe('drawTriangleDots', () => {
  it('draws the triangle plus N hollow circles touching the apex', () => {
    const rc = mockRc();
    drawTriangleDots(rc, 23, 20, 46, 1, {});
    expect(rc.polygon).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('stacks 2 circles above the apex for count=2', () => {
    const rc = mockRc();
    drawTriangleDots(rc, 23, 20, 46, 2, {});
    expect(rc.circle).toHaveBeenCalledTimes(2);
    const cy1 = rc.circle.mock.calls[0][1];
    const cy2 = rc.circle.mock.calls[1][1];
    expect(cy2).toBeLessThan(cy1); // second circle sits above the first
  });
});

describe('drawCirclePetals', () => {
  it('draws N petal circles before the center circle (so the center occludes overlaps)', () => {
    const rc = mockRc();
    drawCirclePetals(rc, 35, 38, 15, 3, {});
    expect(rc.circle).toHaveBeenCalledTimes(4); // 3 petals + 1 center
    // center circle (largest radius*2 diameter) must be the LAST call
    const lastCallDiameter = rc.circle.mock.calls[3][2];
    expect(lastCallDiameter).toBe(30); // 15*2
  });
});

describe('drawSaturn', () => {
  it('draws back-ring arc, then occluding circle, then front-ring arc, in that order', () => {
    const rc = mockRc();
    drawSaturn(rc, 40, 52, 16, {});
    expect(rc.path).toHaveBeenCalledTimes(2);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('the ring is level (arc rotation term is 0, not tilted)', () => {
    const rc = mockRc();
    drawSaturn(rc, 40, 52, 16, {});
    const [backPath] = rc.path.mock.calls[0];
    const [frontPath] = rc.path.mock.calls[1];
    expect(backPath).toMatch(/A[\d.]+,[\d.]+ 0 /);
    expect(frontPath).toMatch(/A[\d.]+,[\d.]+ 0 /);
  });
});

describe('drawCenterDotModifier', () => {
  it('draws one small hollow circle at the exact given center', () => {
    const rc = mockRc();
    drawCenterDotModifier(rc, 25, 25, 44, {});
    expect(rc.circle).toHaveBeenCalledTimes(1);
    expect(rc.circle.mock.calls[0][0]).toBe(25);
    expect(rc.circle.mock.calls[0][1]).toBe(25);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/shapes/consonants.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `consonants.js`**

```js
import { drawCircle } from './primitives.js';

// ㄴㄷㄹ family: flat-ish bottom, `count` rounded bumps on top, corners
// slightly rounded (not sharp). Scaled from the brainstorm-validated
// 52-wide/40-tall 2-bump reference; each extra bump adds one 20-wide lobe.
export function drawHeartPeaks(rc, cx, cy, size, count, options) {
  const bumpR = size / 5.2; // matches the 10-radius-in-52-wide reference ratio
  const cornerR = bumpR * 0.4;
  const top = cy - size * 0.28;
  const bottom = cy + size * 0.28;
  const left = cx - (bumpR * 2 * count) / 2 - cornerR;
  const bumpStart = left + cornerR;

  let d = `M${bumpStart + cornerR},${bottom} A${cornerR},${cornerR} 0 0 1 ${bumpStart},${bottom - cornerR} L${bumpStart},${top}`;
  let x = bumpStart;
  for (let i = 0; i < count; i++) {
    const nextX = x + bumpR * 2;
    d += ` A${bumpR},${bumpR} 0 0 1 ${nextX},${top}`;
    x = nextX;
  }
  const right = x;
  d += ` L${right},${bottom - cornerR} A${cornerR},${cornerR} 0 0 1 ${right - cornerR},${bottom} Z`;

  rc.path(d, options);
}

// ㅁ/ㅂ: circle with `count` horizontal lines through the middle.
export function drawCircleLines(rc, cx, cy, r, count, options) {
  drawCircle(rc, cx, cy, r, options);
  const gap = r * 0.24;
  const startY = cy - (gap * (count - 1)) / 2;
  for (let i = 0; i < count; i++) {
    const y = startY + i * gap;
    rc.line(cx - r * 0.9, y, cx + r * 0.9, y, options);
  }
}

// ㅅ base triangle used directly for ㅅ, and as the base of ㅈ/ㅊ below.
export function trianglePoints(cx, apexY, size) {
  const halfBase = size / 2;
  const baseY = apexY + size * 0.87;
  return [[cx, apexY], [cx - halfBase, baseY], [cx + halfBase, baseY]];
}

// ㅈㅊ: triangle with `count` hollow circles stacked touching the apex.
export function drawTriangleDots(rc, cx, apexY, size, count, options) {
  const points = trianglePoints(cx, apexY, size);
  rc.polygon(points, options);
  const dotR = size * 0.13;
  for (let i = 0; i < count; i++) {
    const cy = apexY - dotR - i * dotR * 2;
    drawCircle(rc, cx, cy, dotR, options);
  }
}

// ㅋㅌㅍㅎ: `count` petal circles (bigger, spaced out) drawn first, then the
// center circle drawn last so it occludes the overlap — no crossed lines.
export function drawCirclePetals(rc, cx, cy, r, count, options) {
  const petalR = r * 0.57;
  const dist = r * 1.75;
  const spreadDeg = count === 1 ? 0 : 40 + count * 20;
  const startDeg = -90 - spreadDeg / 2;
  const stepDeg = count === 1 ? 0 : spreadDeg / (count - 1);
  for (let i = 0; i < count; i++) {
    const angle = ((startDeg + i * stepDeg) * Math.PI) / 180;
    const px = cx + dist * Math.cos(angle);
    const py = cy + dist * Math.sin(angle);
    drawCircle(rc, px, py, petalR, options);
  }
  drawCircle(rc, cx, cy, r, options);
}

// ㅇ: level ring, back half drawn first, planet circle occludes it, front
// half drawn last on top — reads as one continuous ring line.
export function drawSaturn(rc, cx, cy, r, options) {
  const rx = r * 1.7, ry = r * 0.44;
  const left = cx - rx, right = cx + rx;
  rc.path(`M${left},${cy} A${rx},${ry} 0 0,1 ${right},${cy}`, options);
  drawCircle(rc, cx, cy, r, { ...options, fill: 'white', fillStyle: 'solid' });
  rc.path(`M${right},${cy} A${rx},${ry} 0 0,1 ${left},${cy}`, options);
}

// 쌍자음 marker: small hollow circle at the exact center of the base shape.
export function drawCenterDotModifier(rc, cx, cy, baseSize, options) {
  drawCircle(rc, cx, cy, baseSize * 0.1, options);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/shapes/consonants.test.js`
Expected: PASS (9 tests). If `drawSaturn`'s arc regex assertion fails because of decimal formatting, adjust the implementation's template string (not the test) so the arc's rotation term is literally `0` — the point is the ring must not carry a rotation angle.

- [ ] **Step 5: Commit**

```bash
git add src/utils/shapes/consonants.js src/utils/shapes/consonants.test.js
git commit -m "Add consonant compound shape drawers (heart-peaks, circle-lines, petals, saturn)"
```

---

## Task 5: Vowel mark shapes

**Files:**
- Create: `src/utils/shapes/vowelMarks.js`
- Test: `src/utils/shapes/vowelMarks.test.js`

**Interfaces:**
- Consumes: `drawCircle` from `./primitives.js`.
- Produces: `drawLineMark(rc, baseBox, position, count, options)`, `drawDotMark(rc, baseBox, positions, options)`, `drawPinMark(rc, baseBox, position, variant, options)` where `variant` is one of `'mid' | 'midDouble' | 'end' | 'endDouble'`, and `drawComboMark(rc, baseBox, marks, options)` which dispatches each entry in `marks` to the function above. `baseBox` is `{ cx, cy, r }` — the base consonant shape's bounding circle, as computed by `renderToCanvas.js` (Task 8).

⚠️ Per spec §11, the attach side for ㅐㅒㅔㅖ (pin marks) and the exact ㅙ/ㅞ combo are the plan's best guess, not user-confirmed. `drawPinMark`'s `position` argument is passed in by the caller (symbolMap data), so correcting this later is a one-line change in `scripts/generate-seed-excel.js`, not a code change here — call this out to the user during Task 9's manual QA pass.

- [ ] **Step 1: Write the failing tests**

`src/utils/shapes/vowelMarks.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { drawLineMark, drawDotMark, drawPinMark, drawComboMark } from './vowelMarks.js';

function mockRc() {
  return { circle: vi.fn(), line: vi.fn() };
}

const box = { cx: 35, cy: 25, r: 18 };

describe('drawLineMark', () => {
  it('draws 1 line to the right of the box for position=right, count=1', () => {
    const rc = mockRc();
    drawLineMark(rc, box, 'right', 1, {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    const [x1, , x2] = rc.line.mock.calls[0];
    expect(Math.max(x1, x2)).toBeGreaterThan(box.cx + box.r); // reaches outside the circle, to the right
  });

  it('draws 2 parallel lines for count=2', () => {
    const rc = mockRc();
    drawLineMark(rc, box, 'top', 2, {});
    expect(rc.line).toHaveBeenCalledTimes(2);
  });

  it('draws above the box for position=top', () => {
    const rc = mockRc();
    drawLineMark(rc, box, 'top', 1, {});
    const [, y1] = rc.line.mock.calls[0];
    expect(y1).toBeLessThan(box.cy - box.r);
  });
});

describe('drawDotMark', () => {
  it('draws one filled dot per position', () => {
    const rc = mockRc();
    drawDotMark(rc, box, ['right', 'bottom'], {});
    expect(rc.circle).toHaveBeenCalledTimes(2);
  });
});

describe('drawPinMark', () => {
  it('mid variant draws one line and one circle centered on the line', () => {
    const rc = mockRc();
    drawPinMark(rc, box, 'right', 'mid', {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('endDouble variant draws one line and two side-by-side circles at one end', () => {
    const rc = mockRc();
    drawPinMark(rc, box, 'left', 'endDouble', {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(2);
    const y1 = rc.circle.mock.calls[0][1];
    const y2 = rc.circle.mock.calls[1][1];
    expect(y1).toBe(y2); // side-by-side means same y
  });
});

describe('drawComboMark', () => {
  it('dispatches each mark entry to the right drawer', () => {
    const rc = mockRc();
    drawComboMark(rc, box, [
      { mark: 'line', position: 'top', count: 1 },
      { mark: 'dot', positions: ['right'] },
    ], {});
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('dispatches a pin entry inside a combo (ㅙ/ㅞ)', () => {
    const rc = mockRc();
    drawComboMark(rc, box, [
      { mark: 'line', position: 'top', count: 1 },
      { mark: 'pin', position: 'right' },
    ], {});
    expect(rc.line).toHaveBeenCalledTimes(2); // 1 from line mark + 1 from pin's own line
    expect(rc.circle).toHaveBeenCalledTimes(1); // pin's circle
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/shapes/vowelMarks.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `vowelMarks.js`**

```js
import { drawCircle } from './primitives.js';

const OFFSET = 6; // gap between the base shape's edge and a mark

function edgePoint(box, position) {
  const { cx, cy, r } = box;
  switch (position) {
    case 'right': return { x: cx + r + OFFSET, y: cy };
    case 'left': return { x: cx - r - OFFSET, y: cy };
    case 'top': return { x: cx, y: cy - r - OFFSET };
    case 'bottom': return { x: cx, y: cy + r + OFFSET };
    default: throw new Error(`unknown position: ${position}`);
  }
}

const isHorizontalMark = (position) => position === 'top' || position === 'bottom';

export function drawLineMark(rc, box, position, count, options) {
  const { x, y } = edgePoint(box, position);
  const len = box.r * 0.7;
  const gap = box.r * 0.18;
  const horizontal = isHorizontalMark(position); // top/bottom marks are vertical strokes; left/right are horizontal strokes
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * gap;
    if (horizontal) {
      rc.line(x + offset, y - len / 2, x + offset, y + len / 2, options);
    } else {
      rc.line(x - len / 2, y + offset, x + len / 2, y + offset, options);
    }
  }
}

export function drawDotMark(rc, box, positions, options) {
  const dotR = box.r * 0.14;
  for (const position of positions) {
    const { x, y } = edgePoint(box, position);
    drawCircle(rc, x, y, dotR, { ...options, fill: options.stroke || '#4A4A4A', fillStyle: 'solid' });
  }
}

// ㅐㅒㅔㅖ: a long line with 1-2 hollow circles either centered on it
// (mid/midDouble) or at one end (end/endDouble).
export function drawPinMark(rc, box, position, variant, options) {
  const { x, y } = edgePoint(box, position);
  const lineLen = box.r * 1.4;
  const circleR = box.r * 0.18;
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/shapes/vowelMarks.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/shapes/vowelMarks.js src/utils/shapes/vowelMarks.test.js
git commit -m "Add vowel mark drawers (line/dot/pin/combo)"
```

---

## Task 6: Number and special-character shapes

**Files:**
- Create: `src/utils/shapes/numbersAndSpecial.js`
- Test: `src/utils/shapes/numbersAndSpecial.test.js`

**Interfaces:**
- Consumes: nothing beyond `rc` (rough canvas) directly.
- Produces: `drawUChain(rc, cx, cy, size, count, options)`, `drawArchChainDot(rc, cx, cy, size, count, options)`, `drawStar(rc, cx, cy, r, options)`, `drawSpiral(rc, cx, cy, r, options)`, `drawZigzag4(rc, cx, cy, size, options)`.

- [ ] **Step 1: Write the failing tests**

`src/utils/shapes/numbersAndSpecial.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { drawUChain, drawArchChainDot, drawStar, drawSpiral, drawZigzag4 } from './numbersAndSpecial.js';

function mockRc() {
  return { path: vi.fn(), polygon: vi.fn(), circle: vi.fn() };
}

describe('drawUChain', () => {
  it('draws `count` U-shaped paths side by side', () => {
    const rc = mockRc();
    drawUChain(rc, 20, 20, 20, 3, {});
    expect(rc.path).toHaveBeenCalledTimes(3);
  });
});

describe('drawArchChainDot', () => {
  it('draws `count` arch paths plus one hollow circle at the last leg', () => {
    const rc = mockRc();
    drawArchChainDot(rc, 20, 20, 20, 2, {});
    expect(rc.path).toHaveBeenCalledTimes(2);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('the circle sits at the same x as the last arch path end', () => {
    const rc = mockRc();
    drawArchChainDot(rc, 20, 20, 20, 1, {});
    const archPath = rc.path.mock.calls[0][0];
    const lastX = archPath.match(/(\d+(?:\.\d+)?),\d+(?:\.\d+)?$/)[1];
    const circleX = String(rc.circle.mock.calls[0][0]);
    expect(circleX).toBe(lastX);
  });
});

describe('drawStar', () => {
  it('draws a single 10-point polygon', () => {
    const rc = mockRc();
    drawStar(rc, 20, 20, 18, {});
    expect(rc.polygon).toHaveBeenCalledTimes(1);
    expect(rc.polygon.mock.calls[0][0]).toHaveLength(10);
  });
});

describe('drawSpiral', () => {
  it('draws a single smooth path (quadratic-curve command present)', () => {
    const rc = mockRc();
    drawSpiral(rc, 20, 20, 16, {});
    expect(rc.path).toHaveBeenCalledTimes(1);
    expect(rc.path.mock.calls[0][0]).toMatch(/Q/);
  });
});

describe('drawZigzag4', () => {
  it('draws a single polyline path with exactly 4 sharp peaks', () => {
    const rc = mockRc();
    drawZigzag4(rc, 20, 20, 32, {});
    expect(rc.path).toHaveBeenCalledTimes(1);
    const d = rc.path.mock.calls[0][0];
    const coords = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
    // 9 points (x,y pairs) = 5 base touches + 4 peaks, alternating
    expect(coords.length).toBe(18);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/shapes/numbersAndSpecial.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `numbersAndSpecial.js`**

```js
// 1–5: a "U" bowl shape repeated `count` times side by side.
export function drawUChain(rc, cx, cy, size, count, options) {
  const unitW = size * 0.5;
  const gap = unitW * 0.15;
  const totalW = count * unitW + (count - 1) * gap;
  let x = cx - totalW / 2;
  const top = cy - size * 0.45;
  const bottom = cy + size * 0.45;
  for (let i = 0; i < count; i++) {
    const left = x;
    const right = x + unitW;
    const mid = (left + right) / 2;
    rc.path(
      `M${left},${top} C${left},${bottom - (bottom - top) * 0.1} ${left},${bottom} ${mid},${bottom} C${right},${bottom} ${right},${bottom - (bottom - top) * 0.1} ${right},${top}`,
      options,
    );
    x += unitW + gap;
  }
}

// 6–9: a "U" rotated 180° (an arch, ∩) repeated `count` times, with a
// small hollow circle attached right at the last arch's bottom-right leg.
export function drawArchChainDot(rc, cx, cy, size, count, options) {
  const unitW = size * 0.5;
  const gap = unitW * 0.15;
  const totalW = count * unitW + (count - 1) * gap;
  let x = cx - totalW / 2;
  const top = cy - size * 0.45;
  const bottom = cy + size * 0.45;
  let lastRight = 0, lastBottomY = 0;
  for (let i = 0; i < count; i++) {
    const left = x;
    const right = x + unitW;
    const mid = (left + right) / 2;
    rc.path(
      `M${left},${bottom} C${left},${top + (bottom - top) * 0.1} ${left},${top} ${mid},${top} C${right},${top} ${right},${top + (bottom - top) * 0.1} ${right},${bottom}`,
      options,
    );
    lastRight = right;
    lastBottomY = bottom;
    x += unitW + gap;
  }
  rc.circle(lastRight, lastBottomY, size * 0.15, options);
}

export function drawStar(rc, cx, cy, r, options) {
  const points = [];
  const innerR = r * 0.42;
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : innerR;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  rc.polygon(points, options);
}

// A smooth Archimedean-spiral approximation: sample points at 30° steps
// with linearly shrinking radius, then join them with quadratic beziers
// through each segment's midpoint (avoids the faceted look of a polyline).
export function drawSpiral(rc, cx, cy, r, options) {
  const steps = 30;
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const angle = ((30 * i) % 360) * (Math.PI / 180);
    const radius = r - (r * 0.9 * i) / steps;
    points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
  }
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [x, y] = points[i];
    const mx = (px + x) / 2, my = (py + y) / 2;
    d += ` Q${px},${py} ${mx},${my}`;
  }
  rc.path(d, options);
}

// !: 4 sharp, evenly-spaced zigzag peaks (lightning/grass-blade look).
export function drawZigzag4(rc, cx, cy, size, options) {
  const halfW = size / 2;
  const left = cx - halfW;
  const step = size / 8;
  const bottom = cy + size * 0.45;
  const top = cy - size * 0.45;
  const xs = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => left + n * step);
  const ys = [bottom, top, bottom, top, bottom, top, bottom, top, bottom];
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ');
  rc.path(d, options);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/shapes/numbersAndSpecial.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/shapes/numbersAndSpecial.js src/utils/shapes/numbersAndSpecial.test.js
git commit -m "Add number-chain, star, spiral, and zigzag shape drawers"
```

---

## Task 7: `symbolShapes.js` — the unified shape-name dispatcher

**Files:**
- Create: `src/utils/symbolShapes.js`
- Test: `src/utils/symbolShapes.test.js`

**Interfaces:**
- Consumes: every `draw*` function from Tasks 3–6, plus `BASE_OPTIONS`/`OCCLUDE_OPTIONS` from `roughOptions.js`.
- Produces: `drawChoShape(rc, cx, cy, size, recipe)`, `drawJungMark(rc, box, recipe)`, `drawDigitOrSpecialShape(rc, cx, cy, size, recipe)` — these three functions are what `renderToCanvas.js` (Task 8) calls for every jamo unit, given the recipe object read from `symbolMap.js`.

- [ ] **Step 1: Write the failing tests**

`src/utils/symbolShapes.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { drawChoShape, drawJungMark, drawDigitOrSpecialShape } from './symbolShapes.js';

function mockRc() {
  return { circle: vi.fn(), path: vi.fn(), polygon: vi.fn(), line: vi.fn() };
}

describe('drawChoShape', () => {
  it('dispatches shape:"circle" to a single rc.circle call', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'circle' });
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('dispatches shape:"heartPeaks" with count to drawHeartPeaks', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'heartPeaks', count: 3 });
    expect(rc.path).toHaveBeenCalledTimes(1);
  });

  it('dispatches shape:"saturn"', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'saturn' });
    expect(rc.path).toHaveBeenCalledTimes(2);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });

  it('applies the centerDot modifier as one extra hollow circle', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'circle', modifier: 'centerDot' });
    expect(rc.circle).toHaveBeenCalledTimes(2); // base circle + modifier dot
  });

  it('falls back to a plain circle for an unrecognized shape name', () => {
    const rc = mockRc();
    drawChoShape(rc, 20, 20, 40, { shape: 'nonsense-typo' });
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });
});

describe('drawJungMark', () => {
  const box = { cx: 35, cy: 25, r: 18 };

  it('dispatches mark:"line"', () => {
    const rc = mockRc();
    drawJungMark(rc, box, { mark: 'line', position: 'right', count: 1 });
    expect(rc.line).toHaveBeenCalledTimes(1);
  });

  it('dispatches mark:"combo"', () => {
    const rc = mockRc();
    drawJungMark(rc, box, {
      mark: 'combo',
      marks: [{ mark: 'line', position: 'top', count: 1 }, { mark: 'dot', positions: ['right'] }],
    });
    expect(rc.line).toHaveBeenCalledTimes(1);
    expect(rc.circle).toHaveBeenCalledTimes(1);
  });
});

describe('drawDigitOrSpecialShape', () => {
  it('dispatches shape:"star"', () => {
    const rc = mockRc();
    drawDigitOrSpecialShape(rc, 20, 20, 36, { shape: 'star' });
    expect(rc.polygon).toHaveBeenCalledTimes(1);
  });

  it('dispatches shape:"spiral"', () => {
    const rc = mockRc();
    drawDigitOrSpecialShape(rc, 20, 20, 36, { shape: 'spiral' });
    expect(rc.path).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/symbolShapes.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `symbolShapes.js`**

```js
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
  triangleDots: (rc, cx, cy, size, recipe, options) => drawTriangleDots(rc, cx, cy - size / 2, size, recipe.count, options),
  circlePetals: (rc, cx, cy, size, recipe, options) => drawCirclePetals(rc, cx, cy, size / 2, recipe.count, options),
  saturn: (rc, cx, cy, size, recipe, options) => drawSaturn(rc, cx, cy, size / 2, options),
  placeholderCircle: (rc, cx, cy, size, recipe, options) => drawCircle(rc, cx, cy, size / 2, options),
  placeholderTriangle: (rc, cx, cy, size, recipe, options) => drawTriangle(rc, trianglePoints(cx, cy - size / 2, size), options),
  placeholderSquare: (rc, cx, cy, size, recipe, options) => rc.rectangle(cx - size / 2, cy - size / 2, size, size, options),
  placeholderHeart: (rc, cx, cy, size, recipe, options) => drawHeartPeaks(rc, cx, cy, size, 2, options),
};

export function drawChoShape(rc, cx, cy, size, recipe, options = BASE_OPTIONS) {
  const draw = CHO_DRAWERS[recipe.shape] || CHO_DRAWERS.circle;
  draw(rc, cx, cy, size, recipe, options);
  if (recipe.modifier === 'centerDot') {
    drawCenterDotModifier(rc, cx, cy, size, options);
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/symbolShapes.test.js`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/symbolShapes.js src/utils/symbolShapes.test.js
git commit -m "Add symbolShapes dispatcher wiring shape names to drawers"
```

---

## Task 8: `hangulDecompose.js`

**Files:**
- Create: `src/utils/hangulDecompose.js`
- Test: `src/utils/hangulDecompose.test.js`

**Interfaces:**
- Consumes: nothing (pure function, no dependencies).
- Produces: `decomposeText(text)` returning an array of lines, each line an array of units: `{ type: 'syllable', cho, jung, jong }` (`jong` is `null` or an array of 1–2 jamo strings), `{ type: 'digit', char }`, `{ type: 'special', char }`, `{ type: 'passthrough', char }`. `renderToCanvas.js` (Task 9) consumes this directly.

- [ ] **Step 1: Write the failing tests**

`src/utils/hangulDecompose.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/hangulDecompose.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `hangulDecompose.js`**

```js
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

function decomposeSyllable(char) {
  const code = char.codePointAt(0) - 0xAC00;
  const choIndex = Math.floor(code / (21 * 28));
  const jungIndex = Math.floor((code % (21 * 28)) / 28);
  const jongIndex = code % 28;
  const jongJamo = JONG[jongIndex];
  let jong = null;
  if (jongJamo !== '') {
    jong = DOUBLE_JONG[jongJamo] || [jongJamo];
  }
  return { type: 'syllable', cho: CHO[choIndex], jung: JUNG[jungIndex], jong };
}

function classifyChar(char) {
  const code = char.codePointAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) return decomposeSyllable(char);
  if (char >= '0' && char <= '9') return { type: 'digit', char };
  if (SPECIAL_CHARS.has(char)) return { type: 'special', char };
  return { type: 'passthrough', char };
}

export function decomposeText(text) {
  return text.split('\n').map((line) => Array.from(line).map(classifyChar));
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/utils/hangulDecompose.test.js`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/hangulDecompose.js src/utils/hangulDecompose.test.js
git commit -m "Add pure Hangul decomposition function with double-batchim splitting"
```

---

## Task 9: `renderToCanvas.js`

**Files:**
- Create: `src/utils/renderToCanvas.js`
- Test: `src/utils/renderToCanvas.test.js`

**Interfaces:**
- Consumes: `decomposeText` (Task 8), `drawChoShape`/`drawJungMark`/`drawDigitOrSpecialShape` (Task 7), `symbolMap` (Task 2), `BASE_OPTIONS` (Task 3), `rough` (the `roughjs` package's default export, via `rough.canvas(canvasEl)`).
- Produces: `computeCanvasSize(lines, layoutOptions)` returning `{ width, height }`, and `renderToCanvas(canvasEl, text, layoutOptions)` — the function `ResultCanvas.jsx` (Task 11) calls directly.

- [ ] **Step 1: Write the failing tests**

`src/utils/renderToCanvas.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { computeCanvasSize, renderToCanvas } from './renderToCanvas.js';

vi.mock('roughjs', () => ({
  default: { canvas: () => ({ circle: vi.fn(), path: vi.fn(), polygon: vi.fn(), line: vi.fn(), rectangle: vi.fn() }) },
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
});

// local helper duplicating decomposeText's line-splitting shape, so this
// test file doesn't need to import the real decomposer just to build fixtures
function decomposeLines(strings) {
  return strings.map((s) => Array.from(s).map((char) => ({ type: 'syllable', cho: 'ㄱ', jung: 'ㅏ', jong: null })));
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/utils/renderToCanvas.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `renderToCanvas.js`**

```js
import rough from 'roughjs';
import { decomposeText } from './hangulDecompose.js';
import { drawChoShape, drawJungMark, drawDigitOrSpecialShape } from './symbolShapes.js';
import { BASE_OPTIONS } from './roughOptions.js';

const DEFAULT_LAYOUT = {
  cellSize: 90,      // bounding box per syllable/char cell
  choSize: 60,       // base consonant shape size within a cell
  jongScale: 0.5,    // batchim shrink factor
  cellGap: 14,        // horizontal gap between cells
  lineGap: 24,        // vertical gap between lines
  padding: 24,
  maxWidth: 900,      // wrap once a line would exceed this
};

function wrapLines(lines, layout) {
  const wrapped = [];
  for (const line of lines) {
    let current = [];
    let currentWidth = layout.padding * 2;
    for (const unit of line) {
      const unitWidth = layout.cellSize + layout.cellGap;
      if (currentWidth + unitWidth > layout.maxWidth && current.length > 0) {
        wrapped.push(current);
        current = [];
        currentWidth = layout.padding * 2;
      }
      current.push(unit);
      currentWidth += unitWidth;
    }
    wrapped.push(current);
  }
  return wrapped;
}

export function computeCanvasSize(lines, layoutOverrides = {}) {
  const layout = { ...DEFAULT_LAYOUT, ...layoutOverrides };
  const wrapped = wrapLines(lines, layout);
  const longest = Math.max(1, ...wrapped.map((l) => l.length));
  const width = Math.max(layout.cellSize + layout.padding * 2, longest * (layout.cellSize + layout.cellGap) + layout.padding * 2);
  const height = Math.max(layout.cellSize + layout.padding * 2, wrapped.length * (layout.cellSize + layout.lineGap) + layout.padding * 2);
  return { width, height, wrapped, layout };
}

function drawUnit(rc, ctx, unit, cx, cy, layout) {
  const options = BASE_OPTIONS;
  if (unit.type === 'digit') {
    return drawDigitOrSpecialShape(rc, cx, cy, layout.choSize, unit.__recipe, options);
  }
  if (unit.type === 'special') {
    return drawDigitOrSpecialShape(rc, cx, cy, layout.choSize, unit.__recipe, options);
  }
  if (unit.type === 'passthrough') {
    ctx.font = `${layout.choSize * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = options.stroke;
    ctx.fillText(unit.char, cx, cy);
    return;
  }
  // syllable
  const choRecipe = unit.__choRecipe;
  drawChoShape(rc, cx, cy, layout.choSize, choRecipe, options);
  const box = { cx, cy, r: layout.choSize / 2 };
  if (unit.__jungRecipe) drawJungMark(rc, box, unit.__jungRecipe, options);
  if (unit.jong && unit.__jongRecipes) {
    const jongSize = layout.choSize * layout.jongScale;
    const baseY = cy + layout.choSize * 0.32;
    unit.__jongRecipes.forEach((recipe, i) => {
      const spread = (unit.__jongRecipes.length - 1) * jongSize * 0.5;
      const jx = cx - spread / 2 + i * jongSize * 0.5 + jongSize * 0.4;
      drawChoShape(rc, jx, baseY, jongSize, recipe, options);
    });
  }
}

function attachRecipes(unit, symbolMap) {
  if (unit.type === 'digit') return { ...unit, __recipe: symbolMap.digit[unit.char] };
  if (unit.type === 'special') return { ...unit, __recipe: symbolMap.special[unit.char] };
  if (unit.type === 'passthrough') return unit;
  return {
    ...unit,
    __choRecipe: symbolMap.cho[unit.cho],
    __jungRecipe: symbolMap.jung[unit.jung],
    __jongRecipes: unit.jong ? unit.jong.map((j) => symbolMap.cho[j]) : null,
  };
}

export function renderToCanvas(canvasEl, text, layoutOverrides = {}) {
  const symbolMapModule = renderToCanvas.__symbolMap;
  const lines = decomposeText(text);
  const { width, height, wrapped, layout } = computeCanvasSize(lines, layoutOverrides);

  canvasEl.width = width;
  canvasEl.height = height;
  const ctx = canvasEl.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  const rc = rough.canvas(canvasEl);

  wrapped.forEach((line, lineIndex) => {
    const cy = layout.padding + layout.cellSize / 2 + lineIndex * (layout.cellSize + layout.lineGap);
    line.forEach((rawUnit, cellIndex) => {
      const unit = attachRecipes(rawUnit, symbolMapModule);
      const cx = layout.padding + layout.cellSize / 2 + cellIndex * (layout.cellSize + layout.cellGap);
      drawUnit(rc, ctx, unit, cx, cy, layout);
    });
  });
}
```

- [ ] **Step 4: Wire in the real `symbolMap` and fix the test's mock shape**

Add near the top of `renderToCanvas.js` (after the imports):

```js
import { symbolMap } from '../data/symbolMap.js';
renderToCanvas.__symbolMap = symbolMap;
```

Update the test file's mock so `drawChoShape` etc. don't throw on an undefined recipe: since the test's `decomposeLines` helper fabricates units with real `cho`/`jung` values (`ㄱ`/`ㅏ`) that exist in the real generated `symbolMap.js` from Task 2, `attachRecipes` will find them — no further test changes needed as long as Task 2 ran successfully first.

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/utils/renderToCanvas.test.js`
Expected: PASS (7 tests). If `computeCanvasSize`'s width/height comparisons fail, double check `wrapLines` isn't wrapping the single-char test cases — `maxWidth: 900` with `cellSize: 90` fits ~9 cells before wrapping, which is enough headroom for the test fixtures used here.

- [ ] **Step 6: Commit**

```bash
git add src/utils/renderToCanvas.js src/utils/renderToCanvas.test.js
git commit -m "Add canvas composition: syllable layout, wrapping, dynamic sizing"
```

---

## Task 10: `Header.jsx`, `TextInput.jsx`, `ConvertButton.jsx`

**Files:**
- Create: `src/components/Header.jsx`, `src/components/TextInput.jsx`, `src/components/ConvertButton.jsx`
- Test: `src/components/TextInput.test.jsx`

**Interfaces:**
- Produces: `<Header />` (no props). `<TextInput value, onChange />` (controlled input). `<ConvertButton onClick, disabled />`. `App.jsx` (Task 13) composes all three.

- [ ] **Step 1: Write the failing test for `TextInput`**

`src/components/TextInput.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextInput } from './TextInput.jsx';

describe('TextInput', () => {
  it('shows the placeholder text', () => {
    render(<TextInput value="" onChange={() => {}} />);
    expect(screen.getByPlaceholderText('변환할 텍스트를 입력해주세요')).toBeInTheDocument();
  });

  it('calls onChange with the new value as the user types', async () => {
    const onChange = vi.fn();
    render(<TextInput value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), '안녕');
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)[0]).toBe('안녕'); // last call has the full typed string
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/TextInput.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement all three components**

`src/components/Header.jsx`:

```jsx
export function Header() {
  return (
    <header className="text-center py-8">
      <h1 className="font-title text-4xl text-wingto-text">윙토언어</h1>
      <p className="mt-2 text-sm text-wingto-text/70">텍스트를 나만의 기호로 바꿔보세요</p>
    </header>
  );
}
```

`src/components/TextInput.jsx`:

```jsx
export function TextInput({ value, onChange }) {
  return (
    <textarea
      className="w-full rounded-xl border border-wingto-sky-dark bg-wingto-sky/20 p-4 text-wingto-text outline-none focus:border-wingto-pink-dark"
      rows={3}
      placeholder="변환할 텍스트를 입력해주세요"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

`src/components/ConvertButton.jsx`:

```jsx
export function ConvertButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-wingto-pink-dark px-8 py-3 font-bold text-white transition-colors hover:bg-[#ff9fc4] disabled:opacity-40"
    >
      변환하기
    </button>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/TextInput.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.jsx src/components/TextInput.jsx src/components/ConvertButton.jsx src/components/TextInput.test.jsx
git commit -m "Add Header, TextInput, ConvertButton components"
```

---

## Task 11: `ResultCanvas.jsx`

**Files:**
- Create: `src/components/ResultCanvas.jsx`
- Test: `src/components/ResultCanvas.test.jsx`

**Interfaces:**
- Consumes: `renderToCanvas` from `../utils/renderToCanvas.js`.
- Produces: `<ResultCanvas text, canvasRef />` — `canvasRef` is a ref forwarded up so `DownloadButton.jsx` (Task 12) can call `.toDataURL()` on the same canvas element. Shows the spec's §10 "empty input" guidance message when `text` is blank.

- [ ] **Step 1: Write the failing test**

`src/components/ResultCanvas.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { ResultCanvas } from './ResultCanvas.jsx';

vi.mock('../utils/renderToCanvas.js', () => ({ renderToCanvas: vi.fn() }));

describe('ResultCanvas', () => {
  it('shows a guidance message and no canvas when text is empty', () => {
    render(<ResultCanvas text="" canvasRef={createRef()} />);
    expect(screen.getByText('변환할 텍스트를 입력해주세요')).toBeInTheDocument();
    expect(screen.queryByTestId('result-canvas')).not.toBeInTheDocument();
  });

  it('renders a canvas and calls renderToCanvas when text is present', async () => {
    const { renderToCanvas } = await import('../utils/renderToCanvas.js');
    render(<ResultCanvas text="안녕" canvasRef={createRef()} />);
    expect(screen.getByTestId('result-canvas')).toBeInTheDocument();
    expect(renderToCanvas).toHaveBeenCalled();
    expect(renderToCanvas.mock.calls[0][1]).toBe('안녕');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/components/ResultCanvas.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ResultCanvas.jsx`**

```jsx
import { useEffect } from 'react';
import { renderToCanvas } from '../utils/renderToCanvas.js';

export function ResultCanvas({ text, canvasRef }) {
  useEffect(() => {
    if (text && canvasRef.current) {
      renderToCanvas(canvasRef.current, text);
    }
  }, [text, canvasRef]);

  if (!text) {
    return (
      <div className="rounded-xl bg-wingto-pink/20 p-8 text-center text-wingto-text/60">
        변환할 텍스트를 입력해주세요
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white p-4">
      <canvas data-testid="result-canvas" ref={canvasRef} />
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/components/ResultCanvas.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultCanvas.jsx src/components/ResultCanvas.test.jsx
git commit -m "Add ResultCanvas component with empty-state message"
```

---

## Task 12: `DownloadButton.jsx` + `SymbolGuide.jsx`

**Files:**
- Create: `src/components/DownloadButton.jsx`, `src/components/SymbolGuide.jsx`
- Test: `src/components/DownloadButton.test.jsx`, `src/components/SymbolGuide.test.jsx`

**Interfaces:**
- Consumes: `canvasRef` (from Task 11), `symbolMap` from `../data/symbolMap.js`.
- Produces: `<DownloadButton canvasRef />`, `<SymbolGuide />` — both consumed by `App.jsx` (Task 13).

- [ ] **Step 1: Write the failing tests**

`src/components/DownloadButton.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { DownloadButton } from './DownloadButton.jsx';

describe('DownloadButton', () => {
  it('triggers a download using the canvas data URL when clicked', async () => {
    const canvasRef = createRef();
    canvasRef.current = { toDataURL: vi.fn(() => 'data:image/png;base64,xyz') };
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    render(<DownloadButton canvasRef={canvasRef} />);
    await userEvent.click(screen.getByRole('button', { name: 'PNG 다운로드' }));

    expect(canvasRef.current.toDataURL).toHaveBeenCalledWith('image/png');
    expect(clickSpy).toHaveBeenCalled();
    document.createElement.mockRestore();
  });
});
```

`src/components/SymbolGuide.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SymbolGuide } from './SymbolGuide.jsx';

describe('SymbolGuide', () => {
  it('starts collapsed, showing only the toggle', () => {
    render(<SymbolGuide />);
    expect(screen.queryByText('ㄱ')).not.toBeInTheDocument();
  });

  it('expands to show jamo entries when the toggle is clicked', async () => {
    render(<SymbolGuide />);
    await userEvent.click(screen.getByRole('button', { name: /자모 대응표/ }));
    expect(screen.getByText('ㄱ')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify both fail**

Run: `npx vitest run src/components/DownloadButton.test.jsx src/components/SymbolGuide.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement both components**

`src/components/DownloadButton.jsx`:

```jsx
export function DownloadButton({ canvasRef }) {
  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `wingdian_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-full bg-wingto-sky-dark px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[#8ecde8]"
    >
      PNG 다운로드
    </button>
  );
}
```

`src/components/SymbolGuide.jsx`:

```jsx
import { useState } from 'react';
import { symbolMap } from '../data/symbolMap.js';

const SECTION_LABELS = { cho: '초성/쌍자음', jung: '중성', digit: '숫자', special: '특수문자' };

export function SymbolGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-bold text-wingto-text underline"
      >
        자모 대응표 {open ? '접기' : '펼치기'}
      </button>
      {open && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <div key={key} className="rounded-lg bg-wingto-sky/10 p-3">
              <h3 className="mb-2 text-xs font-bold text-wingto-text/60">{label}</h3>
              <ul className="flex flex-wrap gap-2 text-sm">
                {Object.keys(symbolMap[key]).map((jamo) => (
                  <li key={jamo} className="rounded bg-white px-2 py-1">{jamo}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify both pass**

Run: `npx vitest run src/components/DownloadButton.test.jsx src/components/SymbolGuide.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/DownloadButton.jsx src/components/SymbolGuide.jsx src/components/DownloadButton.test.jsx src/components/SymbolGuide.test.jsx
git commit -m "Add DownloadButton and collapsible SymbolGuide components"
```

---

## Task 13: `App.jsx` assembly

**Files:**
- Modify: `src/App.jsx`
- Test: `src/App.test.jsx`

**Interfaces:**
- Consumes: every component from Tasks 10–12.
- Produces: the full page. Nothing downstream consumes `App.jsx`.

- [ ] **Step 1: Write the failing test**

`src/App.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

describe('App', () => {
  it('renders the title and starts with the empty-state canvas message', () => {
    render(<App />);
    expect(screen.getByText('윙토언어')).toBeInTheDocument();
    expect(screen.getByText('변환할 텍스트를 입력해주세요')).toBeInTheDocument();
  });

  it('typing text and clicking 변환하기 renders the canvas', async () => {
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText('변환할 텍스트를 입력해주세요'), '안녕');
    await userEvent.click(screen.getByRole('button', { name: '변환하기' }));
    expect(screen.getByTestId('result-canvas')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/App.test.jsx`
Expected: FAIL — `App.jsx` still has the Vite starter template content.

- [ ] **Step 3: Implement `App.jsx`**

```jsx
import { useRef, useState } from 'react';
import { Header } from './components/Header.jsx';
import { TextInput } from './components/TextInput.jsx';
import { ConvertButton } from './components/ConvertButton.jsx';
import { ResultCanvas } from './components/ResultCanvas.jsx';
import { DownloadButton } from './components/DownloadButton.jsx';
import { SymbolGuide } from './components/SymbolGuide.jsx';

export default function App() {
  const [draft, setDraft] = useState('');
  const [text, setText] = useState('');
  const canvasRef = useRef(null);

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <Header />
      <div className="flex flex-col gap-4">
        <TextInput value={draft} onChange={setDraft} />
        <div className="flex justify-center">
          <ConvertButton onClick={() => setText(draft)} disabled={!draft.trim()} />
        </div>
        <ResultCanvas text={text} canvasRef={canvasRef} />
        {text && (
          <div className="flex justify-center">
            <DownloadButton canvasRef={canvasRef} />
          </div>
        )}
        <SymbolGuide />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/App.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: every test file from Tasks 2–13 passes.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "Assemble App.jsx: input -> convert -> canvas -> download -> guide"
```

---

## Task 14: Responsive pass + manual QA in the browser

**Files:**
- Modify: `src/index.css` and/or component `className`s as needed for narrow viewports.

**Interfaces:**
- Consumes: the full app from Task 13. No new exports.

- [ ] **Step 1: Start the dev server and open it in a browser at 360px width**

```bash
npm run dev
```

Resize the browser (or use device toolbar) to 360px wide. Confirm the input, buttons, and `SymbolGuide` don't overflow or get clipped horizontally.

- [ ] **Step 2: Confirm the canvas scrolls horizontally instead of overflowing the page**

Type a long string (15+ characters) at 360px width. Confirm `ResultCanvas`'s `overflow-x-auto` wrapper produces a horizontal scrollbar inside the card rather than breaking the page layout. If the canvas instead shrinks/squishes, add `min-width` matching the canvas's natural pixel width to the inner `<canvas>` via an inline style in `ResultCanvas.jsx`.

- [ ] **Step 3: Run through the spec's §10 manual checklist**

In the browser:
1. Click 변환하기 with an empty textarea — confirm the button is disabled (per Task 13's `disabled={!draft.trim()}`) and/or the guidance message shows.
2. Type `Hello 안녕 123?!` and convert — visually confirm English/spaces pass through as literal text, Korean syllables render as symbols, digits render as U/arch-chain shapes, `?`/`!` render as spiral/zigzag.
3. Type `앉다` and `닭` and convert — visually confirm both batchim consonants render side-by-side at reduced size under each syllable (this is the double-batchim path from Task 8/9).

- [ ] **Step 4: Flag the spec's unresolved items to the user for a live check**

With the dev server running and a few test words converted on screen, point the user at:
- The 쌍자음 rendering (e.g., convert "까까") — confirm the center-dot marker matches what they want, or gather the real design if not.
- A word using ㅐ or ㅔ (e.g., "개", "제") — confirm the mark lands on the correct side of the consonant.
- A word using ㅙ or ㅞ (e.g., "왜", "웨") — confirm the combo mark looks right.
- The `?`/`!` rendering — confirm the spiral/zigzag read correctly at actual canvas size (not just the small brainstorm mockups).

Do not silently change these based on your own judgment — get explicit confirmation, since spec §11 already flags them as open.

- [ ] **Step 5: Commit any responsive-CSS fixes made in Steps 1–2**

```bash
git add -A
git commit -m "Responsive pass for mobile widths and horizontal canvas scroll"
```
