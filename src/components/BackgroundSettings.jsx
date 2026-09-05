import { BACKGROUND_STYLES, TINT_COLORS } from '../utils/backgroundStyles.js';
import { useEffect, useState } from 'react';

const TRANSPARENT_SWATCH_STYLE = {
  backgroundImage:
    'linear-gradient(45deg, #c9d0c7 25%, transparent 25%), linear-gradient(-45deg, #c9d0c7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #c9d0c7 75%), linear-gradient(-45deg, transparent 75%, #c9d0c7 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
};

const TINT_NAMES = {
  '#FFE1EC': '복숭아 분홍',
  '#DCF0FA': '하늘빛',
  '#FFB3D1': '장밋빛',
  '#A8DDF0': '맑은 파랑',
};

const CONSONANT_FILL_COLORS = ['#F9E296', '#F6C7A9', '#BBDAB9', '#B8DEEB', '#FFF7DF'];
const CONSONANT_FILL_NAMES = {
  '#F9E296': '버터 노랑',
  '#F6C7A9': '살구빛',
  '#BBDAB9': '새싹 초록',
  '#B8DEEB': '하늘빛',
  '#FFF7DF': '크림빛',
};

function SwatchButton({ label, selected, onClick, style }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={`relative h-9 w-9 rounded-full border-2 shadow-sm transition-transform ${selected ? 'scale-110 border-wingto-sage-dark ring-2 ring-wingto-sage/25' : 'border-white hover:scale-105'}`}
      style={style}
    >
      {selected && (
        <span className="absolute inset-0 grid place-items-center text-sm font-black text-wingto-moss drop-shadow-sm" aria-hidden="true">✓</span>
      )}
    </button>
  );
}

function ToggleButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${selected ? 'border-wingto-sage-dark bg-wingto-sage text-white shadow-sm' : 'border-[#A8872A]/30 bg-wingto-cream/55 text-wingto-moss hover:bg-wingto-cream'}`}
    >
      {children}
    </button>
  );
}

function RangeControl({ label, value, min, max, step, suffix, onChange, helpText }) {
  const [typedValue, setTypedValue] = useState(String(value));

  useEffect(() => {
    setTypedValue(String(value));
  }, [value]);

  function commitTypedValue() {
    const parsed = Number(typedValue);
    if (!Number.isFinite(parsed)) {
      setTypedValue(String(value));
      return;
    }

    const lower = Number(min);
    const upper = Number(max);
    const increment = Number(step);
    const clamped = Math.min(upper, Math.max(lower, parsed));
    const snapped = lower + Math.round((clamped - lower) / increment) * increment;
    const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    onChange(Number(snapped.toFixed(decimals)));
  }

  return (
    <div className="rounded-xl border border-wingto-sage/20 bg-white/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-xs font-bold text-wingto-moss">
        <label htmlFor={`${label}-number`}>{label}</label>
        <span className="flex items-center gap-1 rounded-full bg-wingto-cream/80 px-2 py-0.5 text-[11px] text-wingto-sage-dark">
          <input
            id={`${label}-number`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={typedValue}
            onChange={(event) => setTypedValue(event.target.value)}
            onBlur={commitTypedValue}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            aria-label={`${label} 직접 입력`}
            className="w-14 bg-transparent text-right font-semibold tabular-nums outline-none"
          />
          <span>{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
        className="mt-2 h-2 w-full cursor-pointer accent-wingto-sage-dark"
      />
      {helpText && <p className="mt-2 text-[10px] leading-4 text-wingto-moss/90">{helpText}</p>}
    </div>
  );
}

export function BackgroundSettings({
  background,
  onBackgroundChange,
  customBackgroundColor,
  onCustomBackgroundColorChange,
  tint,
  onTintChange,
  strokeColor,
  onStrokeColorChange,
  symbolScale,
  onSymbolScaleChange,
  letterSpacing,
  onLetterSpacingChange,
  lineSpacing,
  onLineSpacingChange,
  strokeWidth,
  onStrokeWidthChange,
  outputWidth,
  onOutputWidthChange,
  recommendedSyllables,
  fillConsonants,
  onFillConsonantsChange,
  consonantFillColor,
  onConsonantFillColorChange,
}) {
  const showTint = BACKGROUND_STYLES[background]?.usesTint;

  return (
    <section className="forest-card p-4 sm:p-5" aria-labelledby="settings-title">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wingto-sky text-xs font-bold text-wingto-sage-dark" aria-hidden="true">2</span>
        <div>
          <h2 id="settings-title" className="forest-panel-title">꾸미기 설정</h2>
          <p className="mt-1 text-xs leading-5 text-wingto-moss/90">배경, 기호 색, 자음 내부 채움을 골라 결과를 꾸며요.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.15fr_1fr]">
        <fieldset>
          <legend className="mb-2 text-sm font-bold text-wingto-moss">결과 배경</legend>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(BACKGROUND_STYLES).map(([id, style]) => (
              <div key={id} className="flex flex-col items-center gap-1">
                {id === 'custom' ? (
                  <div className={`relative rounded-full transition-transform ${background === 'custom' ? 'scale-110 ring-2 ring-wingto-sage/25' : 'hover:scale-105'}`}>
                    <input
                      type="color"
                      value={customBackgroundColor}
                      onClick={() => onBackgroundChange('custom')}
                      onChange={(event) => {
                        onCustomBackgroundColorChange(event.target.value);
                        onBackgroundChange('custom');
                      }}
                      aria-label="직접 색 배경 — 색을 골라 배경으로 적용해요"
                      aria-pressed={background === 'custom'}
                      className={`h-9 w-9 cursor-pointer rounded-full border-2 bg-transparent p-0.5 shadow-sm ${background === 'custom' ? 'border-wingto-sage-dark' : 'border-white'}`}
                    />
                    {background === 'custom' && (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-black text-wingto-moss drop-shadow-sm" aria-hidden="true">✓</span>
                    )}
                  </div>
                ) : (
                  <SwatchButton
                    label={style.label}
                    selected={background === id}
                    onClick={() => onBackgroundChange(id)}
                    style={style.preview ? { backgroundColor: style.preview } : TRANSPARENT_SWATCH_STYLE}
                  />
                )}
                <span className="text-[10px] font-medium text-wingto-moss/90">{style.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-wingto-moss/90">
            '직접 색'을 누르면 원하는 색을 골라 배경으로 쓸 수 있어요. 고른 색은 PNG에도 그대로 저장돼요.
          </p>
        </fieldset>

        <div className="space-y-4 border-t border-[#A8872A]/20 pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          {showTint && (
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-wingto-moss">무늬 색</legend>
              <div className="flex flex-wrap gap-2.5">
                {TINT_COLORS.map((color) => (
                  <SwatchButton
                    key={color}
                    label={TINT_NAMES[color] || color}
                    selected={tint === color}
                    onClick={() => onTintChange(color)}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-bold text-wingto-moss">윙토언어 색 선택</span>
              <span className="mt-0.5 block text-xs text-wingto-moss/90">선의 색상을 변경해요.</span>
            </span>
            <input
              type="color"
              value={strokeColor}
              onChange={(event) => onStrokeColorChange(event.target.value)}
              aria-label="윙토언어 색 선택"
              className="h-10 w-10 cursor-pointer rounded-full border-2 border-white bg-transparent p-0.5 shadow-sm"
            />
          </label>
        </div>
      </div>

      <fieldset className="mt-5 border-t border-[#A8872A]/20 pt-4">
        <legend className="text-sm font-bold text-wingto-moss">윙토언어 모양 조절</legend>
        <p className="mt-1 text-xs leading-5 text-wingto-moss/90">윙토언어의 스타일을 변경할 수 있어요.</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <RangeControl
            label="윙토언어 크기"
            value={symbolScale}
            suffix="%"
            min="20"
            max="220"
            step="5"
            onChange={onSymbolScaleChange}
          />
          <RangeControl
            label="자간 조절"
            value={letterSpacing}
            suffix="px"
            min="-160"
            max="240"
            step="4"
            onChange={onLetterSpacingChange}
          />
          <RangeControl
            label="줄 간격"
            value={lineSpacing}
            suffix="px"
            min="-80"
            max="240"
            step="4"
            onChange={onLineSpacingChange}
          />
          <RangeControl
            label="선 두께"
            value={strokeWidth}
            suffix="px"
            min="0.6"
            max="6"
            step="0.2"
            onChange={onStrokeWidthChange}
          />
          <RangeControl
            label="PNG 가로 너비"
            value={outputWidth}
            suffix="px"
            min="280"
            max="2400"
            step="20"
            onChange={onOutputWidthChange}
            helpText={`이 너비면 한 줄에 약 ${recommendedSyllables}글자가 보이고, 더 길어지면 다음 줄로 이어져요.`}
          />
        </div>
      </fieldset>

      <fieldset className="mt-5 border-t border-[#A8872A]/20 pt-4">
        <legend className="text-sm font-bold text-wingto-moss">자음 내부 채우기</legend>
        <p className="mt-1 text-xs leading-5 text-wingto-moss/90">기본은 빈 형태예요. 채우면 ㅇ·ㅋ·ㅌ·ㅍ·ㅎ을 포함한 자음 본체에만 색이 들어가요.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ToggleButton selected={!fillConsonants} onClick={() => onFillConsonantsChange(false)}>비우기</ToggleButton>
          <ToggleButton selected={fillConsonants} onClick={() => onFillConsonantsChange(true)}>채우기</ToggleButton>
        </div>

        {fillConsonants && (
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold text-wingto-moss/90">채움 색 팔레트</p>
              <div className="flex flex-wrap gap-2.5">
                {CONSONANT_FILL_COLORS.map((color) => (
                  <SwatchButton
                    key={color}
                    label={CONSONANT_FILL_NAMES[color]}
                    selected={consonantFillColor === color}
                    onClick={() => onConsonantFillColorChange(color)}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 rounded-xl bg-wingto-cream/50 px-2.5 py-1.5 text-xs font-semibold text-wingto-moss">
              직접 선택
              <input
                type="color"
                value={consonantFillColor}
                onChange={(event) => onConsonantFillColorChange(event.target.value)}
                aria-label="자음 내부 채움 색 선택"
                className="h-8 w-8 cursor-pointer rounded-full border-2 border-white bg-transparent p-0.5 shadow-sm"
              />
            </label>
          </div>
        )}
      </fieldset>
    </section>
  );
}
