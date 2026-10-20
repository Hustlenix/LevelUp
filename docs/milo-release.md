# Milo and usability release

## What owns state

The companion reducer continues to own traits, milestones and room objects. Chat never imports its mutation functions. `MiloTalk` keeps a maximum of six messages in React memory; closing the panel clears that conversation. The optional task attachment reads only the current Small Steps task. The summary attachment contains counts, not notes. Both are previewed before sending. Suggested saves use the existing `SaveAction` button and queue validator; model output never writes to storage directly.

## Cloud setup and release boundary

The static Next export remains suitable for GitHub Pages. `services/milo` is a separate Vercel project, with its root directory set to that folder. Configure the server variables described in its `.env.example`, using a newly rotated Hack Club key and a random strong hash secret. Configure an Upstash Redis REST database and restrict `MILO_ALLOWED_ORIGINS` to the frontend origins (origins do not include `/LevelUp`). Do not put secrets in `NEXT_PUBLIC_` variables, logs, screenshots, or backups.

`MILO_PUBLIC_APPROVED` defaults off. Enable it only after Hack Club confirms the intended audience is permitted and an eligible owner has checked live response quality. Its [published rules](https://docs.ai.hackclub.com/guide/rules.html) restrict eligibility and sharing access. No authenticated provider request has been made by Codex. Public setup is intentionally separate from local verification.

Set `NEXT_PUBLIC_MILO_API_URL` to the deployed HTTPS `/api/milo/chat` URL before building the frontend. With no URL the Talk tab clearly labels authored offline guidance. The GitHub Pages build can receive this public URL via its repository variable. There is no secret field in the website.

## Limits and failure paths

The server accepts 500-character messages, six bounded history messages, and 500 characters of explicitly selected context. Output is limited to 300 tokens, 1,200 characters, and two validated actions. Only known internal destinations or a 240-character next action are accepted. No tools or arbitrary model/provider URL is accepted from the browser.

Before each call the server verifies the selected model in Hack Club's public catalog. Free-model pricing must remain zero. The optional explicitly configured nano model must remain at or below $0.10/$0.40 per million input/output tokens. There is no automatic fallback model. An atomic Redis Lua reservation checks all ceilings before incrementing: two requests per minute per browser session, ten per day per session, forty per IP per day, five hundred globally per day, and one dollar per UTC day. IP and session identifiers are HMAC hashed with the UTC date; daily keys expire within 25 hours. Failed calls are conservatively not refunded. Session storage is not authentication; the IP and global ceilings provide additional bounds. CORS is not an authentication mechanism.

Redis failures, price changes, invalid output, timeouts, and provider errors fail closed and return a generic failure. The UI labels the authored offline fallback. No message content is logged or retained by this application; infrastructure and upstream providers have their own retention policies. Do not enable body logging on the hosting platform.

## Accessibility, onboarding and offline use

Text sizing uses the existing backed-up reader-scale key, extended to 150%. Root font sizing and rem-based text allow one scale across the interface and manual; the prose no longer multiplies it again. Old 85% backups remain valid. The theme palettes are shared CSS tokens. The tour uses component-local fixtures; only its final explicit Save button touches real actions. A local seen flag controls its invitation.

PWA icons are generated from a source SVG in `scripts/build-install-icons.mjs`. Install UI appears in Settings. The service worker is enabled in production on HTTPS or localhost, so the exported build can be tested offline. Previously visited assets are cached; never promise a page works offline before it has loaded online. Chat POST requests bypass caching. Native app-store publication is outside this release.

## Verification commands

`node --test services/milo/tests/chat.test.mjs` exercises simulated provider failures and validation. `node verify-milo-release.mjs http://localhost:3116` exercises the exported UI, isolated tour, typography, themes, and offline behavior. Run `npm test`, `npm run lint`, and `npm run build` for the repository baseline. Browser QA uses fresh contexts, never the owner's existing local progress.

Live cloud quality, real Redis deployment, browser-native installation acceptance, and public deployment must be reported separately from these local checks.

## Local verification, 2026-10-20

- Production export: 68 pages built successfully, including TypeScript checks.
- Repository unit tests: 202 passed; backend validation and failure tests: 8 passed.
- Milo release browser suite: 109 passed, including isolated tour state, text scaling, theme layouts, and previously visited Small Steps working offline.
- Simulated cloud browser suite: 14 passed. These intercept a test endpoint; they are not proof of a live provider integration.
- Refreshed desktop and mobile README screenshots from the exported site.
- Broader editorial checks exposed duplicate Settings headings and insufficient Deep Work secondary-text/accent contrast; both were corrected.
- Editorial browser rerun: all 96 route/theme/width checks passed after those corrections.

This implementation was AI-assisted with Codex. The architecture and verification notes describe the code and observed tests, not a fabricated personal development narrative.

## Integration with LifeOS and Nexus

The integrated app keeps mission onboarding, XP, skill paths, and Nexus replication. Today also shows saved lesson actions and the daily ritual. Tools links connect Small Steps, habits, practice plans, the manual, and Nexus. The detailed reading/focus record remains available under Progress and loads when expanded.

Both backup surfaces export and restore the Nexus replica and materialized mission state alongside habits, Small Steps, and practice drafts. The combined backup test covers all five stores, 150% text preferences, and rollback after a late Nexus write fails. Existing storage keys remain unchanged. App surfaces use the shared theme tokens and rem-based text. The service worker cache is v4 and includes both sets of routes.

Integration checks: `node verify-integration.mjs http://localhost:3116` covers saved lesson actions appearing on Today, the ritual, a combined browser backup round trip, and nine routes at 150% across four themes and three widths. `verify-release.mjs` also checks the mission loop, Nexus partition convergence, encrypted export, and restored progress.
