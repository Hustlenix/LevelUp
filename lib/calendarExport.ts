// Calendar ICS file generator for daily time-blocking

export interface TimeBlock {
  title: string;
  description: string;
  durationMinutes: number;
  category: "focus" | "calibration" | "recovery" | "review";
}

function formatDateToICS(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

export function generateICSContent(
  blocks: { title: string; description: string; start: Date; end: Date }[]
): string {
  const now = formatDateToICS(new Date());

  const events = blocks.map((b, idx) => {
    const startStr = formatDateToICS(b.start);
    const endStr = formatDateToICS(b.end);
    const uid = `levelup-${Date.now()}-${idx}@lifeos.local`;

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${b.title.replace(/[,;]/g, " ")}`,
      `DESCRIPTION:${b.description.replace(/\n/g, "\\n")}`,
      "STATUS:CONFIRMED",
      "TRANSP:OPAQUE",
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Level Up LifeOS//Daily Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadDailyScheduleICS(
  startTimeStr: string, // e.g. "08:30"
  selectedPlan: "sprint3" | "balanced" | "deepwork",
  customGoal?: string,
  targetDateStr?: string
) {
  const [hours, minutes] = startTimeStr.split(":").map(Number);
  const baseDate = new Date();
  if (targetDateStr) {
    const [y, m, d] = targetDateStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      baseDate.setFullYear(y, m - 1, d);
    }
  }
  baseDate.setHours(hours || 9, minutes || 0, 0, 0);

  const plans: Record<
    string,
    { title: string; desc: string; durMins: number; breakMins: number }[]
  > = {
    sprint3: [
      {
        title: "☀️ Morning Calibration & Autonomic HRV Pacer",
        desc: "Set the 1 needle-moving target, run 2-min box breathing, lock physical trigger.",
        durMins: 15,
        breakMins: 15,
      },
      {
        title: `⚡ Deep-Work Sprint 1: ${customGoal || "Single Core Deliverable"}`,
        desc: "God-mode focus sprint. Zero browser tabs, park thoughts in distraction pad.",
        durMins: 50,
        breakMins: 15,
      },
      {
        title: "🚶 Autonomic Decompression & Daylight Walk",
        desc: "Look into far distance, nasal breathing, no screen/audio stimulation.",
        durMins: 20,
        breakMins: 10,
      },
      {
        title: "⚡ Deep-Work Sprint 2: Secondary Milestone",
        desc: "Execute high-cognitive task with Brown Noise / 40Hz Gamma beat.",
        durMins: 50,
        breakMins: 20,
      },
      {
        title: "🛡️ 4-Pillar Non-Zero Floor Check",
        desc: "Verify Health, Wealth, Love, and Self minimums are held.",
        durMins: 15,
        breakMins: 0,
      },
    ],
    balanced: [
      {
        title: "☀️ Morning Calibration (Protocol 2.3)",
        desc: "Define target outcome and verify zero-day floor.",
        durMins: 10,
        breakMins: 10,
      },
      {
        title: `🎯 Focus Block 1 (Pomodoro): ${customGoal || "Priority Task"}`,
        desc: "25-min single-focus sprint with zero task-switching.",
        durMins: 25,
        breakMins: 5,
      },
      {
        title: "🎯 Focus Block 2 (Execution)",
        desc: "25-min sprint to complete deliverable draft.",
        durMins: 25,
        breakMins: 20,
      },
      {
        title: "🛡️ Pillar Check & Winner's Loop Close",
        desc: "Speak win aloud, bank progress, update consistency record.",
        durMins: 15,
        breakMins: 0,
      },
    ],
    deepwork: [
      {
        title: "☀️ Morning Calibration & Objective Lock",
        desc: "Frame the entire day around 1 non-negotiable masterpiece deliverable.",
        durMins: 15,
        breakMins: 15,
      },
      {
        title: `🔥 90-Minute God-Mode Block: ${customGoal || "Deep Work Output"}`,
        desc: "Full ultradian cycle. Offline mode, ambient brown noise, zero interruptions.",
        durMins: 90,
        breakMins: 30,
      },
      {
        title: "⚡ 50-Minute Sprint: Integration & Ship",
        desc: "Export, polish, send, or commit the created artifact.",
        durMins: 50,
        breakMins: 15,
      },
      {
        title: "🛡️ 4-Pillar Floor Verification",
        desc: "Health, Wealth, Love, Self review.",
        durMins: 15,
        breakMins: 0,
      },
    ],
  };

  const schedule = plans[selectedPlan] || plans.sprint3;

  let currentCursor = new Date(baseDate.getTime());
  const icsBlocks = schedule.map((item) => {
    const start = new Date(currentCursor.getTime());
    const end = new Date(start.getTime() + item.durMins * 60 * 1000);
    // advance cursor with break
    currentCursor = new Date(end.getTime() + item.breakMins * 60 * 1000);

    return {
      title: item.title,
      description: item.desc,
      start,
      end,
    };
  });

  const icsContent = generateICSContent(icsBlocks);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `LevelUp-DailySchedule-${targetDateStr || new Date().toISOString().slice(0, 10)}.ics`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
