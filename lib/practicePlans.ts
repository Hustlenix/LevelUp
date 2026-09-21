export interface PracticePlan {
  id: string;
  title: string;
  duration: string;
  purpose: string;
  steps: string[];
  prompt: string;
  template: string;
  smaller: string;
}

/** Optional editorial adaptations. Durations are suggestions, not efficacy claims. */
export const PRACTICE_PLANS: PracticePlan[] = [
  {
    id: "pomodoro", title: "Pomodoro starter", duration: "25 + 5 min",
    purpose: "One output, a focused attempt, then a break. Start with one round; repeat only if useful.",
    steps: ["Name one visible output and prepare only what it needs.", "Choose 25 minutes, or the shorter 10-minute adaptation. Park unrelated thoughts in your notes.", "Try the focus block, then take the break. You can pause or finish early.", "Record what changed and one next step. Four rounds are optional, not a quota."],
    prompt: "What will you work on? Use this space as your distraction pad too.",
    template: "My output: Draft three headings.\nParked distractions: Check email later.\nNext step: Add one example under each heading.",
    smaller: "Try 10 minutes with a 2-minute break, or stop after one small action.",
  },
  {
    id: "tiny-start", title: "Two-minute restart", duration: "2 min",
    purpose: "Lower the cost of beginning or returning after a missed session.",
    steps: ["Name the obstacle without blaming yourself.", "Choose a first action that fits two minutes and prepare its materials.", "Try it. Then choose whether to continue, reschedule or rest."],
    prompt: "What is your smallest next action, and when will you try it?",
    template: "Obstacle: The essay feels too large.\nNext action: Open the document and write one heading.\nCue: After lunch.\nIf interrupted: Leave a note showing where to resume.",
    smaller: "Just prepare the materials or choose a realistic return time.",
  },
  {
    id: "morning-plan", title: "One-outcome morning", duration: "5 min",
    purpose: "Give today a direction without planning every minute.",
    steps: ["Choose one useful output that fits your actual capacity.", "Name its first physical action and a realistic time to try it.", "Park optional ideas on a later list. Leave room for responsibilities and interruptions."],
    prompt: "What would make today’s effort useful?",
    template: "Output: Send a rough outline.\nFirst action: Write three headings.\nWhen: 11:00, after the meeting.\nLater: Compare design tools.\nFallback: Send the key question if the outline cannot be finished.",
    smaller: "Write only the first action. A full schedule is optional.",
  },
  {
    id: "belief-test", title: "Small belief experiment", duration: "10 min setup",
    purpose: "Turn an assumption into a safe, observable test rather than an affirmation you must believe.",
    steps: ["Write one specific assumption and what you predict will happen.", "Choose a low-risk action and an observation that could challenge the assumption.", "Try it when practical. Record what happened separately from your interpretation.", "Decide what to test or change next. One attempt is not proof of a universal rule."],
    prompt: "What assumption are you testing, and what actually happened?",
    template: "Assumption: My explanations are always confusing.\nTest: Explain one idea to a willing friend.\nObserve: Can they restate the main point?\nActual result: …\nOther explanations / next change: …",
    smaller: "Write the test today and schedule the attempt for another day.",
  },
  {
    id: "reverse-plan", title: "Three-milestone plan", duration: "10 min",
    purpose: "Make a vague goal concrete without needing a perfect 20-step map.",
    steps: ["Describe a visible finish and a tentative date.", "Work backwards through three milestones; check constraints and dependencies.", "Choose the first small action and put a review date beside the plan."],
    prompt: "What is the finish, and what comes immediately before it?",
    template: "Finish: Submit essay Friday.\n3. Proofread Friday morning.\n2. Draft Thursday.\n1. Outline Wednesday.\nNext action: List three headings.\nReview: Wednesday evening; reduce scope if needed.",
    smaller: "Write just the finish and the next action.",
  },
  {
    id: "rehearse", title: "Rehearse the first move", duration: "3 min",
    purpose: "Prepare a real behaviour for an upcoming situation.",
    steps: ["Name the situation and the first sentence or movement you control.", "Rehearse it once, aloud, in writing or in your imagination. Include one likely obstacle.", "Choose when to try it in the real situation, then note what to adjust."],
    prompt: "What will you do first, and what is your fallback?",
    template: "Situation: Ask for help in a meeting.\nOpening: I am stuck on this step; can we look at an example?\nIf time runs out: Ask when we could discuss it.\nAfter the attempt: …",
    smaller: "Write only the opening sentence. Visualisation is not required.",
  },
  {
    id: "two-lines", title: "Fact, not self-judgement", duration: "5 min",
    purpose: "Separate feedback about an attempt from a judgement about your worth.",
    steps: ["Describe what happened using observable facts.", "Notice the judgement you added. Write a fair response you might offer a friend.", "Choose one controllable action, rest or source of support."],
    prompt: "What happened, and what would a fair response sound like?",
    template: "Fact: I missed a planned session.\nJudgement: I never follow through.\nFair response: One session was missed; the plan can change.\nNext: Move the task to a realistic time.",
    smaller: "Write one neutral sentence. You do not have to solve everything now.",
  },
  {
    id: "energy-check", title: "Capacity check", duration: "5 min",
    purpose: "Match the plan to today’s capacity instead of forcing yesterday’s schedule.",
    steps: ["Notice your current capacity without assigning it a moral score.", "List one support, one drain and any non-negotiable responsibilities.", "Make one realistic adjustment: reduce scope, add a buffer, rest or ask for help."],
    prompt: "What adjustment would make today more manageable?",
    template: "Support: A quiet place for the first task.\nDrain: Back-to-back meetings.\nResponsibility: Afternoon appointment.\nAdjustment: Finish one section, not the whole report.",
    smaller: "Choose one thing to reduce or one support to ask for.",
  },
  {
    id: "decision", title: "Reversible decision", duration: "5 min",
    purpose: "Stop over-comparing a low-stakes choice and learn from a small trial.",
    steps: ["Check that the choice is low-stakes and easy to undo. Otherwise stop and gather appropriate advice.", "Write two options and the one criterion that matters most.", "Pick a small trial, its end date and how you will undo or change it."],
    prompt: "What will you try, and how will you review it?",
    template: "Choice: Paper notes or one existing app.\nCriterion: Easy to find tomorrow.\nTrial: Paper notes for one class.\nReview: Tomorrow; keep a photo so nothing is lost.",
    smaller: "Identify the missing information instead of forcing a decision.",
  },
  {
    id: "pause", title: "Pause before the scroll", duration: "10 sec + reflection",
    purpose: "Create a moment to choose what you need when an automatic distraction appears.",
    steps: ["Notice the impulse without judging it.", "Pause for about ten seconds if comfortable. Ask what you need: information, connection, rest or stimulation.", "Choose deliberately. Using the phone for a real need is a valid choice."],
    prompt: "What prompted the impulse, and what did you choose?",
    template: "Trigger: A difficult paragraph.\nNeed: A short break.\nChoice: Step away, then return to the first sentence.",
    smaller: "Simply notice the impulse. Keep necessary communication and sensory supports.",
  },
  {
    id: "learn-practise", title: "Learn, practise, explain", duration: "15 min",
    purpose: "Turn a small piece of information into something you can attempt yourself.",
    steps: ["Learn one small example for about five minutes.", "Try a related task for five minutes without copying the answer.", "Explain what you did, check the source and note one gap to revisit."],
    prompt: "What can you now do or explain, and what needs another attempt?",
    template: "Skill: Use one spreadsheet formula.\nExample: Sum a column.\nMy attempt: Sum a different range.\nExplanation: …\nGap to check: …",
    smaller: "Try one question and check its answer. The minute split is flexible.",
  },
  {
    id: "seven-day-trial", title: "Seven-day starter plan", duration: "10 min setup · 1 week trial",
    purpose: "Try one direction for a week with small sessions, buffer time and a review.",
    steps: ["Day 1: Choose one observable output and a small first action.", "Days 2–3: Try one 10–25-minute session. Note a question or obstacle.", "Days 4–5: Try a second session and seek relevant feedback if appropriate; ask before involving someone.", "Day 6: Leave a buffer for rest, revision or a third optional session.", "Day 7: Review what happened and decide to continue, adapt or stop."],
    prompt: "Adapt this week to your capacity. Save the plan now; review the outcome after trying it.",
    template: "Output: One useful study sheet.\nFirst action: List three topics.\nSession 1: Tuesday, 10 minutes.\nSession 2: Thursday, 10 minutes.\nBuffer: Saturday.\nReview: Sunday; what was useful and what should change?",
    smaller: "Schedule one session and a review. You can stop the experiment without calling it a failure.",
  },
  {
    id: "weekly-review", title: "Keep, change, stop", duration: "10 min",
    purpose: "Use real observations to adjust the next week instead of protecting an unhelpful plan.",
    steps: ["Compare what you planned, what you tried and what happened.", "Separate the input you controlled from outcomes with other possible causes.", "Choose one thing to keep, change or stop. Set the next review date."],
    prompt: "What does this week suggest you should change?",
    template: "Planned: Three practice sessions.\nTried: Two.\nObserved: I understand examples but struggle unaided.\nChange: Attempt first, then check.\nNext review: Sunday.",
    smaller: "Write one observation and one next adjustment.",
  },
];

export function getPracticePlan(id: string): PracticePlan {
  const plan = PRACTICE_PLANS.find((item) => item.id === id);
  if (!plan) throw new Error(`Unknown practice plan: ${id}`);
  return plan;
}
