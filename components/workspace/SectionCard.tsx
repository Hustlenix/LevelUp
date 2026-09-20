import type { HTMLAttributes, ReactNode } from "react";

export function SectionCard({ children, className = "", ...props }: HTMLAttributes<HTMLElement> & { children: ReactNode }) {
  return <section {...props} className={`rounded-xl border border-line bg-card p-5 sm:p-6 ${className}`}>{children}</section>;
}
