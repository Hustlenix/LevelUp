# Connected practice — 20 October 2026

This update connects the existing lessons, practice library, Today workspace and Small Steps. It preserves the paper/charcoal theme and existing work in this checkout.

## What changed

- Every one of the 28 chapter companions can save its smallest first step as a next action. All 13 practice runners can save their first action too. A source link leads back to the chapter or library.
- Next actions appear on Today and in Small Steps. The list holds up to 20 actions, prevents duplicate captures, supports moving an action to first, and offers undo after removal. Opening an action parks the current draft, including its step index and return note. Running or paused blocks cannot be silently replaced.
- The practice library supports keyword search, filters by need and setup time, empty-result recovery, and links to continue drafts. Initially six cards are shown; all thirteen remain available. Setup times are editorial estimates, separate from practice duration.
- Original protocols are collapsed for scanning. A direct protocol anchor opens the matching entry; its full content and interactive runner remain available.
- Practice notes, checkboxes and record type save as local drafts, separately for each plan and chapter. Reloading or changing plans preserves them. Explicitly saving a practice record clears that draft and keeps the finished record visible. The Pomodoro timer still resets on navigation, as stated beside it; timer restoration is not part of this update.
- Drafts and queued actions are included in exports from both Backup and Progress. Invalid draft/queue data rejects an import before writes. Restore uses the existing rollback journal; legacy backups remain valid. Storage failures retain the draft in memory and show a warning to copy notes or export a backup.

## Storage and verification

Queued actions are optional fields in `levelup-small-steps-v1`, so existing records remain valid. Practice drafts use `levelup-practice-drafts-v1`, with a versioned and bounded schema. Existing optional cloud AI behavior is unchanged; the new workflow requires no AI, account or network request.

Run:

```sh
npm test
npm run lint
npm run build
node verify-connected-practice.mjs http://localhost:3113
node verify-small-steps.mjs http://localhost:3113
node verify-editorial.mjs http://localhost:3113
```

The connected-practice browser checks exercise actual lesson capture, Today discovery, safe task switching, removal/undo, filter recovery, draft reload and cross-tab synchronization, explicit record saving, four themes at four widths, both backup screens, simulated storage failure, keyboard focus handoff, and protocol deep links. Tests run in isolated browser contexts and do not modify the user's saved progress.

No commit, GitHub push or public deployment is part of this local update.

Verified on 20 October 2026: 202 unit tests, 48 connected-practice browser checks, 34 Small Steps browser checks and 96 editorial route/theme/width checks passed. Full lint plus targeted lint after final edits passed; the production build exported all 68 pages; `git diff --check` passed. Screenshots were inspected locally. Live cloud AI remains outside this verification.
