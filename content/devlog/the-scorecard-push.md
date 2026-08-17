---
slug: the-scorecard-push
date: 2026-08-17
title: The Scorecard Push
---

Every chapter used to be a wall of text with a scroll bar. This update turned
the reading experience into something a reader can *do* things with:

- **Knowledge checks** — each chapter ends with three questions drawn from its
  own key concepts, evidence grades, and protocols, plus a reflection prompt.
  No API, no accounts: the questions are generated deterministically at build
  time and the answers are checked locally.
- **Text highlighting** — select a passage, mark it, and it stays highlighted.
- **A scroll-spy table of contents** — the chapter sidebar now follows you down
  the page.
- **J and K keyboard shortcuts** — flip between chapters without touching the
  mouse.
- **Group banners** — the four parts of the book announce themselves at chapters
  1, 12, 16, and 21.
- **Backup & restore** — export your progress, highlights, quiz scores, and
  reflections as a JSON file; import them on any other device.
- **Levels and badges** — local gamification with honest rules: XP for chapters,
  quizzes, highlights, and reflections; nine badges from First Step to
  Quiz Master.
- **Reader themes** — Light, Dark, Deep Work (low-glare sepia), and Cyberpunk.
- **Offline support** — a service worker precaches the shell and data so the
  book works without a connection.
- **A devlog** — this page, because a book about evidence should show its work.

Everything is derived from real chapter data, everything is local-first, and
nothing phones home.

### Before and after

The home page before this push (the first version shipped with the book) and
after the declutter:

![Home page before the declutter](/devlog/before-home.png)

![Home page after the declutter](/devlog/after-home.png)