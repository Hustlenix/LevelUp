---
slug: eight-hours-two-fewer-things
date: 2026-08-19
title: Eight Hours, Two Fewer Things
---

"Simplify the home page." That was the assignment. Eight hours later, the page
has a privacy badge, a hue that shifts with the clock, and two fewer visible
things than it could have had. This is the story of how that happened, and it
is not a story about restraint. Not at first.

We already told you about the declutter: the hero contents box came out, the
four parts of the book moved into the nav as an accordion, and every element
left on the page had to answer a question the reader actually asked (commit
14400ef). Then the scorecard push landed - knowledge checks, themes, badges,
offline support, even this devlog - and the home page started feeling like the
plain cousin at a loud party. A reader said it still read as boring. Fair. So
we asked the dangerous question: how do we make it feel *alive*?

That question produced a design brief with roughly twenty-six answers. A
dynamic hero momentum card. A visual pillar constellation. Micro-interactions,
scroll-triggered typography, a breathing background gradient, an activity
heatmap, an inline quiz widget, an XP header, a time-of-day aesthetic shift, a
privacy badge. All of it local-first by construction: the site is a Next.js 16
static export to GitHub Pages (basePath /LevelUp), so anything "alive" has to
come from the browser's own localStorage - keys like `levelup-streak-v1` and
`levelup-quiz-v1` - zero APIs, zero telemetry.

Then came the QuoteCard.

- Commit 6601138 added it: a React 19 client component that fetches
  `/data/quotes.json` on mount, picks a random quote, and renders it with a
  "Read chapter" link. Locally: build green, 22/22 tests, eslint clean.
- GitHub Actions failed eight times in a row. The same phantom TypeScript
  error every run: TS7006, parameter 'array' implicitly has an 'any' type.
- The spiral: a type fix, a @ts-ignore, a @ts-nocheck, then empty commits to
  force re-runs. The commit messages tell the story honestly: "force CI
  re-run", "another CI trigger", "force CI re-re-re-run". Every re-run failed
  identically while the same tree passed locally.

It was never a code bug. It was the environment disagreeing with us, and it
ate a day before we accepted that.

What actually shipped was restraint (commit 13e3391): a **PrivacyBadge**
-"100% Private · On-Device Storage Only", shown once per session after two
seconds - and a **ThemeTimeShift**, a tiny client component that reads the
clock once on mount and nudges the `--hue` CSS variable from crisp and bright
in the morning toward moody and calm at night. Two small things. The 26-idea
brief was cut to four priorities, and only two shipped. The quote card that
cost us a day of CI is not even on the page anymore; it was deleted in
commit 13e3391.

Eight hours, two additions, and two fewer things than we could have shipped.
We are prouder of what we did not build than of what we did. The rule:
subtraction is a loop, not a one-time cleanup - and stopping, with the brief
still on the table, is the feature.