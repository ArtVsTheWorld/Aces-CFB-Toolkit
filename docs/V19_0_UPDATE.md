# v19.0 — Configuration on Demand

## Current follow-up: grouped controls and deeper customization

- Equipment Patcher is **5.5**; Smart Force Win is **4.5**; the app stays **v19.0** (installer metadata **19.0.0**).
- Player Pool columns align. Skip NIL Players is now inside Player Filters, remains checked for fresh configurations, and is included in its main-page summary. Saved choices survive navigation and presets.
- User-controlled teams have a **(User)** marker in checkbox selectors and summaries. Stored team names/identities stay unchanged so presets still match other saves.
- Undershirt Settings uses a dedicated window with the existing weighted/fixed-color presets and optional whole-number percentages for both body groups. Each custom mix totals 100% and has a Balance to 100% button.
- Visor Frequency has independent whole-number chances/limits for QB, HB, FB, WR, TE, OL, EDGE, DT, LB, CB, FS, SS, and K/P. Existing visors are not removed. Prior frequencies remain defaults.
- Match Tape to Player Accessory Color is the fresh-configuration default. Older saved percentage-based configurations retain their choice.
- Helmets use those same position groups. OL can now be configured, and every listed helmet—including both Vicis Zero 2 variants—is available to every group. Legacy individual-position mixes are grouped deterministically; explicit group mixes win. The separate visible Vicis checkbox is removed. Old preset values are still interpreted and brought into the editor without discarding them.
- Facemask Pools provides helmet-specific checkboxes, display labels, search, All/Clear, default pools and validation. Selected masks must fit that helmet; previously omitted masks start unchecked. Zero-weight helmet exclusion, separate FBS/FCS balancing and protected/shared-player safeguards remain active. Earlier presets retain their OL protection until a new grouped helmet configuration is saved.
- Custom Matchup Model starts from any of the five real existing models. Sliders cover team/position/unit weights, coaching/staff/continuity, home field/atmosphere/ranking, rivalry/FCS adjustments, mismatch categories, force-win probability and projected lines. An optional weekly cap prioritizes stronger new assignments without clearing existing ones. Starting-preset calculations are tested for exact equivalence. Format/safety guards are not exposed as tunable sliders.
- Commentary matching options fill two equal columns. The Advanced Reporting switch is removed; every scanned player is reported. Exact suffixed matches take precedence, with Jr./Sr./Roman-numeral fallback to the base name when needed.
- The Logs screen is removed; background diagnostic logging remains. About links to the GitHub source repository.
- Mod requirements and credits are consistent: **Bear’s Pads by Bear5**, **CFB27 Unlocked by Orckestra**, **RAW Accessories by Delonte RAW**.

### Vanilla catalog evidence and remaining verification

The current user-confirmed unmodded CollegeFB27 session was scanned read-only, without memory writes, injection, privilege changes or bypassing protections. Bounded scans covered the normally readable loaded memory for equipment tokens; further ItemInfo probes cross-check repeated identifiers and display-name fields. `equipmentVanillaObservation.json` records verified labels separately from generation pools. Loaded/locked assets are not proof that every item is available in a vanilla menu and are never automatically moved out of mod-specific pools.

249 verified equipment labels are retained in the observation catalog after the full scan. There were 1214 loaded equipment-string candidates, kept separate from generation eligibility. Twenty additional facemask IDs/display names are recorded in `equipmentLiveFacemasks.json`, including newer Axiom, SpeedFlex, F7 and Vicis Zero 2 styles. They start unchecked. Their helmet families agree in both IDs and labels; runtime compatibility tags were not recovered. Individual new mask/helmet combinations still require in-game appearance checks. No process addresses or raw memory are bundled.

### Reports and presets

Every run’s CSV includes a run identifier, tool version, Preview/Apply mode, save path and input configuration. Cached Apply retains the original preview configuration rather than reporting only a plan ID. Equipment reports preserve all before/after equipment JSON, changed slots/metadata, seed, resolved settings and helmet distribution diagnostics. Team Boost and Dealbreaker include generated seeds/resolved settings as well; Smart Force Win includes the custom model and weekly-limit decisions.

Run-wide configuration and helmet diagnostics appear in the **first CSV data row**, not repeated for every correction. The report metadata sidecar also keeps the input audit context. Per-player changes remain on every row. CSV output uses bounded writes, avoiding giant-string failures on large dynasty reports.

All configurable tool presets retain canonical values, team names, grouped weights, mask pools, sliders and NIL choices. Draft values and cached plans never enter presets. Development UI checks exercise full serializer→load→render→option round-trips across the nine tool pages.

### Follow-up verification

- **534/534** full regression checks passed, plus **2/2** newly added real-save workflow checks (**536 total**). The latter exercise grouped OL helmets, a new opt-in mask, visor frequencies, custom shirts, custom model sliders and a weekly cap through exact cached Preview/Apply/reopen with unchanged originals and verified backups.
- **458/458** portable source checks passed. Existing save/container/overflow regressions remain covered; save-format safety guards were not weakened.
- Real development and packaged Electron UI checks passed across all nine tools, with complete preset serializer/load/render round-trips. Save/Cancel/Escape, whole percentages, user markers, aligned columns, navigation and no-save guards passed. Light/dark visual checks and 760px/520px dialog overflow checks—including the custom model—passed.
- Windows NSIS and portable builds succeeded in the separate follow-up directory. Packaged source/assets/resources and update SHA-512/size/blockmap were verified. Portable and unpacked startup/registry/schema/map checks passed; the packaged codec preserved four real case-alias rows with exact reopen verification, fixed file size and unchanged original save.
- The real NSIS updater passed loopback higher-version detection, opt-in installer download/progress, checksum validation and bad-checksum rejection. No installer was executed by that test.
- Optional user-team metadata is best-effort: unavailable Home metadata cannot prevent an otherwise supported tool from opening; its own preparation/schema/safety checks still apply.
- New optional facemasks and broad newly enabled helmet/position combinations still need in-game visual testing. Automated parse/reopen validation is not claimed as that visual confirmation.

### Current rollback point

Before this follow-up, `outputs/ui-rollback-H6VjDL` preserved **606 checksum-verified files** from the actual working source. Run `node scripts/ui-snapshot.mjs verify outputs/ui-rollback-H6VjDL`, then `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-H6VjDL` to restore that baseline; restore first snapshots newer work. The earlier pre-redesign snapshot and previous release directories remain intact. This follow-up builds separately under `dist/v19.0-followup` and is not published or installed automatically.

---

The following sections record the earlier v19.0 work; their historical version/test counts and inline-control decisions predate this follow-up.

## App-wide UI redesign

The guiding rule is **Simple main pages. Powerful configuration on demand.** The complete pre-implementation audit and recovery instructions are in `V19_0_UI_AUDIT.md`.

| Screen | What changed |
| --- | --- |
| Equipment Randomizer | One Configure control center replaces the three settings-step pages. Teams use a searchable selection window. Player Filters combines positions, class, redshirt and overall bounds. Donor Settings contains donor mode, top count/donor save, specific-player checkboxes with position tabs/sorting/shift-click, and mixing chances. No Drip chances have a small editor. |
| Equipment Patcher | One Configure control center shows normal and modded passes together. Teams and Player Filters use windows (including body type). Helmets use the shared shell. Mouthpiece Settings combines colors/rerolls/branded frequency. Tattoo Settings combines cap and searchable designs. Colors & Tape contains the entire accessory/tape editor, including searchable team distributions, without another nested window. Summaries sit beside the relevant pass. |
| Team Boost | Searchable windows replace the large team, position-subset and Specific Attributes selectors. The base scope, rating family and adjustment range remain inline. Empty teams still mean no selected teams, not the whole dynasty. |
| NIL Toggle | One Player Scope window contains team, specific-player, position, year and redshirt filters together. Target True/False stays inline. Empty selections retain the existing whole-roster meaning. |
| Jersey Renumber | Teams to Skip is a searchable logo/checkbox window. Numbering mode and the small rule switches remain inline. Controlled-team defaults remain selected. |
| Smart Force Win | Protected teams use the shared searchable selector. Action, scope, involvement/model, FCS switch and clear-one-team controls remain inline. Settings review and schedule Preview are unchanged. |
| Dealbreaker Fixer | Nine starting percentages move into a Starting Dealbreaker Mix window with the existing precision, total validation and reset. The cleanup switch stays inline. The window explains that the final assignments also consider each player's situation. |
| Commentary IDs | Four simple scope/matching toggles stay inline. Detailed CSV reporting becomes an Advanced Reporting disclosure; sound-alike approval and Preview are unchanged. |
| Settings | Manage Artwork opens one searchable team artwork window, with logos/header previews and the existing uploads/default actions. Theme, app accent, active save and update status stay inline. Artwork explicitly retains its existing immediate-save behavior. |
| Help | New instructions explain selection/configuration summaries, draft Save/Cancel, scoped defaults, the shorter equipment workflow and immediate personal artwork changes. |

### What intentionally remains direct

Pass-enable switches, Skip NIL protection, the Randomizer's single extra-gear percentage, undershirt color, Bears Pads replacement style, Team Boost's base scope/range/family, Jersey's small allocation choices, Commentary's matching switches, NIL target, Force Win's short choices, and appearance preferences remain inline. A window would add clicks without meaningfully reducing their complexity.

Home, Long Snap Fixer, History, Reports, Logs, About, season matchup lines, and all result-review filtering were inspected and deliberately kept in their existing form. Search/facet dropdowns on previews are frequently used to review results, so they were not hidden in configuration windows. Existing compact Config Presets disclosures remain available.

### Reusable framework

`src/renderer/configuration.js` and `configuration.css` provide:

- A labelled native-dialog shell with the same visual language as the helmet editor, bounded internal scrolling, sticky header/footer actions and responsive sizing.
- Draft editing with unique control IDs, current/default values, Save/Cancel/Escape, focus restoration, scoped Reset Defaults, inline validation and unsaved-draft messaging.
- Selection cards with accurate counts and explicit empty-selection meanings, using the existing logo/search/checkbox controls inside windows.
- One-dialog-at-a-time protection. Complex features contain their complete controls instead of launching further dialogs.
- A transactional commit that updates all changed canonical values before emitting the existing change events. Save Settings is not Preview or Apply; Cancel never invalidates an existing preview.

Canonical control IDs and serializers remain intact, including older presets, per-team tape values and donor settings. Scoped resets modify the draft only until Save. Choosing Save with no changes leaves the existing preview available. Whole-tool Reset still works independently.

Error notices now append without rebuilding the live form, so a displayed error cannot discard field values or detach configuration-button handlers.

### Behavior and safety boundaries

No backend tool algorithms, shared contracts, resources, defaults, save parsing/writing, reports, history storage, or backups were changed by the app-wide UI overhaul. A checksum comparison against the pre-overhaul snapshot confirmed this. The earlier v19.0 custom-helmet 0% exclusion change described below is retained.

Intentional interaction changes: equipment configuration no longer requires hopping through three settings pages; advanced values take effect only when the window is saved; invalid numeric/distribution selections are blocked at Save rather than left for Preview to reject. Team artwork uploads still save immediately, clearly disclosed in that window. No configuration capability was removed.

### Recovery and remaining candidates

The source snapshot is `outputs/ui-rollback-4kbVek` (601 verified files). The restore helper creates a new snapshot of later work first; it restores baseline files without deleting new files, saves or personal settings. Restored renderer/index files use the previous UI. For an exact, isolated source tree without retained extra files, use the snapshot's `files` directory as a separate project copy. The preserved `dist/v19.0-release` executable runs the exact prior working UI immediately; `dist/v18.5-release` remains available too.

Future candidates: searchable/collapsible Help, pagination for very long History/Reports libraries, and virtualization of very large player/donor lists. Small windows still require internal scrolling for large selections. These are preferable to hiding commonly used result filters or adding further modal layers.

## App-wide verification and deliverables

- Full save-regression run: **521 passed, 0 failed, 0 skipped**; two subsequently added rollback filesystem checks also passed. Current portable source subset: **447 passed, 0 failed**. The 17 focused configuration tests cover atomic commit, defaults, empty-selection semantics, numeric validation, unique draft IDs and recoverable/checksummed rollback.
- Real Electron development and packaged UI checks passed across all nine tool pages, Settings, read-only screens and no-save guards. Covered Save/Cancel/Escape, preserved exact previews, team filtering/counts, donor position/sorting/shift-click, compound scope, preset serialization, navigation and separate Review/Preview stages.
- Light/dark desktop visual inspection and 760px/520px selection, filters, mouthpiece, tattoo and tape-window overflow checks passed. The helmet window was checked at 760px as well.
- Existing helmet/session/Preview/Apply UI smoke passed. Packaged equipment codec regression passed on four real case-alias rows, including candidate verification/reopen, fixed container size and unchanged original save.
- NSIS installer and portable builds passed. Both executable startup/registry/schema/map checks passed. All **412** bundled source/assets and required resources matched the source. Installer size, blockmap/update manifest and SHA-512 were verified.
- Local updater smoke passed opt-in download/progress, checksum verification and rejection of a bad checksum. No installer was executed by that test.

New artifacts: `dist/v19.0-progressive-disclosure/Aces-CFB-Toolkit-Setup-19.0.0.exe` and `Ace's CFB Toolkit 19.0.0.exe`. The matching installer/blockmap/`latest.yml` upload files are in that directory's `github-release-assets`. Prior release directories were not overwritten. Nothing was published or installed over the existing app.

## Earlier v19.0 helmet refinement (retained)

## Player-facing changes

- Helmet action and mix are now configured together in **Configure Helmets & Facemasks**, instead of separate settings scattered across Correction Passes.
- **Repair Only** keeps allowed existing helmets. In Custom Percentages, **0% excludes a model**, so existing helmets at 0% are replaced using your mix. Models with a positive percentage stay unless their facemask needs correcting. Repair Only does not rebalance usage among the allowed models.
- **Apply My Mix** is the clearer name for the existing Balance Existing Helmets behavior. It also adjusts existing helmets toward your percentages. A 0% model is replaced within the eligible population, unless a position-specific mix gives it a share.
- The panel lists helmets allowed by the selected mix, including position restrictions. Custom mode can fix a facemask without replacing an allowed helmet. A position-specific positive percentage can allow a globally excluded model, and a position-specific 0% can exclude a globally allowed one.
- Toolkit Defaults, their optional standard Vicis Zero 2 setting, the shared All Positions Mix, and position-specific mixes are clearly separated.
- **Normalize to 100%** only adjusts percentages. It does not enable population balancing.
- Correction Passes and the final Review show the chosen action, mix, and the meaning of 0%. New previews retain and show the action used for that run, including when reopened from History.
- Save commits the action and mix together; Cancel discards all changes in the panel. Settings remain intact through navigation, Preview/Apply, disabling/re-enabling the pass, and presets.

## Compatibility and safety

Custom Repair Only now intentionally treats zero-weight models as excluded, not acceptable existing helmets. Toolkit Defaults, facemask mappings, helmet balancing, seeded selection, reports, and save writing remain unchanged. Repair Only remains the default. Existing presets retain their original helmet-control keys and percentages; custom 0% values now act as exclusions. Offensive linemen and existing player/save protections remain unchanged. FBS and directional FCS helmet balancing remain separate. Balancing diagnostics still count the actual before models, even if their weight is zero. Older saved previews identify their earlier repair rules instead of claiming the new exclusion behavior was used.

The app displays **v19.0**; Windows installer/update metadata uses **19.0.0**. Equipment Patcher remains v5.3 and Equipment Randomizer remains v5.1. No unrelated tool changes or release publishing are included.

## Earlier helmet-refinement verification

See `test/v190HelmetUi.test.js` for mode-specific copy, approved-list accuracy, review/preview metadata, position overrides, and the F7-at-0% repair/balance distinction. The Electron UI smoke additionally exercises modal Save/Cancel, whole-percentage validation, presets, default choices, disabling/re-enabling the pass, navigation, session persistence, Preview/Apply, and reset.

Build artifacts are under `dist/v19.0-release`. The `github-release-assets` directory contains the installer, matching blockmap, and `latest.yml` for upload. Builds never publish automatically.

Results before the app-wide overhaul:

- Full automated suite after the custom 0% exclusion update: **506 passed, 0 failed, 0 skipped**.
- Portable source subset: **430 passed, 0 failed**.
- Added coverage checks zero and positive weights for all 14 models at every allowed position, override precedence, deterministic repairs, protected/shared records, accurate before counts, and a full custom Repair Only Preview/Apply/backup/reopen operation on a real fixture save.
- Development and packaged Electron UI smoke checks passed, including the new combined helmet panel.
- Packaged codec smoke passed on four real case-alias rows, with strict candidate verification/reopen, fixed container size, and the original save unchanged.
- Windows NSIS installer and portable builds succeeded. Both executable startup/registry/schema/map checks passed.
- All 410 bundled source/assets matched the working source; schema and commentary resources, installer size, and updater SHA-512 metadata matched.
- Local updater smoke passed version detection, opt-in download, progress, checksum validation, and rejection of bad checksums. No installer was executed by that test.
- Nothing was published to GitHub or installed over the user's existing app.
## Model help, persistent season-line models and RAW v2.0.4 follow-up

- All 71 model fields plus the weekly assignment cap have compact question-mark buttons. Help explains both slider directions and the resulting model effect. Focus and hover share styled, viewport-bounded tooltips; Escape dismisses a tooltip first. Range inputs have explicit labels, separate from the help buttons.
- Saving a model validates all known fields and totals in the main process and writes it to the existing personal settings file. It survives restart; Cancel does not persist drafts. Settings only change in memory after the atomic file replacement succeeds. Preferences/artwork are not bundled into either executable.
- Fresh Smart Force Win forms load the saved model, with session settings and Config Presets retaining their normal precedence. Home's model dropdown includes **Saved Custom Model** when one exists. Read-only season projections use exactly the same custom configuration as Smart Force Win, without running assignments or writing a dynasty.
- Season Lines gives search the remaining width beside a compact week selector. Search/week survive model changes, and stale/background requests cannot overwrite a newer selection.
- Facemask rows no longer reserve a nonexistent logo column. Names wrap, use readable text, and drop only the selected helmet-family prefix; full labels remain searchable and available as titles.
- The read-only modded scan completed all normally readable regions for the targeted gear names. A checked, address-free catalog is in [catalogs/equipment-modded-2026-10-05.json](catalogs/equipment-modded-2026-10-05.json), with sourcing limitations in [catalogs/README.md](catalogs/README.md). This is not a guarantee all menu assets were resident.
- Catalog observations distinguish 145 established catalog/locked entries, 47 Unlocked entries, 52 RAW entries (including excluded earring combinations), and 7 unresolved entries. Established pool mappings are listed separately from current-session observations.
- Exact white IDs are **GuardianCap_RawNikeSkullCapWhiteV87** and **GuardianCap_RawBattleSkullCapWhiteV87**. Rechecked black IDs remain **GuardianCap_RawNikeSkullCap** and **GuardianCap_RawBattleSkullCap**. All four use GuardianCap, stay RAW-only, have verified labels, and have explicit white/black recolor pairs. Missing team-color variants are not invented.
- The supplied RAW manifest is 2.0.2; the running session was user-confirmed v2.0.4. Its newer white skullcaps were verified live and attributed using the user's explicit provenance. Vanilla observations alone are not treated as proof an item is unmodded or unlocked.
- Every Unlocked/RAW requirement notice now recommends 0.96/v2.0.4 respectively, with creator credits unchanged.

The rollback snapshot immediately before this follow-up is `outputs/ui-rollback-Jyjadz` (616 verified files). Earlier v19/v18.5 rollback snapshots remain intact. Use `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-Jyjadz` only when intentionally discarding subsequent source changes; personal settings/dynasties are not part of the snapshot.

Builds remain **v19.0 / 19.0.0**, Patcher **5.5**, Randomizer **5.1**, Smart Force Win **4.5**. Local installer, portable and upload assets are under `dist/v19.0-model-help`. Nothing was installed over the user's app or published.

### Follow-up verification

- Full suite: **542 passed, 0 failed, 0 skipped**. Portable source subset: **463 passed, 0 failed**.
- Development and packaged Electron UI checks passed across all nine tools and Settings, including every slider tooltip, keyboard/hover behavior, saved custom-model loading, Season Lines model/search persistence, and readable facemask labels. Light/dark desktop and 760px/520px dialog checks passed.
- Save-based tests confirmed that Saved Custom Model season projections match Smart Force Win's projections without changing the dynasty. All four RAW Nike/Battle skullcaps passed Preview/Apply/reopen and report checks.
- All **420** bundled source/assets matched the final working source. Installer/update manifest size and SHA-512, schemas, and commentary resources were verified.
- Packaged codec checks passed on four real case-alias rows, preserving fixed container size and the original save. Local updater checks passed discovery, opt-in download/progress, checksum verification, and bad-checksum rejection without executing an installer.
- Both unpacked and portable executable startup smoke tests exited successfully. Final installer and portable builds are local only.
