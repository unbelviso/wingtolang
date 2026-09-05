const STEPS = [
  ['1', '한글 입력', '바꾸고 싶은 글을 입력해요.'],
  ['2', '꾸미기 설정', '배경·기호 색·자음 채움을 골라요.'],
  ['3', '번역 결과 확인', '생성된 기호를 살펴봐요.'],
  ['4', 'PNG 저장', '필요할 때 이미지로 받아요.'],
];

export function HelpGuide() {
  return (
    <section className="forest-card overflow-hidden" aria-labelledby="help-title">
      <div className="border-b border-wingto-sage/15 bg-wingto-cream/65 px-4 py-4 sm:px-5">
        <h2 id="help-title" className="forest-panel-title">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-wingto-pink text-xs font-bold text-wingto-peach-dark" aria-hidden="true">?</span>
          도움말
        </h2>
        <p className="mt-1 text-xs text-wingto-moss/90">처음 사용하는 분도 순서대로 따라 할 수 있어요.</p>
      </div>

      <ol className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        {STEPS.map(([number, title, description]) => (
          <li key={number} className="rounded-2xl border border-wingto-sage/13 bg-white/65 p-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-wingto-sage/15 text-xs font-bold text-wingto-sage-dark">{number}</span>
            <p className="mt-2 text-sm font-bold text-wingto-moss">{title}</p>
            <p className="mt-1 text-xs leading-5 text-wingto-moss/90">{description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
