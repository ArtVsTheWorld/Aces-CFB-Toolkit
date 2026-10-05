# Ace's CFB Toolkit v0.18.0

Equipment Randomizer v5.0 · Equipment Patcher v5.0 · Team Boost v2.0 · NIL Toggle v1.0

## What changed

- Undershirt arm sleeves block elbow gear, but keep wrist accessories. Rolled Sleeves do the same, except Wrist Coaches are removed. Both equipment tools share these rules.
- Recolor Accessories can match tape to the player's accessory color instead of using team tape percentages. The original percentage option remains available.
- Reroll Existing Mouthpieces now chooses a complete replacement from the Add Mouthpieces pool. Both additions and rerolls share the color, position, mask-compatibility, and branded-frequency settings. Branded frequency defaults to 75%; all verified branded choices in the current pool are hanging pacifiers.
- Improve Non-OL Helmets and Facemasks optionally includes standard Vicis Zero 2 helmets. This option and Balance Existing Helmets both start off. Without Vicis, the existing 70/10/10/10 targets remain; with it, targets are 65% SpeedFlex, 15% F7/F7 Pro, 14% Axiom, and 6% Vicis Zero 2.
- Helmet balancing keeps acceptable helmets where possible, uses the minimum family swaps needed to reach rounded targets, and spreads replacements across roster teams. FBS and directional FCS populations stay separate. Preview shows before/after counts, percentages, targets, and replacements by team.
- Equipment settings, including Skip NIL Players, survive forward/back navigation, Preview, Apply, and tool switching. Reset to Defaults still explicitly restores defaults.
- Home has a more prominent Season Matchup Lines section and up to three active-week matchup cards. Existing rankings take priority, followed by paired roster strength and closer projected spreads. Reading projections does not run Smart Force Win or write the save.
- NIL Toggle changes only the IsNIL flag. Combine team, player, position, class-year, and redshirt filters; leave filters empty for all active rosters. Preview includes unchanged matches as well as proposed changes. Apply uses the reviewed plan and creates a backup before writes.
- Team Boost can apply its existing player scope to a position subset and adjust only checked attributes. Position-room averages still use the full room, not just a selected subset. Existing rating modes and bounds remain unchanged.

## Compatibility and safety

Old single-color tape presets and the former existing-mouthpiece-color checkbox remain understood. That checkbox now opts into full mouthpiece rerolls. Existing NIL/player-scope, donor-protection, population-cap, save-version, and exact-plan safeguards remain in place.

The legacy CLI scripts and launchers were not changed. The supplied CRASHTEST save and both supplied backups were only read; validation runs used independent copies under `outputs`.

Automated checks cover core combinations, step/session/default state, previews, backups, field isolation, exact cached Apply, helmet diagnostics, and the existing parity/regression suite. Development and packaged UI smoke scripts are `scripts/smoke-recolor-ui.cjs` and `scripts/smoke-v180-ui.cjs`; supplied-save validation is `scripts/validate-v180-supplied-saves.mjs`.

Final visual validation of the new combinations still requires loading a test save in-game with the appropriate equipment mods. Cash's separate corruption investigation remains paused.

## Verification results

- Automated suite: 387 passed, 0 failed, 0 skipped.
- Development and packaged runs of both UI smoke scripts passed.
- Windows x64 portable build and portable executable launch smoke passed.
- Supplied-save copy validation passed for the all-pass Patcher, both Randomizer mod pools, NIL Toggle, and Team Boost's combined scope/position/attribute filters.
- Patcher Apply persisted 1,219 reviewed equipment records. Helmet balancing reached all rounded target counts with 25 FBS and 31 directional-FCS family swaps; actual reopened-save counts matched Preview.
- NIL Toggle changed exactly one IsNIL field, with every other Player field and equipment record unchanged. Team Boost changed 30 selected attributes across 10 eligible Alabama players, with all other fields unchanged.
- SHA-256 checks confirmed that all three supplied original files remained untouched.
