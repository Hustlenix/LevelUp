"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Chapter } from "@/lib/types";
import { BOOK_GROUPS } from "@/lib/groups";

export default function ChaptersMenu({
  chapters,
  mobile = false,
}: {
  chapters: Chapter[];
  mobile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(BOOK_GROUPS.map((g) => g.name))
  );
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div ref={ref} className={`relative ${mobile ? "" : "hidden md:block"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1.5 text-ink-soft transition-colors hover:text-gold ${
          mobile ? "text-xs" : "text-sm"
        }`}
      >
        Chapters
        <span
          aria-hidden="true"
          className={`text-[10px] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div
          id="chapters-menu"
          className={`mt-2 w-full rounded-xl border border-line bg-paper shadow-xl ${
            mobile ? "" : "absolute left-0 top-full z-50 w-80"
          }`}
        >
          <div className="max-h-[70vh] overflow-y-auto p-3">
            <Link
              href="/chapters/"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-deep hover:text-gold"
            >
              View all chapters
            </Link>
            <div className="mt-1 border-t border-line pt-1">
              {BOOK_GROUPS.map((g) => {
                const items = chapters.filter(
                  (c) => c.number >= g.start && c.number <= g.end
                );
                const isOpen = openGroups.has(g.name);
                return (
                  <div key={g.name}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.name)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink"
                    >
                      <span>
                        {g.name}
                        <span className="text-ink-faint">
                          {" "}
                          · Chapters {g.start}–{g.end}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`text-[10px] text-ink-faint transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        ▾
                      </span>
                    </button>
                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                        isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <ul className="space-y-0.5 pb-1">
                          {items.map((c) => (
                            <li key={c.slug}>
                              <Link
                                href={`/chapters/${c.slug}/`}
                                onClick={() => setOpen(false)}
                                className="flex items-baseline gap-2 rounded-md px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper-deep hover:text-gold"
                              >
                                <span className="w-6 shrink-0 text-right font-display text-xs font-bold text-gold/70">
                                  {c.number}
                                </span>
                                <span className="truncate">{c.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}