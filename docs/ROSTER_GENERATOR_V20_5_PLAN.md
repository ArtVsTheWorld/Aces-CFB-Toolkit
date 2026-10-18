# Roster Generator — v20.5 implementation contract

The in-app implementation now includes multi-team generation, all nine calibers, shared configuration/review/preset/history integration and a verified atomic Apply path in development v20.5. The current published release remains v20.1. See [current implementation and testing status](V20_5_ROSTER_GENERATOR_APP.md); the [earlier preview-only prototype](V20_5_ROSTER_GENERATOR_PROTOTYPE.md) remains a historical milestone.

## Approved evidence-based scope

The owner supplied the same dynasty at 2026 preseason (base EA rosters) and 2032 preseason (simulated with default XP/progression/recruiting settings and no progression/recruiting mods). Each has 11,730 FBS players on 138 85-player rosters. The 424 directional FCS players retain their collected profiles, so do not double-weight them as generated-player examples.

The owner explicitly approved observational rules instead of further research into named skill groups and exact engine ability prerequisites. Those mappings are not implementation blockers.

### Age

- Do not generate from, condition on, derive eligibility from, validate against or write Age/birth-date fields. Preserve their original values unchanged.
- Use Class Year (`SchoolYear` in the save) and `RedshirtStatus` for the generated eligibility profile.
- New research/profile exports exclude Age and birth dates; older audit files remain historical evidence, not an allowlist of fields the generator may write.

### Skill caps

Use whole numbers within each field's pooled minimum and maximum across the named playable roster players in both examples:

| Stored field | Minimum | Maximum |
| --- | ---: | ---: |
| SkillGroupCap1 | 2 | 20 |
| SkillGroupCap2 | 3 | 20 |
| SkillGroupCap3 | 2 | 20 |
| SkillGroupCap4 | 2 | 20 |
| SkillGroupCap5 | 2 | 20 |
| SkillGroupCap6 | 2 | 20 |

These bounds include the built-in directional FCS examples; cap 3's FBS-only minimum would instead be 4. Do not use empty/non-rostered placeholder rows to derive limits.

No named skill-group interpretation is required. Prefer observed cap distributions and development-conditioned patterns within these hard bounds rather than a nationwide uniform draw. Presets may change the weights but may not exceed the bounds. Stored cap values must not be described as numbers of locked/unlocked UI bars without evidence.

### Physical abilities

- PhysicalAbility1–5 are tier fields: None, Bronze, Silver, Gold, Platinum.
- Use complete five-slot packages observed for the same exact position/archetype, sampled alongside comparable rating profiles. Do not independently roll five unrelated tiers or borrow packages from a different archetype merely because the positions share a group.
- Prefer the 2032 examples for natural generation frequencies; both files contribute observed packages. Preserve source/cohort/sample-size evidence.
- Sparse class/development/rating buckets may broaden those conditioning dimensions while retaining the position/archetype. Report that fallback. Do not invent an unobserved named ability or call sample minima proven engine thresholds.
- Rating generation and OVR retuning must consider the selected ability package; extreme presets need representative in-game checks rather than an assertion that empirical templates prove every hidden prerequisite.

### Mental abilities

- Sample complete three-slot identity/rank packages observed in the saves, conditioned on position and preferably archetype/class/talent.
- Preserve each ability's tier with its identity, require None identity/None rank to agree, and reject duplicate active identities.
- Use observed packages to avoid, for example, transferring a specialist-only observed package to an unrelated position.
- Separate cohort frequency weighting from the allowed-package union: EA's sparse mental abilities should not erase the much more common generated-player distribution.

### Class Year / Redshirt Status

The FBS examples contain these pairs:

- Freshman: Eligible, Previous.
- Sophomore: Eligible, Ineligible, Previous.
- Junior: Eligible, Ineligible, Previous.
- Senior: Eligible, Ineligible, Previous.

Sample pairs jointly, not as two independent fields. Current is a schema value but is absent from these preseason snapshots; leave it outside initial generation choices. All-redshirt-senior presets use Senior + Previous. Observe XP/skill-point patterns for matching profiles rather than carrying an old senior's progression state into a generated freshman. Any additional eligibility/progression fields must be verified before entering the write allowlist. Never use Age as a consistency check.

## Appearance strategy

Use the 2032 generic-player representation as the first controlled prototype:

1. Sample exact observed `Generic_*` head assets, not original `Unique_*` real-player identities or synthesized asset-name strings.
2. Use the observed generic-head representation (`PLYR_GENERICHEAD = NoHead` coexisting with GenericHeadAssetName); do not misclassify its enum label as a missing face.
3. Select an observed physique/body/height/encoded-weight profile appropriate to the target position. Keep appearance selection independent of athletic or mental talent.
4. Reconcile old explicit skin/body overrides. All 2032 FBS visual blobs omit root skinTone/bodyType, whereas every 2026 FBS blob has an explicit skinTone. An adapter should mirror the sampled representation rather than leave an old override or add guessed ones.
5. Check portrait/presentation fields and original-player asset bindings against actual generic examples before deciding which to replace or clear. Do not copy donor player IDs, roster/team references or unrelated history.
6. Address stale custom jersey-name text when the name itself is regenerated. Do not wipe unknown appearance layers, equipment blends or arbitrary RawData properties.
7. Generate equipment after the final physique is known, reusing compatibility/brand rules. Preserve fixed-size visual/container protections.

This is a proposed adapter backed by observed formats, not an in-game-verified appearance fix. A disposable copied-save test is still required to confirm face, skin/body consistency, portraits and equipment.

## Implementation sequence

1. Build a versioned anonymous profile catalog and schema-aware field allowlist. Keep source saves/private raw audits outside the public repository. Record source hashes, pooled bounds, sample counts and fallback policy. Exclude Age and birth dates from model inputs.
2. Build a deterministic headless one-team preview using Building Blocks (70–75 average player OVR), preserving exact player count and position counts. Generate valid class/redshirt pairs, ratings/archetype profiles, bounded caps, observed ability packages, generic identities and equipment. No save writing in this stage.
3. Expand to all requested presets and multiple teams; solve each team's average independently. Clearly report unattainable targets or sparse evidence. Low/high extremes require controlled extrapolation, not claims of directly observed complete rosters.
4. Add one atomic cached Preview/Apply plan for the full cross-table change, fixed storage checks, backups, candidate/reopen verification, unselected-player/table invariants and exact before/after reports. Verify shared-row isolation/capacity; do not mutate another owner or silently skip part of a full-roster promise.
5. Test disposable candidates in-game: appearance, equipment, player pages, play, weekly progression and offseason/class advancement. Treat an all-redshirt-senior roster's graduation as expected behavior.
6. Build the existing-style UI: Team Selection + Preset + Preview, with advanced configuration windows, individual locks, player cards, distributions and preset support. Defaults should be usable without opening advanced windows.

## Acceptance checks

- Same input/settings/seed produces the same plan; Apply never rerolls.
- Every cap stays in its approved integer bounds, every ability package has source evidence for the position/archetype policy, and every class/redshirt pair is allowed.
- Exact roster sizes, positions, team/player references and all unselected players are preserved.
- Age/birth-date values are never assigned and remain byte/field-identical after candidate verification.
- Preview does not write; failed candidate validation cannot replace the original.
- Reports include every changed field, configuration, seed, profile-data version, source-profile provenance and fallbacks.
- Stored OVR is recalculated and checked. Existing formulas cover both cohorts but have some ±1 differences, so no unsupported exact in-game team-OVR guarantee is shown.

No further bulk save samples or cap-label research are required before the headless prototype. The main remaining empirical check is the appearance adapter and end-to-end progression behavior.
