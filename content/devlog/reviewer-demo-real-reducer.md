---
slug: reviewer-demo-real-reducer
date: 2026-09-24
title: "A One-Minute Demo Without Faking the Engine"
---

A persistent companion has a demo problem: the interesting version gets better after the user has accumulated real history.

A reviewer should not need five focus sessions and a week of progress to see that.

The Companion Space now includes a disposable reviewer fixture. It uses the **same production reducer** as the saved companion, but starts from a deterministic in-memory state and never overwrites the user's local record.

The demo steps are deliberately small:

- start focus
- complete focus
- open a Health chapter
- complete the chapter
- reach a roadmap milestone

The fixture starts one focus session below the desk-lamp threshold. Completing the demo session therefore produces a visible room change immediately while still exercising the real unlock rule.

The Engine tab shows the resulting traits, current behaviour, route/context and event journal. The goal is not a staged video trick. It is to let somebody inspect the system while it is happening.

This also became a useful development tool. When a room object does not appear, the question is no longer "did the animation break?" It is "what event entered the reducer, what state came out, and which unlock rule qualified?"
