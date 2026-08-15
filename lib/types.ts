export type Pillar = "health" | "wealth" | "love" | "self";

export interface ChapterMeta {
  slug: string;
  number: number;
  title: string;
  pillar: Pillar;
  duration: string;
  teaser: string;
  keyConcepts: string[];
  studies: { name: string; grade: string }[];
  protocols: string[];
  quotes: string[];
}

export interface Chapter extends ChapterMeta {
  body: string;
  stats: {
    words: number;
    sections: { num: number; title: string }[];
    keyIdeas: boolean;
    applyToday: boolean;
    theScience: boolean;
  };
}

export interface AuditClaim {
  id: string;
  category: string;
  claim: string;
  grade: string;
  verdict: string;
  detail: string;
  citation: string;
}

export interface Protocol {
  num: string;
  title: string;
  duration: string;
  purpose: string;
  steps: string[];
  evidence: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Quote {
  text: string;
  source: string;
  chapter?: string;
}

export interface SearchDoc {
  id: string;
  type: string;
  title: string;
  sub: string;
  teaser: string;
  url: string;
  text: string;
}

export interface SiteData {
  chapters: Chapter[];
  audit: AuditClaim[];
  protocols: Protocol[];
  glossary: GlossaryTerm[];
  quotes: Quote[];
  roadmap: {
    phases: {
      phase: number;
      title: string;
      days: string;
      focus: string;
      items: string[];
      milestone: string;
    }[];
    rules: string[];
  };
}

export const PILLAR_META: Record<
  Pillar,
  { label: string; description: string; verse: string }
> = {
  health: {
    label: "Health",
    description: "Body, energy, discipline & the nervous system",
    verse: "Energy is the currency of every other chapter.",
  },
  wealth: {
    label: "Wealth",
    description: "Work, skill, business & compounding",
    verse: "Skill compounds; consistency cashes it in.",
  },
  love: {
    label: "Love",
    description: "Relationships, values & life design",
    verse: "Floors are not negotiable. People are the substrate.",
  },
  self: {
    label: "Self",
    description: "Belief, identity, mind & manifestation",
    verse: "The filter, the loop, and the stack that run everything.",
  },
};