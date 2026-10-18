# v20.5 — Roster Generator, first implementation milestone

This document records the earlier standalone prototype milestone. The current development app now has an in-app tool and Apply path; see [the in-app implementation](V20_5_ROSTER_GENERATOR_APP.md).

## What existed at this milestone

A headless, deterministic, preview-only generator for one selected team using **Building Blocks**, targeting a 70–75 average player OVR. It is not registered in the installed app, has no Apply path and does not change package version 20.1.0. No source or release has been published for this milestone.

- Preserves exact roster size, every original position and all player/team/appearance-row references.
- Selects complete observed football profiles, retaining the relationship between ratings, archetype, class/redshirt, development, six caps, physical/mental packages, XP/skill points and personality.
- Uses generated-cohort profiles primarily, with an explicit observed EA fallback only if a position has no generated examples. The solver makes small complete-profile substitutions within the same position/archetype; it never edits an individual rating to pretend an observed ability requirement is met.
- Solves toward the midpoint while retaining a player talent spread. An unachievable average is reported as a blocker rather than manufactured or treated as successful.
- Recombines first/last name parts, avoids names already present in the target dynasty and duplicates within the new roster, and respects the current schema's conservative name-length bounds. Commentary uses the existing exact/suffix/hyphen/first-name matcher without phonetic guessing.
- Assigns unique jersey numbers using existing position ranges and retired-number data. It does not call the existing age-based jersey sorter. Infeasible number assignments fail clearly.
- Independently samples observed generic head/portrait/physique/equipment packages for the same position, preferring the target team's apparel brand. Existing field-level brand guards and equipment compatibility cleanup are reused. No optional mod-pool additions are made.
- Reconciles old root skin/body/jersey-name overrides with the sampled generic format, retaining unknown root data and non-on-field layers. Additional appearance layers and shared visual owners are explicit future-Apply blockers.
- Reports each player's original/proposed fields and exact visual JSON, source profile IDs, catalog version/hash, source fingerprints, seed, fallbacks and equipment corrections in companion JSON/CSV files. The standalone HTML has searchable expandable player cards and readable labels.

## Approved safety boundaries

- Age and birth dates are not model inputs or proposed fields. The current read-only audit/compiler excludes them, and tests use throwing Age getters to catch unintended access.
- PresentationId is preserved because its transferability has not been established. It is not silently copied from an appearance donor.
- Internal IDs, positions, roster membership, team indexes, depth charts, history, injuries and unselected players are not proposed for change.
- All preview players become fictional non-NIL identities in the proposal. The report counts existing NIL players and warns that a future Apply needs explicit authorization/protection choices. No NIL flag is currently written.
- `previewRosterGenerator` rejects every mode except Preview. No backup, temporary dynasty, save writer, cached Apply plan or application IPC handler exists for this tool yet.
- The source save's SHA-256 is checked before and after generating the preview. Reports go into a new ignored output directory, never over the input.

## Observed catalog

`src/main/tools/rosterGenerator/data/observed-v1.json.gz` contains 23,460 anonymous FBS football profiles, 11,730 generated generic appearance/equipment packages, observed style packages, separate generated first/last name dictionaries and the existing 79 OVR formulas.

It does not contain source save files, Age/birth dates, paired original full names, original unique faces, source RawData blobs or PresentationId. On-field equipment arrays and generic head/portrait identifiers are included as observed transferable data. The 424 directional FCS players are excluded from generation frequencies; their valid values contribute to the owner-approved pooled cap limits. Source hashes and row-based observation IDs preserve audit provenance without copying player identities into the football-profile bank.

The compiler is read-only toward its input saves. It checks actual roster ownership, known profile shapes, cap bounds, source years and the generated cohort's non-NIL/generic-face format before writing the separate generated catalog. It records any unsupported appearance samples; the supplied files currently have none.

## Run the prototype

From the project root, using an authorized save:

```powershell
node scripts/preview-roster-generator.mjs "C:\path\DYNASTY-SAVE" "LSU" 2052026
```

The command prints a fresh output directory containing `preview.html`, `preview.json` and `preview.csv`. Open the HTML to review it. This is a report, not a modified dynasty file, and it cannot be applied.

To rebuild the observation bank deliberately:

```powershell
node scripts/compile-roster-generator-bank.mjs "C:\path\2026-example" "C:\path\2032-example"
```

Do not replace the curated bank with unrelated modded or edited data without reviewing the evidence, reversioning it and rerunning validation. Private source saves and raw research audits remain outside version control.

## Verification

- **565 portable source tests passed**, including 12 new generator tests.
- **Two additional full-save tests passed** using a disposable copied fixture. They prove repeated previews are identical, source bytes remain unchanged, no backup is created, CSV field/raw-data evidence round-trips, and invalid/Apply requests cannot write.
- The supplied 2026 LSU roster retains 85 players and its exact position counts: 77.5059 → **72.5059** projected average player OVR at seed 2052026.
- The supplied 2032 Army roster also retains 85 players and its exact position counts: 68.2 → **72.5059** at seed 2052032. It no longer contains fullbacks; the generator correctly does not add any.
- The supplied 2026 Navy roster is an additional preview case exercising its four fullbacks without changing its roster composition.
- Standalone report checks pass for search/reset/no-results, expandable cards, no script errors and light/dark 1480/760/520px layouts.
- Both supplied source saves retain their original SHA-256 hashes.

The pre-prototype source is recoverable from verified snapshot `outputs/ui-rollback-cARNbB` (685 files, package 20.1.0). Restoring through `scripts/ui-snapshot.mjs` first archives newer work and does not delete newer files. Because the new generator is unregistered and no existing application files were changed, its presence alone does not alter the v20.1 app.

## Still to implement / validate

- Remaining presets, controlled extrapolation for extreme talent levels, per-team preset choices, multiple-team operation, individual locks and advanced configuration.
- A final policy for NIL protection/confirmation and custom jersey traditions/locks.
- Atomic cross-table Apply, safe shared-row isolation, fixed-storage capacity/encoding checks and complete unrelated-data verification.
- In-game validation of generic appearance/portraits, retained presentation bindings, weight display units, weekly progression and offseason eligibility. Observed ability packages are not a proof of all hidden engine prerequisites.
- Installed-app integration, polished configuration windows, history/review/preset integration and release packaging.

The existing OVR formulas cover every sampled profile but differ by one point for some original players. Values in this report are formula projections, not guarantees about the game UI's recalculated player or team overall.
