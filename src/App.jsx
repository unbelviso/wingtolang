import { useRef, useState } from 'react';
import { Header } from './components/Header.jsx';
import { TextInput } from './components/TextInput.jsx';
import { ConvertButton } from './components/ConvertButton.jsx';
import { ResultCanvas } from './components/ResultCanvas.jsx';
import { DownloadButton } from './components/DownloadButton.jsx';
import { SymbolGuide } from './components/SymbolGuide.jsx';
import { BackgroundSettings } from './components/BackgroundSettings.jsx';
import { DEFAULT_BACKGROUND, TINT_COLORS } from './utils/backgroundStyles.js';
import { BASE_OPTIONS } from './utils/roughOptions.js';
import { estimateSyllablesPerLine } from './utils/renderToCanvas.js';
import { GUIDE_RESULT_LAYOUT } from './utils/vowelLayout.js';

export default function App() {
  const [draft, setDraft] = useState('');
  const [text, setText] = useState('');
  const [background, setBackground] = useState(DEFAULT_BACKGROUND);
  const [customBackgroundColor, setCustomBackgroundColor] = useState('#FFF7DF');
  const [tint, setTint] = useState(TINT_COLORS[0]);
  const [strokeColor, setStrokeColor] = useState(BASE_OPTIONS.stroke);
  const [symbolScale, setSymbolScale] = useState(100);
  // Same-word symbols begin at a closer, notebook-like tracking value.
  // Word spaces still use their own wider advance in the renderer.
  const [letterSpacing, setLetterSpacing] = useState(20);
  const [lineSpacing, setLineSpacing] = useState(20);
  const [strokeWidth, setStrokeWidth] = useState(BASE_OPTIONS.strokeWidth);
  const [outputWidth, setOutputWidth] = useState(720);
  const [fillConsonants, setFillConsonants] = useState(false);
  const [consonantFillColor, setConsonantFillColor] = useState('#F9E296');
  const [isConverting, setIsConverting] = useState(false);
  const canvasRef = useRef(null);
  const recommendedSyllables = estimateSyllablesPerLine(GUIDE_RESULT_LAYOUT, {
    symbolScale: symbolScale / 100,
    letterSpacing,
    outputWidth,
  });

  function handleConvert() {
    if (!draft.trim() || isConverting) return;
    setText(draft);
    setIsConverting(true);
    window.setTimeout(() => setIsConverting(false), 380);
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <span className="forest-leaf left-[2%] top-44 hidden -rotate-[65deg] opacity-30 lg:block" aria-hidden="true" />
      <span className="forest-leaf right-[4%] top-[28rem] hidden rotate-[35deg] bg-wingto-sky-dark opacity-35 lg:block" aria-hidden="true" />
      <span className="forest-flower bottom-52 left-[8%] hidden text-wingto-butter opacity-80 lg:block" aria-hidden="true" />

      <main className="relative mx-auto max-w-3xl px-4 pb-12 sm:px-6 sm:pb-16" aria-label="윙토언어 변환 도구">
        <Header />
        <div className="flex flex-col gap-4 sm:gap-5">
          <TextInput
            value={draft}
            onChange={setDraft}
            recommendedSyllables={recommendedSyllables}
          />

          <div className="flex flex-col items-center py-1">
            <ConvertButton onClick={handleConvert} disabled={!draft.trim()} loading={isConverting} />
          </div>

          <BackgroundSettings
            background={background}
            onBackgroundChange={setBackground}
            customBackgroundColor={customBackgroundColor}
            onCustomBackgroundColorChange={setCustomBackgroundColor}
            tint={tint}
            onTintChange={setTint}
            strokeColor={strokeColor}
            onStrokeColorChange={setStrokeColor}
            symbolScale={symbolScale}
            onSymbolScaleChange={setSymbolScale}
            letterSpacing={letterSpacing}
            onLetterSpacingChange={setLetterSpacing}
            lineSpacing={lineSpacing}
            onLineSpacingChange={setLineSpacing}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            outputWidth={outputWidth}
            onOutputWidthChange={setOutputWidth}
            recommendedSyllables={recommendedSyllables}
            fillConsonants={fillConsonants}
            onFillConsonantsChange={setFillConsonants}
            consonantFillColor={consonantFillColor}
            onConsonantFillColorChange={setConsonantFillColor}
          />

          <ResultCanvas
            text={text}
            canvasRef={canvasRef}
            background={background}
            customBackgroundColor={customBackgroundColor}
            tint={tint}
            strokeColor={strokeColor}
            symbolScale={symbolScale / 100}
            letterSpacing={letterSpacing}
            lineSpacing={lineSpacing}
            strokeWidth={strokeWidth}
            outputWidth={outputWidth}
            fillConsonants={fillConsonants}
            consonantFillColor={consonantFillColor}
          />

          <div className="forest-card flex justify-center px-4 py-4 sm:py-5">
            <DownloadButton canvasRef={canvasRef} disabled={!text} />
          </div>

          <SymbolGuide
            strokeColor={strokeColor}
            fillConsonants={fillConsonants}
            consonantFillColor={consonantFillColor}
          />
        </div>
      </main>

      <footer className="relative border-t border-wingto-sage/15 bg-wingto-sage/10 px-4 py-7 text-center text-xs leading-6 text-wingto-moss/72 sm:py-8">
        <span className="forest-leaf left-[10%] top-5 hidden scale-75 opacity-45 sm:block" aria-hidden="true" />
        <span className="forest-leaf right-[11%] top-8 hidden scale-75 rotate-[55deg] bg-wingto-sky-dark opacity-45 sm:block" aria-hidden="true" />
        <p>이곳은 윙토언어 팬 사이트로, 원작자 홍학순 작가님이 응원해주십니다.</p>
        <p>본 사이트는 비상업적 목적으로 운영됩니다.</p>
        <p className="mt-1 font-medium">윙토언어 © 홍학순 (winktokki.com) All rights reserved.</p>
      </footer>
    </div>
  );
}
