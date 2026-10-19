# v20.5 — in-app Roster Generator

## Status

Roster Generator 1.0 is integrated into the Team Management sidebar of the development app. App version is 20.5 (package/update version 20.5.0). This work has not been published and does not replace the installed v20.1 portable or installer.

The earlier standalone HTML prototype remains available for research. Its preview-only API still cannot write a save; the registered application handler provides the separate confirmed Apply path.

For current identity, health, eligibility, captains, geography and pitch handling, see [player-state changes](V20_5_PLAYER_STATE.md). For revised targets, sampling, name/head pairing and report controls, see [the follow-up changes](V20_5_GENERATOR_REFINEMENTS.md). The earlier target table and generation description below record the first implementation and are superseded where those follow-ups differ.

## Workflow

1. Open a **copied Dynasty save**, preferably in preseason.
2. Open **Team Management → Roster Generator**.
3. Use the searchable Teams window to select one or more rosters. Empty always means **no teams**.
4. Configure **Roster Caliber & Seed**, then save that draft.
5. Generate Preview. Review original/generated identities, ratings, class/redshirt, archetypes, development, abilities, caps, appearance and equipment in cards or the compact table. Team, position, class and text filters work in live and historical reviews.
6. Confirm **Back Up & Regenerate Rosters**. The app backs up the source and applies exactly the cached preview, not another roll.

Each team targets its own mean player OVR. This is not the game's displayed team OVR and does not constrain every individual player to the preset's mean range. All original positions, roster sizes, player record identities, team ownership and depth-chart references remain intact. New players receive unique position-appropriate numbers with supported retired numbers excluded. Selected NIL identities are intentionally replaced by fictional non-NIL players, with an explicit confirmation.

| Caliber | Mean player OVR | Special behavior |
| --- | --- | --- |
| From the Ground Up | 45–50 | Startup rebuild |
| The Kids Are the Future | 45–55 | Freshmen/sophomores with observed Impact/Star/Elite development |
| FCS Foundation | 55–60 | Lower-rated roster, not an FCS-team conversion |
| One Last Ride | 55–65 | Every player is a redshirt senior |
| Building Blocks | 70–75 | Complete observed football profiles |
| Competitive | 75–80 | Calibrated observed profiles |
| Contender | 80–85 | Calibrated observed profiles |
| Blue Blood | 85–90 | Calibrated observed profiles |
| All-Time Team | 90–99 | Intentionally extreme strength |

## Generation and evidence

The bundled, compressed catalog contains 23,460 anonymous football profiles from the supplied 2026/2032 example cohorts, 11,730 generic appearance/equipment packages, observed animation packages, separate name-token dictionaries and the existing verified OVR formulas. Directional FCS repetitions do not inflate generation frequencies. Private save files and raw audit exports are not packaged.

Building Blocks retains complete observed rating/ability/eligibility/development/cap/progression packages. Other calibers calibrate positive OVR-contributing ratings from position/archetype profiles while keeping unrelated ratings unchanged and preserving whole observed ability/cap/progression packages. Downward calibration only uses profiles with no active physical abilities, avoiding invented physical-ability thresholds. Eligibility-specific presets filter the observation pool before generation. Ratings stay within 1–99 when calibrated; six skill caps stay within the owner-approved pooled bounds. Hidden game ability-unlock requirements are **not independently verified**.

Appearance uses generic head/body/physique/portrait packages, reconciles stale skin/build/name overrides, and uses existing field-level brand and equipment compatibility guards. Harmless empty Base-category placeholders are preserved. Unknown populated/non-on-field appearance layers and shared character-visual owners block Apply with explicit reasons; this implementation does not silently modify or skip their other owners.

Age and birth-date fields are never read for generation or written. Raw protected-bit verification checks preservation without decoding those legacy fields. Fresh presentation IDs/asset names clear the old full-name broadcast identity. Class/redshirt and consecutive years with the team use the same observed football package. Historical statistics, awards, career records and depth charts are **not reset**. Reorder the depth chart in-game after regeneration.

## Save safety

- Immutable source fingerprints, tool/save-bound expiring plans, stale-preview rejection and no repeat Apply.
- Backend confirmation required for full roster/NIL replacement.
- Only explicit Player allowlist fields and proposed RawData rows are written.
- Byte-mask verification checks every Player row outside the approved fields, including unselected players, references and historical bits; unmodified string fields are also checked.
- Player table queued string edits are materialized before expected-byte hashing. This fixes verification of pending name/head changes, without bypassing the equipment checks.
- Shared equipment writer preserves fixed visual-storage capacity, overflow ownership, packed save size, untouched tables and unmodified visual rows.
- Temporary candidate is reopened and every generated field and visual proposal is checked **before atomic replacement**. A failed/injected verification leaves the source untouched and cleans up the candidate. The backup remains available.

CSV reports retain every player's old/new allowlisted fields, full field diffs, old/new visual JSON, profile/appearance/style provenance, calibration, source/catalog hashes, seeds, presets, compatibility adjustments and diagnostics. The existing History/ReviewSnapshots service stores complete live/applied reviews. Existing name-based preset save/load/export/import and My Default infrastructure is reused; presets never contain a generated roster or cached Apply authorization.

## Verification and remaining in-game checks

Source tests cover every preset across all 21 raw positions, targets, eligibility, observed cap/ability packages, determinism, age exclusion, malformed inputs, appearance layers and tampering. Copied-save tests cover multi-team Preview/Apply/reopen, protected data, exact fields/visuals, CSVs, backups, stale/repeated plans, confirmation and interrupted-candidate rollback. Electron tests cover the real sidebar, modal Save/Cancel/validation, presets, live/saved review searches, cards/table, confirmation, actual Apply to an isolated copy, navigation and responsive light/dark layouts. Packaged smoke also checks that the catalog is shipped and usable.

Toolkit checks do not prove all game behavior. Before release, load generated copies in CFB 27 and verify generic heads/skin/builds, portraits, equipment, commentary, in-game OVR, abilities, class/redshirt, development/progression, depth charts and advancing a week. Include a low-caliber, high-caliber and all-redshirt-senior roster. Shared/unknown appearance cases remain intentionally blocked rather than guessed.

### Completed checks in this implementation

- 570 source tests passed (`outputs/v205-in-app-source-tests.log`).
- Five roster copied-save integration tests passed; the three application tests were rerun after the final changes (`outputs/v205-in-app-save-tests.log`, `outputs/v205-in-app-save-tests-final.log`).
- All 16 existing equipment copied-save workflows passed (`outputs/v205-equipment-writer-regression.log`).
- Existing application configuration/refinement/uniform/color UI suite passed (`outputs/v205-existing-ui-regression.log`).
- Packaged Roster Generator UI/handler smoke passed with zero renderer errors, including lazy full-field details and live/historical filters (`outputs/v205-packaged-smoke.log`). Detailed player sections are rendered only when opened; unique accessible summaries preserve the correct player's expansion during filtering.
- All-team Preview generated 11,730 players across 138 teams, with every team reaching its target, zero blockers and unchanged source fingerprint (`outputs/v205-all-teams-preview.log`). This large Preview took about 34 seconds on the test machine; it is not instantaneous.
- Production Apply generated three separately verified test copies under `outputs/v205-game-validation-2qA885`: `DYNASTY-V205-STARTUP` (LSU average 47.51), `DYNASTY-V205-ALL-TIME` (LSU average 94.51), and `DYNASTY-V205-SENIORS` (LSU/Navy averages 60.00, all redshirt seniors). These have **not** yet been confirmed in-game.
- Unpublished unpacked development app: `dist/v20.5-roster-generator/win-unpacked/Ace's CFB Toolkit.exe`. Run it with its adjacent resources; it is not a standalone portable EXE or installer release.

Reproduce the main checks with `npm run test:source`, `node --test test/v205RosterGeneratorAppSave.test.js`, and `node scripts/smoke-v205-packaged.mjs`. The copied-save/UI suites require the private example fixture. `node scripts/validate-v205-roster-generator.mjs` produces fresh in-game diagnostic copies without changing that fixture.

## Rollback

The pre-in-app source snapshot is `outputs/ui-rollback-PS2NGo`, containing 698 checksum-verified files. Restore with:

```powershell
node scripts/ui-snapshot.mjs restore outputs/ui-rollback-PS2NGo
```

Restore first creates a fresh recovery snapshot and then restores tracked source/resources; it does not delete newly added files, touch personal settings or alter dynasty saves. Restart/rebuild afterward. Existing v20.1 binaries remain intact.
