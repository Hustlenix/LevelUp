"use client";

import { useHabitSaveFailed } from "@/lib/habitsStore";
import { ActionLink, InlineNotice } from "@/components/workspace";

export default function HabitSaveNotice() {
  const failed = useHabitSaveFailed();
  if (!failed) return null;
  return <div className="mb-5"><InlineNotice tone="error">Your habit changes could not be saved to this browser. Keep this tab open and export a backup before refreshing or closing it.</InlineNotice><ActionLink href="/backup/" variant="quiet">Export a backup →</ActionLink></div>;
}
