# LevelUp visual direction

The October 1 local revision corrects the mint-green, soft dashboard styling. Keep the manual's identity visible instead of making the product look like a generic wellness app.

- Light: warm paper, dark ink, restrained brass accents.
- Dark: neutral charcoal, warm white text, brass accents. No green-tinted base surfaces.
- Source Serif headings and wordmark; sans-serif controls and supporting copy.
- Small corner radii, thin rules, flat surfaces. No decorative hero gradients or oversized pastel icon shapes.
- Describe what the product actually does: chapters, focus blocks, practice plans, goals, habits, reviews. Avoid motivational filler.
- Progress leads with recorded results. Milestones, reading badges, and the chapter ledger remain available through labelled, keyboard-accessible disclosure controls.
- Preserve saved theme IDs, local data, feature behavior, and accessibility. Deep Work and Cyberpunk remain explicit user choices.

## Local verification

Serve the static export before running browser checks:

```text
node scripts/serve-static.mjs out 3113
node verify-editorial.mjs http://localhost:3113 [optional screenshot directory]
node verify-design.mjs http://localhost:3113
node verify-habits.mjs http://localhost:3113
PLAYWRIGHT_BASE_URL=http://localhost:3113 node verify-release.mjs
```

The editorial check covers six routes, four themes, and four viewport widths (96 combinations), serif headings, preserved theme selections, 4.5:1 minimum primary text-token contrast against the page background, milestone disclosure, and the chapter ledger's mark-read/undo controls. This is not a full accessibility audit or a claim that every text/surface combination has been measured.

Changes remain local for review. No GitHub push or deployment is part of this revision.
