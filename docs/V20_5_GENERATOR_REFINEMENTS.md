# v20.5 — realistic roster generation follow-up

## Evidence and answers

The supplied Startup report contains 85 players: 44 freshmen, 25 sophomores, 11 juniors and 5 seniors. All four QBs are freshmen; three were assigned 23, 26 or 29. The source of those issues was profile selection by OVR (which selected many low-rated freshmen) and whole-roster unique-number matching that could displace a QB into its fallback range.

- **Equipment:** selects an observed 2032 same-position on-field loadout, preferring the team's brand, then reuses shared field-level branding and equipment compatibility guards. It does **not** execute Equipment Randomizer, mix its donor categories, or enable its optional mod pools.
- **Names:** previously drew independent first/last tokens, uniformly, from the generated cohort, independently of the head. Now retains a first-name/head pairing actually observed on fictional 2032 players, while surnames remain independently mixed. Full names remain unique and different from existing dynasty identities. No ethnicity categories or racial name restrictions are assigned.
- **Commentary:** uses the existing name matcher: complete surname first, suffix handling, final hyphenated component, then exact first-name fallback. No phonetic guesses are enabled; no supported match means ID 0.
- **Numbers:** uses existing jersey position ranges and supported retired numbers, with unique numbers across each regenerated team. QBs are now restricted to 0–19 in both generation and validation; other position ranges are unchanged. A genuinely impossible numbering scope fails rather than violating those rules.
- **XP and skill points:** still come with a whole observed position/class/development football package. They are not independently rolled, inferred from Age, or automatically zeroed for everyone. Their exact before/after values remain in the CSV.
- **Class/redshirt:** ordinary presets now use the base EA cohort's class-year balance (about 27.3% freshmen, 23.5% sophomores, 23.8% juniors, 25.4% seniors), stratified inside position rooms before ratings are matched. Valid redshirt status and progression stay paired with an observed profile for that class. Youth uses about 65% freshmen / 35% sophomores; One Last Ride remains all redshirt seniors. Small position rooms round to whole players, so exact percentages vary. Age/birth dates remain untouched and are not generation inputs.
- **Statistics:** no stat reset was added. Player references, protected Player bits and all other game tables remain preserved by the verified writer. Seeing cleared stats in-game would need a separate before/after investigation; the generator does not intentionally zero them.

## Approved average-player OVR targets

The FBS team averages in the two audits were 67.118–78.753 in 2026 and 64.953–79.600 in 2032. The weakest team across both was Texas State (2032); the strongest was Notre Dame (2032). These are roster means, not in-game team OVR.

| Preset | Target average |
| --- | ---: |
| From the Ground Up | 62 |
| The Kids Are the Future | 65 |
| FCS Foundation | 66 |
| One Last Ride | 68 |
| Building Blocks | 70 |
| Competitive | 72 |
| Contender | 75 |
| Blue Blood | 78 |
| All-Time Team | 82.6 |

The owner approved these targets. Startup rounds the weakest observed mean minus three; All-Time is exactly three above the strongest. Ordinary presets permit a one-point mean tolerance for constrained samples. The solver still aims at the midpoint to the nearest achievable roster sum. Individual players vary substantially around the mean; a target of 70 does not make every player 70.

## Development, caps and sampling

The unchanged 2032 baseline has 8,417 Normal (71.756%), 2,518 Impact (21.466%), 669 Star (5.703%) and 126 Elite (1.074%) players. Default 85-player quotas are 61 / 18 / 5 / 1. Preset shifts are small: youth shifts five percentage points out of Normal; All-Time shifts four; other ordinary presets shift zero to three. The generator places rare tiers only where an observed position/class package exists. Any unavoidable quota deviation is reported, not solved by inventing a package.

Six caps remain attached to their observed development package. The generated cohort's mean raw cap fields are about 13.51 Normal, 15.59 Impact, 17.18 Star and 18.72 Elite. These are stored values, **not** a proven count of locked UI bars. Do not reverse that relationship based on the everyday meaning of “more skill caps.” Generation preserves the actual observed joint relationship and all approved raw ranges.

Class and development strata are fixed before OVR matching and remain fixed during the roster-average solver. Ratings are calibrated using the observed position/archetype shapes. Low-caliber profiles use observed ability-free physical packages so lowering ratings cannot invent unverified ability thresholds. Physical and mental slots, caps, XP and skill points remain full observed packages. Validation repeats the deterministic allocation to catch independent class/development tampering.

## Appearance and measurements

Both installed reference tools confirm Height is stored in inches and Weight as pounds minus 160. Preview cards, details, tables and standalone reports now show feet/inches and pounds; CSVs retain original raw fields plus formatted measurements. These are presentation conversions only.

The local Player/Coach Editor confirms the second-to-last generic-head suffix identifies a game tone bucket and explicitly supports 1–8, not just 1–7. RO27 also has categorized optional Unique/NIL face metadata. No third-party portrait assets or implementation were copied. Unique faces have a different representation in the supplied EA save (including a non-NoHead enum and explicit skin/body roots), so they were **not** added automatically to the generic-only generation path. They need an explicit reconciled appearance path and in-game testing before inclusion.

The compiled catalog now stores the fictional observed first-name token with each generated-cohort appearance. It still excludes full paired identities, Age, birth dates and PresentationId. Catalog hashes identify the new evidence; the original saves were verified unchanged during compilation.

## App changes

- Separate roster-create, banknote and equipment-repair icons for Roster Generator, NIL Toggle and Equipment Patcher. The equipment group header keeps shoulder pads.
- New reports include `-preview-` or `-apply-` in their filenames using the shared execution audit. Existing report files are not renamed, preserving History links.
- Open File Location in result/report panels and the Reports library selects the CSV in Explorer. The new IPC validates the real file path against the reports directory and rejects traversal/outside files.
- Large player details remain lazy-loaded; ordinary team summaries now include class/redshirt and development counts.
- No app version bump beyond the current development v20.5; no source or installer publication was requested.

## Rollback and tests

The pre-follow-up snapshot is `outputs/ui-rollback-GiKezw` (709 verified files). Restore with `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-GiKezw`; this creates another recovery snapshot first and does not touch dynasty saves or personal settings.

Focused tests cover measurements, all approved targets, conservative quotas, order-independent strata, four-QB class variety, observed name/head pairings, cap/development linkage, QB ranges, distinct icons, report modes and safe reveal paths. Copied-save Preview/Apply/reopen tests preserve all protected/unselected data and backups. Source and packaged UI smoke tests exercise confirmation, reports/reveal IPC, saved reviews, presets and responsive configuration windows. New generated copies still need in-game validation, especially appearance and progression.
