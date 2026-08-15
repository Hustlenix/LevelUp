import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import type { Components } from "react-markdown";
import { GradeBadge } from "@/components/ui";

const components: Components = {
  a: ({ href, children, ...props }) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  em: ({ children }) => <em className="italic text-ink-soft">{children}</em>,
  strong: ({ children }) => <strong>{children}</strong>,
};

export function BookMarkdown({
  body,
  className = "",
  dropCap = false,
}: {
  body: string;
  className?: string;
  dropCap?: boolean;
}) {
  return (
    <div className={`book-prose ${dropCap ? "drop-cap" : ""} ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </ReactMarkdown>
    </div>
  );
}

export function StudyList({ studies }: { studies: { name: string; grade: string }[] }) {
  if (!studies.length) return null;
  return (
    <div className="mt-6 rounded-xl border border-line bg-paper-deep/60 p-4">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        Evidence cited
      </p>
      <ul className="mt-3 space-y-2">
        {studies.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 shrink-0">
              <GradeBadge grade={s.grade} />
            </span>
            <span className="text-ink-soft">{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}