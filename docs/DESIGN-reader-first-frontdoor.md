# Design Brief — Reader-First Front Door

**DRAFT — review before building**

---

## 1. The decision

Readers come first. Right now, the homepage greets a brand-new visitor like a returning power user — streak counters, daily floors, the full operating system — before they've even read a single page of the book. That's backwards. The book is the product, and the operating system is the reward for reading it. So we flip the front door: the homepage starts with the book, and the dashboard moves out of the way — not away, just one click back. We are not building anything new. No accounts, no sync, no payments. This round is about reshaping what already exists so the site feels lighter, and proving the free reading experience works before we ever ask anyone for money.

## 2. What changes, and what stays the same

**Changes:**

- The homepage becomes a calm reading entry — book first, dashboard nowhere in sight.
- The menu gets simplified into two clear layers (spelled out in section 4).

**Stays exactly the same (nothing is lost):**

- The full dashboard — streak counter, the four daily floors (Health, Wealth, Love, Self), the 28-day consistency matrix, protocol launchers — is not deleted. It moves to its own page at /dashboard and keeps every behavior it has today.
- All progress and streaks stay where they already live: in the reader's browser. A returning reader's history is untouched.
- The Verification, Research, Glossary, Quotes, and Analytics pages all remain, and remain reachable.

## 3. Page by page

**What a first-time visitor sees on the homepage:**

- The book title, one line about what it's for.
- An "evidence-audited" badge — meaning every chapter is checked against published research (randomized trials and meta-analyses), with sources cited.
- One primary button: **Start reading.** One click, straight into Chapter 1. No login, no choices, no setup.
- A small set of hand-picked starting chapters — 3–4 of them, one per pillar (Health, Wealth, Love, Self) — as guided entry points for readers who want to begin somewhere specific.
- A short trust strip: 28 chapters, verified against the research, sources cited, linking to the existing Verification and Research pages.
- A quiet line at the bottom: "Open your dashboard" — for the returning reader.

**What a returning reader sees on the homepage:**

- The same calm reading entry, plus that quiet line at the bottom. One click takes them to everything they built: streak, daily floors, matrix, protocols.

**What the dashboard page shows:**

- Everything it shows today. Same features, same data, same behavior. It just lives at its own address now.

## 4. The menu, simply

Today's menu tries to show everything at once. It becomes two layers:

- **Primary menu:** Chapters · Daily Action · Protocols · Dashboard
- **More menu:** Verification · Glossary · Quotes · Analytics

The same two-layer treatment applies on mobile. Nothing disappears from the menu — the secondary items just tuck under "More" so the main choices stay obvious.

## 5. Deliberately not in this round

- **Accounts** — no logins, no sign-ups.
- **Cross-device sync** — progress stays on the device where it was made.
- **Payments** — no paid tier yet, no paywalls.
- **Any new feature** — nothing added.

Why: we agreed to prove the free reading experience first. The council's call was FIX FIRST — the book is the product, and until people actually read it, asking them to pay is premature. This round exists to make the free experience as good as it can be. If the reading experience works, the paid tier decision comes later, on a foundation of evidence rather than guesses.

## 6. How we'll know it worked

From a plain, non-technical checklist:

1. The site still works — nothing breaks when the dashboard moves to its own page.
2. The home page shows the book and nothing else — zero dashboard clutter for a new visitor.
3. The dashboard still works for returning readers — live streak and daily floors exactly as before.
4. The menu works on both phone and desktop — two layers, everything reachable.

If all four hold, this round is done.

---

*Next step: review this brief, then hand it to the build. The design is deliberately small — reshaping what exists, adding nothing.*