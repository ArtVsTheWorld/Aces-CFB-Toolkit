# Potential Next Steps — Not Implemented

These are scoped suggestions based on the existing save tables, tools, preview
workflow, and reports. They are not promises of new features or verified new
game fields.

## New tools

1. **Roster Health Check:** a read-only report of invalid equipment links,
   shared visuals, duplicate jersey numbers, and missing commentary matches.
   Separate harmless inactive records from active-roster problems. Reuse the
   existing diagnostics instead of attempting automatic repairs.
2. **Equipment Compare:** compare two saves by team/player and show which
   equipment changed. Useful for checking a mod, an in-game edit, or a Toolkit
   run, without modifying either save.
3. **Roster Change Tracker:** compare selected pre/post-season saves to show
   returning players, new arrivals, and rating changes. Matching reliability
   must be established from available identifiers before presenting a player
   as a transfer or departure.

## Existing tools

1. **Named helmet presets:** a few optional mixes such as Modern, Classic,
   and Position-Based, all using the verified registry. Existing Config
   Presets already let users save their own configurations.
2. **Equipment coverage report:** summarize which scoped players can be
   changed and why others cannot, before building a long preview. Keep real
   shared-row protections rather than forcing changes to linked players.
3. **Optional equipment consistency checks:** preview incompatible
   helmet/mask/accessory combinations without rerolling them. Restrict the
   report to verified rules and clearly distinguish mod-dependent choices.

## UI/UX

1. **Tattoo thumbnails:** useful if a verified screenshot/asset sheet becomes
   available; do not guess artwork from numbered internal names.
2. **Preview comparison mode:** show only changed fields, with an optional
   expanded before/after view, while retaining complete CSV debug output.
3. **Clearer preset management:** label presets with the tool/version and
   show a short configuration summary before loading one. Warn if a preset
   uses a mod-dependent option.
