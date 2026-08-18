"use client";

import { useEffect, useState } from "react";

export default function PrivacyBadge() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Show badge once per session, after 2 seconds
    const timer = setTimeout(() => setShown(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!shown) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-10 rounded-full bg-card px-4 py-1.5 text-xs text-mint-soft transition-opacity"
    >
      <span>100% Private</span>
      <span>· On-Device Storage Only</span>
    </div>
  );
}