# v20.1 — Unlocked 0.97 Uniform Styles and Team Accessory Colors

## Changes

- App/package version remains 20.1.0, as corrected by the user. Equipment Randomizer is v5.6 and Equipment Patcher is v6.0. CFB27 Unlocked by Orckestra now recommends v0.97 throughout the user-facing app.
- Every Patcher correction pass starts unselected in a factory configuration. Skip NIL Players remains on. Explicit presets, session selections and saved personal defaults are preserved. The redundant general mod-requirement banner was removed; individual mod requirements remain visible.
- Recolor Accessories adds **Team Percentage Distributions** alongside the existing weighted, fixed-color and random choices. Each team has whole-number White / Black / Primary / Secondary weights totaling 100%, the same school defaults as tape, searchable rows, color dots and Balance to 100%. Unspecified schools start at 95% white / 5% black. Primary/Secondary still use the save's established color mapping.
- Accessory and tape distributions are stored independently. **Match Tape to Player Accessory Color** remains the tape default and uses the player's exact accessory-color roll, including when the accessory roll comes from a team distribution. Separate tape distributions remain available and roll independently. Existing gear scope, team ownership checks and player protections are unchanged.
- Team accessory maps serialize by team name in presets, Review, saved reviews and resolved CSV options. Old presets remain compatible. The isolated Colors & Tape window validates all active rows, supports whole-number balancing, and discards edits on Cancel.
- Two new optional Patcher passes, both initially off, use the existing isolated Save/Cancel/Reset configuration windows. Caps use whole percentages for the established position groups. Old presets leave the passes off; the new controls participate in session settings, preset import/export/defaults, Review and saved reviews.
- **Lower Rolled Jersey** replaces Jersey Rolled Low Tucked Undershirt with Jersey Rolled Lowest, and Rolled Jersey Low with Jersey Rolled Lowest Untucked. Defaults: 100% except OL and DT at 0%; EDGE now starts at 100%.
- **Cutoff Pants** replaces eligible Above-Knee Pants up to 5% at WR, CB, FS and SS, 0% elsewhere by default. **Also Replace All Standard Pants** starts unchecked. It converts compatible below-knee Standard Pants even beyond the cap, and counts those replacements before capped additions. This explicit exception is labeled in the modal, Review and Preview diagnostics.
- Both caps count existing target styles first, preserve existing styles above a lowered cap, and round down to whole players. Counts use the selected Player Pool, including protected players; only safe, unprotected, single-owner equipment rows can receive additions. FBS and directional FCS are counted separately. Selection is seeded, not first-row biased.
- Cutoff pants require no active InnerPants base layer, an active InnerShirt, and one of the four verified allowed OuterShirt styles. The pass never strips other gear to manufacture eligibility. Lowest tucked jerseys remain incompatible.
- Lower Rolled Jersey precedes Cutoff Pants; tattoos remain last. Cutoff selection uses each player's original pants style, so the ordinary Above-Knee Pants pass cannot silently opt Standard Pants into the new conversion. Other uniform/gear changes remain opt-in.
- Shared compatibility cleanup in Randomizer and Patcher repairs incompatible cutoff pants to Above-Knee Pants without changing the conflicting shirt/base layer. The Randomizer's generated-item checks also reject adding leg base layers under cutoff pants.
- Added six newly sourced cleat models to the optional Unlocked pool using exact live names/labels: Nike Diamond Turf 93, Nike Vapor Edge Kobe 6, Nike Foamposite Pro, Nike Diamond Turf 2, Nike Alpha Menace Elite 5 and Nike Alpha Menace Pro 5. Receiver-brand protection still applies. Existing verified mod cleats remain available; known soccer/sneaker exclusions were not broadly relaxed.
- Display names were refreshed from live repeated-name ItemInfo records. Four Irish Jamo sleeve labels are available for display only; no unverified Jamo slot/compatibility or generation behavior was introduced.
- Patcher CSV includes exact before/after RawData and changed-slot audits as before, plus `UniformPopulationAuditJSON`. Resolved options retain every cap and the Standard Pants checkbox. Preview adds before/limit/after counts, protected-player counts in stored diagnostics, and fit-exclusion counts.

## Gear evidence

The supplied mod has SHA-256 `0d2c7ba8f1a8237e6ffd2cf67cbfda92e1e079c5ac7277fee5990404c085d2b2`. Its 2,062 payloads are encrypted; the mod manifest alone was not treated as proof of save-facing names. The user confirmed that the loaded game used only Unlocked. Read-only process queries recovered the exact ItemName and DisplayName associations; no game writes, injection, protection bypasses, or raw dumps were used.

See [the readable v0.97 catalog addendum](catalogs/gear-catalog-v20.1-unlocked097.md) for exact mappings, additions and remaining review limits. Loaded presence does not prove historical mod exclusivity or menu availability.

## Safety and rollback

The published v20.0 source is preserved in verified snapshot `outputs/ui-rollback-RMCVKx` (671 source files), with its release assets copied to `release`. The published build remains untouched in `dist/v20.0-refinement`. Use the source snapshot tool's verify/restore commands with that path if needed; restore first archives newer work and does not alter personal settings or dynasty saves.

The earlier v20.1 iteration, before the team-accessory/default changes, is preserved separately in verified snapshot `outputs/ui-rollback-vckLzg` (680 source files), with matching installer, portable, blockmap and update manifest in its `release` folder.

v20.1 is local development work, not a GitHub release. Save fingerprint checks, cached Preview/Apply plans, backups, fixed-size equipment storage/container checks, unrelated-row verification and rollback protections are unchanged.

The current complete local installer/portable build is in `dist/v20.1-team-colors`. A rebuild in `dist/v20.1-development` was stopped because its previous portable executable was still open; use the new folder rather than mixing files from those two builds. The open app was not interrupted.

## Verification

- **553 source tests passed**. Regression coverage includes caps/defaults, invalid percentages, exact mappings, both passes together, protected/shared players, cohort separation, repeat runs, every allowed/incompatible cutoff outfit, generated leg layers, readable labels and pool membership. New tests cover every tape-derived accessory default, independent team maps, all four matching colors, deterministic rolls, validation, preset compatibility, protection and factory-off defaults.
- **15 focused equipment save-workflow tests passed**, covering roster/dynasty donors, mixing, mouthpieces, socks/tattoos and the new gear. Copied real-save workflows exercise uniform-only Preview/Apply/reopen, a newly sourced cleat through Randomizer, and team accessories with matching or independently distributed tape. They compare every equipment row against the exact plan, preserve unrelated appearance data, verify the backup and CSV audits, and leave the original fixture untouched.
- Development and final packaged-renderer configuration smoke checks passed. They cover all existing tools plus new modal defaults, Save/Cancel, whole-number validation, conditional visibility, preset compatibility, Review summaries and responsive light/dark layouts.

The final build's 444 source/assets, engine schemas, commentary map and installer/update hashes were verified. Installer/portable startup checks passed using isolated temporary settings. An optional older all-roster helmet stress test was stopped after excessive test-process memory growth; it is not counted as a passing test, and the complete fixture-dependent suite is not claimed to have run.

These checks cannot establish in-game appearance. New uniforms and cleats still need a representative in-game load/appearance check with Unlocked 0.97.
