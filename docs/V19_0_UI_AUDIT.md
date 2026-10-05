# v19.0 — Simple main pages, powerful configuration on demand

## Baseline and recovery

Before the overhaul, the actual dirty working tree (not just Git HEAD) was copied to `outputs/ui-rollback-4kbVek`: 601 source/resource/build-definition/test/document files, verified with SHA-256. Existing `dist/v18.5-release` and `dist/v19.0-release` binaries are preserved. New builds use a separate output directory. No personal settings or dynasty saves are included in this snapshot or installer.

From the project directory:

```powershell
node scripts/ui-snapshot.mjs verify "outputs/ui-rollback-4kbVek"
node scripts/ui-snapshot.mjs restore "outputs/ui-rollback-4kbVek"
```

Restore first creates another complete source snapshot of newer work, then restores only the recorded files. It does not delete saves, personal configuration, Git data, extra files, or release artifacts. Restart the development app, or rebuild into a new directory. The retained installer is the fastest way to run the exact earlier packaged UI. Do not publish a rollback as version 19.0 after newer releases without choosing a new update version.

## Audit decisions (recorded before UI implementation)

| Screen / element | Decision | Reason |
| --- | --- | --- |
| Equipment configuration wizard | One configuration control center; retain separate settings review and exact Preview/Apply pages | Avoid hopping between three settings pages while preserving explicit approval |
| Equipment teams | Searchable checkbox selection window with current scope summary | Hundreds of logo rows dominate Player Pool |
| Equipment positions, class, body, redshirt and overall | One Player Filters configuration window | Related filters compose; show them together, not a stack of separate popups |
| Skip NIL | Inline | Important protection should remain obvious and directly accessible |
| Randomizer donor pool, selected donors, sorting, mixing percentages and donor save | One Donor Settings window | Conditional selection can be huge; position tabs, sort and shift-click remain in the same window |
| Randomizer No Drip switch | Inline; chances in configuration window | Enable is simple; three rates need grouping |
| Randomizer mod pool switches | Inline; extra-gear chance inline | Mod requirements must be visible; a single percentage does not justify a window |
| Patcher pass enable switches | Inline, grouped by purpose | Primary actions should be discoverable |
| Helmet action/mix/position overrides | Existing editor adapted to shared dialog shell | Benchmark design; retain the recently corrected 0% semantics |
| Rolled undershirt color, Bears Pads replacement | Inline | One short dropdown each; a popup would add friction |
| Mouthpiece colors, reroll, brand frequency | One Mouthpiece Settings window | Parameters must clearly affect additions and rerolls together |
| Accessory theme, weights, tape behavior and team tape table | One Colors & Tape window | Keep the complete color experience in one window, no nested tape modal |
| Tattoo cap and searchable design pool | One Tattoo Settings window | Large conditional selection; cap and designs belong together |
| Equipment presets | Existing compact disclosure | Already hides an advanced group without a modal; retain storage semantics |
| Team Boost teams | Searchable selection window, required-team validation | Large selector; empty must still mean no teams, not the whole dynasty |
| Team Boost base scope, adjustment range, rating family | Inline | Frequently changed, simple choices |
| Team Boost positions / Specific Attributes | Separate searchable selection windows | Large subsets, with summaries; base scope still applies |
| NIL Toggle target value | Inline | Fundamental action, one dropdown |
| NIL teams / players / positions / classes / redshirt | One Player Scope window | Composable scope; entire dynasty meaning stays explicit; no nested selectors |
| Jersey mode and three allocation-rule switches | Inline | Small, central decisions |
| Jersey Teams to Skip | Searchable selection window | Large selector; controlled-team defaults and empty = none preserved |
| Commentary scope and two matching switches | Inline | Only four simple toggles; window adds no useful simplification |
| Commentary detailed CSV option | Compact Advanced Reporting disclosure | Rarely used single checkbox, not a separate popup |
| Commentary sound-alike decisions | Existing dedicated review with inline search/facets | Approval is the task, not advanced configuration |
| Smart Force Win action, scope, involvement, model and FCS switch | Inline | Short controls closely affect the next action |
| Smart Force Win protected teams | Searchable selection window | Large selector; skip semantics preserved |
| Smart Force Win clear-one-team dropdown/search | Inline | Single selection, only visible in a specific action |
| Dealbreaker cleanup toggle | Inline | Primary feature |
| Dealbreaker nine starting weights | One Starting Mix editor with totals/reset/validation | Large related editor; do not change contextual algorithm or precision |
| Long Snap Fixer | Unchanged | No editable configuration; current concise explanation is enough |
| Settings theme/accent | Inline | Small, quick personal preferences with live feedback |
| Settings team artwork | One searchable artwork management window | Big previews and uploads obscure other settings; no nested dialogs |
| Settings active-save picker and update status | Inline | Primary actions/status should stay visible; existing native file picker remains |
| Home identity/workflow/lines/activity | Unchanged | Already a useful clean control center |
| All tool Preview / saved reviews / season lines | Inline search and relevant facet dropdowns | These narrow visible results and are repeatedly used; hiding them slows review |
| History / Reports / Logs / About | Unchanged | Read-only/navigation-led screens, no sprawling configuration |
| Help | Update for new entry points and draft semantics | Users should understand that Save Settings does not modify a dynasty |

## Shared implementation contract

- Native dialog shell: labelled title/description, backdrop, bounded internal scroll, pinned actions, focus restoration and Escape/Cancel discard. Only one configuration dialog at a time.
- Transactional editor: clone existing controls into an isolated draft, retain canonical controls/IDs for the existing serializers, and commit all changed values before emitting the normal change events. Drafts must never invalidate previews, alter presets, or leak into session settings. Cancel must leave the prior preview usable.
- Reuse existing checkbox/logo/search/sort/range-selection controls inside windows. No algorithm changes or reduced configuration capability.
- Current-selection cards distinguish empty = all, empty = none, and a required selection. Save uses the relevant existing validation/bounds and blocks invalid configuration.
- Scoped defaults reset only the open feature's draft; whole-tool reset remains available separately. Review/Apply/backups/reporting are unchanged.

## Follow-up verification record

Implementation, regression results and build paths are recorded in `V19_0_UPDATE.md`. Remaining future candidates: better navigation/search in lengthy Help, paginated very large History/Reports libraries, and measured performance improvements for extremely large donor/player lists. These are deliberately outside the current presentation-only scope.
