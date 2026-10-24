# v23.0 equipment presentation and Quickstart refinement

## Quickstart

- Only the three optional mod checkboxes are exposed. No Drip, Hand Out Visors, and Brand Existing Visors are built in. Earlier `quickstart-noDrip` preset values are discarded rather than restoring an obsolete opt-out.
- GameDay Gear enables the two game-verified clear logo visors for branding and new visor additions. Tinted generic visors still receive matching Oakley tinted variants; no unsupported GameDay tint variants are invented.
- The landing page explains the one-size-fits-all workflow and points users to Randomizer/Patcher for more control afterward. Per-save successful-Apply tracking is unchanged.
- Mod requirements show the requested minimum versions: Unlocked v0.97+, RAW v3.1.0+, and GameDay Gear v2.0+.

## Sources

- Shared donor cards group each source player once, with team logo, name, position, and category chips. Mod-pool additions appear separately. The table uses the same grouped presentation.
- Compatibility substitutions and fallback explanations stay in a separate disclosure. Exact IDs and original donor decisions remain in CSV audits.

## Patcher configuration

- Helmets: Repair or Balance / Helmet Mix / Facemask Pools.
- Visors: All Positions / By Position.
- Mouthpieces: Positions & Frequency / Colors & Branding / Existing Mouthpieces. Positions & Frequency supports global edits or individual groups, style totals and normalization.
- Lower jerseys and cutoff pants: All Positions / By Position / Fit & Rules.
- Tattoos: Frequency / Tattoo Designs.
- Recolor: Accessory Colors / Tape Colors.
- Custom undershirt mixes: Other Builds / Muscular–Standard.
- Simple settings remain simple. Player Filters already use focused pages.

Global controls explicitly edit the existing per-position values. Mixed values show “Varies”; merely opening or switching pages does not change the configuration. Helmet and facemask global actions explicitly clear the relevant overrides. Canonical controls, preset serialization, reset defaults, validation, isolated drafts, and Save/Cancel are retained. No pass defaults or save-writing rules change merely because controls were moved.

## Verification

- Portable source checks, including fixed Quickstart settings, verified visor IDs, and shared source-card grouping.
- Read-only Electron UI checks for global edits, overrides, normalization, hidden-page validation, Save/Cancel/Reset, and light/dark layouts at 1480, 760, and 520 pixels.
- Three copied-save Apply/reopen checks for exact Quickstart writes, tracking failure handling, EA-player protection, and per-team population caps.
- Unpacked package source/resource hash checks and packaged UI smoke checks. No original example save is changed by the copied-save checks.
