"use client";

import { useEffect, useRef, useState } from "react";

const SCALE_KEY = "levelup-reader-scale";
const LH_KEY = "levelup-reader-lh";
const FONT_KEY = "levelup-reader-font";
const CONTRAST_KEY = "levelup-reader-contrast";

const SCALES = [0.85, 1, 1.15, 1.3];
const LH_PRESETS = ["tight", "normal", "airy"] as const;
const FONT_FAMILIES = ["source", "serif"] as const;

type LhId = (typeof LH_PRESETS)[number];
type FontId = (typeof FONT_FAMILIES)[number];

function readAttr(name: string): string | null {
  return typeof document === "undefined"
    ? null
    : document.documentElement.getAttribute(name);
}

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeAttr(name: string, value: string): void {
  document.documentElement.setAttribute(name, value);
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function parseScale(raw: string | null): number {
  const n = raw ? parseFloat(raw) : 1;
  return SCALES.includes(n) ? n : 1;
}

export default function ReaderControls() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentScale = () => parseScale(readAttr("data-reader-scale") ?? readStorage(SCALE_KEY));
  const currentLh = (): LhId => {
    const v = readAttr("data-reader-lh") ?? readStorage(LH_KEY) ?? "normal";
    return (LH_PRESETS as readonly string[]).includes(v) ? (v as LhId) : "normal";
  };
  const currentFont = (): FontId => {
    const v = readAttr("data-reader-font") ?? readStorage(FONT_KEY) ?? "source";
    return (FONT_FAMILIES as readonly string[]).includes(v) ? (v as FontId) : "source";
  };
  const currentContrast = (): boolean =>
    (readAttr("data-contrast") ?? readStorage(CONTRAST_KEY)) === "high";

  const applyScale = (scale: number) => {
    const s = String(scale);
    writeAttr("data-reader-scale", s);
    writeStorage(SCALE_KEY, s);
  };
  const applyLh = (lh: LhId) => {
    writeAttr("data-reader-lh", lh);
    writeStorage(LH_KEY, lh);
  };
  const applyFont = (font: FontId) => {
    writeAttr("data-reader-font", font);
    writeStorage(FONT_KEY, font);
  };
  const applyContrast = (on: boolean) => {
    if (on) {
      writeAttr("data-contrast", "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
    writeStorage(CONTRAST_KEY, String(on));
  };

  const step = (dir: 1 | -1) => {
    const idx = SCALES.indexOf(currentScale());
    const next = Math.min(SCALES.length - 1, Math.max(0, idx + dir));
    applyScale(SCALES[next]);
  };

  useEffect(() => {
    applyScale(currentScale());
    applyLh(currentLh());
    applyFont(currentFont());
    applyContrast(currentContrast());
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const contrast = currentContrast();

  return (
    <div ref={rootRef} className="relative no-print">
      <div className="flex items-center gap-1 rounded-full border border-line bg-paper-deep p-1">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Decrease text size"
          title="Decrease text size"
          className="reader-btn-minus flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold text-ink-soft transition-colors hover:text-gold"
        >
          A−
        </button>
        <span className="reader-scale-label min-w-10 text-center font-display text-[11px] font-semibold text-ink-faint" />
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Increase text size"
          title="Increase text size"
          className="reader-btn-plus flex h-8 w-8 items-center justify-center rounded-full font-display text-base font-bold text-ink-soft transition-colors hover:text-gold"
        >
          A+
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Reader settings"
          title="Reader settings"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-gold"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Reader settings"
          className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-line bg-card p-2 shadow-lg"
        >
          <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Line height
          </div>
          <div className="flex gap-1 rounded-lg bg-paper-deep p-1">
            {LH_PRESETS.map((lh) => (
              <button
                key={lh}
                type="button"
                onClick={() => applyLh(lh)}
                aria-pressed={currentLh() === lh}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  currentLh() === lh ? "bg-gold/15 text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {lh === "tight" ? "Tight" : lh === "normal" ? "Normal" : "Airy"}
              </button>
            ))}
          </div>

          <div className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Font
          </div>
          <div className="flex gap-1 rounded-lg bg-paper-deep p-1">
            {FONT_FAMILIES.map((font) => (
              <button
                key={font}
                type="button"
                onClick={() => applyFont(font)}
                aria-pressed={currentFont() === font}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  currentFont() === font ? "bg-gold/15 text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                {font === "source" ? "Source" : "Serif"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => applyContrast(!contrast)}
            aria-pressed={contrast}
            className="mt-3 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <span>High contrast</span>
            <span
              aria-hidden="true"
              className={`relative h-4 w-7 rounded-full transition-colors ${contrast ? "bg-gold" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-paper transition-all ${
                  contrast ? "left-3.5" : "left-0.5"
                }`}
              />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}