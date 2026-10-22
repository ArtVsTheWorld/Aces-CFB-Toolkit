# v21.5 local test build

App version: **21.5.0** (displayed as **v21.5**). This is an unpublished unpacked Windows x64 test build, not an installer release.

Run `dist/v21.5-equipment-truck/win-unpacked/Ace's CFB Toolkit.exe` from its folder. This includes the verified Equipment Truck support and the earlier roster integrity fix. It supersedes `dist/v21.5-roster-fix` and the earlier `dist/v21.5-test` build. Keep the rest of `win-unpacked` alongside the EXE. Close any already-running Toolkit first so its single-instance handling does not redirect you to an older build.

## Checks completed

- `npm run test:source`: **711 passed, 0 failed**.
- Equipment Truck: **5 additional copied-save workflows passed** using GEARTRUCK. Four full recolor themes and one Truck-enabled Randomizer run verified exact Preview/Apply/reopen, deterministic seeded replay, backup equality, untouched other tables, readable reports and original-save protection.
- Equipment Truck packaged UI: default off/hidden controls, all 12 sleeves and two visors, independent category chances, whole-number validation, Cancel isolation, saved settings, preset round trips, Review summaries and navigation persistence passed. The configuration window and labels fit 1480px, 760px and 520px widths.
- Copied-save/game-written fixture workflows: **5 passed**. Mapper covers deterministic previews, exact Apply/reopen, backup equality, stale-preview and repeated-Apply rejection, an originally implicit facemask replacement, and original fixture protection.
- Play Now roster workflow: generated LSU's 85 players in a copy of ROSTER-Official, then verified Apply/reopen, exact backup, fixed file capacity, preserved immutable header metadata, refreshed length/checksum, entity links, untouched players, coach blobs, teams and depth-chart data.
- Both original Official and game-written ONEEDIT verify against the CRC-32/BZIP2 checksum. Stale checksums, same-length edits and nested appearance-gzip changes are covered by regression tests.
- Paired-item rules, per-team replacement caps, coach exclusions, readable labels, typed roster round trips and malformed/over-capacity container rejection passed focused regression tests.
- Copied-save two-team Roster Generator workflow: seeded player NIL redistribution, exact original team totals retained, tampered NIL proposal rejected before a write, successful Apply/reopen and backup verification.
- Seeded complete brother generation and replay validation, including a changed-family-hometown rejection.
- Existing app-wide configuration smoke: Save/Cancel/Escape, defaults, controls, presets, navigation, light/dark, small windows, and icon checks passed.
- Packaged renderer/preload/**packaged tool handlers**: grouped helmets/backplates/waist gear, compact bilateral items, pagination, previously missing implicit facemasks, non-active saved sources, exact-side replacement restrictions, compact Copy From Player, no section-jump links or nested modals, actual Mapper Preview/Apply/backup, batch presets, draft cancellation, card/table switching, roster cards and expandable technical details passed.
- Equipment Mapper rule and replacement-picker width checks passed at 760px and 520px. Library screenshots cover light and dark themes.
- Packaged UI checks also verified default paired gloves, observed partner selectors and saving a 40% replacement cap.
- All **497 packaged source/assets** matched working source; schema, commentary map and package version matched as well.

The packaged `resources/app.asar` SHA-256 is:

`9E78C5CA6A615BAB1A6E29320167C5B0B1A96DDD19CEBA61AC0E96E0B667905A`

Local verification logs are under `outputs/v215-*`; those logs, test copies, screenshots, and build outputs are not distributed as source. Test saves and test settings were isolated from the originals.

## Remaining manual testing

Load copied generated/mapped dynasties in-game and inspect intended gear combinations. Unknown custom equipment and external-mod visual conflicts cannot all be proven from save data alone. Shared CharacterVisuals and detected compatibility conflicts intentionally block Mapper Apply until the rules or targets are changed. Original saves must remain backed up.

The user confirmed that `outputs/v215-roster-integrity-fixed-tHktFP/ROSTER-LSU-FIXED` displays the game's successful-load message and shows generated LSU quarterback Gage Vedvik. It retains every original LSU generation change; only four checksum bytes differ from the previously rejected HEADERTEST. ROSTER-Official remains unchanged. The earlier uncorrected test copies should not be used.

Nothing was pushed to GitHub or published by these build/test steps. The prior public release remains unchanged. Draft notes are in `RELEASE_NOTES_V21_5.md`; architecture and behavior are documented in `V21_5_UPDATE.md`.
