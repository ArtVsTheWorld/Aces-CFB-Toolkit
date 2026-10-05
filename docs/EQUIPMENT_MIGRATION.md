# Equipment tools v2.0 migration audit (CFB Toolkit v0.5.0)

The three original entrypoints remain separate registered tools. Original scripts and BAT launchers are untouched. Their five equipment core modules are copied text-identically into the app and covered by source and behavioral parity tests.

## White Helmet Fix

- Tables: Player `1612938518`, Team `3359508968`.
- Selection: non-empty records with an integer rostered `TeamIndex` other than 255 and `NumPrideStickers > 32`.
- Change: `NumPrideStickers` becomes exactly 32. No randomization or configurable branch.
- Validation: Player table must expose `NumPrideStickers` and `TeamIndex`; autosaves and missing saves use shared rejection.
- Report: `Row, Team, Player, Position, OldPrideStickers, NewPrideStickers`.
- Preview writes the report only. Empty Apply creates no backup and performs no save, matching v2.0. Non-empty Apply backs up before saving.

## Freshman Equipment Randomizer

- Tables: Player `1612938518`, CharacterVisuals `1429178382`, Team `3359508968`; an optional donor save uses the same three tables.
- Recipients: non-empty, non-NIL true freshmen (`SchoolYear=Freshman`, `RedshirtStatus=Eligible|Current`) that pass exact team inclusion/exclusion, position, and overall filters. Omar/Omar placeholders are skipped. FCS recipients remain eligible; FCS upperclassmen are not donors.
- Safeguards: a recipient visual row must exist, contain valid PlayerOnField loadouts, and have exactly one Player reference. Brand-specific gloves/cleats copy only from matching `TeamApparel`; personal slots are preserved; body-dependent shirts are preserved across body-type mismatch.
- Donors: top 125 by default, configurable positive integer, selected from usable Sophomore/Junior/Senior players by original position family and cross-position pools.
- Randomization: original `mulberry32` unsigned 32-bit seed. Full/mixed/cross mix probabilities, donor shuffle, face paint, pants normalization, and hoodie repair remain unchanged. Equipment compatibility now also covers the explicitly supported sleeve/undershirt and mask/mouthpiece rules. Same save/options/seed remains reproducible.
- Report: original shared equipment columns with `ChangeType=freshman`, recipient fields, and primary donor team/player.
- Failures: invalid seed/top/filter values, unknown exact team names, invalid/missing tables or visuals, missing donor save, and autosaves remain rejected.

## Equipment Patcher

- Tables: Player, CharacterVisuals, and Team UIDs above.
- Default passes: the standard correction passes are enabled in the desktop UI and can be disabled individually. Available passes include above-knee pants, skill helmet/facemask, rolled-low undershirt, mid-sock replacement, equipment compatibility, Nike thigh pads, and visors. CFB 27 Unlocked-only passes remain disabled by default.
- Dynamic option: undershirt color appears only with rolled-jersey correction; modes remain weighted, primary, secondary, white, and black.
- Filters: exact included/excluded teams, positions, class years, true/redshirt group, body types, and 0–99 overall bounds. The CLI's `Lean` prompt maps to the stored `Freshman` body-type value exactly.
- Safeguards: records must have valid CharacterVisuals references and JSON loadouts. Shared visual rows are skipped if any linked player is NIL or on an excluded team. All selected passes operate in the original order.
- Seeded rules: helmet/facemask weighting, undershirt weighting, and 85/14/1 sock weighting use the original seed XOR and PRNG behavior.
- Report: `ChangeType, Team, Player, Position, Overall, OldOrDonorTeam, NewOrDonorPlayer` with the original change-type labels and pass-specific before/after values.

## Shared Electron integration

All three reuse Active Save, C27_486_1 loading, team discovery, backend option validation, searchable result tables, CSV reports, logging, Execution History, and backup handling. Freshman and Patcher share only the original Player/Visuals/Team loading, exact team/filter construction, and result/plan formatting; their algorithms remain separate.

Preview executes against in-memory records, creates no backup, and never saves. It caches exact Player-field or CharacterVisuals `RawData` assignments. Apply verifies the complete save hash and every original field value, creates the backup, then writes the cached values without rerunning randomization. Empty runs preserve the original no-backup/no-save behavior.

## Compatibility and next state

No core compatibility differences were found. The GUI replaces CLI comma-separated prompts with multi-selects and typed controls but submits the same normalized values and defaults. Automatic Force Win is now the only registered unmigrated tool. No work on it is included in v0.5.0.
