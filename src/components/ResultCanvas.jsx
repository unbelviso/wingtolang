import { useEffect } from 'react';
import { renderToCanvas } from '../utils/renderToCanvas.js';
import { GUIDE_RESULT_LAYOUT } from '../utils/vowelLayout.js';

const TRANSPARENT_BACKDROP_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, rgba(117,142,116,.15) 25%, transparent 25%), linear-gradient(-45deg, rgba(117,142,116,.15) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(117,142,116,.15) 75%), linear-gradient(-45deg, transparent 75%, rgba(117,142,116,.15) 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
};

export function ResultCanvas({
  text,
  canvasRef,
  background = 'transparent',
  customBackgroundColor,
  tint,
  strokeColor,
  symbolScale,
  letterSpacing,
  lineSpacing,
  strokeWidth,
  outputWidth,
  fillConsonants,
  consonantFillColor,
}) {
  useEffect(() => {
    if (text && canvasRef.current) {
      renderToCanvas(canvasRef.current, text, GUIDE_RESULT_LAYOUT, {
        background,
        customBackgroundColor,
        tint,
        strokeColor,
        symbolScale,
        letterSpacing,
        lineSpacing,
        strokeWidth,
        outputWidth,
        fillConsonants,
        consonantFillColor,
      });
    }
  }, [text, canvasRef, background, customBackgroundColor, tint, strokeColor, symbolScale, letterSpacing, lineSpacing, strokeWidth, outputWidth, fillConsonants, consonantFillColor]);

  return (
    <section className="forest-card overflow-hidden" aria-labelledby="result-title">
      <div className="flex items-start justify-between gap-4 border-b border-wingto-sage/30 bg-[#D6E1BE] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wingto-butter text-xs font-bold text-wingto-sage-dark" aria-hidden="true">3</span>
          <div>
            <h2 id="result-title" className="forest-panel-title">번역 결과</h2>
            <p className="mt-1 text-xs text-wingto-moss/76">투명 배경도 바로 확인하고 PNG로 저장할 수 있어요.</p>
          </div>
        </div>
        {text && <span className="rounded-full bg-white/65 px-2.5 py-1 text-[11px] font-semibold text-wingto-sage-dark">준비 완료</span>}
      </div>

      {text ? (
        <div
          className="forest-scroll overflow-x-auto p-4 sm:p-5"
          style={background === 'transparent' ? TRANSPARENT_BACKDROP_STYLE : { backgroundColor: background === 'custom' ? customBackgroundColor : '#F7F3EA' }}
        >
          <div className="min-w-max rounded-2xl bg-wingto-cream/45 p-2">
            <canvas data-testid="result-canvas" ref={canvasRef} className="block max-w-none" />
          </div>
        </div>
      ) : (
        <div className="grid min-h-60 place-items-center bg-wingto-cream/45 px-5 text-center">
          <div className="max-w-xs">
            <div className="relative mx-auto mb-4 h-16 w-20" aria-hidden="true">
              <span className="absolute bottom-1 left-1 h-9 w-12 rounded-full bg-wingto-sky/80" />
              <span className="absolute bottom-1 right-0 h-11 w-14 rounded-full bg-wingto-sky/70" />
              <span className="absolute left-7 top-0 text-2xl text-wingto-butter">✦</span>
              <span className="forest-leaf bottom-0 right-1 rotate-45" />
            </div>
            <p className="font-title text-lg text-wingto-moss">아직 빈 공간이에요.</p>
            <p className="mt-2 text-sm leading-6 text-wingto-moss/76">입력창에 한글을 입력하고 '번역하기'를 눌러보세요.</p>
          </div>
        </div>
      )}
    </section>
  );
}
