# Roster Generator physical ratings: findings and proposed improvements

October 28, 2026. This analysis records the pre-change findings. The subsequently authorized [implementation and validation](ROSTER_GENERATOR_ATHLETICS_V24_6.md) is now available for review.

## Findings

The supplied report is an 85-player East Point **All-Time Team** run from v24.5.1, seed 122676576. It uses Playmakers talent allocation, Standard roster age, High Potential and random offensive/defensive schemes. Average player overall is exactly **83.0**. All 85 saved overall ratings agree with the toolkit’s verified overall formulas.

The generated roster is frequently too slow for its players’ overall ratings. The issue affects acceleration and several other physical attributes as well. It is not a universal deficiency: quarterbacks are broadly plausible in this run, and cornerback change of direction is above the reference mean.

### Comparisons at similar player overall

Each generated player is compared with the same position within ±3 overall in each source. A player needs at least 10 matching reference observations to enter an aggregate. Reference means below are averaged per generated player, so the comparison follows this roster’s overall distribution rather than letting low-overall backups dominate the reference population.

| Group / attribute | Generated mean | EA 2026 matched mean | Community Week 8 matched mean | Generated players compared |
| --- | ---: | ---: | ---: | ---: |
| WR speed | 84.7 | 91.0 | 91.2 | 9 of 9 |
| WR acceleration | 84.9 | 92.5 | 92.4 | 9 of 9 |
| CB speed | 86.9 | 91.1 | 91.1 | 8 of 8 |
| CB acceleration | 86.8 | 93.1 | 93.1 | 8 of 8 |
| FS speed | 79.7 | 89.1 | 89.2 | 3 of 4 |
| FS acceleration | 79.3 | 91.6 | 91.6 | 3 of 4 |
| TE speed | 74.3 | 82.4 | 82.7 | 4 of 5 |
| TE acceleration | 73.8 | 86.4 | 86.4 | 4 of 5 |

The matched FS/TE rows describe only the comparable subset, not the full position room. Full-room speed is 81.0 for FS and 75.4 for TE. Some unusually high-overall players have too few reference peers for a reliable narrow comparison.

Seven of nine WRs and seven of eight CBs fall below the EA matched speed distribution’s 10th percentile. The community save independently shows the same counts. Archetype composition does not explain the whole WR gap: among seven WRs with at least 10 same-archetype, similar-overall EA examples, speed is still 6.2 points below the matched reference mean.

The original 2032/2038 generated dynasties have somewhat slower receivers than the EA roster. Even against those cohorts, this run’s WR speed averages 3.5/3.7 points below same-position, similar-overall peers, and CB speed averages 3.8/3.5 points below. Source-cohort differences must remain visible rather than pooling them into one apparent ground truth.

Reference ratings were also cross-checked: all 211,140 physical values across the three original snapshots agree with the compiled observation bank. A small number of saved reference overalls differ from the toolkit calculation: 67/22/25 original players by one point, and 71 community players by up to five points. Repeating the WR/CB comparisons using calculated reference overalls leaves the reported means effectively unchanged (largest difference below 0.01).

Specific examples illustrate the mechanism:

- **Ben Theus, WR:** 80 overall and 79 speed, from a 57-overall observation with the same 79 speed
- **Fredrick Baggett, FS:** 78 overall and 72 speed, from a 66-overall observation with the same 72 speed. Same-archetype EA peers within three overall average 88.2 speed across 60 observations
- **Rashad Serwanga, TE:** 86 overall and 66 speed, from a 61-overall observation with the same 66 speed. His blocking archetype warrants a separate comparison; a slow blocking TE alone is not evidence that every TE needs a speed increase

### Team-level context

Four reference snapshots were examined separately: EA 2026, generated 2032, generated 2038 and the supplied community Week 8 roster. Each contains 138 FBS team snapshots and 11,730 active-roster players. Longitudinal snapshots and the edited community roster are not treated as independent samples from one population. Original save/report hashes were checked and all inputs remained unchanged.

No reference team is within two points of this All-Time roster’s **83.0 full-roster player average**. The strongest team averages are 78.75, 79.60, 79.60 and 78.51 respectively. Consequently, claiming an exact team-overall match would be misleading. The analysis uses each source’s strongest 10 full rosters for team-level context, then compares individual position/archetype/overall groups more closely.

Displayed game team overall and mean player overall are different measures. For example, the EA snapshot’s Ohio State averages 78.75 player overall while its saved team overall is 94. The generated report provides a player-average target, not a newly verified game-displayed team rating.

### Multiple-seed check

Forty read-only, in-memory rosters were generated using the report’s 85 positional slots and Playmakers/age/potential settings: 10 Contender, 10 Blue Blood and 20 All-Time. This produced 3,400 players without Apply or save writes.

| Group | Contender overall / speed | Blue Blood overall / speed | All-Time overall / speed |
| --- | ---: | ---: | ---: |
| WR | 77.5 / 84.7 | 81.6 / 84.0 | 85.6 / 85.2 |
| CB | 77.6 / 86.3 | 81.6 / 86.4 | 85.6 / 86.5 |
| FS | 78.5 / 82.6 | 82.5 / 82.4 | 86.5 / 82.4 |
| SS | 79.3 / 81.2 | 83.3 / 82.7 | 87.3 / 82.8 |
| TE | 78.2 / 74.1 | 82.2 / 72.5 | 86.2 / 73.2 |

This is a repeatable selection/calibration issue rather than just one unlucky team. It does not imply that speed must rise on every player or every draw.

## Why it happens

1. `modelForPreset` shifts a broad pool of generated observations toward the caliber/talent target before choosing each player. An originally weak observation can become a highly rated candidate without changing its athletic package
2. `calibrateProfile` intentionally excludes speed, acceleration, agility, change of direction, jumping and strength from its overall offset. This prevents blanket physical inflation, but it also permits large skill-only promotions. In the supplied run, 78 of 85 players retain source speed exactly, while overall increases by 10.9 points on average, with a maximum increase of 28
3. `sampleNear` and the final roster balancer choose by calibrated overall, room targets and archetype. They do not check whether the original physical package is typical of the final overall band
4. `observedAthleticBounds` protects only position-wide minima and maxima across all original cohorts. A 72-speed safety can therefore remain technically inside the allowable position range even if inappropriate as a frequent high-caliber outcome
5. Rare athletic profiles make modest adjustments. They do not repair the broad mismatch: the report has 74 Balanced players, and its nonzero speed adjustments range only from −2 to +2

The low-level safeguard that overall calibration must not automatically turn 91 speed into 99 speed should remain. The main change should be **which observed package is selected for a requested target**, followed by restrained calibration.

## Proposed implementation order

### 1. Build conditional athletic references

- Index the verified unmodified observations by position, archetype and original overall band, with class/redshirt context where samples support it
- Keep complete six-attribute physical vectors to preserve observed correlations. Do not roll speed, acceleration and agility independently
- Use EA 2026 as the initial physical-distribution anchor for an EA-like roster. Keep generated 2032/2038 as separate progression/plausibility checks. Treat the community save as a secondary sensitivity comparison, not an automatic replacement training source
- Use a documented fallback from a sparse exact archetype/overall/class group to a broader same-position group. Never borrow a different position’s speed range

### 2. Select observations near the final player target

- Allocate team talent and starter/depth targets first, as today
- Select a native observed football/physical package appropriate to that individual target before caliber calibration, rather than choosing from an already shifted broad pool
- Prefer modest skill calibration and penalize large promotions of weak native packages. Widen sparse candidate groups explicitly rather than silently accepting a 20–28-point skill-only upgrade
- Keep blocking TEs, power backs, slower technical receivers, pocket QBs and rare athletic outliers. Control their prevalence at the group level instead of imposing one speed floor on everybody
- Preserve existing athletic-profile choices and ability/rating safety. Do not invent ability thresholds or weaken a package with active physical abilities

### 3. Preserve plausibility through balancing and appearance selection

- Include original target proximity and physical plausibility when the final balancer swaps profiles to reach the team/talent average
- Ensure a last-step overall adjustment cannot undo the improved source selection
- Check supported size/strength/athletic combinations using observed source relationships. Preserve source provenance when an appearance or physical package comes from a different observation
- Keep age, potential, schemes, position distribution, equipment, caps, protection and Preview/Apply behavior intact

### 4. Add distribution checks and concise diagnostics

- Validate all six physical attributes against conditional references, including means, lower tails, high-speed prevalence and correlations
- Compare complete position rooms and starter/depth slices, not only the overall roster mean
- Expose only useful exceptions in expanded run details: unusually broad fallback groups, large calibration distances or insufficient observations. Avoid cluttering the configuration screen
- Keep the current position-wide safety bounds as hard limits, with the existing explicitly rare outlier allowance

### 5. Validate before release

- Run at least 100 seeds per caliber on the standard settings, plus targeted age/potential/talent/scheme combinations
- Test the supplied seed and roster specifically, then compare aggregate distributions with held-out reference groups. Establish tolerances from the reference sampling variation, rather than assuming every roster must hit one fixed speed average
- Retain exact overall-formula checks, team/talent budget checks, physical-ability safety, caps, reproducibility and no-input-mutation tests
- Add regression cases for an 80-overall physical WR sourced from a 57-overall package, slow high-caliber safeties, legitimate blocking TEs, and normal pocket QBs
- Finish with native copied-save Preview → Apply → reopen checks and an in-game review roster before publication

## Scope

The recommended candidate-selection change and its distribution tests have now been implemented in the linked follow-up. The analysis itself did not edit player ratings. Preset averages, athletic-profile chances and low-level physical-inflation safeguards remain intact.

Private reproducible evidence is retained locally under `outputs/v246-roster-athletics/`; the supplied saves and CSV were read only.
