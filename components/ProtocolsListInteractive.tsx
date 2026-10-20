"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import type { Protocol } from "@/lib/types";
import ProtocolRunnerModal from "@/components/ProtocolRunnerModal";

export default function ProtocolsListInteractive({ protocols }: { protocols: Protocol[] }) {
  const [activeProtocol, setActiveProtocol] = useState<Protocol | null>(null);
  useEffect(() => {
    const reveal = () => {
      if (!/^#protocol-[0-9-]+$/.test(location.hash)) return;
      const item = document.getElementById(location.hash.slice(1));
      if (item instanceof HTMLDetailsElement) { item.open = true; item.scrollIntoView({ block: "start" }); }
    };
    reveal(); window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);

  return (
    <>
      <div className="space-y-3">
        {[...protocols].sort((a, b) => a.num.localeCompare(b.num, "en", { numeric: true })).map((p) => {
          const anchor = `protocol-${p.num.replace(".", "-")}`;
          return (
            <details key={p.num} id={anchor} className="scroll-mt-36 rounded-md border border-line bg-card p-5">
              <summary className="min-h-11 cursor-pointer">
              <span className="inline-flex flex-wrap items-baseline gap-3">
                <span className="font-display text-lg font-bold text-gold">{p.num}</span>
                <span className="font-display text-xl font-bold text-ink">{p.title}</span>
                {p.duration && (
                  <span className="ml-auto rounded-full border border-line bg-paper-deep px-3 py-1 text-[0.6875rem] uppercase tracking-wider text-ink-faint">
                    {p.duration}
                  </span>
                )}
              </span>
              </summary>
              {p.purpose && <p className="mt-2 font-display italic text-ink-soft">{p.purpose}</p>}

              {p.steps.length > 0 && (
                <ol className="mt-4 space-y-2.5">
                  {p.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 font-display text-[0.6875rem] font-bold text-gold">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {p.evidence && p.evidence.length > 0 && (
                <div className="mt-4 rounded-lg bg-paper-deep/60 p-4">
                  <p className="text-[0.6875rem] uppercase tracking-[0.2em] text-gold">Evidence & context</p>
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink-soft">
                    {p.evidence.map((e, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gold">◆</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <span className="text-xs text-ink-faint">
                  Try the steps and record what happened
                </span>
                <button
                  onClick={() => setActiveProtocol(p)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-gold px-5 py-2 text-xs font-semibold text-paper transition-colors cta-hover"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Run Interactive Protocol
                </button>
              </div>
            </details>
          );
        })}
      </div>

      {activeProtocol && (
        <ProtocolRunnerModal
          protocol={activeProtocol}
          onClose={() => setActiveProtocol(null)}
        />
      )}
    </>
  );
}
