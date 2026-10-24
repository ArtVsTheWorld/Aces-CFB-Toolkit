# v23.0 configuration and tooltip cleanup

## Scope

Presentation and interaction changes only. Existing equipment generation, save writing, defaults, preset fields, position overrides and validation remain in place.

## Changed screens

- **Equipment Patcher / Mouthpieces:** rebuilt around Application & Styles and Colors & Existing Gear. All Positions and By Position use matching application and style cards. Application chance and population cap are separate from Standard/Pacifier/Hanging shares. Mixed global values remain explicitly marked as varying. The selected position is now the copy source, eliminating a duplicate selector.
- **Other Patcher editors:** consistent field groups, spacing, caption-owned help and persistent footers. Removed redundant numbered helmet section headings and facemask dividers. Preserved existing tabs, controls and validation.
- **Randomizer / Donors:** Donor Source & Players and Mixing & Cross-Position pages separate source selection from advanced mixing. Existing donor selection and external-save controls are preserved.
- **Equipment Mapper:** Equipment & Matching and Target Players pages separate replacement settings from targeting. Existing team/position/player sub-pages, paired gear, caps and match rules remain intact.
- **Jersey Renumber:** one horizontal page selector for Player Locks, Retired Numbers and Team Traditions; removed the duplicate visible dropdown and numbered sidebar. Arrow-key navigation remains available.
- **Team Boost:** explicit Minimum and Maximum column headings and aligned position-adjustment rows.
- **Dealbreaker Fixer:** protected dealbreakers and protected players occupy separate pages.
- **Shared player filters:** compact class-year choices avoid unnecessary search boxes; consistent picker text and spacing.
- **Quickstart:** Included Corrections is now a clear caption with attached help rather than a paragraph ending in a floating icon.
- **App-wide:** compact checkbox rows, label/control grouping, aligned info captions, responsive footer wrapping and consistent checkbox accent colors.

## Tooltip behavior

Mouse focus no longer pins help after the pointer leaves. Help supports delayed hover, click/tap toggling and keyboard focus. Scrolling, page changes, Escape, window blur, resizing and dialog closure dismiss it. Only one tooltip is active at a time. Hidden or removed anchors cannot leave help visible. Clicking help does not toggle its surrounding checkbox.

## QA and test entry points

- `scripts/smoke-v190-configuration.cjs --visual-audit-only`: read-only rendered inventory of all available tool pages, settings/help/history/reports and configuration pages. Images and geometry inventory in `outputs/v230-visual-audit/`.
- `scripts/smoke-v190-configuration.cjs --equipment-pages-only`: global and position edits, hidden-page validation, Save/Cancel/Reset, mouse/keyboard tooltip lifecycle and responsive light/dark layouts.
- `scripts/smoke-v190-configuration.cjs --paged-filters --alignment --tooltip-redshirt --scope-force-alignment`: broader configuration, filters, presets, navigation and safety regressions.
- `scripts/smoke-v225-packaged.mjs dist/v23.0-ui-redesign-test --quickstart --equipment-pages --mod-pool-layout --filter-polish`: verify packaged source/assets and run UI checks against the extracted packaged renderer.
- The save-workflow test's old hard-coded RAW facepaint count was updated to compare against the complete current catalog, including the already-added offline expansion. No equipment behavior was changed for this correction.

## Local handoff and rollback

### Verified October 23, 2026

- Full visual inventory: 106 captured views, no horizontal overflow or unanchored info captions flagged.
- Source selection: 332 of 333 checks passed on the first run; the only failure was the obsolete facepaint-count assertion described above. Its corrected real-save workflow rerun passed.
- Packaged verification: all 517 packaged source/assets matched the working source; schema, commentary map and version matched.
- Packaged UI suites passed: native schemes/team configuration, full alignment/filter checks, 288 mod-pool layout combinations, Quickstart and Patcher editors, and real mouse/keyboard tooltip interactions.
- Additional Mapper page/library round-trip tests passed for replacement and copy rules, selected-player preservation, Save, and narrow layouts.

Test build: `dist/v23.0-ui-redesign-test/win-unpacked/Ace's CFB Toolkit.exe`.

The prior renderer was copied before editing to `outputs/ui-before-redesign-20261023-212634/renderer/`. The previous unpacked build was not overwritten. If rollback is needed, compare/restore the changed renderer files from that snapshot and rebuild; do not reset unrelated working-tree changes. Nothing was pushed or published by this UI task.
