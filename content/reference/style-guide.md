# Style Guide — Chapter Authoring (MANDATORY)

You are writing chapters of a book-like self-development website. Every chapter must read like a
chapter from a well-edited book: rich, specific, warm, honest, and intellectually rigorous.

## Golden rules

1. **Never invent citations, studies, numbers, or quotes.** You may ONLY use facts from
   `content/reference/verified-facts.md`. If a fact isn't there, don't use it.
2. **Verification discipline:** when a claim from the original trainings is scientifically
   weak (grade C/D in verified-facts.md), present it honestly — e.g. "the trainings call this X;
   the evidence supports the direction, not the number." Never state a weak claim as proven fact.
3. **No emojis. No clichés.** No "unleash your potential" filler. Write like a serious author.
4. **Concrete > abstract.** Every abstract claim gets an example, a mechanism, or a scene.
5. **No medical/financial guarantees.** Add the disclaimer spirit: "not medical advice" only
   where health content appears; keep it subtle, one line.
6. **British-leaning neutral English**, present tense, second person ("you") for direct address.
7. **Tone:** mentor-author. Earnest, precise, a little poetic, zero hype.

## File format

One file per chapter at `content/chapters/<slug>.md`. Structure:

```markdown
---
slug: belief-engineers-reality
number: 1
title: Belief Engineers Your Reality
pillar: self            # health | wealth | love | self
duration: "12 min"
teaser: One sentence for the table of contents (max 24 words).
keyConcepts: [Self-Fulfilling Loop, Placebo Effect, Attention Filter]
studies:
  - name: Crum & Langer (2007)
    grade: A
  - name: Crum et al. (2011)
    grade: A
protocols: [Belief Audit, Morning Calibration]   # exact protocol titles from the spec
quotes:
  - "Text of one strong pull-quote from the chapter's own prose."
---

## Overview
Two or three paragraphs that open the chapter like a book. Set the scene, name the promise,
foreshadow the mechanism. No bullet points here.

## 01 — <Section Title>
Prose. 2–4 paragraphs. Use `###` for sub-points only when necessary.

## 02 — <Section Title>
...

## Key Ideas
A tight bulleted summary, 4–7 bullets, one line each.

## Apply Today
Numbered actions, 3–6 steps, each concrete and doable within a day.

## The Science
One paragraph per study listed in the spec's frontmatter. State: what was done, what was found,
what it does and does not license. Cite as "Crum and Langer (2007) showed..."
```

## Conventions

- Word count: **750–1,150 words** of body prose (excludes frontmatter and Apply Today list).
- Section titles: numbered `01`, `02`, ... with real titles, e.g. `## 01 — The Filter You Never Chose`.
- 3–6 sections between Overview and Key Ideas.
- Use blockquotes sparingly (max 2 per chapter) for a striking line of prose from the chapter.
- `studies:` grade values are ONLY: A, B, C, D, or compound like "A (behavior) / D (mechanism)".
  Use exactly what the spec gives you.
- `protocols:` use the exact protocol titles from the spec (see verified-facts.md §Protocols).

## Pillars and their colors
- `health` — body, energy, discipline, nervous system
- `wealth` — work, skill, business, compounding
- `love` — relationships, values, life design
- `self` — belief, identity, mind, manifestation
Choose the pillar your spec assigns; do not change it.

## Checklist before finishing
- [ ] Frontmatter exactly matches the spec (slug, number, title, pillar, duration, keyConcepts, studies, protocols).
- [ ] Every factual claim traceable to verified-facts.md.
- [ ] Word count within range.
- [ ] No invented names, papers, percentages, or anecdotes.
- [ ] Reads like a book chapter, not a blog listicle.
