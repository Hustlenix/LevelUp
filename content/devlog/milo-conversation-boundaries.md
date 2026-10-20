---
slug: milo-conversation-boundaries
date: 2026-10-20
title: "Milo chat: state boundaries, quotas, and failure paths"
---

Milo's new Talk panel has two distinct sources: authored offline guidance and an optional Hack Club model endpoint. The UI labels which produced a reply. Cloud mode starts off, and a missing backend URL leaves the authored mode usable.

The companion reducer still owns earned state. A reply can suggest a next action or an allowlisted route, but cannot award points, finish work, or unlock furniture. Saving a suggestion goes through the same explicit button and Small Steps queue validator used by lessons. Chat history stays in component memory, outside exports and progress stores.

The server validates input lengths and response actions. It checks model pricing before a call, then uses one Redis Lua operation to reserve session, IP, global-request, and daily-cost allowances. This avoids concurrent serverless instances each assuming they have the whole budget. When Redis fails, the request stops before inference. Failed requests keep their reservation as a conservative bound.

The default model is explicitly selected; there is no silent paid fallback. Timeout, invalid JSON, changed pricing, and provider failure return the same bounded failure response. The browser then identifies its offline suggestion. No raw provider error or conversation is written to application logs.

Text sizing also changed at the architecture level: the root font sets the scale, fixed text sizes were converted to rem, and the manual's extra multiplier was removed. The same backed-up preference now covers forms and companion text. The optional walkthrough uses disposable React state, with a separate user action required to create a real saved action.

This work was AI-assisted with Codex. Simulated provider verification is not live provider quality proof. The public AI endpoint remains a separate release step requiring server configuration, intended-audience permission, and eligible-owner quality checks. See the repository's `docs/milo-release.md` for the limits and reproduction commands.
