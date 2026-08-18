"use client";

import { useEffect } from "react";

const hueForTime = (): number => {
  const hour = new Date().getHours();
  // Morning: 200 (crisp/bright) -> Evening: 30 (moody/dark)
  // Map hour 0-11 to 200->30, hour 12-23 to 30->200
  if (hour < 12) {
    return 200 - (hour * (170 / 12)); // 200 down to 30
  } else {
    return 30 + ((hour - 12) * (170 / 12)); // 30 up to 200
  }
};

function ThemeTimeShift() {
  useEffect(() => {
    const updateHue = () => {
      document.documentElement.style.setProperty("--hue", hueForTime().toString());
    };

    // Run once on mount
    updateHue();

    // Optional: uncomment to enable per-minute updates
    // const interval = setInterval(updateHue, 60000);
    // return () => clearInterval(interval);
  }, []);

  return null;
}

export default ThemeTimeShift;