# v22.5 — Randomizer pool-window correction

CFB27 Unlocked, RAW Accessories and ELJAX's Equipment Truck share one corrected
category editor. This is a presentation-only change; chances, defaults, allowed
items, compatibility rules, presets and the equipment writer are unchanged.

- Equipment Category has an explicit label/caption row containing its help icon.
  The dropdown is a separate control, so the authored icon cannot become an
  independent row between its caption and dropdown.
- Category and chance fields reuse the common configuration-field spacing.
  Their controls align on wide windows and stack at narrow widths. Both have
  explicit accessible labels; help remains dynamic for the selected category.
- Item rows have zero inherited label margins and an eight-pixel grid gap.
  Checkbox and item text align, and long item names wrap.
- Only the modal body scrolls. The item grid no longer has a second scrollbar;
  the common header and Save/Cancel footer remain outside the scrolling area.

The regression harness checks all 24 categories across three window widths,
light/dark themes and Standard/Extra text sizes: **288 category/layout
combinations**. It covers authored help geometry (not only automatically generated
icons), category switching, keyboard/click help, validation, Save/Cancel, preset
serialization, item spacing, unique field IDs and scrolling boundaries. The
focused checks passed without running a tool or writing a save.

The earlier matching v22.5 release assets are retained locally in
`dist/v22.5-before-pool-fix/github-release-assets`. They do not contain this
correction and must not be mixed with the refreshed assets.
