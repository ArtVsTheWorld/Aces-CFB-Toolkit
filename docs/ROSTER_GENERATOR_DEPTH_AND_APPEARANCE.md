# Roster Generator: appearance mixes and talent distribution

These additions are included in v25.5. Existing preset IDs and saved settings remain supported. The newly approved base skin-tone weights intentionally change generation under those presets.

## Settings

Position Strength includes Talent Distribution: Balanced, Starters First, or Deep Roster. Balanced uses the previous seeded room-target calculation unchanged. By Position can override the choice for any existing strength group. This changes the spread inside a group, not its talent-budget share. Multiple starter roles are counted, including all five natural offensive-line positions. Chosen schemes affect WR/TE/DT/MIKE role counts. The final review has a collapsed Position Strength & Depth table with actual group averages, leading-player OVRs and backup averages.

Targets project into the existing 30–99 OVR bounds while preserving the requested room mean. The non-default balancing path avoids crossing the desired order within a natural position. Existing athletic selection, observed bodies, abilities, development, age, potential, cap checks and physical limits remain in place. A group averaging near 99 cannot also have weak backups. Final ratings can differ slightly from targets because the solver uses valid complete player packages.

Appearance & Names includes Existing Mix (still the default), Latino Mix, Polynesian Mix and Latino + Polynesian Mix. Each optional mix defaults to a 10% share; explicitly saved shares remain unchanged. The combined option uses that percentage once, then chooses Latino or Polynesian roughly equally within it (about 5% each at the 10% default). Share of Roster is a deterministic per-player chance, not an exact quota. Players outside that chance use the existing skin-tone preset. Following the user's approved test approach, both new mixes use medium-tone (4) generic heads and curated observed name-style tokens plus the user-supplied approved surnames. Common first names are included so larger rosters have variety. The game has no ethnicity labels: these are fictional face/name combinations for in-game review, not ethnic classifications of game heads or real players.

Faces retain compatible observed position/body/portrait packages. Offline review of the supplied portrait archive covers 560 medium-tone portraits, including all 424 eligible heads already present in the observed catalog. Both new mixes share this reviewed medium-tone pool; portraits were not used to assign ethnic labels. Selection prefers the least-used template families within each player’s compatible pool, then unused exact head variants. This reduces repeated faces with different hair/beards while retaining all 70 reviewed template families. A 15 KB ID manifest is bundled; the portrait images and optional review gallery remain outside the app. Name length limits and uniqueness checks remain; if a small themed pool exhausts its plain combinations during a large run, existing supported suffix/hyphen forms provide additional combinations. Hometowns still follow school recruiting geography. Standard, HBCU and Big Sky retain their saved IDs, with the newly approved weights below.

Both additions use the existing isolated modal drafts, Save/Cancel/Reset behavior, individual team editor, copy settings and preset serialization. Older presets omit the new fields and keep Balanced/Existing Mix defaults. Older individual overrides inherit newly added shared fields until explicitly saved with a team choice. Existing fields and stored false values are preserved.

## Automatic name variety

Latino and Polynesian name variety is automatic; there are no new settings or sliders. The expanded pools contain 116 first names/197 surnames for Latino and 141 first names/192 surnames for Polynesian. All 100 supplied Latino and 88 supplied Polynesian surnames are included and deduplicated against the observed bank. First names and the older curated surname additions still come from the existing bank; the separate user-mix-surnames.json provides the explicitly approved exception for new surnames. The bank's name tokens were compiled from the simulated 2032/2038 cohorts, with original-player names excluded; the mix-specific style assignment is manual curation, not a recorded ethnicity classification.

Selection prefers first names and root surnames not yet used on the current team. Usage across teams in the same generation run breaks ties, spreading reuse rather than repeatedly drawing the same small subset. Suffixes and hyphens retain their normal rare chances, respect byte limits and approved pool tokens, and do not hide repeated roots from the usage tracking. Previously generated full names remain unavailable across teams. The intentional occasional brother pair can still share a surname. Finite pools necessarily repeat across sufficiently large runs.

Directly supplied surnames receive the existing surname commentary match, or ID 0 if no surname match exists. They do not fall back to a first-name ID. This applies after intentional brother surname changes as well. Existing Mix and other curated surnames retain the earlier surname-first/first-name fallback behavior. No similar-sounding ID substitution was added.

Existing Mix selection stays byte-equivalent in the seeded comparison checks. Football ratings, body/head selection and explicitly saved appearance-mix percentages are unchanged. Existing presets retain all their fields.

## Approved base tone weights

| Tone | Standard | Big Sky | HBCU |
| --- | ---: | ---: | ---: |
| 1 | 8 | 20 | 0 |
| 2 | 10 | 24 | 1 |
| 3 | 8 | 18 | 1 |
| 4 | 9 | 12 | 4 |
| 5 | 0 | 0 | 0 |
| 6 | 20 | 12 | 14 |
| 7 | 32 | 10 | 60 |
| 8 | 13 | 4 | 20 |

These are relative chances totaling 100, not exact roster quotas. Compatible observed bodies remain required; unavailable tones are excluded from that player's draw. Tone 5 remains disabled until complete packages are verified. Both optional Latino/Polynesian mixes still use their shared reviewed tone-4 pool independently of the base preset.

HB/CB have modest position adjustments: Standard 5/7/6/7/0/23/37/15, Big Sky 17/21/15/11/0/16/14/6 in tone order. Each adds ten points to the combined 6–8 chance without excluding tone 8. HBCU uses the same approved distribution at all positions, removing the prior K/P exception. Age, potential, football ratings and ability/cap selection stay independent of the tone choice.

## Verification

- Portable source suite, focused generation/presentation tests and isolated real Electron UI checks.
- Before the approved tone rebalance, six legacy Standard/HBCU/Big Sky cases matched published v25.0.1 exactly. The approved rebalance intentionally changes appearance/name results; current checks validate coherent observed packages, head/name pairing, unchanged football ratings and saved-option compatibility instead.
- Full generated rosters validate both new name mixes, medium heads, unique names, distribution overrides, multi-starter roles, physical packages, averages and cap behavior. A saturated-name test checks the fallback without changing legacy generation.
- Three copied native dynasty saves: Balanced, Starters First and Deep Roster. Each changes USC and Hawai'i only, both at All-Time Team strength, with HB talent shares targeting about 87 average OVR. Preview does not write; Apply backs up and reopens exactly as reviewed. Unselected player fields and appearance rows are preserved and the original fixture remains unchanged.
- UI checks cover default values, conditional percentage, invalid number handling through shared controls, Save/Cancel/Reset, old/new preset restoration, older individual overrides, settings copy, unique IDs, actual review data, and contained scrolling/visible footers at desktop and narrow sizes in light/dark themes.

Native game loading and visual review require the user's game. The test-copy checklist is supplied alongside the saves; source validation does not establish in-game visual correctness.
