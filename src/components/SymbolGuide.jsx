import { useState } from 'react';
import { symbolMap } from '../data/symbolMap.js';
import { SymbolPreview } from './SymbolPreview.jsx';

const SECTION_LABELS = { cho: '초성/쌍자음', jung: '중성', digit: '숫자', special: '특수문자' };

export function SymbolGuide({ strokeColor, fillConsonants, consonantFillColor }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="forest-card overflow-hidden" aria-labelledby="guide-title">
      <div className="border-b border-wingto-sage/15 bg-wingto-sky/30 px-4 py-4 sm:px-5">
        <h2 id="guide-title" className="forest-panel-title">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-wingto-sky text-xs font-bold text-wingto-sage-dark" aria-hidden="true">ㄱ</span>
          자모 대응표
        </h2>
        <p className="mt-1 text-xs text-wingto-moss/76">한글 자모와 윙토언어 기호의 대응을 확인할 수 있어요.</p>
      </div>

      <div className="p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="forest-lift flex w-full items-center justify-between rounded-2xl border border-wingto-sage/18 bg-wingto-sky/35 px-4 py-3 text-left text-sm font-bold text-wingto-moss"
          aria-expanded={open}
        >
          <span>자모 대응표 {open ? '접기' : '살펴보기'}</span>
          <span className="text-lg text-wingto-sage-dark" aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {open && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Object.entries(SECTION_LABELS).map(([key, label]) => (
              <div key={key} className="rounded-2xl border border-wingto-sage/13 bg-wingto-cream/55 p-3.5">
                <h3 className="mb-3 font-title text-sm text-wingto-sage-dark">{label}</h3>
                <ul className="flex flex-wrap gap-2.5 text-sm">
                  {Object.entries(symbolMap[key]).map(([jamo, recipe]) => (
                    <li key={jamo} className="flex min-w-[3.7rem] flex-col items-center gap-1 rounded-xl bg-white px-2 py-2 text-wingto-moss shadow-sm">
                      <SymbolPreview
                        category={key}
                        recipe={recipe}
                        strokeColor={strokeColor}
                        fillConsonants={fillConsonants}
                        consonantFillColor={consonantFillColor}
                      />
                      <span className="text-xs font-semibold">{jamo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
