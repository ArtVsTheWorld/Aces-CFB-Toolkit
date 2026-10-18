# Roster Generator — continued development

## User-facing changes

- Shorter main-page descriptions, preset text, review notes and Help. Caliber, Position Strength, Schemes and Appearance each use an existing Save/Cancel configuration window.
- Position emphasis uses whole-number sliders from −10 to +10. Player-count-weighted offsets subtract from the other groups, preserving the same team-average budget. Preview shows target/actual means for every group.
- Offensive schemes: Randomized, Balanced, Air Raid, Spread/RPO, Power Run, Option. Defensive schemes: Randomized, 4–3, 3–4, Nickel/Coverage, Pressure/Man. Matching archetypes receive a 3× soft weight; no archetype is banned. Position counts do not change.
- Standard skin-tone mix uses observed position-specific frequencies. Big Sky weights tones 1–4 most heavily (more darker tones at skill positions). HBCU heavily favors tones 6–7. Verified tone 8 remains supported. These are appearance controls, not inferred racial identities.
- Each head has up to eight distinct first names actually observed on that exact head in the fictional 2032 sample. Some heads have only one observed name. No names were assigned to race categories or borrowed from adjacent tone buckets. Surnames remain independent.
- A fresh cryptographic seed is generated for each Preview, retained in diagnostics for reproducibility. Apply uses the stored plan, never a reroll. Seed is removed from controls and ignored when loading old presets.
- Prepare, Preview and Apply enforce PreSeason week 0 or RegularSeason week 0. Later weeks and unknown season states fail before writing.

## Calibers and development

| Preset | Average OVR |
|---|---:|
| From the Ground Up | 61 |
| The Kids Are the Future | 63 |
| FCS Foundation | 64 |
| One Last Ride | 68 |
| Building Blocks | 70 |
| Competitive | 72 |
| Contender | 75 |
| Blue Blood | 79 |
| All-Time Team | 83.5 |

Development target weights:

- Ground Up: 88 / 11.5 / 0.4 / 0.1 (Normal / Impact / Star / Elite). An 85-player roster is typically about 75 Normal and 10 Impact; Star and Elite are possible but rare.
- FCS: 82 / 16 / 1.7 / 0.3.
- Blue Blood: 45 / 25 / 10 / 5 out of 85.
- All-Time: 25 / 35 / 15 / 10 out of 85.
- Other calibers retain the generated-player baseline and existing small shifts.

Seeded ±8% relative weight jitter and systematic sampling add small count variation. Allocation only uses observed position/class/development packages; unavailable combinations can reduce a tier quota and produce a diagnostic. Caps, physical/mental packages and progression remain tied to their source profile.

Ratings are centered within position/class/development strata before matching talent. This prevents a freshman-heavy room from silently negating a user's position-strength setting. The solver first fits group budgets, then the team sum, preferring to keep chosen archetypes. It can change an archetype to meet talent constraints. Downward calibration still cannot weaken an observed profile with physical abilities; no unknown unlock thresholds are invented. Unreachable team means remain Apply blockers; group-level constraints are shown as target/actual differences.

## Shared finishing pipeline

1. Generate names, football profiles, appearances, equipment and styles.
2. Run existing Longsnap Fixer on generated records.
3. Run existing Dealbreaker Fixer on generated records. Existing valid dealbreakers are retained; None-floor and invalid Playing Style behavior are unchanged.
4. Assign jerseys last with the actual Standard `runRenumberEngine`, with team traditions and retired protection disabled. Fresh random preferred numbers initialize the engine. Its offense/defense sharing and fourth-QB exception remain intact; numbers are not globally unique across both sides.

No original Age/birth fields are read into the generated records. The shared number engine falls through to its class/redshirt ordering. RecruitingDealbreaker is the only additional writable Player field. Protected-bit validation, exact post-write reopen verification, backups, stale-plan checks and atomic save replacement remain intact. Finishing passes are deterministically re-executed during validation.

CSV reports retain all before/after fields and RawData, plus settings, same-head name pools, tone, per-player finishing corrections and position talent targets/results. No other roster is changed.

## Recovery and validation

Pre-change source snapshot: `outputs/ui-rollback-RGP4co` (714 checksum-verified files). Restore with `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-RGP4co`; a recovery snapshot of newer work is created first. No saves or personal settings are included.

Regression coverage includes weighted zero-sum targets, every caliber, scheme soft weights, observed-name pools, tone distributions, development variation, shared finishing-engine parity, preview tampering, week gates, automatic seeds, multi-team Preview/Apply/reopen, protected data, report evidence, saved configurations and responsive UI. In-game appearance/progression testing is still required on generated copies. No publication or version increment was requested.

Completed checks: 583 portable source tests; five existing copied-save workflow tests plus two new custom-settings/week-gate tests; development and packaged renderer smoke tests, including Save/Cancel, preset capture, all new configuration windows, exact Apply, History, reports and responsive sizing. A 138-team / 11,730-player preview reached every team target with no blockers and left the source file unchanged.

Unpublished development build: `dist/v20.5-roster-generator-continued/win-unpacked/Ace's CFB Toolkit.exe`. Startup, All-Time and all-senior copied dynasties for in-game checking are in `outputs/v205-game-validation-dglHWb`. The packaged smoke test's copied LSU roster uses custom QB strength, Spread/4–3 schemes and HBCU appearance settings (`outputs/v205-app-smoke-eJYuzH/DYNASTY-V205-UI-TEST`). Originals remain untouched.
