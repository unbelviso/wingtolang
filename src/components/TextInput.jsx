import { useState } from 'react';

const STEPS = [
  ['1', '한글 입력', '바꾸고 싶은 글을 입력해요.'],
  ['2', '꾸미기 설정', '배경·기호 색·자음 채움을 골라요.'],
  ['3', '번역 결과 확인', '생성된 기호를 살펴봐요.'],
  ['4', 'PNG 저장', '필요할 때 이미지로 받아요.'],
];

export function TextInput({ value, onChange, recommendedSyllables = 7 }) {
  const characterCount = Array.from(value).length;
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="forest-card p-4 sm:p-5" aria-labelledby="input-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 id="input-title" className="forest-panel-title">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-wingto-sage/15 text-xs text-wingto-sage-dark" aria-hidden="true">1</span>
            한글 입력
          </h2>
          <p className="mt-1 text-xs text-wingto-moss/78">한글, 단자음·단모음, 숫자와 !, ?를 입력할 수 있어요.</p>
        </div>
        <div className="shrink-0 rounded-xl bg-wingto-cream px-2.5 py-1.5 text-right text-xs font-medium text-wingto-moss/78" aria-live="polite">
          <p>{characterCount}자 입력됨</p>
          <p className="mt-0.5 text-[10px] font-semibold text-wingto-sage-dark">한 줄에 약 {recommendedSyllables}글자씩 보여요</p>
        </div>
      </div>

      <textarea
        className="min-h-36 w-full resize-y rounded-2xl border border-wingto-sage/25 bg-white/85 px-4 py-3.5 text-base leading-7 text-wingto-moss shadow-inner shadow-wingto-sage/5 transition-colors placeholder:text-wingto-moss/58 focus:border-wingto-sage focus:bg-white focus:outline-none sm:min-h-40"
        rows={4}
        placeholder="윙토언어로 전하고 싶은 말을 입력해주세요."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="mt-3 border-t border-wingto-sage/15 pt-3">
        <button
          type="button"
          onClick={() => setHelpOpen((open) => !open)}
          className="flex w-full items-center justify-between rounded-xl bg-wingto-cream/55 px-3 py-2 text-left text-xs font-bold text-wingto-moss transition-colors hover:bg-wingto-cream"
          aria-expanded={helpOpen}
        >
          <span>도움말 {helpOpen ? '접기' : '펼치기'}</span>
          <span className="text-base text-wingto-sage-dark" aria-hidden="true">{helpOpen ? '−' : '+'}</span>
        </button>

        {helpOpen && (
          <ol className="mt-3 grid gap-2 sm:grid-cols-2">
            {STEPS.map(([number, title, description]) => (
              <li key={number} className="rounded-xl border border-wingto-sage/13 bg-white/60 p-2.5">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-wingto-sage/15 text-[10px] font-bold text-wingto-sage-dark">{number}</span>
                <p className="mt-1 text-xs font-bold text-wingto-moss">{title}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-wingto-moss/72">{description}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
