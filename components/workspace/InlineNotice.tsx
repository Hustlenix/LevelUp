import type { ReactNode } from "react";

export function InlineNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "error" }) {
  const tones = {
    info: "border-gold/40 bg-gold/10 text-ink",
    success: "border-emerald-700/30 bg-emerald-700/10 text-emerald-900",
    error: "border-rose-700/30 bg-rose-700/10 text-rose-900",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}
