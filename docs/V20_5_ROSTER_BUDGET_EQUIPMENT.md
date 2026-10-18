# v20.5 — talent budget and active-save equipment

This follow-up supersedes the previous independent position-strength sliders and sampled 2032 equipment loadouts in the app.

## UI and appearance

- Removed the requested top notices from NIL Toggle and Roster Generator. Apply confirmation and safety checks remain.
- Removed behind-the-scenes name/sample descriptions from appearance preferences. Standard, Big Sky and HBCU now use plain lighter/darker wording.
- HBCU tone weights are 98.5% tone 7, 1% tone 6 and 0.5% across 4/5/8. Tones 1–3 are not selected. The actual result varies by run and available same-position appearances.

## One linked talent budget

Position sliders now represent whole-number shares totaling 100%. Raising a share redistributes the remainder proportionally across other eligible groups; other sliders and colored change indicators update immediately. Reset restores the default mix; Cancel discards draft changes. Missing groups are disabled. Saved settings/presets retain the shared mix, and older strength-offset presets are translated on load.

The shared browser/backend implementation is `src/shared/rosterTalent.cjs`, not two separate calculations. Default shares reflect player counts and the requested importance ranking. The relative cost coefficients chosen for this implementation are QB 6, EDGE 3, OL 2.6, CB 2.2, WR 2, DT 1.8, LB 1.6, HB 1.4, SS 1.2, FS 1.1, TE 1, K/P 0.55 and FB 0.25. These are design weights, not measured game statistics.

One rating point for an expensive position consumes more allocation than one for a cheap position. A larger group also costs more. The rating projection preserves the preset's **arithmetic mean player OVR**, rather than silently changing it to an importance-weighted team rating. Bounds and observed profile constraints can prevent exact group targets; Preview continues to show requested versus actual group means and blocks an unreachable roster mean. Shares assigned to positions absent from a particular selected team are redistributed among present groups; if none of the requested groups exists, that team uses its neutral default.

## Equipment generation

The app now calls the actual Equipment Randomizer's `patchFreshmanEquipment`, not a reimplementation:

- Top 20 eligible active-save donors per position; same donor eligibility/ranking as Randomizer (rostered, usable visuals, upperclassmen, existing FCS exclusions).
- Normal default mixing: 30% multiple-donor, 10% cross-position, remainder single-donor, with the same position-family/source rules.
- Unlocked additions, RAW additions and No Drip are off. Gear already present on a donor can still be copied, just as in the normal Randomizer; this is not a separate mod-removal pass.
- Same brand-sensitive donor substitutions, facepaint generation, sleeve/body compatibility, pants handling and other final guards.
- Generated head/body packages remain intact. As in Randomizer, body-dependent gear can be retained when donor/receiver builds differ.

Donors are prepared from the unchanged active save. Every receiver uses isolated plain records and visual objects. This avoids mutating source donors and lets selected original top donors receive newly generated gear too. The only shared Randomizer addition is an internal optional prepared-donor list, avoiding repeated parsing across many regenerated teams. Default Randomizer callers still use the original collection path.

Equipment is deterministically regenerated during Preview validation and again from the unchanged original during Apply validation. RawData must match exactly; no fallback to the old sampled gear silently hides missing donors. CSVs contain per-category donor provenance, mixed/cross mode, brand corrections, compatibility changes, active-save/top-20 settings, importance coefficients, baseline/custom shares and group rating targets/results.

## Recovery

Pre-change snapshot: `outputs/ui-rollback-wJKwpM` (720 verified files). Restore using `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-wJKwpM`. This creates a recovery snapshot first and does not touch saves/settings.

Regression coverage includes all importance ranks, linked whole-number redistribution and extremes, zero-sum roster averages, expensive-position versus FB cost, HBCU weights, removed notices/descriptions, exact parity with the real Randomizer, donor eligibility/top-20 limits, donor immutability, missing-pool failure, saved configuration migration, Save/Cancel/Reset, preset reload, responsive windows, Preview/Apply/reopen, backups and protected-field checks. Newly generated saves still need in-game testing. No publication/version increment was requested.

Completed: all 587 source tests; nine focused/copy-save checks in the final regression run; development and packaged UI smoke tests; full 138-team / 11,730-player Preview with every OVR target reached and top-20 active-save equipment confirmed. Source dynasty hashes remain unchanged.

Unpublished build: `dist/v20.5-roster-generator-budget/win-unpacked/Ace's CFB Toolkit.exe`. Copied generated dynasties from the packaged UI tests are under `outputs/v205-app-smoke-*`; the test logs identify the latest run directory.
