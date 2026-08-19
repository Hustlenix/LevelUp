"use client";

const STORAGE_KEY = "levelup-reader-scale";
const SCALES = [0.85, 1, 1.15, 1.3];
const LH_PRESETS = ["tight", "normal", "airy"];
const FONT_FAMILIES = ["source", "serif"];
const CONTRAST_KEY = "levelup-reader-contrast";

export default function ReaderControls() {
  const currentScale = () => {
    const raw = document.documentElement.getAttribute("data-reader-scale");
    const n = raw ? parseFloat(raw) : 1;
    return SCALES.includes(n) ? n : 1;
  };
  const setScale = (scale: number) => {
    const s = String(scale);
    document.documentElement.setAttribute("data-reader-scale", s);
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
    } catch {
      /* storage unavailable */
    }
  };
  const currentLh = (): string => {
    return document.documentElement.getAttribute("data-reader-lh") || "normal";
  };
  const setLh = (lh: string) => {
    const valid = LH_PRESETS.includes(lh) ? lh : "normal";
    document.documentElement.setAttribute("data-reader-lh", valid);
    try {
      window.localStorage.setItem("levelup-reader-lh", valid);
    } catch {
      /* storage unavailable */
    };
  };
  const currentFont = (): string => {
    return document.documentElement.getAttribute("data-reader-font") || "source";
  };
  const setFont = (font: string) => {
    const valid = FONT_FAMILIES.includes(font) ? font : "source";
    document.documentElement.setAttribute("data-reader-font", valid);
    try {
      window.localStorage.setItem("levelup-reader-font", valid);
    } catch {
      /* storage unavailable */
    };
  };
  const currentContrast = (): boolean => {
    const raw = document.documentElement.getAttribute("data-contrast");
    return raw === "high";
  };
  const setContrast = (on: boolean) => {
    if (on) {
      document.documentElement.setAttribute("data-contrast", "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
    try {
      window.localStorage.setItem(CONTRAST_KEY, String(on));
    } catch {
      /* storage unavailable */
    }
  };

  // initialise from storage on mount
  useEffect(() => {
    setScale(currentScale());
    setLh(currentLh());
    setFont(currentFont());
    setContrast(currentContrast());
  }, []);

  return (
    <div
      className="reader-controls flex items-center gap-1 rounded-full border border-line bg-paper-deep no-print"
      aria-label="Text size controls"
    >
      <div
        className="relative group"
        onClick={() =>
          setOpen((o: boolean) => !o)
        }
      >
        <button
          onClick={() => setScale((prev) => {
            const idx = SCALES.indexOf(prev);
            const next = Math.min(SCALES.length - 1, Math.max(0, idx + 1));
            return SCALES[next];
          })}
          aria-label="Decrease text size"
          title="Decrease text size"
          className="reader-btn-minus flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold text-ink-soft transition-colors hover:text-gold"
        >
          A−
        </button>
        <span className="reader-scale-label min-w-10 text-center font-display text-[11px] font-semibold text-ink-faint">
          {currentScale()}x
        </span>
        <button
          onClick={() => setScale((prev) => {
            const idx = SCALES.indexOf(prev);
            const next = Math.max(0, Math.min(SCALES.length - 1, idx - 1));
            return SCALES[next];
          })}
          aria-label="Increase text size"
          title="Increase text size"
          className="reader-btn-plus flex h-8 w-8 items-center justify-center rounded-full font-display text-base font-bold text-ink-soft transition-colors hover:text-gold"
        >
          A+
        </button>
      </div>

      {/* Line height preset popover */}
      <div
        id="lh-popover"
        className="absolute right-2 w-24 rounded-xl border border-line bg-paper-deep shadow-sm mt-2 group-hover:mt-0 z-10 max-h-[200px] overflow-y-auto"
        role="dialog"
        aria-label="Line height preset"
      >
        <div className="p-2 text-xs text-ink-faint">Line height</div>
        <div className="p-1">
          {LH_PRESETS.map((lh, i) => (
            <button
              key={lh}
              onClick={() => setLh(lh)}
              className={`w-full rounded-md px-2 py-1.5 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-paper-deep ${
                currentLh() === lh ? "bg-paper" : ""
              }`}
            >
              {lh === "tight" ? "Tight" : lh === "normal" ? "Normal" : "Airy"}
            </button>
          ))}
        </div>
      </div>

      {/* Font family popover */}
      <div
        id="font-popover"
        className="absolute right-24 w-24 rounded-xl border border-line bg-paper-deep shadow-sm mt-2 group-hover:mt-0 z-10 max-h-[180px] overflow-y-auto"
        role="dialog"
        aria-label="Font family"
      >
        <div className="p-2 text-xs text-ink-faint">Font</div>
        <div className="p-1">
          {FONT_FAMILIES.map((font, i) => (
            <button
              key={font}
              onClick={() => setFont(font)}
              className={`w-full rounded-md px-2 py-1.5 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-paper-deep ${
                currentFont() === font ? "bg-paper" : ""
              }`}
            >
              {font === "source" ? "Source" : "Serif"}
            </button>
          ))}
        </div>
      </div>

      {/* High contrast toggle */}
      <div
        id="contrast-toggle"
        className="absolute right-48 w-20 rounded-xl border border-line bg-paper-deep shadow-sm mt-2 group-hover:mt-0 z-10 py-1"
        role="switch"
        aria-checked={currentContrast()}
        aria-label="High contrast mode"
      >
        <button
          onClick={() => setContrast(!currentContrast())}
          className="w-full rounded-md px-2 py-1.5 text-[10px] font-semibold text-ink-soft transition-colors hover:bg-paper-deep"
        >
          {currentContrast() ? "High contrast On" : "High contrast Off"}
        </button>
      </div>
    </div>
  );
}