import type {
  Achievement,
  CompanionStage,
  DailyMission,
  LifeProfile,
  LifeSkill,
  LifeState,
  MissionRecord,
} from "./types.ts";

export const SKILL_META: Record<LifeSkill, { label: string; short: string; color: string }> = {
  focus: { label: "Focus", short: "Protect attention", color: "#1f6f78" },
  learning: { label: "Learning", short: "Build understanding", color: "#5968a6" },
  fitness: { label: "Fitness", short: "Train the body", color: "#33745a" },
  discipline: { label: "Discipline", short: "Keep promises", color: "#9a652f" },
  confidence: { label: "Confidence", short: "Practice courage", color: "#a44f5d" },
  mind: { label: "Mind", short: "Recover and reflect", color: "#735b91" },
  career: { label: "Career", short: "Create useful work", color: "#8a6f28" },
};

type MissionTemplate = Omit<DailyMission, "id" | "minutes" | "xp" | "primary" | "date"> & {
  baseMinutes: number;
};

const CATALOG: Record<LifeSkill, readonly MissionTemplate[]> = {
  focus: [
    { title: "One-screen focus", description: "Choose one concrete outcome, remove the obvious distraction, and work only on that outcome.", skill: "focus", baseMinutes: 20, difficulty: "Focused", proofPrompt: "What moved forward?" },
    { title: "Clear the runway", description: "Close unused tabs, write the next physical action, then begin before improving the plan.", skill: "focus", baseMinutes: 10, difficulty: "Easy", proofPrompt: "What did you start?" },
    { title: "Deep-work block", description: "Protect a demanding block for the task you have been postponing.", skill: "focus", baseMinutes: 35, difficulty: "Challenge", proofPrompt: "What did the uninterrupted block produce?" },
  ],
  learning: [
    { title: "Active recall round", description: "Study one topic, close the source, and write what you remember before checking gaps.", skill: "learning", baseMinutes: 20, difficulty: "Focused", proofPrompt: "Which gap did you find?" },
    { title: "Explain it simply", description: "Teach one idea in plain words as if the listener is seeing it for the first time.", skill: "learning", baseMinutes: 12, difficulty: "Easy", proofPrompt: "What can you now explain?" },
    { title: "Deliberate practice set", description: "Do a small set of hard questions and review every mistake, not only the score.", skill: "learning", baseMinutes: 30, difficulty: "Challenge", proofPrompt: "What mistake pattern appeared?" },
  ],
  fitness: [
    { title: "Move with intent", description: "Complete a safe full-body movement session at a level that leaves your form clean.", skill: "fitness", baseMinutes: 20, difficulty: "Focused", proofPrompt: "What movement felt strongest?" },
    { title: "Mobility reset", description: "Move gently through your comfortable range and release the stiffness from sitting.", skill: "fitness", baseMinutes: 10, difficulty: "Easy", proofPrompt: "Where do you feel looser?" },
    { title: "Strength practice", description: "Practice a familiar strength routine with control, rest, and no pain-chasing.", skill: "fitness", baseMinutes: 30, difficulty: "Challenge", proofPrompt: "What did you complete with good form?" },
  ],
  discipline: [
    { title: "Keep one promise", description: "Choose the smallest useful promise you made to yourself and finish it before adding another.", skill: "discipline", baseMinutes: 15, difficulty: "Focused", proofPrompt: "Which promise did you keep?" },
    { title: "Two-minute start", description: "Begin the task you are avoiding for two honest minutes; continue only if it helps.", skill: "discipline", baseMinutes: 5, difficulty: "Easy", proofPrompt: "What resistance became smaller?" },
    { title: "Finish the open loop", description: "Close one meaningful unfinished task that has been taking up mental space.", skill: "discipline", baseMinutes: 30, difficulty: "Challenge", proofPrompt: "What open loop is now closed?" },
  ],
  confidence: [
    { title: "Small courage rep", description: "Take one safe action you have delayed because it feels slightly uncomfortable.", skill: "confidence", baseMinutes: 10, difficulty: "Focused", proofPrompt: "What did you do despite discomfort?" },
    { title: "Evidence list", description: "Write three specific examples of problems you have handled before.", skill: "confidence", baseMinutes: 8, difficulty: "Easy", proofPrompt: "Which example surprised you?" },
    { title: "Make the ask", description: "Prepare and make one respectful request that matters to your growth.", skill: "confidence", baseMinutes: 20, difficulty: "Challenge", proofPrompt: "What did you ask for?" },
  ],
  mind: [
    { title: "Clear-head journal", description: "Write what is taking up attention, what is controllable, and the next kind action.", skill: "mind", baseMinutes: 12, difficulty: "Focused", proofPrompt: "What became clearer?" },
    { title: "Quiet reset", description: "Step away from inputs, breathe naturally, and let your attention settle without judging it.", skill: "mind", baseMinutes: 6, difficulty: "Easy", proofPrompt: "What changed in your state?" },
    { title: "Weekly truth check", description: "Review the week without drama: what worked, what did not, and what changes next.", skill: "mind", baseMinutes: 25, difficulty: "Challenge", proofPrompt: "What will you change next?" },
  ],
  career: [
    { title: "Ship one useful piece", description: "Create or improve one small thing another person can actually use or review.", skill: "career", baseMinutes: 25, difficulty: "Focused", proofPrompt: "What is now shareable?" },
    { title: "Skill micro-practice", description: "Practice one narrow career skill with a visible output, not passive watching.", skill: "career", baseMinutes: 15, difficulty: "Easy", proofPrompt: "What did you make or solve?" },
    { title: "Portfolio proof", description: "Turn recent work into a clear artifact, explanation, screenshot, or case note.", skill: "career", baseMinutes: 35, difficulty: "Challenge", proofPrompt: "What proof did you add?" },
  ],
};

function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function clampMinutes(base: number, profile: LifeProfile, slot: number): number {
  const intensityFactor = profile.intensity === "gentle" ? 0.7 : profile.intensity === "ambitious" ? 1.25 : 1;
  const total = Math.max(15, profile.minutesPerDay);
  const first = total === 15 ? 5 : Math.max(5, Math.floor(total * 0.55));
  const second = total === 15 ? 5 : Math.max(5, Math.floor(total * 0.25));
  const budgets = [first, second, Math.max(5, total - first - second)];
  const budget = budgets[Math.min(slot, budgets.length - 1)];
  return Math.max(5, Math.min(Math.round(base * intensityFactor), budget));
}

function xpFor(minutes: number, difficulty: DailyMission["difficulty"], primary: boolean): number {
  const difficultyBonus = difficulty === "Challenge" ? 12 : difficulty === "Focused" ? 6 : 2;
  return Math.round(minutes * 1.4 + difficultyBonus + (primary ? 5 : 0));
}

export function missionsForDay(profile: LifeProfile, date: string): DailyMission[] {
  const fallback: LifeSkill[] = ["focus", "discipline", "mind"];
  const skills = [...profile.goals, ...fallback].filter((skill, index, all) => all.indexOf(skill) === index).slice(0, 3);
  return skills.map((skill, slot) => {
    const options = CATALOG[skill];
    const template = options[hash(`${date}:${skill}:${profile.intensity}`) % options.length];
    const minutes = clampMinutes(template.baseMinutes, profile, slot);
    return {
      ...template,
      id: `${date}:${skill}:${hash(template.title).toString(36)}`,
      date,
      minutes,
      xp: xpFor(minutes, template.difficulty, slot === 0),
      primary: slot === 0,
    };
  });
}

export function missionIsComplete(state: LifeState, missionId: string): boolean {
  return state.progression.completions.some((record) => record.missionId === missionId);
}

export function levelSummary(totalXp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)) + 1);
  const floor = (level - 1) ** 2 * 100;
  const nextXp = level ** 2 * 100;
  const titles = ["Beginner", "Builder", "Pathfinder", "Practitioner", "Specialist", "Guide"];
  return {
    level,
    title: titles[Math.min(titles.length - 1, level - 1)],
    currentXp: totalXp,
    nextXp,
    progress: Math.max(0, Math.min(1, (totalXp - floor) / Math.max(1, nextXp - floor))),
  };
}

export function skillLevel(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1);
}

export function companionStage(completionCount: number): CompanionStage {
  if (completionCount >= 50) return "legend";
  if (completionCount >= 25) return "guide";
  if (completionCount >= 12) return "builder";
  if (completionCount >= 5) return "scout";
  if (completionCount >= 1) return "spark";
  return "seed";
}

function previousDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

export function applyMissionCompletion(state: LifeState, mission: DailyMission, completedAt: string, proof = ""): LifeState {
  if (missionIsComplete(state, mission.id)) return state;
  const record: MissionRecord = {
    id: `${mission.id}:completed`,
    missionId: mission.id,
    title: mission.title,
    skill: mission.skill,
    minutes: mission.minutes,
    xp: mission.xp,
    date: mission.date,
    completedAt,
    proof: proof.trim().slice(0, 280),
  };
  const prior = state.progression.streak;
  const current = prior.lastDate === mission.date
    ? prior.current
    : prior.lastDate === previousDate(mission.date)
      ? prior.current + 1
      : 1;
  return {
    ...state,
    progression: {
      totalXp: state.progression.totalXp + mission.xp,
      skillXp: {
        ...state.progression.skillXp,
        [mission.skill]: state.progression.skillXp[mission.skill] + mission.xp,
      },
      completions: [...state.progression.completions, record],
      streak: { current, best: Math.max(prior.best, current), lastDate: mission.date },
    },
    updatedAt: completedAt,
  };
}

export function achievementsFor(state: LifeState): Achievement[] {
  const p = state.progression;
  const minutes = p.completions.reduce((total, record) => total + record.minutes, 0);
  const skillsUsed = new Set(p.completions.map((record) => record.skill)).size;
  return [
    { id: "first-proof", title: "First proof", description: "Complete one real-world mission.", unlocked: p.completions.length >= 1 },
    { id: "three-day", title: "Three steady days", description: "Reach a three-day progress streak.", unlocked: p.streak.best >= 3 },
    { id: "hundred-minutes", title: "100 minutes invested", description: "Put 100 honest minutes into your growth.", unlocked: minutes >= 100 },
    { id: "range", title: "Range", description: "Build progress in four different skills.", unlocked: skillsUsed >= 4 },
    { id: "twenty-missions", title: "Evidence stack", description: "Complete 20 meaningful missions.", unlocked: p.completions.length >= 20 },
  ];
}

export function weeklySummary(state: LifeState, today: string) {
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 6);
  const from = start.toISOString().slice(0, 10);
  const records = state.progression.completions.filter((record) => record.date >= from && record.date <= today);
  return {
    completed: records.length,
    minutes: records.reduce((total, record) => total + record.minutes, 0),
    xp: records.reduce((total, record) => total + record.xp, 0),
    activeDays: new Set(records.map((record) => record.date)).size,
  };
}

export function strongestAndNeglected(state: LifeState): { strongest: LifeSkill; neglected: LifeSkill } {
  const sorted = (Object.entries(state.progression.skillXp) as [LifeSkill, number][]).sort((a, b) => b[1] - a[1]);
  return { strongest: sorted[0][0], neglected: sorted[sorted.length - 1][0] };
}
