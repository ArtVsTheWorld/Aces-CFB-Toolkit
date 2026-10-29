# Roster Generator physical package selection — v24.6

This implements the authorized follow-up to [the physical-ratings analysis](ROSTER_GENERATOR_ATHLETICS_PLAN_V24_6.md). Preset overall targets and the settings/preset format are unchanged.

## Selection and calibration

- Unmodified EA observations provide conditional physical references by exact position, target overall and, where available, archetype and class/redshirt status
- Small groups back off through documented wider groups at the same position. No community roster edits are imported into the generator
- A complete game-generated football/physical package is chosen near the requested player overall and sampled reference vector. All six physical attributes stay together; they are not rolled independently or raised by a blanket caliber bonus
- Native overall distance and standardized distance across all six physical ratings both contribute to selection. Ordinary candidates are sought within ten overall points; a sparse group can expand to the nearest available observations. Larger skill adjustments and broader references remain visible in expanded generation details
- Skill calibration retains its existing hard position ranges, modest athletic-profile changes and protection against weakening observed packages with active physical abilities
- Final team/position balancing changes overall variants of the selected source package. It cannot swap away the selected physical vector just to meet an average
- Generic bodies are selected near the observed football package’s size within the allowed tone, brand and athletic/caliber body pools. Deliberate size outliers retain their existing behavior

The EA reference is an anchor, not a promise that each generated player equals an EA mean. Complete generated observations retain variation, specialist builds and rare outliers. Slow blocking TEs and pocket QBs remain possible.

## Compatibility and safeguards

### Unlocked tattoo appearance regression

Roster generation previously recognized `ArmTattoo_*` / `LegTattoo_*` in a plain Base tattoo layer, but rejected verified Unlocked `CujoMatty_ArmTats_*` assets. The supplied East Point save reproduced 27 blockers, all from these known arm tattoos. The appearance adapter now also recognizes exact arm assets from the shared Unlocked tattoo catalog, only in left/right arm tattoo slots. As with existing vanilla tattoos, they are reset to the slot's None asset when replacing the original player with a newly generated player. No mod checkbox is required to clear a known existing tattoo.

Unknown assets, non-tattoo slots, unexpected layer/element metadata and unrelated appearance layers retain their blockers and are preserved. The original save is never modified by Preview. Regression tests cover the entire tattoo pool, both sides, unknown cases and actual copied-save Preview → Apply → reopen with field/appearance verification and protected-player checks.

Existing roster caliber, talent mix/custom shares, age, potential, schemes, roster makeup, skin-tone mix and per-team overrides keep their controls and saved representation. Development quotas and cap packages retain the existing generated-cohort policy.

Preview validation replays the seeded conditional selection, checks exact ratings/provenance, verifies physical summaries and preserves the existing identity, ability, cap, equipment, scheme and native-save guards. CSV reports append `AthleticSelectionJSON`; historical fields retain their names and order.

No new configuration options were added. The short physical-package explanation is inside the existing expanded Equipment & Generation Details section.

## Validation

- 100 seeds for each of seven calibers, plus 80 age/potential/native-scheme/custom-share corner runs: **780 rosters and 68,640 players**
- Every run met its preset overall range. All six physical fields stayed within observed position/profile bounds; active physical-ability floors remained intact
- No 99-speed DTs. In the 100 All-Time balanced-roster runs, DT speed averaged **71.8**, maximum **87**; LT speed averaged **67.9**, maximum **80**
- Across those All-Time runs, 99 speed remained rare: **3 of 900 WRs**, **7 of 800 CBs**, and **12 of 600 HBs**
- All-Time balanced-roster mean speed: WR **90.2**, CB **90.6**, FS **88.0**. These use balanced talent settings; the original report used Playmakers
- Native copied-save workflows cover multiple teams, independent settings, exact Preview/Apply/reopen values, protected fields, backups and stale-plan rejection
- A separate 85-player East Point copied-save run used the supplied report’s Playmakers/age/potential settings. Its saved WR/CB/FS mean speeds were **90.2 / 90.4 / 88.0**, with the original save unchanged

The source regression suite and packaged UI evidence are recorded in the local handoff and verification outputs. In-game testing of the separate review save remains pending.

Read-only sampling can be repeated with:

```text
node scripts/validate-roster-athletics.mjs --seeds=100 --output=outputs/roster-athletics-audit.json
```

The audit does not open or write a game save. Native integration tests require the private example-save fixtures.
