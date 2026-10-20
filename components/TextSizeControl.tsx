"use client";
import { useSyncExternalStore } from "react";
const SCALES = [1, 1.15, 1.3, 1.5] as const;
const KEY = "levelup-reader-scale";
export default function TextSizeControl() {
  const scale = useSyncExternalStore(subscribe, read, () => 1);
  function update(index: number) { const safe = SCALES[Math.max(0, Math.min(SCALES.length - 1, index))]; document.documentElement.setAttribute("data-reader-scale", String(safe)); try { localStorage.setItem(KEY, String(safe)); } catch { /* Available for this visit. */ } }
  const index = SCALES.indexOf(scale as never);
  return <div className="flex items-center gap-1 rounded-lg border border-line bg-paper-deep p-1" aria-label="Text size"><button type="button" onClick={() => update(index - 1)} disabled={index === 0} aria-label="Decrease text size" className="h-8 w-8 rounded-md text-sm font-bold text-ink-soft hover:bg-card disabled:opacity-40">A−</button><span className="min-w-8 text-center text-[0.625rem] font-semibold text-ink-faint">{Math.round(scale * 100)}%</span><button type="button" onClick={() => update(index + 1)} disabled={index === SCALES.length - 1} aria-label="Increase text size" className="h-8 w-8 rounded-md text-sm font-bold text-ink-soft hover:bg-card disabled:opacity-40">A+</button></div>;
}
function read() {
  const value = Number(document.documentElement.getAttribute("data-reader-scale"));
  return SCALES.includes(value as never) ? value : 1;
}
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reader-scale"] });
  return () => observer.disconnect();
}
