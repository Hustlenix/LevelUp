"use client";

const STORAGE_KEY = "levelup-reader-scale";
const SCALES = [0.85, 1, 1.15, 1.3];

export default function ReaderControls() {
  const current = () => {
    const raw = document.documentElement.getAttribute("data-reader-scale");
    const n = raw ? parseFloat(raw) : 1;
    return SCALES.includes(n) ? n : 1;
  };

  const set = (scale: number) => {
    const s = String(scale);
    document.documentElement.setAttribute("data-reader-scale", s);
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* storage unavailable */
    }
  };

  const step = (dir: 1 | -1) => {
    const idx = SCALES.indexOf(current());
    const next = Math.min(SCALES.length - 1, Math.max(0, idx + dir));
    set(SCALES[next]);
  };

  return (
    <div
      className="reader-controls flex items-center gap-1 rounded-full border border-line bg-paper-deep no-print"
      aria-label="Text size controls"
    >
      <button
        onClick={() => step(-1)}
        aria-label="Decrease text size"
        title="Decrease text size"
        className="reader-btn-minus flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold text-ink-soft transition-colors hover:text-gold"
      >
        A−
      </button>
      <span className="reader-scale-label min-w-10 text-center font-display text-[11px] font-semibold text-ink-faint" />
      <button
        onClick={() => step(1)}
        aria-label="Increase text size"
        title="Increase text size"
        className="reader-btn-plus flex h-8 w-8 items-center justify-center rounded-full font-display text-base font-bold text-ink-soft transition-colors hover:text-gold"
      >
        A+
      </button>
    </div>
  );
}