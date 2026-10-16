# v20.0 — Selected Usability and Tool Refinements

## Protected baseline

Source snapshot: `outputs/ui-rollback-rfTC9W` (652 SHA-256-verified files). Original v20.0 installer/portable/update files are copied into its `release` directory; `dist/v20.0-release` remains untouched. Candidate builds use a separate directory. No publishing or version increment is requested.

## Main Pages, Configuration, and Help

- Before Preview, a **Who This Will Affect** summary exposes team, position, class, player, NIL, and other applicable restrictions. These are configuration summaries, not invented eligible-player counts; Preview remains the exact result.
- Team selectors explicitly distinguish **All Teams** from **Selected Teams**. Selected Teams cannot be empty. Protection selectors additionally offer **No Teams Protected**. Other player filters retain their existing meaning and explain it; checked donor/item/attribute pools remain actual selections, not implicit all-item pools.
- Equipment summaries call out excluded helmet models, position overrides, disabled mouthpiece groups, and existing-mouthpiece rerolls.
- Settings includes Standard, Large, and Extra Large text. Muted descriptions have improved contrast; keyboard focus is visible, tooltips can be reached by keyboard, and reduced-motion preferences are respected.
- Longer configuration windows offer section buttons. Position-specific overrides are identified and inherited settings are shown as actual effective values.
- Force Win's user-team confirmation uses the app's configuration-dialog design. Cancel is initially focused; Escape safely cancels.
- Help is searchable and filterable by tool. Topics cover percentage meanings, scope, safeguards, overlapping passes, presets, and **Why Didn't This Player Change?**
- Commentary uses **Suggest Similar-Sounding Last Names** and **Use First Name When Last Name Isn't Available**. Longer option examples/exceptions remain in searchable Help and feature editors instead of extra Details & Exceptions dropdowns.

## Equipment Randomizer

- Preview exposes the donor for each copied category, fallback selection explanations, and brand-compatible substitutions. CSV reports additionally retain the donor-decision audit alongside exact before/after equipment.
- Mixing help includes a concrete example and explains that cross-position and multiple-donor outcomes share one 100% budget; they are not independent rolls.
- Existing donor variety, field-level brand checks, seeded behavior, mod-pool settings, and save safeguards are preserved.

## Equipment Patcher

- Correction passes remain individually selectable. The follow-up removed **Select Recommended Passes** and **Clear All Passes** to keep the two settings columns aligned.
- Helmet Preview reports actual before/target/after counts and percentages by position group and team, separated by the existing FBS/FCS cohorts. Targets use the effective position mix. Explanations distinguish Repair Only from balancing, rounding, protected/shared rows, and team diagnostics from enforced team quotas.
- Helmet, facemask, visor, and mouthpiece editors can copy settings to checked position groups. Copies become independent overrides. Cancel discards draft copies; Save commits them.
- Inherited helmet mixes and facemask pools show what actually applies, not just an inheritance label.
- Before Preview, overlapping-pass help explains Unlocked Sock Styles taking priority over Mid-Sock Replacement, tattoos running last without changing the resulting sock style, and visor addition versus branding.

## Smart Force Win

- Matchup cards distinguish the projected favorite from the proposed forced winner and expose the strongest actual model contributions.
- **Leave This Matchup Unchanged** omits the selected assignment from Apply while preserving its existing force-win value. Decisions remain attached to the correct schedule row after sorting/filtering.
- Apply reports and saved reviews distinguish proposed assignments, deliberate omissions, and actual writes. Omitting every proposed assignment writes no dynasty and creates no unnecessary backup.

## Commentary IDs

- Added composable team, position, class, redshirt, and individual-player filters. They narrow the existing True Freshmen setting rather than replacing it.
- Scope and Help explicitly state that NIL players are always excluded. Existing suffix/hyphen matching, decision approval, stale-analysis validation, reporting, and backups remain in place.

## Jersey Renumber

- **Player Locks & Team Number Rules** uses three separate pages inside one modal: Player Locks, Retired Numbers, and Team Traditions. Page switching preserves the isolated draft; Save commits all pages and Cancel discards them. There is no section-jump bar.
- Retired Numbers displays the toolkit's actual team defaults as selected numbered jersey icons. Custom lists restore correctly; **Use Toolkit Defaults** removes the override. Retired-number enforcement still follows the existing Protect Retired Numbers setting.
- Traditions can optionally require Leader, Intense, Entertainer, Team Player, or Unpredictable personality, using the verified Player.Personality schema. Personality intersects the existing position/side/class eligibility and never changes player personality.
- Locks preserve the selected player's current number. Custom traditions use the existing highest-rated eligible-player allocation rules. A matching custom team/number tradition replaces its default rule; a team retired-number override replaces that team's entire list, including an explicitly empty list.
- Conflicts explain locked/retired numbers, duplicate protected numbers, unavailable teams/players, and protected NIL holders. Standard and No Duplicates retain their respective existing NIL policies.
- Locks record their source save and selected player identity. Imported locks from another dynasty, or a reused row belonging to a different player, require selection again instead of silently protecting the wrong player.

## Team Boost, Dealbreakers, and NIL Toggle

- Team Boost adds class, redshirt, and individual-player filters plus optional whole-number adjustment ranges by position group. All filters intersect the existing All/Above/Below Room Average scope. Room averages still use the full eligible position room, not merely the selected subset.
- Team Boost explains that Relevant Ratings uses archetype weights; Specific Attributes adjusts the explicitly checked supported attributes. Existing bounds and write safeguards remain.
- Dealbreaker Fixer can preserve selected existing dealbreaker types or individual players. Assignment explanations and the None-floor summary clarify why changes were chosen or limited. Protection does not alter the population-floor accounting.
- NIL Toggle clearly labels entire-dynasty scope and asks for confirmation before that Preview. The warning explains how NIL flags affect equipment and Commentary protection; the flag is not a claim about real-world NIL status.

## History, Presets, and Responsiveness

- History searches and filters every one of the latest 250 retained runs, with 20 results per page. Search/tool/operation/page choices persist while browsing.
- Presets export/import JSON configuration, show compatibility before loading, and support **Save as My Default**. Personal defaults remain local to the user's system and load on a fresh tool visit without running the tool. Toolkit startup defaults can be restored without deleting saved presets.
- Compatibility checks reject unsupported schemas, unsafe keys, invalid settings, missing teams, stale donor sources, and inappropriate player locks. Legacy equipment exclusion presets migrate to the current inclusion model.
- Large player selectors use position grouping and existing search/sort/checkbox behavior. Offscreen list rows receive rendering optimizations.
- Preview filters, expanded details, and scroll position survive review rerenders. Saved reviews have separate identities so another run does not inherit the wrong review state.
- Navigation/save-change/run tokens discard stale results and cached-search errors. Delayed donor-default loading checks source fingerprints and does not overwrite a configuration the user started editing.

## Verification

- Source suite: **534 passing tests across 67 files**, including the follow-up regressions below.
- Relevant real-save workflows: **18 passing cases** covering equipment groups/mod settings, donor roster/dynasty files, mouthpieces, user-only Force Win, scoped Commentary and Team Boost, Jersey locks/custom rules, Dealbreaker protection, and omitted Force Win writes. These use disposable copies, not the user's active saves.
- Development and packaged-renderer smoke checks cover Save/Cancel/Escape, forward/back navigation, explicit selection, all four position-copy editors, inherited settings, overlap notices, preset round trips/defaults, additional scopes, number locks, History, preview state, and a 3,000-player selection benchmark.
- Responsive screenshots cover light/dark themes at desktop and smaller widths. Unpacked and portable startup checks use isolated temporary settings.
- Release verification compares packaged source/assets against the workspace, checks engine/map resources, and validates the installer/update-manifest checksum.
- New regression cases cover navigation races, save switches, stale preview/search replies, interrupted errors, preset schema/migrations, player-lock identity changes, and saved review omissions.

These are structural, functional, and UI checks. They do not replace a final in-game check of representative user runs, particularly custom number rules and equipment configurations. No new in-game validation is claimed for this iteration.

## Candidate and Rollback

Candidate installer: `dist/v20.0-refinement/Aces-CFB-Toolkit-Setup-20.0.0.exe`.

Candidate portable: `dist/v20.0-refinement/Ace's CFB Toolkit 20.0.0.exe`.

The original `dist/v20.0-release` artifacts remain untouched. This candidate has not been installed or published. Because its version is still 20.0.0, it should not be published as an automatic update over an existing 20.0.0 release without choosing a newer release version first.

To verify the archive, from the project directory:

```powershell
node scripts/ui-snapshot.mjs verify outputs/ui-rollback-rfTC9W
```

If you decide to roll back the source:

```powershell
node scripts/ui-snapshot.mjs restore outputs/ui-rollback-rfTC9W
```

Restore first archives the current iteration, then restores the baseline's recorded files. It does not delete newly added files. For an immediate app-only rollback, use the original installer/portable in the archive's `release` directory. User settings and dynasty saves are not overwritten by the source rollback.

## October 13 Follow-Up

- Fixed a Commentary UI race. The scope catalog loads asynchronously; analyzing before saved scope finished restoring could lose the filters or discard the result and leave a loading message behind. Analyze now waits for scope, prevents duplicate submissions, and safely discards results after navigation/save changes.
- Fixed the shared settings-restoration cause: restoring an unchanged control no longer emits a change event. Adding a loading/result message therefore cannot masquerade as a settings edit and invalidate an in-flight tool. Genuine edits still invalidate stale results. Error displays remove their loading indicator without rebuilding live configuration controls.
- On the test save, real Commentary scope loading, analysis, and automatic final Preview completed in about 4.5 seconds, including an artificial 500 ms scope delay. Matching itself took about one second. Save/signature checks were not bypassed or cached unsafely.
- Removed the Patcher's two bulk-pass buttons. Conditional configuration entries now disappear entirely when their linked option is off, including helmets, shirts, visors, mouthpieces, colors/tape, tattoos, No Drip, and the Randomizer's optional mod pools. Their saved configuration remains intact while hidden.
- Added **Clear Tattoos** under standard correction passes. It starts off, is mutually exclusive with Add Tattoos, and respects the Player Pool, NIL protection, active roster and shared-row safeguards. It clears actual tattoo slots across appearance layers without rebuilding those layers or changing sleeves, socks, skin, faces or other equipment. Arm/leg slots use their known None assets; other tattoo slots are omitted without inventing asset IDs. Preview, per-player counts, CSV slot/raw-data audits, backups, cached Apply and exact saved-data verification are included. Presets containing both tattoo passes are rejected with an explanation.
- Fixed the equipment season gate using the actual schema names: **BowlSeason1**, **BowlSeason2**, **BowlSeason3**, and **NationalChampionship**. Bowl weeks can use absolute season numbers such as 17; comparing those against a count of postseason weeks was incorrect. Both tools now accept those stages through the championship. Offseason, invalid/unknown stages and invalid weeks remain blocked. The older PostSeason representation remains supported.
- Added source regressions for season stages, tattoo clearing/exclusivity/protection, unchanged restoration events, delayed Commentary scope and save-switch cancellation. Real copied-save tests exercise BowlSeason1 week 17 through Randomizer Prepare/Preview/Apply/reopen, and Add Tattoos → Clear Tattoos through exact Patcher plans. They compare unchanged appearance/player data, backups and CSV removals. Full-roster test comparisons use real field keys and release lazy decoded-field caches to avoid test-only memory growth.
- Development and packaged UI checks include all nine tool pages, hidden editors, tattoo toggles, preset/navigation behavior and responsive light/dark layouts. A separate hidden renderer uses real Commentary analysis/Preview with delayed filter restoration; it never applies to the source save.

The immediately preceding refinement iteration is additionally archived at `outputs/ui-rollback-BzElx4` (663 verified source files), with its installer/portable/update files in `release`. Use the same verify/restore commands with that path to revert only this follow-up. The original pre-refinement archive also remains untouched.

## Jersey Configuration Follow-Up

- Removed generated **Details & Exceptions** dropdowns app-wide. Concise descriptions and required-mod notices remain; searchable Help and dedicated editors retain the longer explanations.
- The jersey modal uses desktop page navigation and a small-window page dropdown instead of a long scrolling form. Each page supports the same shared draft and validation; no nested modal is introduced.
- Number selection uses accessible native controls behind numbered SVG jerseys, with selected states and keyboard focus. All 100 numbers are available; team defaults are preselected from the existing retired-number mapping, not a new real-world list.
- Added optional personality-qualified traditions in both jersey algorithms. Existing presets without personality remain Any Personality. Invalid values are rejected, and CSV rules/reasons retain the selected personality.
- Tests cover schema choices, default-list aliases, both jersey algorithms, full copied-save personality eligibility and unchanged unrelated player fields, page switching, saved defaults, Cancel across pages, and light/dark responsive layouts at 1480/760/520 px.
- The prior iteration is archived at `outputs/ui-rollback-H9YOXn` (667 verified source files plus its candidate release files). Verify/restore it using the same snapshot commands above to revert just this follow-up.

## Safety boundaries

Only the selected features are in scope. No new tools, gear catalog in-app, task presets, backup manager, diagnostics exporter, mod-profile detector, thumbnails, or real-world NIL inference. Existing algorithms/defaults are preserved unless a selected configurable extension requires a change. Save fingerprints and apply protections remain enforced.
