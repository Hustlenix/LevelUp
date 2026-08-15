"use client";

import { useEffect } from "react";

const KEY = "levelup-scroll-pos-v1";

type ScrollMap = Record<string, number>;

function read(): ScrollMap {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as ScrollMap;
  } catch {
    return {};
  }
}

function write(map: ScrollMap) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

export default function ResumeScroll({ slug }: { slug: string }) {
  useEffect(() => {
    const saved = read()[slug];
    if (saved && saved > 100) {
      window.scrollTo(0, saved);
    }
  }, [slug]);

  useEffect(() => {
    let raf = 0;
    const save = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const map = read();
        map[slug] = window.scrollY;
        write(map);
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("beforeunload", save);
    return () => {
      window.removeEventListener("scroll", save);
      window.removeEventListener("beforeunload", save);
      cancelAnimationFrame(raf);
    };
  }, [slug]);

  return null;
}