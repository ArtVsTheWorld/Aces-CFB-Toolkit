# v0.18.3 — Equipment Save Compatibility

This records the earlier fixed equipment-pool investigation. The final **v18.3** build also fixes packed-container growth; see [the final release notes](V18_3_UPDATE.md) for current verification and release files.

## User-facing patch notes

- Fixed an equipment-save issue that could make a dynasty crash on load even after Toolkit reported a successful Apply.
- Randomizer and Patcher now keep equipment inside the game's original storage limits while safely separating shared equipment data.
- Added stronger checks for storage size, equipment references, and available storage before replacing a save. Backups and exact Preview matching remain enabled.
- Equipment settings, generation rules, and supported teams are unchanged. No FCS-history saves or individual players are blacklisted.

If a dynasty was affected by v0.18.2, restore its working backup from before the equipment run and rerun Preview/Apply with v0.18.3. Do not use the crashing file as the new starting point. Updating the app alone does not repair an already-written save.

## Confirmed cause

The v0.18.2 shared writer correctly detected physical equipment aliases but detached them by appending new fixed-size blocks to CharacterVisuals. It increased the blob/table length headers without increasing the record capacity. This created a layout the library could read through its pointers, but the game could not safely load.

The supplied working saves reserve 18,000 equipment blocks of 377 bytes each (375 bytes plus the size header): **6,786,000 bytes**. The fix derives this limit from the actual schema and table metadata; those values are not hardcoded.

| Save pair | Actual logical loadouts changed | Blocks appended beyond capacity in v0.18.2 | Invalid pool growth |
| --- | ---: | ---: | ---: |
| CHEE / WR | 1,213 | 56 | 21,112 bytes |
| WK / TE | 573 | 22 | 8,294 bytes |

Both pairs changed only CharacterVisuals; every other table was byte-identical. Their working backups had bounded, aligned pointers and the original pool size. WK had no overflow allocations/releases or free-list changes, isolating the failure from overflow allocation itself. CHEE also had normal spill allocation/release changes, but those were not necessary to reproduce the crash.

### Independent in-game isolation

Two diagnostic copies retained **exactly every equipment value** from the crashing post-Randomizer saves, along with their player references, overflow links, and all other tables. Only out-of-pool physical blocks were relocated into unused blocks within the original pool and the pool length restored. The user confirmed that **both copies load in-game**.

This establishes that the storage expansion—not the chosen equipment, an older game update, or the presence of 266 teams—caused these crashes. External donors can expose additional aliases because their protected donor rows are in another save; external donor usage is supported and does not require a restriction.

## Shared fix and validation

`visualStorage.js` tracks physical occupancy and claims on every canonical block, including partially overlapping spans. Shared/overlapping main blocks and continuation blocks detach into unused physical cells **inside the existing pool**. A row's normal cell is preferred when available; otherwise another unclaimed cell is used. Unique blocks remain in place. The writer never appends storage.

If no safe block or overflow record is available, encoding is oversized/lossy, or a reference is invalid, Apply fails without publishing a candidate. Existing handling of continuation-frame residue, legitimate shared tails, free-list allocation/release, and full-capacity spill blocks is retained.

New layout validation runs when equipment is opened, before candidate serialization, and after reopening the candidate. It verifies:

- Actual and declared pool length equal schema block size × record capacity.
- Record-count metadata agrees with the preallocated pool.
- Every allocated block fits entirely inside that pool.
- Free-row links are bounded, acyclic, refer only to empty rows, and reach every free row.
- Fixed storage metadata is unchanged through Apply.

These checks supplement—not replace—the existing semantic codec checks, exact planned/unplanned loadout comparisons, opaque-row protection, unchanged-other-table checks, original-file hash checks, backups, temporary-candidate validation, and atomic publication.

## Full-save regression results

`scripts/validate-v183-equipment.mjs` performed six successful save-copy scenarios:

- Exact historical mutation replay through the production shared Apply path: CHEE **1,213** loadouts; WK **573**. Every reopened logical equipment value matches the supplied post-save, with fixed storage bounds and all other tables unchanged. Reapplying a no-change plan leaves the file byte-identical and makes no backup.
- Every table in the WK production replay is byte-identical to the storage-only copy already confirmed to load in-game. CHEE's logical gear is identical, but its production replay can use a different valid overflow allocation order; an additional in-game check of the production replay was requested.
- Fresh external-donor runs using the supplied scope/chance settings and a separate copy of each working backup as donor: CHEE WR **1,213** changes; WK TE **573** changes.
- Equivalent normal vanilla dynasty with a separate donor save: WR **1,099** changes; TE **613** changes.
- All fresh seeded analyses reproduced exactly. Preview did not modify a save or create a backup. Apply's backup hash matched the original, donors remained read-only, and no candidate files remained.

Artifacts: `outputs/v183-verified-I0l1Yf`. The read-only pair audit and complete field comparisons are in `outputs/v183-pair-audit-YRRE3I`; in-game isolation probes are in `outputs/v183-storage-probes-2RoRxm`.

Cash's actual DYNASTY-COPYTEST donor file and random seed were not supplied. The exact historical equipment changes were replayed directly, rather than claiming to have reconstructed the unavailable donor selection. Separate-donor tests exercise the same supported path with verified inputs.

## Automated tests and release

- Automated suite: **445 passed, 0 failed, 0 cancelled, 0 skipped**, using `node --test --test-concurrency=2 test/*.test.js` (211 seconds). All 441 previous tests remain passing; four new structural tests cover parser-readable pool expansion, out-of-bounds offsets, fixed metadata/free-list violations, and an alias whose preferred relocation cell belongs to another row. Existing alias/spill tests now also assert unchanged pool size and bounded pointers.
- Development and packaged UI smoke tests passed, including configuration persistence through Preview/Apply and forward/back navigation, reset/session behavior, Home, Team Boost, and NIL Toggle.
- Packaged startup passed. The real NSIS updater downloaded the v0.18.3 installer from a loopback feed, verified its SHA-512, rejected an intentionally incorrect checksum, and did not install/restart.
- The packaged shared storage and validation sources exactly match the tested source. The archive has app version 0.18.3 and does not include personal data or diagnosis outputs.
- The earlier SEASON-BACKUP-100126 Patcher case passed again: **12,136** exact loadout assignments, including the originally reported row 129. All planned/unplanned rows and every other table matched, Preview was read-only, and its backup matched the original. Trace artifacts: `outputs/v182-season-patcher-9xmPEQ`.
- The earlier Astro mouthpiece-release case passed with **10,273** assignments, and Astro's broad all-passes Patcher run passed with **11,463**. Both verified seeded repeats, read-only Preview, exact reopened gear, matching backups, unchanged Player/Team data, and a subsequent Preview. Broad-run artifacts: `outputs/v182-validated-saves-9cxC2W`.
- The earlier CHEE broad Randomizer case passed with **10,681** assignments, including the previously failing shared row. Seeded repeats, matching backup, exact planned/unplanned reopened gear, unchanged Player/Team data, and a follow-up Preview all passed. Artifacts: `outputs/v182-validated-saves-lajfWV`.

One combined broad diagnostic batch exhausted the command-line Node heap after its first successful scenario. Large full-save checks were rerun in separate processes with an 8 GB diagnostic heap allowance; this is a test-harness execution adjustment, not a change to the app's equipment algorithms or validation. No supplied file was written by the failed batch.

The Windows NSIS installer is built locally as **v0.18.3**. Both equipment tool versions remain v5.0; this is a shared serialization correction, not a generation-algorithm update. Personal settings, saves, reports, and diagnostic artifacts are not packaged. Legacy scripts and launchers remain untouched.

Upload the matching Setup EXE, EXE.blockmap, and latest.yml from `dist/v0.18.3-installer/github-release-assets` together under release tag **v0.18.3**. The build does not publish anything automatically. Do not upload the superseded v0.18.2 installer.
