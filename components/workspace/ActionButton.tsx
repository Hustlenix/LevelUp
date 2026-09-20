import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: never;
  variant?: "primary" | "secondary" | "quiet";
  children: ReactNode;
};

type ActionLinkProps = {
  href: string;
  variant?: "primary" | "secondary" | "quiet";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  "aria-label"?: string;
};

const styles = {
  primary: "bg-gold text-paper hover:bg-gold-deep",
  secondary: "border border-line bg-paper text-ink-soft hover:border-gold hover:text-gold",
  quiet: "text-ink-soft hover:bg-paper-deep hover:text-gold",
};

const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50";

export function ActionButton({ variant = "primary", className = "", ...props }: ActionButtonProps) {
  return <button {...props} className={`${base} ${styles[variant]} ${className}`} />;
}

export function ActionLink({ href, variant = "primary", className = "", ...props }: ActionLinkProps) {
  return <Link href={href} {...props} className={`${base} ${styles[variant]} ${className}`} />;
}
