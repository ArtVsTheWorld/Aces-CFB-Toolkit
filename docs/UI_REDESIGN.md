# UI redesign: shared tool flows

The current implementation covers the rollback baseline, shared UI components,
Equipment Patcher, Equipment Randomizer, shared preview/results and all remaining
tool settings, independent main/accent colors, GitHub release-note dialogs and
final polish. The current v24.0 review adds the accent-tinted wrench, equal-height
Quickstart mod rows, Reports pagination and shared sportsbook-style matchup tiles.
In light mode, Main Color affects dark chrome while light surfaces stay neutral.

## Rollback baseline

Before editing application code, the corrected v23.1 source at
`2fcb8c01aad14fbff8d62370083ada7ccba87f0a` was archived with its matching installer,
blockmap, update manifest, bundled resources, dependency lockfile and Git history.
The published GitHub v23.1 release was downloaded into a separate archive folder.
The local archive includes per-file SHA-256 checksums and restoration instructions;
its source copies and installer/update metadata were verified. Private local
context is separate from distributable source. No game saves or user settings
were changed to create this baseline.

## Shared components

`ui-components.js` and `ui-foundation.css` establish opt-in components for step
navigation, option rows, sections, configuration cards, editor shells and action
areas. They use the existing theme/accent colors, consistent spacing, 38px action
buttons, wrapping labels and visible keyboard focus. Existing tools retain their
layout until migrated.

The Patcher reserves space for its action area and scrolls settings above it.
Editors reserve their header and footer and scroll only their content. This keeps
actions reachable without laying them over settings. Information buttons remain
beside their labels and do not toggle the associated checkbox.

## Patcher flow

1. **Choose Options:** choose teams and player filters, then select changes in
   three compact groups. No pass is selected by default. Short mod requirements
   remain visible; plain-language explanations are available from info buttons.
2. **Configure:** only selected changes appear. Defaults can be used immediately.
   Configurable passes open the existing isolated, tabbed editors. Fixed actions
   describe their effect without an unnecessary Configure button.
3. **Preview and Apply:** continue into the reviewed-plan workflow described
   below. The complete settings review remains inside Run Details.

Changing pages or disabling an option preserves its configuration. Existing
presets and defaults still address the same canonical control IDs. Save commits
a modal draft; Cancel, Close and Escape discard it. Opening a global editor does
not flatten position overrides. Changed settings invalidate an older preview;
opening an editor or saving an unchanged draft does not.

RAW recoloring remains automatic inside Recolor Accessories. There is no RAW
recolor checkbox. Existing mod requirements, default exclusions, pass ordering,
tattoo conflicts, equipment rules and save-writing checks remain in place.

After review, the helmet Configure button was aligned with the other buttons,
including at wide window sizes. Fresh/reset Patcher configurations now use
**Team Percentage Distributions** for accessories and **Match Tape to Player
Accessory Color** for tape. Quickstart already used this combination and retains
it. Explicit saved themes and independent tape distributions remain available.

## Randomizer flow

Choose Options contains the existing Teams/Player Filters editors and four
compact optional choices: Unlocked Equipment, RAW Accessories, GameDay Gear /
Equipment Truck, and No Drip. Donor copying always remains available, including
when no extras are selected.

Configure always shows Donor Settings and shows only selected extras. The donor
editor retains its Source & Players and Mixing & Cross-Position pages: active or
read-only external source, top-rated or selected donors, donor count, independent
position-source lists and the existing shared mixing budget. Item-pool editors
retain every category, chance and item selection. RAW and Unlocked Jamo additions
still start off. Player protection, dynasty memory and donor-recipient options
remain in Player Filters.

All 28 canonical controls on the reference save, their default values and the
serialized options for all selected extras match the pre-change inventory.
Disabling an extra preserves its settings. Unchanged pool Save now preserves the
reviewed preview, matching the other editors; actual edits still invalidate it.
Navigation and saved-preset loading retain donors, mixing, item pools and style
settings. The shared frame reserves the same actions and progress area as Patcher.

## Preview and results

The shared result shell starts with a plain-language status and up to three key
totals. Equipment shows players, teams and equipment changes for the complete
run, even when only the first 1,000 rows are displayed or a review filter is active.
Full-run display metadata is calculated from the cached plan and retained in saved
reviews. Unknown totals are omitted rather than inferred from a partial page.
Other tools retain their own units, including rating changes and schedule games.
Smart Force Win's totals respond to Leave This Matchup Unchanged decisions.

Affected players or games are the main content. Equipment rows retain 36px team
logos, exact before/after changes, lazy player dropdowns, donor sources, mod items
and compatibility details. Cards and Table remain available. Applicable player
tools share labeled Search, Team, Position, Class Year and Reset Filters controls.
Live filters search the entire cached plan; saved reviews search the full stored
snapshot. Review filters never reduce the scope of Apply.

Run Details starts collapsed. It holds the original complete run statistics,
settings, protection audit, equipment breakdowns by team/type, skipped players,
population and compatibility diagnostics, report actions and backup paths.
Actual blockers and unknown warnings remain visible above the player list.
Routine Mapper ordering and Quickstart skip notes remain available in Run Details.

The live preview frame reserves its Apply footer below one scrolling results
area. Completed results say Results, offer Back to Settings and hide the Apply
footer. No-change and equipment-memory failures have distinct truthful messages.
A recoverable Apply failure restores the reviewed list, disclosures and scroll
position, shows its error near the top and permits a deliberate retry. Expired
plans are discarded and Apply is disabled, including when expiry is discovered
through search. Successful writes remain successful if a history refresh fails.

The shared frame is used by the equipment tools and existing standard/schedule
preview workspaces. Saved history reviews remain read-only. This stage changes
display metadata and renderer presentation; save encoding, equipment selection,
pass ordering, reviewed-plan checks, backups and reopen verification remain intact.

## Remaining tool settings

The other tools now reuse the same step navigation, configuration cards, compact
choices, help buttons, theme tokens and reserved action area. Existing controls
and bound launchers move into the shared frame; a second settings model is not
introduced. Presets and Reset stay in the same command area above the settings.

| Tool | Setup | Detailed control retained |
| --- | --- | --- |
| Jersey Renumber, both modes | Choose Options → Configure | Protected teams/players, promotions, traditions, retired numbers and the three-page player-lock/custom-rule editor |
| Team Boost | Choose Options → Configure | Combined player filters, above/below-average scope, main range, independent position ranges and specific attributes |
| Roster Generator | Choose Options → Configure | Team selection gate, caliber/age/potential, schemes and position counts, talent shares, appearance and per-team overrides |
| Smart Force Win | Choose Options → Configure | Evaluate/clear, schedule scope, protected/user teams, involvement, models, FCS behavior and exact clearing targets |
| Commentary ID Patcher | One compact settings page, then decision review | Combined filters, True Freshmen Only, matching rules, individual/bulk Accept/Reject, cards/table and final Preview |
| NIL Toggle | One compact settings page | Plain-language Allow/Restrict In-Game Editing, combined filters and the existing dynasty-wide confirmation |
| Equipment Mapper | One compact library/queue page | Browse/copy, ordered rules, editable targets, paired sides, color preservation and per-team caps |
| Equipment Quickstart | One compact settings page | All three mod choices, shared player memory/counts, clear-memory confirmation and automatic included corrections |
| Long Snap Rating Fixer | One read-only rules page | Existing TE/OL correction ranges and Preview; no artificial configuration step |

The reference inventory retains all **89 canonical controls**, available options
and serialized defaults across these 11 configurations (10 visible tools, with
both Jersey modes checked). Cancel/Escape preserve drafts; generic editor Save
commits only actual changes. Unchanged Team Boost position-range Save now keeps a
reviewed preview. Tabs and page changes preserve all granular settings.

Team Boost's position/class/redshirt/player and room-average filters now share a
tabbed Player Filters editor. Its position overrides retain an independent editor.
Late-loaded fields are restored before the setup frame captures settings. Changes
emitted by session restoration cannot overwrite saved values for fields still
loading. This fixes loss of position overrides on return to the tool.

The custom matchup model now has four keyboard-accessible pages: Model & Limits,
Ratings & Matchups, Coaches & Venue, and Decisions & Lines. All sliders, balancing,
weekly limits, validation and model persistence remain intact. Inactive-page
errors still block Save. Clearing assignments has its own visible configuration.
The existing duplicate settings-review screen is bypassed by the visible Preview
action; the reviewed settings remain available in the result's Run Details.

Commentary decision review uses the same reserved actions and labeled
Search/Team/Match Type/Reset Filters controls. Similar-sounding decisions remain
mandatory. Coverage and matching notes are in Match Details. Accepted/rejected
decisions persist through filtering and Cards/Table changes. Exact-only analysis
still opens final Preview directly.

Jersey, Dealbreaker, Force Win and Commentary now share the recoverable-failure
presentation from the equipment tools. A completed write is not reported as failed
because a history refresh failed. An expired plan disables Apply. Page-load guards
also prevent late tool or Reports responses from replacing a page opened later.

A separate source checkpoint of the approved preview/results stage and its ASAR
hash was saved before this work. The original release archive and installer remain
intact. Backend/shared files are byte-identical to that approved stage; no equipment
generation, save encoding or game-data write rules changed.

## Pass inventory

| Group | Options | Detailed editors retained |
| --- | --- | --- |
| Helmets & Face | Improve Helmets and Facemasks; Hand Out Visors; Brand Existing Visors; Add Mouthpieces | Helmet repair/balance, mixes and facemask pools; visor frequencies; mouthpiece application, position/style mixes and colors |
| Uniform Fit | Above-Knee Pants; Rolled-Jersey Undershirts; Lower Rolled Jersey; Cutoff Pants; Mid-Sock Replacement; Unlocked Sock Styles | Undershirt presets and body-specific mixes; global/position frequencies, fit rules and Standard Pants conversion |
| Accessories & Appearance | Equipment Compatibility; Recolor Accessories; Nike Thigh Pads; Remove Handwarmers; Add Tattoos; Clear Tattoos; Bear's Pads Sleeve Fit | Shared/team accessory and tape colors; tattoo frequencies, placement, pairing and design pools; sleeve replacement style |

Every one of the 17 existing passes remains available. Canonical controls are
moved or their existing editor launchers are reused, rather than copied into a
second settings model. On the reference dynasty, the pre-change inventory has
1,332 controls; team-specific rows make this count save-dependent.

## Verification

Run the existing portable source tests and the Electron configuration smoke.
Additional targeted checks:

```powershell
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --patcher-flow-only
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --results-ui-only
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --remaining-tools-only
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --remaining-behavior-only
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --equipment-pages-only
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --randomizer-flow-only
node_modules/electron/dist/electron.exe scripts/smoke-tool-worker.cjs --randomizer
```

The flow check covers defaults, original-control parity when the private baseline
is present, selection, isolated Save/Cancel/reset, position overrides, preset
capture, stale-preview protection and the existing Preview/Apply requests. It
checks both themes, custom accents, 2296/1480/1100/760/520px windows and larger text
at 150% scaling. Randomizer checks cover the same flow, source/mixing drafts, all
mod pools, default Jamo exclusions and actual preset save/load. Screenshots and
diagnostics are local ignored output files.

The results smoke uses deterministic 2,501-player IPC replies without opening a
save for Apply. It checks complete-run totals, beyond-limit search, combined facets,
reset, row details, both views, settings-node identity, recoverable and expired
failures, completed/no-change/memory statuses, saved reviews, schedule decisions
and the reserved layout at all five widths, both themes and larger text. The worker
smoke separately applies a copied fixture and verifies backups, reopen, original
integrity, response progress and full overview persistence in saved reviews.

Remaining-tool checks compare the original control inventory/default options,
exercise actual drafts and presets, verify reachable editors and all modal pages
at desktop and narrow widths, and run Preview/Apply/failure paths with deterministic
IPC replies that never open a save for writing. The same helpers accept `--ui-root`
to verify the packaged ASAR. The packaged wrapper accepts `--remaining-tools`.


## Updates and final polish

- Commentary and Dealbreaker keep the original form hidden while their late player/protection selectors assemble. A shared loading panel occupies the settings area until the cohesive form is ready. Commentary load failure exposes a retry instead of a hidden form.
- Team Boost rating mode and Smart Force Win action/scope/model/involvement use the same setting-card frame as their adjacent controls. Related fields fill their card; responsive columns and Configure buttons remain consistent. Roster Team Settings now correctly refers to shared settings above.
- Randomizer and Quickstart use the same Player Memory row and Clear Dynasty Memory confirmation. They clear the shared dynasty memory without touching the save and invalidate both tools’ cached previews. Successful Randomizer Apply updates the remembered count.
- Quickstart adds one default-on Protect Original EA Roster Players checkbox. Disabling it includes those players and refreshes the eligibility totals. Its built-in style profile stays internal: no option, help text, preview marker or named report setting is exposed. Unlocked enables Add Tattoos in Fill to Frequency mode at 35%. K/P use donor equipment and donor facepaint, with no new pool items, style stripping or follow-up patcher passes.
- Each enabled Randomizer mod provider rolls independently on the same donor outfit. Random provider priority resolves conflicting slots, paired items stay together, and compatibility validation rejects a later proposal that would remove an earlier winner. Nonconflicting additions survive together. The single-provider seeded path is preserved. Facepaint retains its existing combined pool. The same core serves Quickstart.
- History resets pagination when leaving or reopening it. Search, Tool and Operation share one aligned desktop row, with a single-column fallback on narrow screens.
- Main Color tints page surfaces, panels, sidebar and top bar independently of Accent Color. Neutral gray is the default main palette. Both light/dark palettes bound tint strength and keep text/button contrast readable, including black, white, saturated colors and independent rapid setting changes.
- Available updates display GitHub’s release notes in a What’s New popup before download approval. Downloaded notes persist for a once-per-installed-version What’s New popup after updating. Notes support safe HTML/Markdown formatting; scripts, attributes, links, media and embedded content are discarded. Download and restart consent, Later, tool-operation guards and no-auto-install-on-quit remain intact.

The immutable v23.1 release archive is preserved, as are the previous review builds. Before this stage, `outputs/ui-step6-source-checkpoint.zip` and its hash record captured the approved stage6 source and ASAR. No version bump, production installer replacement, source push or GitHub publication is part of this review stage.

Additional checks:

```text
node_modules/electron/dist/electron.exe scripts/smoke-v190-configuration.cjs --final-polish-only
node --test test/modPoolArbitration.test.js test/updates.test.js test/tattooPoolAndAccent.test.js test/quickstartMemory.test.js
```

The polish smoke covers slow-loading form paint, EA opt-out counts, shared memory clearing, history pagination/alignment, independent color persistence and responsive palettes, escaped/allowlisted release notes, Later consent and post-install acknowledgement. It accepts the same packaged `--ui-root` as the other UI helpers. Real-save coverage additionally verifies specialist pool exclusions, optional EA eligibility, tattoo defaults and hidden internal Quickstart settings.


## v24.0 visual follow-up

Package and lockfile version is **24.0.0**, displayed as **v24.0**. The separate review build is `dist/v24.0-ui-review/win-unpacked/Ace's CFB Toolkit.exe`. Previous review builds, production v23.1 installer and the immutable release archive remain intact. Before this follow-up, the approved step7 source and ASAR were checkpointed in `outputs/ui-step7-source-checkpoint.zip` and `outputs/ui-step7-source-checkpoint-hashes.json`.

- The sidebar, startup and no-save Home branding use a scalable SVG mask based on the existing wrench and rounded frame. Its color follows the accessible app accent immediately. Team artwork is unchanged. The packaged Windows/installer shortcut icon stays the original fixed artwork.
- Quickstart's three Mods You Use rows share equal grid tracks, padding and centered controls, including narrow widths and larger text.
- Reports shows 20 entries per page, with Previous / count / Next matching History. Reopening starts on the first page; Open and Open File Location target the visible report. Escaping and stale-request guards cover navigation away and overlapping report requests.
- Main Color changes only dark chrome in light mode, including sidebar, top bar and Home's dark hero. White/light panels, page backgrounds and borders remain neutral. Dark mode retains tinted surfaces. Sidebar footer and hero overlays use the same palette.
- Home's selected notable matchups and the full season view share `seasonLineGameMarkup`: two team rows with retained logos, rankings, venue labels and aligned Spread / Moneyline / Total tiles. Each team receives its existing projected spread and moneyline; total appears as O / U, and zero spread is PK. Tiles are read-only displays. No additional odds, selections, write actions or model changes are introduced. Existing notable-matchup ranking, week/team filtering and model choice remain.

`--v240-ui-only` verifies these changes on source or a bound ASAR at 2296/1480/1100/760/520 pixels, both themes and 150% scaling. It includes Reports page bounds/actions, exact team projections, retained logos, equal tile columns and heights, neutral light surfaces, live icon tint and version display. Screenshots are under `outputs/v240-ui/`.


## v24.0 Home and navigation refinement

The sidebar and bottom navigation now share one continuous background. The footer is transparent, and the palette rule also overrides the old light-only fixed green gradient.

Matchup team logos increase to 56px and names to 24px on desktop, with responsive sizes on narrow screens. Venue subtitles are removed. The away team's name ends with an inline @; neutral-site games use vs. Both market rows share equal grid tracks even when long names wrap, while the original projections and team ordering remain unchanged.

Home keeps its hero and shows the following content based on the active save's native season type:

- **Preseason:** Recommended Preseason Workflow, then Quick Tools / Recent Activity. Season Matchup Lines is hidden and no projection request starts.
- **Other phases:** Quick Tools / Recent Activity, then Season Matchup Lines. The preseason workflow is absent.
- **No save / unknown season:** Quick Tools / Recent Activity remain available; the preseason workflow does not appear without a confirmed active preseason save.

The separate review is `dist/v24.0-home-review/win-unpacked/Ace's CFB Toolkit.exe`, still 24.0.0. The preceding v24.0 review and `outputs/v240-before-home-polish.zip` checkpoint remain intact. `test/homeSeasonLayout.test.js` covers phase-dependent ordering and suppression of unavailable preseason requests; the enhanced `--v240-ui-only` smoke checks these behaviors plus transparent footer, tint, larger team labels, paired rows, responsive layouts and 150% scaling on source and ASAR.


## Dynasty identity, activity and artwork

Activity and personal artwork now use the save's native signed **Franchise.LeagueID**, matching the existing equipment-memory identity. Filenames remain diagnostic paths and write targets; they are not dynasty identifiers. New Preview/Apply history entries, report audits and saved reviews retain `dynastyId`. Home's recent activity and recorded-tool labels use that ID across renamed/manual/autosave copies. History retains All Dynasties and adds This Dynasty filtering. Known IDs are never inferred from filename matches, including when a filename is reused for another dynasty. Non-dynasty roster activity can still use a local file association.

Custom logos and headers are stored in per-dynasty settings and managed image directories. Reading, uploading and Use Default stay within that dynasty; clearing one does not affect another. Saved reviews use the reviewed run's artwork profile, even when another dynasty is active. File-picker responses and late review/context results are checked against the selected save, and reviewed Apply plans remain bound to the exact file.

Legacy history is recovered conservatively from available backups, matching report audit links or source files that have not changed since their recorded run. Unverifiable older entries remain intact in All Dynasties. The first history-ID migration preserves `history.json.before-dynasty-ids.bak`.

Earlier globally shared artwork and its original files are retained. A verified previous save/ID can assign it to that dynasty once; copies of that dynasty share the recovered artwork. If its previous save cannot be identified, Settings offers **Use for This Dynasty** rather than guessing. The original settings file is backed up as `settings.json.before-dynasty-profiles.bak`. The migration adds scoped preferences; it does not edit game saves.

Home's content now follows the team hero with 24px clearance, and 24px separates the Quick Tools/Recent Activity row from matchup lines. The spacing applies in both season layouts, themes and responsive widths.

The review remains v24.0 at `dist/v24.0-dynasty-review/win-unpacked/Ace's CFB Toolkit.exe`. Prior builds and `outputs/v240-before-dynasty-profiles.zip` remain available for rollback. `scripts/smoke-dynasty-profiles.cjs` tests actual main/preload/worker flow on isolated copies, with optional `--app-root` for an ASAR. It covers native IDs, renamed copies, reused filenames, independent artwork/reset, historical review artwork, legacy recovery/backups and stale picker/Apply guards. Pure regression coverage is in `test/dynastyProfiles.test.js`.


## Save-loading responsiveness follow-up

Selection now opens one read-only session for schema, native dynasty ID, teams and season. Detached metadata is cached by full file-content SHA-256; tools retain their own mutable sessions and exact-file Apply checks. History recovery and optional matchup calculations run separately from selection and tool execution. Home/listHistory return immediately without waiting for older history migration. Known artwork ownership is prepared immediately; uncertain legacy owners recover in the background without rebuilding open configuration drafts.

A shared Loading Save pane displays stage percentages and hides old controls until selection is ready. Cancel/failure cleanup, replaced-filename detection and stale background Home/matchup guards are tested. On an isolated copy of the user history, the Gator benchmark improved from 8.8 to 3.2 seconds first ready and 8.1 to 0.08 seconds on repeat selection. The review is dist/v24.0-loading-review/win-unpacked/Ace's CFB Toolkit.exe. Prior reviews, the pre-change source ZIP and the production rollback archive are preserved. See HANDOFF.md for verification details and test logs.


## Home artwork action

For an active save, the hero uses Customize Team Art as its main action; Change Save remains in the shared top bar. The artwork action opens Settings with the displayed team selected. The no-save Home page retains Select Save. The shared v24 UI smoke checks this behavior, responsive layout, themes and the navigation target. User-facing notes for the complete update since v23.1 are in RELEASE_NOTES_V24_0.md.


## Preview scrolling follow-up

Equipment and Jersey results keep only the selected Cards/Table content in the live document, retaining the other view's nodes and listeners in a fragment for exact restoration. Searches, full-run totals, open player details and the reviewed Apply plan are preserved. Removed unused serialized search attributes and deferred result-logo decoding. Tooltip scroll dismissal avoids rewriting an already-hidden state. Legacy inner height caps no longer compete with the shared result scroller in Jersey and generic tables. Native wheel checks cover both views of Quickstart and Jersey, including repeated view changes, search/reset and help dismissal. No save-writing code changed.

### Preview paging

Equipment, Jersey and the other cached player previews now show at most **100 result rows per page**, with Previous/Next and direct page selection above and below the list. Completed results and saved reviews use the same controls. Search and combined team/position/class filters cover the entire result, reset to the first matching page, and retain complete run totals. Apply still uses every cached assignment, regardless of the displayed page or filters. Commentary's separate decision flow and Smart Force Win's schedule decisions retain their existing behavior.

The background worker sorts and indexes complete preview rows once per plan, reuses matching rows while paging, and returns only the requested 100 rows. Full reports, assignments, player memory and complete saved-review rows are retained. Saved reviews index their complete snapshot once. Late search responses cannot replace newer input or another page; temporary page-request errors leave the current review available. Player expansion state is specific to the player row and page, avoiding repeated opening of rows sharing the same summary text.

Stress validation uses a real Quickstart run with all three mods selected and original EA protection off: **12,153 players / 254,671 equipment changes / 122 pages**. A synthetic **12,087-player / 410,958-change** run covers the larger case. Native wheel tests exercise Cards/Table for Quickstart and Jersey in the packaged review. A disposable-save Patcher Apply/reopen verifies all **627** planned appearance records across seven pages, plus an exact backup. The 868 portable source checks pass. These checks establish bounded rendering and preserved results; user-machine scrolling still needs confirmation. The separate review is `dist/v24.0-preview-pages-review/win-unpacked/Ace's CFB Toolkit.exe`; production installer and prior reviews remain intact.

### Accessory and tape defaults

Alabama, Nebraska, Penn State and USC now start at **95% white / 5% black accessories** in both Quickstart and Patcher. Other school distributions and the original tape percentage tables remain unchanged. Quickstart alone uses **white wrist tape / black spats** for the four schools; arm tape retains the player accessory result. Patcher’s Match Player Accessory Color recolors wrist tape and spats to the player’s accessory color, including these schools. Patcher's explicit independent tape distributions and custom accessory percentages remain available. Prepared configuration metadata now separates accessory defaults from tape defaults, and the editor displays/saves each independently.

Quickstart alone, with Unlocked enabled, has a **5% per-player** finishing step that recolors one worn gloves/sleeves/undershirt category to an available primary or secondary variant. Paired gloves or sleeves and duplicate on-field outfits share that color. It preserves style, adds no gear, skips unknown/unavailable variants, protects shared appearance rows and original EA players when protection is enabled, and retains donor-only kickers/punters. A None slot stays empty and does not prevent recoloring its single worn counterpart. There are no new Quickstart controls or explanatory notes. The normal preview/report still shows actual changed equipment. Patcher and Randomizer do not run this step.

The local review is `dist/v24.0-accessory-colors-review/win-unpacked/Ace's CFB Toolkit.exe`. Prior reviews and the production installer are preserved. The full-source checkpoint is `outputs/v240-before-accessory-colors.zip`; HANDOFF.md records the package and verification results.


### v24.1 validation and position ratings

Team Boost’s automatic modes now adjust the full relevant rating set for a position, independent of archetype. This set combines the meaningful skills across that position’s embedded reference profiles; it excludes unrelated baseline-weight ratings. Every eligible rating receives its own adjustment within the selected range, with no weighted chance to omit a skill. Physical/nonphysical modes, Specific Attributes, position ranges, team/player filters, room averages, clamping and exact cached Preview/Apply remain available. All WR archetypes include short, medium and deep route running. Preview/report descriptions now identify position relevance accurately.

Equipment Mapper passes its library, side/pair, scope, metadata/color, cap, compatibility, malformed-input and shared-appearance regression checks. Additional real-save workflows copy a sleeve, paired sleeves and an undershirt, replace a sleeve, remove an undershirt and queue multiple mappings. Each verifies read-only Preview, exact backed-up Apply/reopen, unchanged unrelated equipment/Base layers and other tables, same file size and an untouched original. A separate real-save Team Boost check verifies every Boise State WR’s three route-running ratings and all unrelated ratings/players/tables. Private save fixtures remain outside the published repository.

### Loading and generation performance follow-up

Save opening now validates the schema and parses the same fresh franchise instance, avoiding a second inflation. Home's read-only session loads only the team, ownership and season fields it uses; mutable tools still read all their normal fields. Metadata caching remains keyed by freshly hashed contents, including when another dynasty replaces the same filename.

Equipment generation reuses static branded catalog filtering through isolated returned arrays. It avoids an unnecessary overlap scan for items without overlap groups. Low-chance pool rolls first establish that a legal item exists; only successful rolls build the complete compatible pool. This keeps pool ordering, every random draw, and all selected-item/final compatibility checks unchanged. A seeded 11,838-player comparison against the previous build matches the complete output exactly, with the same explicit pools.

On the local fixture, warmed generation improved from17.5s to6.2s, the complete profiled Randomizer Preview from28.8s to22.9s, and alternating native save-selection checks averaged2.11s to1.71s. Repeated selection stays around40ms. These are local measurements, not timing guarantees for other machines/saves. Source tests, exact save/reopen workflows, metadata comparisons across two dynasties and native configuration/result checks validate preserved behavior.

Team Boost's positive rating indicators use a dedicated light/dark green, independent of the app accent; decreases stay red. All four Unlocked biceps-band colors remain available but start unchecked in Randomizer and Quickstart. Explicit selections and presets are preserved; default category reset disables the bands again. Existing donor gear is not removed just because an item is excluded from new pool additions.
