# v22.5 — Roster athletic limits and preview cleanup

Generated-player cards show the replaced player's name, number and previous
position. A red asterisk beside the generated player's name identifies reassigned
roster slots in both Cards and Table view. Its tooltip and accessible label show
**Position changed: WR → TE**. Unchanged positions are not flagged; enum
aliases such as MLB/MIKE and LE/LEDG are normalized before comparison. Preview
metadata includes `originalPosition` and `positionChanged`, and the CSV adds a
`PositionChanged` column beside the existing original/generated positions.

**Before You Apply** now contains actual warnings only and is hidden when none
exist. Routine explanations, supported scheme fallbacks, completed depth-chart
reordering, and normal finishing-pass notes are separate generation notes,
retained in CSV diagnostics rather than shown as warnings. Original EA player
replacement (one combined total), missed position targets, unusable NIL budget, class/development
fallbacks, coach/commitment problems, and unchanged depth charts remain visible
when applicable. Multi-team warnings identify their team. Unknown warnings are
not filtered out by a prose allowlist. The large per-team preview-summary grid
has been removed. Team schemes, class/development counts, talent targets and
depth-chart details remain in backend summaries and CSV diagnostics.

Athletic profile chances are now Balanced 85%, Speed Focused 2%, Size & Strength
2%, Technical 3%, Freak Athlete 1%, Outlier 1%, Field Savant 3% and Drill
Specialist 3%. These are independent per-player rolls, not fixed roster quotas.

The original, uncalibrated 2026/2032/2038 observations define exact-position
minimums and maximums for Speed, Acceleration, Agility, Change of Direction,
Jumping and Strength. Caliber calibration no longer changes these six observed
ratings: only positive non-athletic OVR contributors (positional skills and
awareness) receive the calibration offset. OVR balancing selects from those
packages. Freak Athletes and Outliers allow two additional points at either
end (still within 1–99). Outlier remains a build/size variant, with no automatic
rating bonus. The former minimum skill-position speed floors are removed.

Athletic-profile adjustments are modest and stay fixed during OVR recalibration:
Speed Focused adds 2 to speed/acceleration/agility/change of direction/jumping
and subtracts 1 strength; Size & Strength adds 3 strength and subtracts 2 from
the other five; Technical subtracts 2 from all six; Freak Athlete adds 3 to all
six, subject to position bounds and existing ability requirements. Balanced,
Outlier, Field Savant and Drill Specialist do not adjust these six ratings.
An active observed physical-ability package is never weakened to fit a variant.

For example, DT speed/acceleration have observed ceilings of 90/95, with rare
profile ceilings of 92/97. Unknown physical-ability requirements are not weakened;
positional skills and awareness now absorb OVR changes instead of athleticism.
Unreachable OVR targets still use the existing Apply blockers rather than
bypassing the limits or falsifying the displayed OVR.

Apply blockers, confirmation, input fingerprints, preview validation, backups,
candidate verification and rollback behavior are unchanged. Athletic-profile
chances and generated rating vectors change; roster composition, scheme
weights, appearance sources, ability packages and save-write fields do not.

Checks cover card/table labels and names, aliases, unknown historical positions,
HTML escaping, missing/empty warnings, retained blockers, and routine scheme
fallback classification. The actual renderer generates an 85-player read-only
Preview with 19 scheme-based position changes, checks every flag against the
composition audit and CSV, and verifies light/dark desktop/narrow views without
changing the input save. Additional tests check all source cohorts, exact
position aliases, extreme DT ratings, low/high caliber models, all athletic
variants, ability floors, OVR consistency and multi-team warning aggregation.
Distribution tests verify every model profile across all seven calibers retains
its observed physical package and exact 99-rating counts before profile changes.

Verification for this follow-up is recorded in
`outputs/v225-athletic-{bounds,source,save,ui,packaged}.log`.
Physical-preservation follow-up checks are recorded in
`outputs/v225-physical-preservation-{unit,source,save,packaged}.log`.
All 784 portable source tests, both copied-save Apply/reopen checks (Dynasty and
Play Now) and packaged UI checks pass. All 511 packaged runtime files/assets
match the working source. A read-only 255-player All-Time preview for Alabama,
Georgia and LSU reached 83.0 average OVR on every team without any 99 speed,
acceleration or strength in that particular sample; legitimate rare 99s remain
possible. That audit is in `outputs/v225-physical-preservation-preview-audit.log`.
User source fixtures are unchanged.

Local test build: `dist/v22.5-physical-preservation-test/win-unpacked`. This task does not
push source or refresh the previously prepared installer/update files.
