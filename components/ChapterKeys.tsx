"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function ChapterKeys({
  prevHref,
  nextHref,
}: {
  prevHref?: string;
  nextHref?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "j" || e.key === "ArrowRight") {
        if (nextHref) {
          e.preventDefault();
          router.push(nextHref);
        }
      } else if (e.key === "k" || e.key === "ArrowLeft") {
        if (prevHref) {
          e.preventDefault();
          router.push(prevHref);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prevHref, nextHref]);

  return null;
}