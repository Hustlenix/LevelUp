"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useHighlightsStore, addHighlight, removeHighlight } from "@/lib/activity";
import { normalize, prefixCandidates } from "@/lib/highlights";

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

interface ToolbarPos {
  left: number;
  top: number;
}

function isInside(node: Node, root: HTMLElement): boolean {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  return !!el && root.contains(el);
}

export default function HighlightLayer({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const highlights = useHighlightsStore();
  const ref = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<ToolbarPos | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const mine = highlights.filter((h) => h.slug === slug);
    const liveIds = new Set(mine.map((h) => h.id));
    root.querySelectorAll("mark[data-hi]").forEach((m) => {
      if (!liveIds.has(m.getAttribute("data-hi") ?? "")) {
        const frag = document.createDocumentFragment();
        while (m.firstChild) frag.appendChild(m.firstChild);
        m.replaceWith(frag);
      }
    });
    const existing = new Set(
      [...root.querySelectorAll("mark[data-hi]")].map((m) => m.getAttribute("data-hi") ?? "")
    );
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
    for (const h of mine) {
      if (existing.has(h.id)) continue;
      const needle = normalize(h.text);
      if (!needle) continue;
      for (const node of textNodes) {
        if (node.parentElement?.closest("mark[data-hi]")) continue;
        const hay = node.data;
        let from = hay.indexOf(h.text);
        let len = h.text.length;
        if (from < 0) {
          const n = normalize(hay);
          const i = n.indexOf(needle);
          if (i >= 0) {
            from = i;
            len = needle.length;
          }
        }
        if (from < 0) {
          const candidates = prefixCandidates(h.text, [10, 6, 3]);
          for (const cand of candidates) {
            const i = normalize(hay).indexOf(cand);
            if (i >= 0) {
              from = i;
              len = cand.length;
              break;
            }
          }
        }
        if (from < 0) continue;
        const range = document.createRange();
        range.setStart(node, Math.min(from, node.data.length));
        range.setEnd(node, Math.min(from + len, node.data.length));
        if (range.collapsed) continue;
        const mark = document.createElement("mark");
        mark.setAttribute("data-hi", h.id);
        mark.title = "Remove highlight";
        mark.className =
          "cursor-pointer rounded-sm bg-gold-soft/60 text-inherit underline decoration-gold/40 decoration-2";
        range.surroundContents(mark);
        break;
      }
    }
  }, [highlights, slug]);

  const onSelection = () => {
    const root = ref.current;
    const sel = window.getSelection();
    if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!isInside(range.commonAncestorContainer, root)) {
      setToolbar(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const host = root.getBoundingClientRect();
    setToolbar({
      left: Math.max(0, Math.min(rect.left - host.left, host.width - 140)),
      top: Math.max(0, rect.bottom - host.top + 10),
    });
  };

  const clearToolbar = () => setToolbar(null);

  const saveHighlight = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (!text) return;
    addHighlight({
      id: newId(),
      slug,
      text,
      color: "gold",
      ts: Date.now(),
    });
    sel.removeAllRanges();
    setToolbar(null);
  };

  const onClick = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.tagName === "MARK" && el.hasAttribute("data-hi")) {
      removeHighlight(el.getAttribute("data-hi") ?? "");
      window.getSelection()?.removeAllRanges();
      setToolbar(null);
    }
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onMouseUp={onSelection}
        onTouchEnd={onSelection}
        onScrollCapture={clearToolbar}
        onClick={onClick}
      >
        {children}
      </div>
      {toolbar && (
        <div
          role="toolbar"
          aria-label="Highlight options"
          style={{ left: toolbar.left, top: toolbar.top }}
          className="absolute z-30 rounded-lg border border-line bg-paper-deep px-1.5 py-1 shadow-lg"
        >
          <button
            type="button"
            onClick={saveHighlight}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-paper hover:text-ink"
          >
            Highlight
          </button>
          <button
            type="button"
            onClick={clearToolbar}
            className="rounded-md px-2 py-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}