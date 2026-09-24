---
slug: teaching-milo-without-ai
date: 2026-09-24
title: "Teaching Milo to Live Without AI"
---

The easiest version of this feature would have been an LLM with a cartoon face.

I did not want that.

The core behaviour is a deterministic selector running on top of persistent state. Important context wins first:

1. milestone reaction
2. active focus session
3. recovery
4. night rest
5. chapter context
6. ambient behaviour

A Health chapter can make Milo stretch. Wealth can shift him toward the tiny ledger. Love can produce writing. Self can produce reading or thinking.

Idle behaviour is selected from a small authored pool using the companion seed and an idle tick. That means it can vary without becoming impossible to reproduce in tests.

The character itself is lightweight SVG/CSS. React changes semantic state; CSS owns the continuous motion. There is no animation-frame React render loop and no model request deciding where an arm should move.

I also removed negative relationship/confidence penalties from failed quizzes, interrupted sessions and broken streaks. Failure is useful input, but a self-improvement pet should not become an emotional punishment system.

AI can still be optional flavour elsewhere in Level Up. It is not the brain required to keep the companion alive.
