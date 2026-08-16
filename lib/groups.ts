export interface BookGroup {
  name: string;
  start: number;
  end: number;
  message: string;
}

export const BOOK_GROUPS: BookGroup[] = [
  {
    name: "Build the Belief Engine",
    start: 1,
    end: 11,
    message: "Chapters 1–11 build the belief engine.",
  },
  {
    name: "Move to Action",
    start: 12,
    end: 15,
    message: "Chapters 12–15 move you to action.",
  },
  {
    name: "Train Body & Mind",
    start: 16,
    end: 20,
    message: "Chapters 16–20 train body and mind.",
  },
  {
    name: "Build the Business",
    start: 21,
    end: 28,
    message: "Chapters 21–28 build the business. Each step builds on the last.",
  },
];

export function groupOf(number: number): BookGroup | undefined {
  return BOOK_GROUPS.find((g) => number >= g.start && number <= g.end);
}