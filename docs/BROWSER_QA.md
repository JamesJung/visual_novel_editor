# Browser QA — 2026-10-25

Source baseline: caa65a0db29fe303178e277a9a88d8b88fb53d83 (main).
GitHub connector materialized the UTF-8 source because direct git transport was unavailable.
Served buildless index.html using the managed preview daemon; tested in the actual cloud Chrome browser.

## Reproduced and fixed

Remove both choices from the first scene, start/restart play, click 장면 종료.
Before: render treated empty playId/history as uninitialized and restarted scene_1.
After: explicit playStarted state separates not-started from ended; resetPlay initializes only on first entry or explicit restart. Terminal scenes enter history. Ended screen no longer overlays the missing-image hint.
Import/sample reset invalidates the prior play session.

## Checks

- Project: rename to StorySim QA, blur, reload; saved name retained.
- Sample reset: confirmation and replacement verified.
- Character studio: transparent 128×192 geometric PNG master uploaded.
- Same PNG uploaded as neutral and manually approved.
- 128×128 smile fixture produced size-mismatch warning and disabled approval.
- Scene editor: list and fields rendered; both choice deletions persisted to player and reproduced the defect.
- Player: initial terminal scene ends correctly after fix; explicit restart works.
- Sample branch: development choice increases product completeness 20→40, advances to scene_2; terminal exit records both scenes and shows game end.
- JSON export: browser download completed.
- Automated regression: node --test tests/player.test.cjs — 2 passed. Terminal regression failed before patch, passed after.

## Limits

AI generation, normalization, face consistency, immutable asset versions, server persistence and billing remain unimplemented prototype scope. Test fixtures are geometry only, not identity/face-quality evidence. No normalized output exists to compare. Mobile/DPR matrix and JSON import robustness were not verified in this pass.
Browser console showed extension metadata errors; those originate from chrome-extension content scripts, not this app.

Screenshots delivered separately: project, character studio, scene editor, player, plus pre-fix terminal reproduction.
