import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const control = "mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink transition-colors focus:border-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40";

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-ink-soft">{label}</span>{children}{hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} ${props.className ?? ""}`} />;
}
