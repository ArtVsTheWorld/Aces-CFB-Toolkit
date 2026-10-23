# v22.5 — UI cleanup and NIL increments

## App-wide

- Removed the generated “Who This Will Affect” panels. Player filters, preview verification, NIL-wide confirmation and other safety checks remain.
- Removed automatic section-jump navigation from configuration windows. Genuine page tabs, such as Jersey Renumber’s three configuration pages, remain functional.
- Added one shared selection-order policy for canonical controls, cloned editors, dynamic filters and saved-run reviews. Positions follow the game’s order, with native enum aliases normalized for comparison; class years run Freshman through Senior. Age, potential, caliber, text size, week and other ordinal selections use meaningful orders. Remaining options use case-insensitive natural alphabetical order. Placeholders and explicit All/User/Selected/None modes stay easy to find.
- Checkbox choice lists use the same policy. Donor-player lists retain their intentional default/rating sort, and Force Win’s team search retains relevance ordering while searching.
- Sorting preserves selected values and original defaults and does not emit a settings-change event.
- Standardized label/control gaps, configuration actions, checkbox alignment, captions, help-icon sizing and responsive toolbars. Searchable selection captions retain their help icon when their selected-count label changes.

## Roster Generator

- Configure Teams combines Bulk Setup and the complete individual editor in one window. Numbered Bulk Setup, Shared Settings and Team List sections keep detailed frequency and allowed-option controls in Advanced Options. Edit Team and Back to Team List switch views without another modal or an intermediate save.
- Team rows include logos, current average/roster size, locks and compact editing controls. The table scrolls internally and Save/Cancel remain available. Search, rerolls, bulk copying, preset serialization and isolated drafts remain intact.
- NIL compensation is allocated in blocks of five. Valid native team budgets are preserved exactly and QB weighting remains in place. A legacy total not divisible by five leaves its remainder unspent. The largest per-player allocation is 1,020, the greatest multiple of five within the existing unsigned ten-bit field; an over-capacity legacy budget likewise leaves excess unspent instead of creating invalid amounts. Review labels disclose unallocated amounts.

## Validation

Automated checks cover five-unit allocation, legacy remainder handling, ceilings, weighted/deterministic allocation, actual funded Preview/Apply/reopen workflows, selection ordering, selected/default preservation, all-tool configuration navigation, preset round-trips and responsive light/dark layouts.

The UI audit visits all 12 registered tool routes plus Home, Settings, Help, About, History, Reports and Season Lines. It checks 21 generic editors, 260 dropdowns and visible help-icon/label geometry in addition to the dedicated equipment/roster editor tests. Unified-team tests cover shared inheritance, all individual fields, protection, bulk/copy/reset, invalid budgets across views, unselected overrides, no-op Save, Cancel/Escape, previews and presets. Detailed results are generated locally in `outputs/v225-alignment-audit.json`.

Pre-cleanup renderer and NIL-writer copies are retained under `outputs/v225-before-ui-cleanup-20261022-204009`. They are local rollback references, not distributed application assets. No installer or source has been published by this task.
