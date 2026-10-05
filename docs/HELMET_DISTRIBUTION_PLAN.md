# Configurable Helmet Distribution — Original Design

This design was proposed during v18.4 and implemented in v18.5. See
[the v18.5 implementation and verification notes](V18_5_UPDATE.md) for the
supported models and final behavior. The proposal below is retained as design
history; its 16-model catalog inventory is not a list of selectable models.

## Recommended user experience

Keep this inside the existing helmet/facemask correction pass. Add a compact
**Helmet Mix** editor with **Default Mix** and **Custom Mix** choices.

- Default Mix keeps today's replacement rules: SpeedFlex 70%, Axiom 10%, F7 10%, F7 Pro 10%.
- Custom Mix shows one whole-number percentage per verified helmet model, a running total, **Balance to 100%**, and **Reset Mix**. Additional models start at 0%.
- Keep F7 and F7 Pro separate, so F7 can be 0% without disabling F7 Pro.
- Start with an **All Positions** mix. A position selector in the game's normal order opens an optional override for that individual position. **Use All Positions Mix** is the default; users only edit positions they want to differ. Avoid a giant position-by-model spreadsheet.
- Include the mixes in the existing Review Configuration and Config Presets, and preserve them through wizard navigation.

Keep **Balance Existing Helmets** as a separate, default-off choice. Without
balancing, the mix controls replacement helmets only; already-acceptable
helmets stay unchanged. With balancing, 0% targets can remove that model from
the eligible population. Explain that distinction directly beside the editor.

## What the current catalog actually contains

There are 16 player helmet models in `equipmentCatalog.json`, excluding
`None` and the main-menu prop:

- Riddell: SpeedFlex, Axiom, Revolution, Revolution Speed, TK, VSR4, VSR4 Softcup.
- Schutt: F7, F7 Pro, Air Advantage, Air XP PRO VTD.
- LIGHT: Gladiator, LS2.
- VICIS: Zero 1, standard Zero 2, Zero 2 Trench.

They are catalogued assets, **not yet all validated Patcher replacement
choices**. The current pass has weighted facemask rules for SpeedFlex, Axiom,
F7, F7 Pro, and standard Zero 2 only. LIGHT and the other models need an
explicit, verified helmet-to-facemask mapping before they become selectable.
The catalog has supporting mask families, but shared/incomplete tags are not
enough to treat every mask as compatible with every variant.

Do not put `None`, a prop, or unverified mod assets into the player helmet pool.
Retain guardian-cap/hanging-mouthpiece compatibility when changing families.
Validate those combinations as part of introducing the additional models.

## Position safeguards and offensive line

Standard Zero 2 currently applies only to QB, TE, linebackers and defensive
linemen. Keep that restriction unless explicitly changed. Do not automatically
apply that same policy to Zero 1, Trench or LIGHT; verify each variant's
facemasks and intended position rules separately.

The existing pass explicitly excludes offensive line. Recommended approach:
keep OL unchanged by default and make any extension to OL an explicit option
with its own appropriate mix. Confirm this scope choice before implementing.

For a global mix that contains a position-restricted model, show each
position's effective mix after unavailable weights are redistributed among
allowed models. Block an all-unavailable/all-zero effective pool rather than
silently falling back to another helmet. Individual overrides should disable
unavailable models and clearly explain why.

## Reuse the current implementation

1. Add a small helmet registry next to the current equipment catalog: exact
   model ID, readable label, verified facemask pools, eligibility and relevant
   accessory compatibility. Do not infer new IDs from names.
2. Resolve one validated percentage mix per recipient position and use it in
   both ordinary replacement and balancing. Do not maintain two independent
   sets of model/eligibility rules.
3. Extend `helmetBalance.js` rather than creating another balancing engine.
   Calculate targets for each selected position within the existing separate
   FBS/directional-FCS populations. Reuse largest-remainder allocation,
   surplus-to-deficit swaps and spreading changes across teams.
4. Preserve scoped players, NIL protection, shared-row safeguards, seeded
   plans, matching facemasks and the shared verified equipment writer.
5. Reuse whole-percentage inputs and Balance to 100% conventions from Tape
   Color, plus the current preset/session-state infrastructure.
6. Migrate old configs: absent custom settings retain current behavior.
   Existing Allow Standard Vicis Zero 2 uses its current 68/14/15/3 family mix;
   the 15% F7/F7 Pro family currently rolls the two variants equally. Preserve
   that exactly when loading old presets rather than rounding it silently.

## Preview and verification

Show before/after/target counts and percentages by helmet model, with a
position filter and separate FBS/FCS totals. Retain per-player old/new helmet
and facemask details, and list when eligibility limits an effective target.

Test every enabled model/facemask combination, zero weights, invalid totals,
small rosters, all-restricted pools, position overrides, preset migration,
deterministic replay, minimal balancing swaps and team-spread behavior.
Complete in-game checks for newly enabled variants before shipping support.

Suggested implementation order: configurable existing five models first;
then verified LIGHT/other VICIS and remaining catalog models; finally optional
OL support if requested. All stages use the same editor and registry.
