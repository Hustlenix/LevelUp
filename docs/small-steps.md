# Small Steps

Open `/small-steps/`, or use the link from Today or Focus. Write a task and one action, or pick an example. Choose 2, 5, 10, or 15 minutes. The timer pauses when the page is hidden; reopening a running record restores it paused. Timer expiry does not complete the action. Finish explicitly to record actual elapsed timer seconds. This is a practical task tool, not treatment or an assessment of attention.

Steps, the later pad, return note, and the latest 100 attempts stay in `levelup-small-steps-v1`. Full exports on both Backup and Progress include this record. Imports validate it before any writes and use the existing rollback journal. Older backups remain supported. A storage error offers a recovery download. A visited page and its assets can be reopened offline after the service worker has cached them.

## Optional owner-only AI prototype

The public static website works without AI. Only a loopback preview shows the optional helper controls. This helper is for a single eligible Hack Club account owner, not a public proxy. Read [Hack Club rules](https://docs.ai.hackclub.com/guide/rules.html): teens 18 and under; no coding-agent use; no sharing access with ineligible users. Do not deploy or expose the helper through a tunnel or LAN binding.

Rotate any key previously shared in chat. Put the replacement in an ignored `.env.small-steps` file on your computer:

```dotenv
HACKCLUB_AI_KEY=your_rotated_key
SMALL_STEPS_ELIGIBLE_OWNER=true
SMALL_STEPS_ORIGIN=http://localhost:3113
```

Start manually using Node 24:

```sh
node --env-file=.env.small-steps scripts/small-steps-helper.mjs
```

The exact preview origin must match `SMALL_STEPS_ORIGIN`. The helper binds only `127.0.0.1:3114`, validates Host and Origin, limits requests, accepts only a task up to 240 characters, and never accepts a model, URL, tools, history, or custom system prompt. It sends the task only after the user clicks the disclosure button. No key enters browser code, browser storage, backups, or logs.

The fixed `liquid/lfm-2.5-2.6b:free` model is checked against the public model catalog before every request. Nonzero or missing pricing disables the request; there is no paid fallback or automatic retry. A shared ten-second deadline covers catalog and generation. Invalid, refused, or incomplete output returns to manual steps. A system instruction limits the intended use to ordinary everyday tasks; model output is still untrusted and must be reviewed. Prompt instructions are not a guarantee of safety or quality.

Tests use a fake provider and synthetic keys. No live authenticated provider calls are made by Codex. Before enabling this personally, the eligible owner should try homework, reading, tidying and message tasks and check that suggestions are short, concrete and safe. Keep manual mode if quality is inadequate.

## Verification

`node --test tests/smallSteps.test.mjs tests/smallSteps-helper.test.mjs`

`node verify-small-steps.mjs http://localhost:3113`

Also run the repository lint, unit suite and production build. Browser checks use isolated contexts and never edit the user's stored progress.

Verified locally on 2026-10-11: lint passed; 191 unit tests passed; production export generated 68 pages; 34 Small Steps browser checks and 96 existing editorial route/theme/width checks passed. The Small Steps checks cover reload, idempotent attempt logging, four themes at 320/375/768/1440px, recovery download after a simulated quota error, offline reopening, and both backup import/export surfaces. No authenticated provider request, GitHub push, or public deployment was performed. Live AI suggestion quality remains an owner-run check.
