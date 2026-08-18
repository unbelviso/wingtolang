export function ConvertButton({ onClick, disabled, loading = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-wingto-moss px-8 py-3 text-[15px] font-extrabold tracking-[0.01em] text-white shadow-[0_8px_0_rgba(45,64,50,0.28)] ring-1 ring-white/25 transition-all duration-150 hover:-translate-y-px hover:bg-[#294333] hover:shadow-[0_10px_0_rgba(45,64,50,0.24)] active:translate-y-px active:shadow-[0_5px_0_rgba(45,64,50,0.24)] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-50"
      aria-busy={loading}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          시간이 멈추는 중...
        </>
      ) : (
        '번역하기'
      )}
    </button>
  );
}
