# v22.5 — Native schemes and team mixes

Roster Generator now uses SDmart3’s export of the game’s ten offensive and nine defensive schemes (game version 4333671, tuning slot 0). The checked-in catalog retains its provenance and ZIP hash. It replaces the earlier handwritten scheme heuristics.

## Schemes and position counts

- **Use Team’s Current Scheme:** reads the dynasty team’s declared scheme and resolves `Team.Philosophy` player preferences where accessible. High-bit asset references are resolved as assets, never mistaken for local rows. If external tuning assets are unavailable in the save, the declared scheme selects the supplied native tuning. Preview and CSV identify those fallbacks.
- **Native scheme choices:** use the exported archetype and depth-slot importance weights. Numeric `PlayerType` values are bound using the save schema, including boundary aliases. Preferences are soft, not exclusive. The final ratings solver preserves the chosen archetype instead of undoing the scheme preference while balancing OVR.
- **Randomized Archetypes:** retains the previous varied mix without scheme weighting. **Random Native Scheme** chooses a scheme once for that team’s Preview; Apply uses the exact resolved choice.
- **Keep Existing Position Counts** is the default. **Build to Scheme Needs** is explicit opt-in: constrained integer allocation reserves native position minima, scales ideal counts to the existing roster size, and changes the fewest necessary position assignments. Rows, roster ownership, roster size, statistics and awards remain intact. Specialist/subpackage depth-chart seats are not additional primary roster players.
- **Build to Scheme Needs** always uses the chosen schemes’ native position needs, including when those schemes are detected from the team. The separate position-count source selector has been removed. Old presets using saved `Team.DepthChartConfig` counts migrate to this behavior so outdated counts cannot override the newly chosen scheme.
- Head-coach corroboration checks `Coach.TeamIndex` against `Team.TeamIndex`, not table row indices. A mismatched coach is not used.
- Recruiting need estimates exclude generated seniors, subtract readable existing commitments, and clamp to zero. Unknown commitments remain unknown, not zero. The generator never changes commitments or overrides the chosen roster-age mix to meet recruiting estimates.
- Play Now rosters expose native manual/random choices, not dynasty auto-detection. Existing roster checksum, tag validation and protected-data verification remain in force. Their depth charts still need reordering in-game.

## Multi-team builder

One **Configure Teams** button appears when multiple teams are selected. Its team list and **Bulk Setup** controls share a single draft with the full individual editor:

1. **Keep Their Identity** chooses the closest caliber preset to each team’s current player average, its detected native schemes where available, and standard age/potential. Missing schemes receive a native choice.
2. **Controlled Variety** uses relative caliber frequencies and selectable age, potential and talent-spending pools.
3. **Shuffle the Field** varies caliber and native schemes freely while respecting the other allowed pools.

Checked Shared Settings use the main-page configuration captured when the window opens. Team rows show their effective settings and whether they inherit, are customized or are locked. **Edit Team** opens the complete caliber/age/potential, position-strength, scheme/makeup and appearance controls inside the same window; **Back to Team List** retains those edits. Manual changes are protected from bulk updates. **Protect from Bulk Changes** never prevents deliberate individual editing. Existing custom team configurations are protected on opening, as before. Users can reroll unlocked rows or copy a configuration to checked, unlocked teams. Talent mixes are recomputed for the receiving team’s roster composition. Skin-tone mix, roster makeup and other settings are not silently randomized. The allowed-option defaults exclude all-senior rosters and extreme potential settings; users can enable those deliberately.

Controlled Variety starts with caliber weights of 0/10/30/30/20/10/0 for From Nothing, FCS Call-Up, Building Blocks, Competitive, Contender, Blue Blood and All-Time Team. Defaults are keyed by preset ID, not dropdown order. Youth Movement reverses Veteran Heavy’s class mix: 40/30/20/10 percent Freshman/Sophomore/Junior/Senior. Both retain observed valid eligibility packages.

The scheme panel offers just **Keep Existing Position Counts** or **Build to Scheme Needs**, with a live explanation of how the latter redistributes roster spots without changing roster size. Dynasty and Play Now files use the same native needs for manually chosen schemes.

Named talent mixes retain their identity instead of becoming frozen percentages. They recalculate when selected schemes or roster makeup change the position counts, including per-team overrides, copied settings and bulk setup. Preview resolves random schemes before calculating each team’s final named allocation. Custom percentages stay unchanged; Position Strength displays a notice when changed counts affect their OVR estimates. Saved presets and navigation retain this distinction. Older explicit percentages without named intent remain custom; older named bulk mixes retain their known identity.

**Save Team Settings** stores the common draft once; reopening, presets, Preview and Apply do not reroll the team mix. Opening/saving without edits does not create overrides or invalidate an existing preview. Unselected teams’ saved configurations stay intact. **Use Main-Page Settings** removes the current team’s override; **Reset All to Main Page** removes selected teams’ overrides. Cancel, Close and Escape discard changes from both views. Invalid individual settings continue to block Save after returning to the list. The shared position-strength calculations and minimum specialist budget are reused.

## Review and safety

Review shows resolved schemes, positional before/after counts, ideal counts, returning players, commits and estimated needs. Reports retain full settings, per-position preference sources, archetype fit/fallback diagnostics, original/generated positions and the existing player/equipment audit fields. Apply resolves scheme evidence again and refuses a stale or mismatched plan. Normal backup, protected-bit guards and exact post-write/reopen verification remain mandatory.

The automatic depth-chart reorder continues to use natural positions, OVR and specialist skills. Native starter-panel labels are not blindly written into depth charts or treated as new roster slots.

An in-game check of copied saves is still required before a public release; successful parser round-trips alone are not proof of game compatibility.
