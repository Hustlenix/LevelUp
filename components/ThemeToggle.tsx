"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "levelup-theme";

const THEMES = [
  { id: "light", label: "Light", swatch: "#f7f2e7" },
  { id: "dark", label: "Dark", swatch: "#161310" },
  { id: "deepwork", label: "Deep Work", swatch: "#f5efdf" },
  { id: "cyberpunk", label: "Cyberpunk", swatch: "#0a0a12" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function isThemeId(v: string | null): v is ThemeId {
  return v !== null && THEMES.some((t) => t.id === v);
}

export default function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeId>(() => {
    if (typeof document === "undefined") return "light";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const applied = document.documentElement.getAttribute("data-theme");
    return isThemeId(stored) ? stored : isThemeId(applied) ? applied : "light";
  });
  const rootRef = useRef<HTMLDivElement>(null);

  const pick = (id: ThemeId) => {
    setCurrent(id);
    setOpen(false);
    document.documentElement.setAttribute("data-theme", id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage unavailable */
    }
  };

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

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change theme"
        aria-expanded={open}
        title="Change theme"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-paper-deep text-ink-soft transition-colors hover:border-gold hover:text-gold"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="13.5" cy="6.5" r="1.5" />
          <circle cx="17.5" cy="10.5" r="1.5" />
          <circle cx="8.5" cy="7.5" r="1.5" />
          <circle cx="6.5" cy="12.5" r="1.5" />
          <circle cx="12.5" cy="12.5" r="1.5" />
          <circle cx="10.5" cy="17.5" r="1.5" />
          <circle cx="15.5" cy="17.5" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Theme options"
          className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-line bg-card p-1.5 shadow-lg"
        >
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="menuitemradio"
              aria-checked={current === t.id}
              onClick={() => pick(t.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                current === t.id
                  ? "bg-gold/15 text-ink"
                  : "text-ink-soft hover:bg-paper-deep hover:text-ink"
              }`}
            >
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-line"
                style={{ backgroundColor: t.swatch }}
              />
              <span className="flex-1">{t.label}</span>
              {current === t.id && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}