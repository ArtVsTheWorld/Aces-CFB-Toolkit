# CFB 27 Equipment / Unlocked pools and donor face paint

The pool split was re-audited after the first review incorrectly treated base-file presence as proof of vanilla availability. The earlier 301/107 counts are retired. The corrected audit uses the user's October29 equipment-menu checks with no equipment mods, original vanilla save observations, prior explicit user confirmations, and a comparison of the full supplied Unlocked mod including its modified character prefab.

## Current defaults and naming

The standard pool is displayed as **CFB 27 Equipment** throughout settings, previews, source cards, reports and Help. Its persisted `vanilla` keys are retained for saved-preset compatibility.

Fresh Randomizer and Quickstart defaults include Baggy sleeves plus Arm Sleeve Quarter/Half and Long/Short Arm Tape (20 choices total), and Wrist Taped Lite/Max/Normal, Glove Taped Large and Wrist Band Normal (18 choices, 10% category chance). Large glove tape can roll only for DL/OL/LB/TE/FB, including the game's legacy position aliases. Unlocked cross wrist tape defaults to 3%; String Towel defaults to 1% for WR/CB/FS/SS only. These pool restrictions do not strip copied donor gear or prevent deliberate Mapper edits. Existing explicit saved percentages and selected/empty item lists are preserved.

## Current split

| Category | Vanilla choices | Unlocked choices |
|---|---:|---:|
| Irish Jamo sleeves | 0 | 4 |
| Cross wrist tape | 0 | 1 |
| Arm sleeves | 52 standard sleeves/tapes | 8 double/elbow sleeves |
| Elbow gear/bands | 21 standard styles/colors | 7 rubber/biceps bands |
| Cleats | 90 standard styles | 10 additional/unlocked/replacement styles |
| Gloves/hand tape | 134 | 16 |
| Mouthpieces | 17 standard/bright pacifiers | 44 branded/custom mouthpieces |
| Turtlenecks | 8 Scrunched/Tight standard colors | 6 branded variants |
| Balaclavas | 0 | 4 |
| Leg base layers | 3 original menu entries | 16 fixed-color/variant choices |
| Thigh pads | 0 | 6 |
| String towel | 0 | 1 |
| Sock heights / Unlocked socks | 4 original heights | 2 Crew Cut/High styles |
| Matching spats | 4 | 0 |
| Jersey styles | 5 | 0 |
| Standard undershirts | 10 | 0 |
| Neck rolls | 4 | 0 |
| Wrist gear | 33 | 0 |
| Guardian caps | 1 XT 2.0 | 0 |
| Facepaint/eye tape | 10 | 13 |
| **Total style choices** | **396** | **138** |

These are available choices, not all enabled defaults. RAW69 and GameDay Gear29 remain separate and unchanged. The audit covers the old expanded pool, ten standard facepaint styles and 116 additional choices explicitly identified in the user’s unmodded equipment menu. It is still not an assertion about every asset in the game.

## Newly confirmed menu families

The additional 116 choices cover five jersey styles, ten standard undershirts, four neck rolls, 48 sleeve/tape variants, 33 wrist items, three original leg-layer entries, four sock heights, Guardian Cap XT 2.0, and eight standard pacifier/hanging-pacifier colors. The repeated Glove Taped Normal request is deduplicated; existing exact IDs are reused rather than inventing color variants. Original Leg Sleeve Left/Right and Compression Pants are one entry each, as explicitly clarified by the user. Fixed-color leg layers and variant-2 compression pants remain Unlocked. Normal High Socks (`Gear_Socks_High`) remain distinct from the Unlocked High Socks style (`Socks_High`).

The stock ItemInfo data supplies exact names and slots only after the user supplied menu availability. `equipmentVanillaMenuInventory.json` contains the small confirmed inventory. The requested sleeve/tape and wrist families are now selected by default. Other newly added categories remain at zero with no items selected. Saved explicit settings/presets retain their choices; Quickstart uses the updated fresh defaults. Users can explicitly select the additional items in Randomizer’s Vanilla pool. Wrist Brace Support remains off by default.

Vintage neck-roll IDs become masks with Unlocked. They are shown with the correct selected-mod labels and cannot be generated through Vanilla while Unlocked is selected. The four stock arm IDs replaced by RAW Jamo are likewise excluded from Vanilla additions with RAW selected; Mapper shows RAW’s versions in that context. This does not remove existing donor gear. New jersey/undershirt additions also respect the cutoff-pants fit restrictions.

## Shared IDs and correct names

Ten asset IDs have a verified vanilla version and a different Unlocked replacement: six cleat IDs and four Nike Vapor Jet glove colors. Without Unlocked selected, Vanilla can roll their base versions. With Unlocked selected, Vanilla excludes them and the Unlocked pool controls their added rolls. Turning an Unlocked category off does not allow Vanilla to add its replacement indirectly. Existing donor equipment is still copied according to the normal donor rules.

Examples: Nike Vapor Jet5 becomes Nike Vapor Jet9; Nike Vapor Untouchable2 Low becomes Jordan4 Alpha Menace; Nike Alpha Pro2 3/4TD becomes Vapor Speed Kobe5. Their pool, Randomizer/Quickstart preview and Mapper labels now follow the selected mods. Mapper uses the same confirmed availability without changing saved mapping IDs.

The eight replacement cleat styles absent from the user's unmodded menu are Jordan4 Alpha Menace, Vapor Edge Pro3602 KD4, Vapor Edge Pro360VC, Vapor Speed Kobe5, Vapor Untouchable Pro3 OBJ Uptempo, Foamposite Pro–School PE, Vapor Edge Pro3602 Spat, and UA Clone. Not every original base counterpart was verified: no base version is offered here for the 99ClubAlphaMenacePro2/UA MidSpotlight IDs. The mod's FOTF PE entry is also Unlocked-only, based on the user's explicit absence check.

## Evidence and safeguards

`src/main/tools/equipment/equipmentPoolOwnership.json` is an explicit evidence-backed style allowlist. The application never decides availability from a filename, the presence of a base ItemInfo, HiddenInUI, role/outfit flags, or successful save encoding. Original save observations support stock equipment; they do not override menu evidence of a restricted/renamed style. The user's absence confirmations take precedence for Adizero11, Jordan VaporJet5 and UA Blur gloves, despite some existing player-specific assets being present in the files/saves.

Full read-only mod inventory:770 EBX resources; the old251items-only list missed the character prefab. Supplied Unlocked0.97 SHA256 `0d2c7ba8f1a8237e6ffd2cf67cbfda92e1e079c5ac7277fee5990404c085d2b2`. Base prefab SHA1 `1fe4d0dea7ee159bee955bbb99a7c4cc9db48d4c`; mod prefab `8ed82656fe5a34e51f8d6c0b8bc3213b9ea490f4`. Sock authenticity and balaclava slot mappings change in the mod. The user subsequently confirmed plain Scrunched and Tight Turtlenecks are vanilla; all eight standard color choices are included. Battle/NXTRND branded variants remain Unlocked. Neither the presence nor absence of such a delta alone establishes availability.

The user confirmed all six newer Nike cleats as unmodded: Diamond Turf93, Diamond Turf2, Vapor Edge Kobe6, Foamposite Pro, Alpha Menace Elite5, Alpha Menace Pro5. They also confirmed the listed baggy sleeves, elbow gear, nine bright hanging pacifiers, standard glove families/colors and team-color Taped Finger. All ten stock facepaint IDs are equipped in the original vanilla fixtures. Exact per-item records are in the private audit; named evidence sources are included in the small maintained metadata. No SDKs, game binaries, keys, process addresses, textures or portrait packs are shipped.

## Settings and donor face paint

Published pre-split presets still partition their original choices between the correct pools. Version 2 presets from the audited review also move the eight corrected plain turtleneck choices into Vanilla, preserving selected items, separate saved percentages and empty/zero selections. Settings saved by the rejected first review are repaired: restricted items return to Unlocked, while genuine shared base/replacement choices are retained for the appropriate mod setup. A version marker makes migration idempotent. Explicit zero, empty lists and selected items are preserved. If two moved item sets had different category percentages, their previous chances remain independently represented and visible beside the item names. Changing Category Chance explicitly applies one percentage to the selected items. Cancel leaves the saved settings unchanged.

Fresh Randomizer Vanilla is enabled; Unlocked/RAW/GameDay pools keep their installed-mod switches. Quickstart includes Vanilla internally and keeps its three simple mod checkboxes. Existing5%spats/balaclavas, disabled biceps bands/elbow braces/pads/Wrist Brace Support and opt-in Jamo defaults remain. Brands, positions, compatibility, donor freeze, QB glove protection and Quickstart specialist rules remain.

Face paint copies from the donor, including per-loadout differences, None/missing/unknown custom paint and palette data. Mixed outfits use the helmet/head donor. Enabled paint categories can replace it through their selected styles and chances, default10%per pool; zero or an empty list disables that pool's replacements. Competing pools use fair shared arbitration. No unconditional independent paint roll is used by Randomizer generation. Exact-copy mode is deferred and mouthpiece behavior is unchanged.

## Verification and review

Independent known-positive/negative tests assert the user's actual menu findings rather than reproducing a base-file heuristic. Tests cover shared-version routing, correct labels, legacy/review preset migration, different saved chances, fair roll-group winners, Mapper availability, defaults, position/brand/compatibility protections and donor facepaint.

Private evidence is under `outputs/equipment-pool-reaudit/`: `audit-final.json`, metadata/fixture comparisons, source tests, packaged UI checks and native Preview/Apply/reopen results. Native tests use owned copies only and verify exact reviewed assignments, untouched donors/unselected players, exact backups and unchanged original hashes/save sizes. Game loading, appearance, hub return and manual save/reload remain user review checks. The corrected audit and pool behavior are included in v25.5.
