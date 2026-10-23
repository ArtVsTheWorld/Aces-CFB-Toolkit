# v22.5 — Redshirt scope and tooltip follow-up

## Redshirt filters

Equipment, Commentary IDs, Team Boost, and NIL Toggle now share the same
single-selection control, in this order:

- All Players: no redshirt restriction.
- True: `Eligible` or `Current`.
- Redshirt: `Previous`.

The class-year selection still combines with this scope. Backend filters continue
to receive the verified stored statuses, not display labels. Existing saved
status arrays migrate into the new groups: Eligible/Current selections become
True, Previous alone becomes Redshirt, and mixed True/Redshirt selections become
All Players. New presets save the grouped choice.

## Tooltip ownership and layout

- Help is attached to an identifiable caption. Without a caption, the original
  explanation remains readable inline; no standalone icon is created.
- Wrapping labels get a dedicated title row. Their help no longer appears after
  the dropdown as a floating or centered control.
- Cutoff Pants has a labeled Position Caps heading. Standard-pants/Above-Knee
  interaction help is attached to Also Replace All Standard Pants.
- Mouthpiece style-mode help is attached to Mouthpiece Style Mix.
- Checkbox configuration rows size to their content. Tattoo cap/design controls
  and related mouthpiece settings have distinct field/section spacing.
- NIL Toggle uses the same centered 920-pixel settings column as other tools.
- Playing Style cleanup remains visible but disabled and faded unless the
  position restriction is enabled. Disabling the restriction prevents cleanup
  from being included in run options, without erasing the saved checkbox choice.

## Checks

Focused tests cover the grouped statuses in both composable filters and NIL
Toggle, legacy settings migration, dropdown order, and caption-only help.
Real-renderer checks cover Save/Cancel/presets, tooltip click and Escape behavior,
non-toggling info buttons, compact checkbox height, tattoo spacing, centered NIL
layout, dependent cleanup state, and light/dark desktop and narrow-window layout.

The full source suite passes all 770 tests. The full renderer audit passes across
19 pages, 21 configuration editors, 258 dropdowns, and light/dark layouts at
1480, 760, and 520 pixels.

The unpacked build in `dist/v22.5-redshirt-tooltip-test` passes the same packaged
UI checks. Its 510 source files/assets match the working source exactly; bundled
tuning, schema, version, and commentary resources are also verified.

No dynasty fixtures or personal app settings are modified by these checks.

## Scope-summary and Smart Force Win alignment follow-up

- Player Scope now names the selected redshirt scope instead of displaying
  `1 redshirts`. Shared summaries use `Redshirt Scope: All Players`, `True`, or
  `Redshirt` as appropriate.
- The custom matchup-model Starting Preset dropdown and Load Starting Preset
  action align as one toolbar, stacking cleanly on narrow windows.
- Shared checkbox rows align the box, text, and help icon without inheriting
  field-caption bottom spacing. This covers User Schedule Only and Force every
  eligible FCS matchup, without changing either option's behavior.
- Existing slider help is reused rather than adding a duplicate info icon.
- Focused renderer checks exercise all three scopes, preset loading and Cancel,
  checkbox geometry/help behavior, and light/dark 1480/760/520-pixel layouts.

Follow-up verification: all 771 source tests pass. The fresh unpacked build in
`dist/v22.5-scope-force-test` passes all packaged configuration/alignment checks,
including the new scope and Smart Force Win regression checks. Its 510 bundled
source files/assets match the current source.
