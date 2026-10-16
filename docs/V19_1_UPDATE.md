# v19.1 — User Schedules, Facemasks and Modded Equipment

## Patch notes

- Added **User Schedule Only** to Smart Force Win. Check your team's schedule without assigning results to unrelated CPU games. Multiple user teams are supported, and Next Playable Week follows their schedule, including bye weeks.
- Leg tattoos no longer change sock styles, including Crew Cut and Unlocked High Socks. Tattoos still run last; the existing bare-leg adjustment is unchanged.
- Commentary IDs now try the final component of a hyphenated surname when the complete surname has no exact match, including suffix handling. Full-name matches take priority; first names are not split. Reports identify these matches as `hyphen`.
- Added position-group facemask pools to Equipment Patcher. Keep one shared pool or choose different masks for QB, HB, FB, WR, TE, OL, EDGE, DT, LB, CB, FS, SS, and K/P.
- Facemask settings work with Repair Only and Apply My Mix, and are included in configuration presets and reports. Helmet corrections now show the previous facemask as well as the replacement.
- Unlocked and RAW equipment pools now have their own configuration windows: choose allowed items and whole-number chances for each category. Settings are saved in tool presets; empty selections and 0% turn off new additions in a category.
- Added RAW's Battle, Gear Pro-Tec, Gold Rush, X Tech and Xenith backplates. They are only added to outfits without a flak jacket.
- Added the optional Unlocked Sock Styles pass: Mid Socks become Crew Cut, and vanilla High Socks become Unlocked High Socks. These styles are also available in the Unlocked Randomizer pool.
- Tattoos now run after the other Patcher corrections. Their dedicated save slots stay separate from sleeves and socks; leg tattoos preserve sock styles and retain the existing bare-leg adjustment.

## Behavior and safeguards

User Schedule Only starts off. Turning it on removes the detected user teams from the default Teams to Skip selection; other exclusions still protect whole matchups. A user team can be added back to Teams to Skip deliberately. Turning the option off does not reset exclusions. Completed games, the active week, and other existing protections are unchanged. The option limits evaluation and new assignments, not the separate Clear Existing Force Wins action. With no detected user team, the UI disables the option and the backend rejects enabled requests rather than processing the whole league.

The backend derives controlled teams from the active save, using runtime team-table row references. Opponent ratings and league roster data remain available to the matchup model. CPU-only games do not enter the preview or consume random rolls. Preview/Apply still uses the approved plan and the existing backup/save-change checks. CSVs identify the chosen schedule mode, controlled teams, and ignored CPU game count.

In Helmets & Facemasks, choose a helmet and a position group. Groups inherit that helmet's All Positions Pool by default. Uncheck **Use the All Positions Pool for This Helmet** to edit a group override; check it again to restore inheritance. Overrides apply per helmet, independently of helmet percentage overrides. Empty pools cannot be saved. Compatible specialist masks remain available but start unchecked as before.

Older flat facemask presets are treated as All Positions pools. Shared equipment rows use only masks allowed by every linked position group. If those groups have no mask in common, the preview fails with an explanation before writing the save. No group silently receives a mask it excluded.

## RAW Accessories v2.0.4 catalog evidence

The supplied download is a valid 72,137,955-byte Frosty format-9 mod. SHA-256: `ec1c7f4ad5b15d5a06b4061080eb66485a17245599bbf51e37bebb090a332e91`. All 7,283 resource payloads are encrypted, so the manifest cannot verify new save-facing IDs, slot assignments, display labels, or colors by itself.

Compared with RAW 2.0.2, the new version adds resource entries for white Nike/Battle skullcaps and five backplates. The skullcaps were already supported. During this continuation, fresh live ItemInfo records verified the five backplate IDs and display labels, and they were added with a flak-jacket guard. Facepaint resource lists are unchanged. No encrypted-path names were guessed into save values, and no mod file is bundled with the app. See the [new gear catalog/evidence and manual-review notes](catalogs/gear-catalog-v19.1-additions.md).

## Mod-pool controls and pass order

The reusable allowlist in `core/modPools.js` drives the editor data, input validation, and Randomizer selections. Each category has its own independent 0–100% chance and item selection. Chances are not a distribution and need not total 100%. Chosen compatible items are equally likely. Existing brand/position/outfit checks remain active. Pool exclusions control newly generated additions; they do not remove an item already copied from a donor. Facepaint has a separate chance that the selected mod styles join the normal pool, preserving the normal 60% no-paint roll and slogan position rules. Neither enabled mod is required to have an equipped donor.

Legacy `expandedEquipmentPercent` config/presets still supply the default accessory chance for categories without an override. Missing categories use defaults; explicit empty lists disable additions. Each mod's JSON settings are independent. Saving one window does not overwrite the other. Cancel/Escape discard the draft; scoped reset applies only to that mod. Both mod flags still start off.

Unlocked Sock Styles starts off. When enabled with Mid-Sock Replacement, the new pass takes priority: it replaces the two specified vanilla sock styles instead of first rerolling mid socks to low socks. It covers OL as well, changes only InnerSocks, and leaves every other sock style alone. Tattoos are applied last, after the final compatibility and targeted sleeve/waist corrections. Existing tattoos are preserved; newly tattooed legs preserve socks and retain the existing bare-leg adjustment. Arm tattoos do not alter sock/elbow items.

CSV reports retain the exact before/after equipment JSON, changed slot audit, seed, resolved pool settings and every correction action. Preview/Apply continues to use the same cached plan and shared validated save writer.

## Release and rollback

App display version: 19.1. Installer/updater version: 19.1.0. Equipment Randomizer is 5.2, Equipment Patcher is 5.6, and Commentary ID Patcher is 2.1. This local update does not publish a GitHub release or replace the published v19.0.

Before editing, the v19.0 working source/build resources were saved with `node scripts/ui-snapshot.mjs create`: 629 verified files in `outputs/ui-rollback-5RS7V7`. That snapshot and the published GitHub tag `v19.0.0` remain rollback points.

## Validation results before this continuation

- `npm run test:source`: 478 tests passed.
- `node --test test/v191SaveWorkflow.test.js`: both new real-save tests passed. Repeated seeded Force Win previews matched; Apply preserved every CPU game and every other schedule field. The Patcher's QB/WR mask overrides matched the approved equipment rows after reopening. Backups matched the original files, and source fixtures were not modified.
- Full `npm test`: 557 checks passed; the older `v180SaveWorkflow.test.js` worker hit Node's approximately 4 GB heap limit before completing its two tests. Rerunning that file with `node --max-old-space-size=8192 --test --test-concurrency=1 test/v180SaveWorkflow.test.js` passed both. This was a test-resource failure, not a validation assertion or app save failure. Combined, all 559 functional checks passed; the initial full-run log still records the failed worker honestly.
- Development and packaged renderer smoke checks passed for all nine tool pages, including new position-pool inheritance/overrides, empty-pool validation, Cancel, reopening, preset round trips, User Schedule Only default protection removal, review text, and navigation persistence. Light/dark and narrow-window overflow checks also passed.
- Packaged EXE `--smoke-test` passed. Installer/portable builds completed. The release verifier checked all 420 packaged source/assets, bundled schemas/commentary map, and the installer's update-manifest size/SHA-512. Local upload copies are in `dist/v19.1-release/github-release-assets`; nothing was published.
- Setup EXE SHA-256: `498d38ce48b47f3a8e2934348512d5a78789f35aa70c8ff202b216f5da037426`.

Toolkit structural/save-reopen tests are not a substitute for loading the result in CFB 27. Test a copied dynasty in-game before publishing v19.1, particularly position-specific masks and user-only schedule assignments with the intended game/mod setup.

## Validation results for this continuation

- Fresh rollback snapshot: `outputs/ui-rollback-4V0wcz`, with 632 verified source/resource/build/script/test/doc files before this continuation. The earlier v19.0 snapshot and published tag are unchanged.
- Final `npm run test:source`: all 485 checks passed. Two older tests assumed the pools contained no sock/backplate generation categories; their expectations were updated to include and verify the new items without removing brand, compatibility, deterministic, or unrelated-slot assertions.
- Full serialized run with an 8 GB Node heap completed all 569 checks: 567 passed, and the only two failures were those old category-count expectations, loaded before their updates. Rerunning their two complete test files passed. Combined with the final source run, all 569 checks are covered successfully; `outputs/v191-pools-full-tests.log` retains the original failures honestly rather than being rewritten.
- All three new real-save workflows passed exact Preview/Apply/reopen, backup-hash, and full CSV audit checks: selected RAW/Unlocked pools, Unlocked sock priority, and combined socks plus final leg tattoos. Source fixtures were unchanged. Existing equipment serialization, overflow, packed-container, and staged-write safety regressions also passed.
- Development and packaged renderer smoke checks passed for all nine tool pages, including mod-pool Save/Cancel, invalid fractional chances, selected-item filtering, independence of the two mod drafts, navigation, and preset round trips. RAW/Unlocked windows were captured in both themes at 1480, 760, and 520 px; overflow checks passed and representative screenshots were inspected. The default pool JSON is about 12.5 KB, below the existing 250 KB preset limit.
- Fresh NSIS installer and portable builds completed. The verifier checked all 425 packaged source/assets, schemas, commentary map, and installer update-manifest size/SHA-512; local upload copies match. Packaged EXE startup smoke exited successfully using an isolated temporary user-data directory. Nothing was published.
- Installer: `dist/v19.1-release/Aces-CFB-Toolkit-Setup-19.1.0.exe`; SHA-256: `b83a54c614eaed7638259ace478c88bde4e6f473d18fd3649e7b0119d26870b9`.
- Portable: `dist/v19.1-release/Ace's CFB Toolkit 19.1.0.exe`; SHA-256: `dfb7512e3686826ab4bef1637a98a6bc5bb6f23f4601919cb6a07558e60ed3a7`.

Remaining manual review: load a copied dynasty with RAW 2.0.4 and Unlocked 0.96 and check the five backplates and two sock styles in-game. Exact IDs/display labels are verified, but their live slot-vector extraction was inconclusive; save slots use established toolkit conventions. These tests do not claim in-game appearance or fit validation.

## October 6 sock/name follow-up

- Removed only the tattoo pass's sock override. All existing sock styles and sock metadata remain unchanged, and a missing sock entry stays missing. Unlocked Sock Styles can therefore retain Crew Cut or Unlocked High Socks when a leg tattoo is added. Existing bare-leg handling and final tattoo pass order remain unchanged.
- Added exact final-component matching for hyphenated surnames after complete-name/suffix matching and before first-name fallback. ASCII and Unicode hyphens are supported. First names are not split. Preview summaries and CSVs identify hyphen matches separately.
- Tool versions: Randomizer 5.2, Patcher 5.6, Commentary IDs 2.1. App version remains 19.1.0.
- All 489 source checks passed, including full-name priority, suffix/hyphen combinations, missing/fixed/custom socks, and the positive hyphen match/apply audit counter. All three equipment Preview/Apply/reopen/backup/CSV workflows passed again. Development UI smoke checks passed across all nine tools and both themes. Earlier build hashes above describe the earlier continuation, not this rebuilt follow-up.
- Rebuilt installer and portable locally, with all 425 packaged source/assets matching the final source and installer update metadata verified. Packaged startup smoke passed with isolated user data. Current installer SHA-256: `3b66a20f836464ce1eb407503f92a36471f5e13cad308a7c7d6c72d369975890`. Nothing published.
- Packaged renderer smoke also passed for all nine tools, configuration interactions, previews, presets, and light/dark responsive checks.

## Configurable donor sources and mouthpiece styles

- Donor Settings now has cross-position source checkboxes for each receiving group: QB, HB, FB, WR, TE, OL, LB, DT, EDGE, CB, and S (FS/SS). Existing source groups and 10% cross / 30% multiple-donor defaults are retained. Empty or unavailable cross sources fall back to the usual same-position/position-family pool. Brand, body-type, roster, protected-player and deterministic-seed safeguards still apply to every mode.
- Donor source is independent of Top-Rated versus Choose Specific Players. Compatible CFB 27 Dynasty/RTG saves and College-27-RL roster containers can supply read-only equipment donors. RL1, RL2_5 and RL5 files were inspected and tested; older rosters' optional final terminator is accepted only at the exact end. The decoder remains bounded (four million nodes, depth 64, fixed inflate limits), rejects trailing data, and validates the named player/equipment structures. The existing position tabs, search, Overall sort, checkboxes, and Shift-click selection work for external files as well. Changing the source clears checked players. External selected-donor presets use compact source-hash-protected row identities, rather than storing thousands of labels. Browsing to the active file retains Active-Dynasty donor protection, including when upperclassmen are eligible receivers.
- Roster conversion uses verified CFB 27 SDK slot/position/body enums and player-to-blob identities. It preserves equipment blends and default ItemPalette color presets. Recipient identity, tattoos and loadout-level settings are not replaced with roster identity. Unknown equipment metadata excludes that donor with a diagnostic instead of silently dropping data; unsupported containers are rejected. Donor team classifications come from the donor file, not the recipient's team indexes.
- Mouthpiece Settings offers Current Defaults (unchanged brand-first behavior) or Custom by Position. Every group has an enable checkbox and whole-number Standard / Pacifier / Hanging percentages totaling 100%, plus Balance to 100%. QB and K/P start disabled but can be enabled. Add and Reroll use the same profile, colors, verified item pool and branded-frequency setting. Existing population limits and separate FBS/directional-FCS safeguards remain.
- Custom mode rolls style first. Since verified branded designs are hanging styles, branded frequency applies only after Hanging is chosen; it cannot override a Standard/Pacifier selection. Balaclavas allow hanging mouthpieces or none. If Hanging is 0%, masked players receive no mouthpiece and incompatible existing ones are cleared. This rule is shared by Randomizer, Patcher mouthpiece handling and the compatibility pass; ordinary turtlenecks are not masks.
- Reviews, help, presets and CSVs include the new source/group settings. CSVs retain exact before/after equipment JSON and metadata, with the external donor path, kind, fingerprint and exclusion diagnostics. Apply checks the donor fingerprint again before any backup or write. A changed donor source aborts safely, leaving the recipient unchanged.

Before this work, 641 source/resource/build/script/test/doc files were snapshotted in `outputs/ui-rollback-tklVbG`. App/tool versions remain 19.1.0 / Randomizer 5.2 / Patcher 5.6; this continuation does not publish a release.

Toolkit save-reopen tests prove exact serialization and backup behavior, not in-game appearance. Before release, load a copied dynasty with roster-donor equipment and check custom mouthpiece profiles with the intended game/mod setup. No user save or donor file was overwritten during testing.

### Validation for donor/mouthpiece changes

- Final portable source suite: 499/499 passed. Final affected safety/settings suites: 25/25 passed.
- Complete serialized 8 GB-heap run: 589/590 passed. It caught a regression in the legacy, color-only QB mouthpiece path. That path was restored without bypassing custom disabled-group settings; rerunning the entire affected safety/settings files passed. The original full-run log retains the failure honestly. Two additional older-roster workflows were then added and tested rather than claiming they were in that earlier run.
- Final real-file suite: 9/9 passed. Tests cover official and older roster donors, specific external roster/dynasty donors, custom cross sources, custom mouthpiece profiles, exact Preview/Apply/reopen comparisons, backup hashes, CSV audits, stale-donor rejection before writing, and active-file alias donor protection with upperclassman receivers. Three older rosters provide over 8,000 usable donors each. Inconsistent identities/classifications or duplicate equipment slots are reported and excluded, not silently repaired or copied.
- Development and packaged renderer checks passed across all nine available tools and Settings. Focused checks cover external roster loading, checkbox/position/Overall/Shift-click controls, source and selection persistence, Save/Cancel/Reset, custom-group validation, compact presets and no automatic tool execution. Desktop/narrow screenshots were inspected. Existing light/dark responsive checks passed.
- Installer and portable were rebuilt locally. The verifier checked all 431 packaged source/assets, bundled schemas/commentary map, installer manifest size/SHA-512 and matching local upload copies. Packaged startup smoke exited 0 with isolated user data. No GitHub release was published.
- Final Setup EXE SHA-256: `d7c3aeca2cd45e0213de0a80b3c56253f87dc070bbf3a3fd7059f68ee5a5819a`.
- Final portable EXE SHA-256: `65b0199bb763b796da6ece8daf51d75000a932c14000ad024915596d136b9bc3`.
