# Ace's CFB Toolkit v0.7.0 audit

## Save-specific equipment compatibility

`EXAMPLE SAVES MODDED GAME/DYNASTY-Y3W1END` contains 12,452 non-empty CharacterVisuals records. Exactly one record, row 1798, contains data that Node's Zstandard decoder rejects with `Unknown frame descriptor`. No Player record references that row.

The equipment cores already use guarded field access and skip unreadable or invalid visual rows. The Electron adapter introduced an eager before-value snapshot that directly read `RawData` from all non-empty CharacterVisuals rows, including the unreferenced bad row, before either algorithm ran. The adapter now snapshots through the same guarded field accessor and compares only successfully decoded rows. The 1,000-row renderer bound, complete main-process plans, complete CSV reports, and exact cached Apply behavior are unchanged.

## Dealbreaker Fixer

The only writable field is `RecruitingDealbreaker`. Stored outputs are restricted to `Invalid`, `PlayingTime`, `ProPotential`, `PlayingStyle`, `ChampionshipContender`, `BrandExposure`, `ProximityToHome`, `CoachPrestige`, and `ConferencePrestige`. `Invalid` is displayed as **None**.

The initial None roll uses the configured `Invalid` percentage. Remaining weights are modified per player and normalized without changing the configured base distribution. Modifiers are centralized in `dealbreaker/core.js`: OVR 85–89 uses 1.5/1.35/1.25/1.2 for Pro Potential/Championship Contender/Brand Exposure/Conference Prestige; OVR 90+ uses 2.0/1.6/1.45/1.4; sub-75 uses 1.5 Playing Style when eligible, 1.4 Proximity, and 1.3 Coach Prestige; juniors/seniors use 1.35 Playing Time; freshmen/sophomores use 1.25 Proximity; and an older QB with a younger, higher-rated teammate uses 4.0 Playing Time. The save stores running backs as `HB`, which is treated as the stored equivalent of the requested `RB` eligibility label.
