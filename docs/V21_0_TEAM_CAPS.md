# Per-team equipment population limits

Population limits no longer share an allowance across FBS or FCS teams. Teams are identified by their save TeamIndex, not their displayed name, so teams with matching names still have separate limits.

## Limits

- Tattoos: the configured percentage applies to each team's eligible Player Pool. Existing tattoos count first. Untattooed candidates are shuffled within each team using the preview seed.
- Visors: each team's position groups have their own configured ceiling. The existing independent addition chance remains unchanged.
- Mouthpieces: each team's eligible group has its own 85% ceiling. Custom position/style settings and disabled groups remain respected; rerolling an existing mouthpiece does not consume another addition.
- Lower Rolled Jersey and Cutoff Pants: each team's position groups have separate configured limits, shuffled candidates, and Before / Limit / After diagnostics.
- The no-undershirt safeguard also operates within each team's body-type population rather than borrowing from another team.

All counts retain the existing Player Pool and protection rules. Existing above-cap items are preserved, not removed. Fractional addition limits round down within each team/group; they are never pooled into another team's allowance. A shared visual record can receive a capped item only if every linked team's allowance permits the change. Existing NIL, out-of-scope, shared-reference and save-write protections remain in place.

Whole-number percentages are multiplied before division to avoid floating-point undercounts (for example, 58% of 50 must allow 29 players, not 28).

The explicit **Also Replace All Standard Pants** option remains an intentional exception to the cutoff cap, as its configuration explains. Fit requirements still apply. Helmet target distributions, item-pool application chances, accessory color weights and other non-prevalence probabilities are unchanged.

## Review/reporting

- Tattoo settings and configuration review identify the cap as per team.
- New previews provide Tattoo Caps by Team and Equipment Caps by Team tables; uniform diagnostics identify both team and position group.
- Older saved reviews without team-level audit data retain their original cohort presentation.
- CSV reports retain UniformPopulationAuditJSON and add PopulationCapsAuditJSON with tattoo and equipment team-level counts/limits. Apply reports inherit the exact validated preview audit.

## Regression coverage

- `test/equipmentTeamPopulationCaps.test.js`: above-cap early teams cannot starve later teams; deterministic tattoo selection; small-team rounding; repeated runs; NIL/player/shared-row protections; independent visor and mouthpiece ceilings over 30 seeds; custom/disabled position settings; uniform final counts; per-team undershirt floor; review/report wiring.
- `test/equipmentTeamCapsSaveWorkflow.test.js`: two-team copied-dynasty Preview / Apply / backup / reopen, exact changed and unchanged equipment rows, per-team CSV data, and original-fixture hash preservation.
- Existing equipment population, tattoo, uniform, compatibility and save-safety suites remain enabled.

The package remains v21.0.0. Nothing is published to GitHub as part of this change.

## Broader-suite fixture note

The existing `v191DonorMouthpieceSaveWorkflow.test.js` check for the external `ROSTER-Official` file expects exactly 129 palette-bearing donor entries; the current file contains 133. A focused rerun reproduced that assertion (`133 !== 129`). This check calls the donor reader, not any population-cap planner. Its other metadata assertions and donor Preview/Apply/reopen tests pass. Neither the donor reader nor the fixed fixture assertion was changed for this task.

The other full-suite failure is the old `v205RosterGeneratorSaveWorkflow.test.js` prototype assertion that `previewRosterGenerator().canApply` must always be false. The current generator returns true for this valid roster; its real Apply/reopen suites pass. That older preview-only expectation was not changed for this equipment-cap task. Full-suite result: 764 passed, 2 failed. Source-only suite: 655 passed before the final rounding regression was added; the final focused population/tattoo/uniform run passed all 46 checks, including that regression, and the copied-save workflow passed again afterward.
