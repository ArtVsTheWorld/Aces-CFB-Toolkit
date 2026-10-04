# CFB Toolkit migration architecture

Audit date: 2026-08-20. The five original tool directories at the bundle root were the migration source and are now deprecated, frozen references. The Electron project owns its runtime code and data directly; future changes are made under `cfb-toolkit/` without modifying or importing from those legacy directories. All audited tools are Node.js ES modules using `madden-franchise` 4.3.1 and the C27_486_1 schema. Game tables are resolved by Unique ID, never by array position.

## 1. Repository architecture summary

The bundle consists of five independently installable Node packages, eight requested workflows, one additional unrequested White Helmet Fix entry point, a root `Shared/toolUx.js`, repeated `lib/openSave.js` adapters, local or shared Node runtimes, repeated C27_486_1 schema files, example saves/tables, a root Reports library, and packaged third-party example applications. Each launcher chooses the bundle runtime first, falls back to its local `node.exe`, sets `RG_SCHEMA_DIR` when the shared schema exists, verifies dependencies, and invokes the corresponding JS entry point. The original launchers remain untouched.

The current scripts already have useful core modules, but orchestration, prompts, console rendering, report creation, mutation, backup, and saving are still mixed in most entry points. The new app is isolated under `cfb-toolkit/` and imports no prior GUI implementation.

## 2. Tool and entry-point inventory

| Tool | Launcher | Entry point | Version | Input | Core/output behavior |
|---|---|---|---:|---|---|
| Jersey Renumber | `[RUN] Jersey Renumber v3.5.bat` | `jersey-renumber.js` | 3.5 | Manual Dynasty/RTG save | Player 1612938518 + Team 3359508968; CSV; optional backup and in-place save |
| Jersey Renumber — No Duplicates | `[RUN] Jersey No Duplicates v3.5.bat` | `jersey-no-duplicates.js` | 3.5 | Manual Dynasty/RTG save | Same tables; per-team allocation; CSV; optional backup/save |
| Equipment Patcher | `[RUN] Equipment Patcher v2.0.bat` | `index.js --equipment-patcher` | 2.0 | Manual save; optional donor save | Player/Team by UID; equipment compatibility/global fixes; CSV; optional backup/save |
| Freshman Equipment Randomizer | `[RUN] Freshman Equipment Randomizer v2.0.bat` | `index.js --freshman-randomizer` | 2.0 | Manual save; optionally another donor save | Player/Team by UID; donor-copy randomization; CSV; optional backup/save |
| Commentary ID Patcher | `[RUN] Commentary ID Patcher v1.6.bat` | `index.js` | 1.6 | Manual save + commentary map | Player 1612938518 + Team 3359508968; CSV; optional backup/save |
| Long Snap Rating Fixer | `[RUN] Long Snap Ratings Fixer v0.5.bat` | `long-snap-fixer.js` | 0.5 | Manual save | Player 1612938518 + Team 3359508968; seeded rating correction; CSV; optional backup/save |
| Team Boost | `[RUN] Team Boost v0.5.bat` | `team-boost.js` | 0.5 | Manual save | Player/Team by UID; seeded weighted rating changes; CSV; optional backup/save |
| Automatic Force Win | `[RUN] Force Win v3.0.bat` | `index.js` | 3.0 | Manual save + UID config | SeasonInfo, SeasonGame, Team, Coach, Rivalry, neutral schedule, Player, DepthChart, DepthChartPlayers by configured UID; CSV; optional backup/save |

White Helmet Fix (`white-helmet-fix.js`, v2.0) exists in the repository but is not one of the requested eight registered tools. It should be clarified before a later migration rather than silently added or discarded.

## 3. Shared dependencies and resources

- `madden-franchise` 4.3.1 opens and writes saves; `@inquirer/prompts` supplies the CLI interaction layer.
- Every `openSave.js` forces C27_486_1 and exposes Unique-ID table lookup. This should become one app-owned save service after compatibility tests.
- `Shared/toolUx.js` owns backup naming/copying, shared report-folder fallback, CSV escaping, headers, pause behavior, and final summaries.
- Player UID `1612938518` and Team UID `3359508968` recur across appearance/ratings tools.
- Force Win owns `config/table-uids.json` and stronger table-shape/schema validation. Its UID set must remain configuration-driven.
- The Electron app owns `resources/commentary-data/PlayerCommentaryidMap.txt` and `resources/engine-data/C27_486_1.gz`. Frozen test snapshots under `test/legacy-reference/` preserve parity evidence without creating a dependency on the bundle-level CLI directories.
- Reports currently live at bundle-level `Reports`, falling back to `%LOCALAPPDATA%\Ace's CFB 27 Tools Bundle\Reports`. The Electron app writes its own reports/logs under `app.getPath('userData')`; existing reports are not moved or rewritten.
- Backups are sibling files named `-BACKUP-MMDDYY`, with numeric collision suffixes. The proof of concept preserves that algorithm.

## 4. Current CLI prompt trees and GUI mapping

### Jersey Renumber 3.5

Save path (existing manual file; reject `-AUTOSAVE`) → file picker/Active Save. Run mode preview/apply → separate Preview and Apply actions. Initial player scan reports problematic rows → preview notice; if none, stop. Continue after detected issues (default no) → guarded confirmation card. Renumber user-controlled teams (default no), include NIL players (default no), team traditions (default yes), retired numbers (default yes), promotions (default yes) → toggles. Apply path → result preview, then confirmation modal before backup/save. The tool also has legacy prompt-sync/manual selection code paths inside its large entry file; those must be extracted and exhaustively exercised before migration.

### Jersey No Duplicates 3.5

Save → Active Save/file picker. Mode → Preview/Apply buttons. Team traditions, retired-number protection, promotions (all default yes) → toggles. After tables load, scope all teams or one team → segmented control; one team reveals a searchable exact-team selector populated from the save. Apply → confirmation modal. Invalid/autosave/missing Player or Team tables are blocking validation errors.

### Equipment Patcher 2.0

Save → Active Save/file picker. Mode → Preview/Apply. Above-knee pants, helmet, rolled-jersey, socks, equipment compatibility, Nike thigh pads, and visors → independent toggles. Rolled-jersey enabled → reveal undershirt-color choice (weighted/primary/secondary/white/black). Included teams and excluded teams → searchable multiselects; positions/classes/body types → multiselects; redshirt state → multiselect/checkbox group; min/max overall → bounded paired number inputs with min ≤ max. Apply → confirmation modal. At least one fix/filter combination and all current eligibility rules remain controller validation.

### Freshman Equipment Randomizer 2.0

Save/mode as above. Excluded teams → searchable multiselect. Included teams, positions, body types and overall range retain their existing workflow-specific availability. Top-N donors (positive integer, default 125) and unsigned 32-bit seed → numeric inputs. Donor source → same save or another save; “another” reveals file picker and rejects same target/donor and autosaves. Current freshman-specific redshirt/class rules remain core validation. Apply → confirmation modal.

### Commentary ID Patcher 1.6

Save/mode → Active Save and Preview/Apply. Phonetic last-name matching (default false), exact first-name fallback (true), preserve unmatched IDs (false), True Freshmen only (false) → toggles. Commentary map path and Player/Team UID overrides are advanced file/number controls; defaults remain bundled map and verified UIDs. `--all` becomes “include unchanged players in details.” Phonetic candidates currently trigger per-match interactive acceptance in a conditional loop; GUI migration needs a review table that groups identical candidate decisions and requires accept/reject before apply. Apply requires final confirmation.

### Long Snap Rating Fixer 0.5 (proof of concept)

Save → Active Save/file picker, rejecting autosaves. Mode → Preview and “Back up & apply” buttons. Seed → uint32 numeric input, generated per page and not persisted. There are no further branches. Eligible positions are exactly C/LG/RG/TE, valid roster team indices exclude negative and 255, and only `LongSnapRating <= 15` changes. New values use the unchanged seeded Mulberry32 + truncated N(60,12) algorithm constrained to 25–99. Both modes generate a CSV; apply creates a sibling backup before `franchise.save()`.

### Team Boost 0.5

Save/mode/seed → shared controls. Team text match → searchable exact resolved-team selector (current CLI accepts exact or unique substring and rejects ambiguous matches). Minimum adjustment −99..99 (default 1), maximum min..99 (default 3) → paired bounded number inputs. Rating set → radio/cards: nonphysical (default), physical, or all. Apply → confirmation. Position/archetype rating weights, clamping, random order, and report rows remain unchanged.

### Automatic Force Win 3.0

Save/mode → shared controls. First branch: apply/evaluate or clear existing force wins. Clear branch reveals scope week/team/remaining; week accepts 0..15, team requires an exact save-derived display name; then summary and confirmation. Evaluate branch: schedule scope regular/next/specific week; specific week reveals 1..15 and must be after current week. Seed optional text; involvement minimum/low/medium/high/maximum; model profile ratings/balanced/coaching/matchup/chaos; force all FCS toggle; protected teams searchable multiselect; CSV export toggle; compact/expanded result detail. UID config path and nine UID overrides plus schema report belong in Advanced/Diagnostics. The save must be regular-season week 0–15. Existing games, completed games, postseason/championship games, protected teams, malformed references, and other safeguards remain authoritative.

## 5. Proposed Electron project structure

```text
cfb-toolkit/
  docs/                         audit and migration contracts
  src/shared/                   serializable IPC contracts + registry metadata
  src/main/main.js              window lifecycle and narrow IPC registration
  src/main/preload.cjs          approved renderer bridge only
  src/main/services/            paths, settings, logs, backups, reports, save access
  src/main/tools/<tool>/         controller/runner + behavior-preserving core adapter
  src/renderer/                 desktop UI and reusable visual patterns
  test/                         core parity, validation, registry, and security tests
```

Packaged schema data is an `extraResource`, not hidden inside ASAR. Writable settings/logs/reports use Electron userData. Saves and backups remain at user-selected locations.

## 6. Tool-module architecture

The shared registry defines ID, names, category, version, description, icon, input relationship, migration status, preview capability, output types, and setting schema. Navigation and home counts derive from this registry. Main-process execution resolves a registered ID to an allowlisted handler; renderer input can never select an executable path or shell command. Each runner owns backend validation and orchestrates save → UID table reads → unchanged core → report → backup/save → structured result. Tool-specific pages may specialize controls/results while consuming shared Active Save, status, error, report, and logging patterns.

## 7. Navigation and cross-tool state

Data-driven categories are Player Appearance & Identity (5), Ratings & Team Tuning (2), and Dynasty Management (1), followed by Reports, Logs, Settings, and About. Active Save is persistent in the top bar and is passed only to modules declaring compatible input. Cross-tool state is limited to Active Save, recent paths, shared output preferences, app preferences, reports, logs, app version, selected page, and window dimensions. Dangerous modes and random seeds are not persisted. Tool settings remain local by default.

## 8. Logic that still needs separation

- Jersey Renumber has the largest prompt/orchestration surface and mutates records while producing analysis; isolate a plan object before any save.
- No Duplicates mutates roster objects during preview generation; formalize plan/apply while preserving ordering.
- Equipment’s `index.js` combines two workflows, option parsing, table reads, filters, donor selection, fixes, reports, and save; split workflow controllers from existing `lib/equipment` cores.
- Commentary’s phonetic approval loop is UI-dependent; expose candidate groups and consume explicit decisions.
- Team Boost and Long Snap already have clean calculation modules, but their entry points apply to in-memory records even during dry run. A runner must treat loaded franchises as disposable until save.
- Force Win has good domain modules but a large orchestration entry point; isolate request normalization, table-loading contract, clear plan, evaluation plan, and commit.
- Consolidate duplicated `openSave.js` only after regression fixtures prove table proxy behavior and error text compatibility.

## 9. Packaging and path issues

- ASAR cannot be assumed readable by native/schema consumers; C27_486_1 is copied to `resources/engine-data` and resolved through `process.resourcesPath`.
- Never write reports/logs/settings under app resources or Program Files; use userData. Save backups intentionally require write permission beside the save and should report permission failures clearly.
- Windows spaces/apostrophes require path APIs and argument arrays; no renderer-built commands or shell interpolation.
- Existing bundled `node.exe` is unnecessary for migrated in-process JS, but later Python/external runtimes must be unpacked resources and invoked only by fixed handlers.
- `madden-franchise` must be tested both unpacked and inside the packaged application. Electron ABI/native transitive dependencies require packaged smoke coverage.
- File dialogs cannot reliably filter extensionless save files, so backend content/table validation is decisive.
- Recent paths can become stale; display them as missing and require re-selection rather than silently clearing evidence.

## 10. Behavioral-regression risks

Highest risks are mutation during “preview,” changed random-call order, changed roster iteration order, resolving a table by position instead of UID, altered defaults, collapsed conditional branches, wrong schema/resource paths after packaging, duplicate backup names, report-column/content drift, save calls before confirmation, and renderer/main validation disagreement. Other risks include dynamic franchise-record getters (the `in` operator is unreliable), exact team-name ambiguity, autosave detection, RTG compatibility, NIL/user-team policy, placeholder players, force-win enum direction, week indexing, and phonetic decisions. Questionable legacy behavior should be documented and frozen until an explicit bug-fix decision.

## 11. Recommended migration order

1. Long Snap Rating Fixer: smallest complete seeded preview/backup/report path; implemented as proof of concept.
2. Team Boost: reuses the ratings save/table/report pipeline and adds save-derived selection plus paired numeric validation.
3. Commentary ID Patcher: adds advanced resources and a review/decision stage.
4. Jersey No Duplicates: establishes complex allocation preview and team scope.
5. Jersey Renumber: migrate after shared jersey services and regression fixtures exist.
6. Equipment Patcher: migrate filters and independent global fixes.
7. Freshman Equipment Randomizer: add donor-save workflow after Equipment foundations.
8. Automatic Force Win: last because it has the widest UID/table graph, two top-level modes, schedule-state guards, and the greatest destructive impact.

## 12. Proof-of-concept acceptance criteria

The Long Snap page must use C27_486_1, Player UID 1612938518 and Team UID 3359508968; reject missing/autosave inputs and invalid seeds; match the original core output for identical records/seeds; never save in preview; write the same seven CSV columns; create the established sibling backup before apply; expose status/results/errors; record start/completion/failure logs; and remain callable only through allowlisted IPC with context isolation on and renderer Node integration off.
