# v20.5 — independent roster profiles

This follow-up supersedes caliber, age, potential and linked-slider behavior described in the earlier v20.5 milestone documents. It is unpublished development work; the app remains 20.5.0 and Roster Generator remains 1.0.

## Configuration

- Adjusting a talent share automatically checks **Keep**. Later edits redistribute only unpinned groups; their total remains 100%. A kept group can still be edited directly. Uncheck Keep or use Unlock All Groups to release it. Other pinned shares limit the available slider range. Reset/Cancel and saved presets preserve the appropriate draft/committed state.
- Roster Caliber now contains three independent choices: caliber (current player-average OVR), Roster Age (class/redshirt distribution), and Roster Potential (development/caps). Changing caliber cannot change either of the other choices.
- Exactly seven calibers remain: From Nothing 60; FCS Call-Up 64; Building Blocks 69; Competitive 72; Contender 75; Blue Blood 79; All-Time Team 83. These are average player ratings, not the game's team rating.
- Age choices: Standard; Youth Movement (65/30/5 Freshman/Sophomore/Junior); Veteran Heavy (10/20/30/40 across the four classes, with more prior redshirts); One Last Ride (all redshirt seniors). Standard retains the existing observed class/redshirt reference. Only valid observed class/redshirt packages can be selected.
- Potential choices: Standard (2032 reference); Dead End (all Normal, strict observed cap packages); Low Potential (88/11.5/0.4/0.1 development weights); High Potential (45/25/10/5 weights); Sky's the Limit (25/35/15/10 weights). The latter two weights are out of 85, not percentages. Seeded variation and small-roster rounding remain.
- Offensive and defensive schemes explain their preferred archetypes. Defensive labels are Four-Man Front (4–3), Odd Front (3–4), Coverage First (Nickel), and Blitz & Man Coverage. Existing IDs and probability weighting remain compatible.
- Cards and Table are now genuinely mutually exclusive, including when filtering and reviewing saved runs.

## Generation and safety

Age and potential are sampled separately. Class, redshirt, progression, mental and physical abilities remain with the football package. Development and all six caps come from a separate complete 2032 potential package, preferring the same archetype and otherwise the same position. Caliber no longer skews either distribution. This permits low-rated high-potential players and high-rated Dead End rosters without changing current OVR targets.

Cap packages are never fabricated outside observed bounds. Standard samples matching development packages without a cap bias; Dead End/Low select stricter lower-tail observed cap totals, while High/Sky select higher-ceiling upper-tail packages. This follows the audit's stored-value direction: higher stored cap values indicate higher ceilings, not more locked bars. No new skill-group mappings are assumed.

Athleticism is independently assigned per player: Balanced 40%, Speed Focused 20%, Size & Strength 20%, Technical 15%, Freak Athlete 5%. Profiles reshape athletic versus positional ratings while preserving the overall target. Speed profiles favor smaller/lighter observed builds; Size & Strength favors larger ones; Freak Athletes favor the upper part of observed builds. Heads/body/portrait/height/weight remain complete observed appearance packages rather than arbitrary size edits.

Unknown physical-ability requirements remain protected: profiles with active abilities never reduce a rating below its original observed value. This can soften a profile's intended tradeoff. No ability tier or requirement is invented. Final OVR is calculated from ratings and validated; unreachable targets still block Apply.

New surnames have approximately a 1.2% chance of a hyphen and a separate 1.8% chance of Jr./II/III/IV. Parts come from the surname dictionary; names fit the actual 21-byte field. Double suffixes are avoided. The existing suffix/hyphen-aware commentary matcher still selects IDs. Names remain unique against existing and other generated players.

Top-20 active-save Equipment Randomizer generation, finishing fixers, final Standard jersey numbering, season restrictions, retained statistics, protected fields, backups and atomic verified writes are unchanged. Apply reconstructs the exact stored generation plan and rejects changes to ratings, athletic identity, potential packages, names or visual evidence.

CSV reports add PotentialSource, AthleticismProfile and SurnameEvidenceJSON, alongside full before/after fields, equipment audit, age/potential settings, distributions and calibration details. Configuration presets include the new controls and pinned groups. Removed legacy Youth/All-Senior caliber IDs migrate to a remaining caliber plus the corresponding Age choice.

## Recovery and verification

The pre-change source snapshot is `outputs/ui-rollback-ZVhbbk` (724 checksum-verified files). Restore with:

```powershell
node scripts/ui-snapshot.mjs restore outputs/ui-rollback-ZVhbbk
```

Restoring first snapshots newer source and does not touch user saves/settings. Newly added files are not removed; rebuilt restored source does not reference them.

Regression coverage includes all 20 age/potential combinations, every caliber target, locked-share redistribution and exhausted budgets, rare surname rates and commentary matching, cap-package direction, ability floors, physique tendencies, tamper detection, preset migration/reload, draft Save/Cancel/Reset, scheme descriptions and actual computed Cards/Table visibility.

Development and packaged UI smoke use isolated settings and copied dynasties, exercise Preview/Apply/reopen/History/reports, and check light/dark configuration sizing at 1480/760/520 pixels. Copied-save tests verify exact fields/visuals after reload, backups, protected bits and safe failure on stale or interrupted writes. In-game testing of the newly generated rosters remains necessary; automated reopen is not an in-game load test.

Unpublished unpacked build: `dist/v20.5-roster-generator-profiles/win-unpacked/Ace's CFB Toolkit.exe`. Keep its adjacent resources with it. No installer publication or source push was performed.
