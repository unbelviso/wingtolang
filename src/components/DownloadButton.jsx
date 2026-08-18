export function DownloadButton({ canvasRef, disabled = false }) {
  function handleDownload() {
    if (!canvasRef.current || disabled) return;
    const link = document.createElement('a');
    link.download = `wingdian_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={handleDownload}
        disabled={disabled}
        className="forest-lift inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-wingto-sky-dark px-6 py-2.5 text-sm font-bold text-white shadow-[0_7px_0_rgba(73,139,148,0.16)] transition-colors hover:bg-[#5aa5af] disabled:cursor-not-allowed disabled:bg-wingto-sky-dark/45 disabled:shadow-none"
      >
        <span className="text-base" aria-hidden="true">↓</span>
        PNG 다운로드
      </button>
    </div>
  );
}
