"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { Protocol } from "@/lib/types";
import ProtocolRunnerModal from "@/components/ProtocolRunnerModal";

export default function ProtocolsListInteractive({ protocols }: { protocols: Protocol[] }) {
  const [activeProtocol, setActiveProtocol] = useState<Protocol | null>(null);

  return (
    <>
      <div className="space-y-6">
        {protocols.map((p) => {
          const anchor = `protocol-${p.num.replace(".", "-")}`;
          return (
            <section key={p.num} id={anchor} className="rounded-xl border border-line bg-card p-6 shadow-xs">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-display text-lg font-bold text-gold">{p.num}</span>
                <h2 className="font-display text-xl font-bold text-ink">{p.title}</h2>
                {p.duration && (
                  <span className="ml-auto rounded-full border border-line bg-paper-deep px-3 py-1 text-[11px] uppercase tracking-wider text-ink-faint">
                    {p.duration}
                  </span>
                )}
              </div>
              {p.purpose && <p className="mt-2 font-display italic text-ink-soft">{p.purpose}</p>}

              {p.steps.length > 0 && (
                <ol className="mt-4 space-y-2.5">
                  {p.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 font-display text-[11px] font-bold text-gold">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {p.evidence && p.evidence.length > 0 && (
                <div className="mt-4 rounded-lg bg-paper-deep/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gold">Why it works</p>
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
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-xs text-ink-faint">
                  Interactive execution with live timer & logging
                </span>
                <button
                  onClick={() => setActiveProtocol(p)}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2 text-xs font-semibold text-paper transition-colors hover:bg-gold"
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> Run Interactive Protocol
                </button>
              </div>
            </section>
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
