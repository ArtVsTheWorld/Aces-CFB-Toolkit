# Gear Catalog — Human-Readable Reference

Checked scan: 2026-10-05

Source: the October 5, 2026 checked live scan plus established Toolkit mod mappings. Running mods: CFB27 Unlocked 0.96 by Orckestra and RAW Accessories v2.0.4 by Delonte RAW.

This reference combines 251 checked live observations and 78 earlier mappings not re-observed, deduplicated to 329 entries. It is a sourcing reference, not a complete menu inventory or a guarantee of every item's in-game appearance.

Established catalog / locked gear is deliberately not called vanilla-only: loaded no-mod assets can still be locked. A mod can replace an existing asset without adding a new ID.

The supplied RAW mod file is 2.0.2, older than the running v2.0.4. Its manifest cannot prove every current change. New white skullcap attribution uses live records and your explicit RAW provenance.

Facepaint and tattoos use separate pools. The raw JSON's generic generationEligible flag must not be read as their support status. This reference cross-checks knownModPools and the tattoo selector instead.

Eligible means the entry may be used by relevant enabled features; brand, position, pool and compatibility rules still apply. This document changes no Toolkit settings or equipment behavior.

## Manual review checklist

Review labels are not all blockers. Optional checks and deliberately excluded items are kept separate.

### New Unlocked clothing: verify before adding (7)

**Needed before support.** Seven labels were verified, but not the writable slots: rolled-low tucked undershirt, sleeveless hoodie, tight untucked sleeves, and four long-sleeve undershirt colors. These may be backing clothing assets rather than standalone save selections. Leave them out until menu/equipped-save checks establish safe assignments.

- Jersey Rolled Low Tucked Undershirt — Not verified. Internal ID: `Gear_Low_TuckedUndershirt`.
- Sleeveless Hoodie All Jerseys — Not verified. Internal ID: `G_Hoodie_Sleeveless_Ravens_ML_PUR`.
- Tight Sleeves Untucked — Not verified. Internal ID: `Gear_JerseyStyle_SleeveTight_Untucked`.
- Undershirt LongSleeve Black — Not verified. Internal ID: `G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV`.
- Undershirt LongSleeve Secondary Color — Not verified. Internal ID: `G_CompressionT_Crew_LongSleeve_NikeHQ_B_BEI`.
- Undershirt LongSleeve Team Color — Not verified. Internal ID: `G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE`.
- Undershirt LongSleeve White — Not verified. Internal ID: `G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD`.

### RAW Nike/Battle skullcaps: appearance spot-check (4)

**Recommended now.** Check white and black Nike/Battle skullcaps in-game. The IDs, existing GuardianCap slot and Toolkit write/reopen path are verified; actual rendered colors, branding and fit still need a visual check.

- Black Battle Skullcap — Guardian cap / skullcap. Internal ID: `GuardianCap_RawBattleSkullCap`.
- Black Nike Skullcap — Guardian cap / skullcap. Internal ID: `GuardianCap_RawNikeSkullCap`.
- White Battle Skullcap — Guardian cap / skullcap. Internal ID: `GuardianCap_RawBattleSkullCapWhiteV87`.
- White Nike Skullcap — Guardian cap / skullcap. Internal ID: `GuardianCap_RawNikeSkullCapWhiteV87`.

### RAW earrings + facepaint combinations (30)

**Only for future support.** Thirty combined assets were found. They stay out of the standalone facepaint pool. Only investigate them if you want earring support; verify their save slot(s), appearance and persistence rather than treating them like ordinary facepaint.

- Earring combination: FaceMarks_EyePaint — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyePaint`.
- Earring combination: FaceMarks_EyePaint2 — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyePaint2`.
- Earring combination: FaceMarks_EyePaint3 — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyePaint3`.
- Earring combination: FaceMarks_EyePaintCross — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyePaintCross`.
- Earring combination: FaceMarks_EyeTape — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyeTape`.
- Earring combination: FaceMarks_EyeTapeLeft — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyeTapeLeft`.
- Earring combination: FaceMarks_EyeTapeRight — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_EyeTapeRight`.
- Earring combination: FaceMarks_NoseEyeTape — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseEyeTape`.
- Earring combination: FaceMarks_NoseTape — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape`.
- Earring combination: FaceMarks_NoseTape_DP — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_DP`.
- Earring combination: FaceMarks_NoseTape_G — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_G`.
- Earring combination: FaceMarks_NoseTape_KE — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_KE`.
- Earring combination: FaceMarks_NoseTape_T — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_T`.
- Earring combination: FaceMarks_NoseTapeEyePaint — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTapeEyePaint`.
- Earring combination: FaceMarks_RawNoseEyeTape — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_RawNoseEyeTape`.
- Earring combination: FaceMarks_RawNoseTape_1hitta — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_1hitta`.
- Earring combination: FaceMarks_RawNoseTape_540baby — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_540baby`.
- Earring combination: FaceMarks_RawNoseTape_builtdiff — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_builtdiff`.
- Earring combination: FaceMarks_RawNoseTape_dontblink — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_dontblink`.
- Earring combination: FaceMarks_RawNoseTape_fearnone — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_fearnone`.
- Earring combination: FaceMarks_RawNoseTape_imfnopen — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_imfnopen`.
- Earring combination: FaceMarks_RawNoseTape_john316 — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_john316`.
- Earring combination: FaceMarks_RawNoseTape_killall — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_killall`.
- Earring combination: FaceMarks_RawNoseTape_luke137 — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_luke137`.
- Earring combination: FaceMarks_RawNoseTape_nolove — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_nolove`.
- Earring combination: FaceMarks_RawNoseTape_notsorry — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_notsorry`.
- Earring combination: FaceMarks_RawNoseTape_sickem — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_sickem`.
- Earring combination: FaceMarks_RawNoseTape_talkcrazy — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_talkcrazy`.
- Earring combination: FaceMarks_RawNoseTape_theproblem — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_theproblem`.
- Earring combination: FaceMarks_RawNoseTape_watchme — Not verified. Internal ID: `FaceMarks_RawEarringsCombo_NoseTape_watchme`.

### Earlier mappings not refreshed by this session (78)

**Optional completeness check.** 78 established entries were not re-observed: 73 Unlocked and 5 RAW. This is not evidence of a bug. Unlocked: 12 lower-body items (including four excluded NFL undersocks), 3 rubber-band elbow items, 6 thigh pads, 1 string towel and 51 tattoos. RAW: gold/silver cross necklaces and three tape labels (I'm F'n Open, Kill All, Not Sorry). Check these families only if you want a fresh complete inventory.

- Nose and Eye Tape — I'm F'n Open — Facepaint / face tape. Internal ID: `FaceMarks_RawNoseTape_imfnopen`.
- Nose and Eye Tape — Kill All — Facepaint / face tape. Internal ID: `FaceMarks_RawNoseTape_killall`.
- Nose and Eye Tape — Not Sorry — Facepaint / face tape. Internal ID: `FaceMarks_RawNoseTape_notsorry`.
- Raw gold cross necklace — Neck pad / necklace. Internal ID: `GearNeckpad_Raw_GoldCrossNecklace`.
- Raw silver cross necklace — Neck pad / necklace. Internal ID: `GearNeckpad_Raw_SilverCrossNecklace`.
- Rubber Bands 1 — Left elbow / Right elbow. Internal ID: `ElbowGear_RubberBands1`.
- Rubber Bands 2 — Left elbow / Right elbow. Internal ID: `ElbowGear_RubberBands2`.
- Rubber Bands 3 — Left elbow / Right elbow. Internal ID: `ElbowGear_RubberBands3`.
- Compression Pants — variant 2 Black — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_Black2`.
- Compression Pants — variant 2 Primary — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_Primary2`.
- Compression Pants — variant 2 Secondary — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_Secondary2`.
- Compression Pants — variant 2 White — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_White2`.
- Compression Pants Black — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_Black`.
- Compression Pants Primary — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_Primary`.
- Compression Pants Secondary — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_Secondary`.
- Compression Pants White — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_Both_White`.
- NFL Style Undersock Black — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_NFL_Black`.
- NFL Style Undersock Primary — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_NFL_Primary`.
- NFL Style Undersock Secondary — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_NFL_Secondary`.
- NFL Style Undersock White — Lower-body base layer. Internal ID: `GearLegBase_Socks_Under_NFL_White`.
- CujoMatty custom arm design 21 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_21`.
- CujoMatty custom arm design 22 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_22`.
- CujoMatty custom arm design 23 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_23`.
- CujoMatty custom arm design 24 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_24`.
- CujoMatty custom arm design 25 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_25`.
- CujoMatty custom arm design 26 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_26`.
- CujoMatty custom arm design 27 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_27`.
- CujoMatty custom arm design 28 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_28`.
- CujoMatty custom arm design 29 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_29`.
- CujoMatty custom arm design 30 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_30`.
- CujoMatty custom arm design 31 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_31`.
- CujoMatty custom arm design 32 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_32`.
- CujoMatty custom arm design 33 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_33`.
- CujoMatty custom arm design 34 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_34`.
- CujoMatty custom arm design 35 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_35`.
- CujoMatty custom arm design 36 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_36`.
- CujoMatty custom arm design 37 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_37`.
- CujoMatty custom arm design 38 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_38`.
- CujoMatty custom arm design 39 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_39`.
- CujoMatty custom arm design 40 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_40`.
- CujoMatty custom arm design 41 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_41`.
- Custom leg design 1 — Leg tattoo. Internal ID: `LegTattoo_One`.
- Custom leg design 2 — Leg tattoo. Internal ID: `LegTattoo_Two`.
- Custom leg design 3 — Leg tattoo. Internal ID: `LegTattoo_Three`.
- Custom leg design 4 — Leg tattoo. Internal ID: `LegTattoo_Four`.
- Custom leg design 5 — Leg tattoo. Internal ID: `LegTattoo_Five`.
- Japanese arm design 12 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_12_Arm_v02`.
- Japanese arm sleeve — design 07 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_07_ArmSleeve_v02`.
- Japanese arm sleeve — design 07, alternate — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_07_ArmSleeve_v03`.
- Japanese arm sleeve — design 08 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v01`.
- Japanese arm sleeve — design 08, alternate — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v02`.
- Japanese floating arm design — alternate — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_ArmFloating_v01`.
- Japanese floating arm design 09 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_09_ArmFloating_v02`.
- Japanese floating arm design 10 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_10_ArmFloating_v01`.
- Japanese forearm half-sleeve — design 03 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve`.
- Japanese forearm half-sleeve — design 03, alternate — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve2`.
- Japanese full-arm sleeve — design 01 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_01_FullSleeveR`.
- Japanese full-arm sleeve — design 01, alternate — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_01_FullSleeveR2`.
- Japanese full-arm sleeve — design 02 — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_02_FullSleeveL`.
- Japanese full-arm sleeve — design 02, alternate — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Japanese_02_FullSleeveL2`.
- Polynesian Hawaiian I — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm`.
- Polynesian Hawaiian II — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm_v02`.
- Polynesian Māori I — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Maori_Arm_A`.
- Polynesian Māori II — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Maori_Arm_B`.
- Polynesian Samoan I — sticker design — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Samoan_StickerA`.
- Polynesian Samoan II — sticker design — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Samoan_StickerB`.
- Polynesian Samoan III — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Samoan_Arm_v01`.
- Polynesian Tongan I — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Tongan_Arm_A`.
- Polynesian Tongan II — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Tongan_Arm_B`.
- Polynesian Tongan III — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Tongan_Arm_C_v01`.
- Polynesian Tongan IV — Arm tattoo. Internal ID: `ArmTattoo_Tattoos_Polynesian_Tongan_Arm_C_v02`.
- Beast Mode Thigh Pads — Left thigh / Right thigh. Internal ID: `ThighPad_BeastMode_Logo`.
- Cheat Code Thigh Pads — Left thigh / Right thigh. Internal ID: `ThighPad_CheatCode_Logo`.
- Chosen 1 Thigh Pads — Left thigh / Right thigh. Internal ID: `ThighPad_Chosen_Logo`.
- Joker Thigh Pads — Left thigh / Right thigh. Internal ID: `ThighPad_Joker_Logo`.
- Lion Thigh Pads — Left thigh / Right thigh. Internal ID: `ThighPad_Lion_Logo`.
- Shell Thigh Pads — Left thigh / Right thigh. Internal ID: `ThighPad_Shells`.
- String Towel — Towel. Internal ID: `Towel2_South`.

### Numbered tattoo artwork names (26)

**Optional naming improvement.** The 21 CujoMatty arm designs and 5 custom leg designs have established IDs, but their artwork motifs are not known. A visual reference would allow descriptive names. Japanese/Polynesian names describe source styles, not independently verified motifs, and stay deselected by default.

- CujoMatty custom arm design 21 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_21`.
- CujoMatty custom arm design 22 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_22`.
- CujoMatty custom arm design 23 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_23`.
- CujoMatty custom arm design 24 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_24`.
- CujoMatty custom arm design 25 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_25`.
- CujoMatty custom arm design 26 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_26`.
- CujoMatty custom arm design 27 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_27`.
- CujoMatty custom arm design 28 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_28`.
- CujoMatty custom arm design 29 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_29`.
- CujoMatty custom arm design 30 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_30`.
- CujoMatty custom arm design 31 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_31`.
- CujoMatty custom arm design 32 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_32`.
- CujoMatty custom arm design 33 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_33`.
- CujoMatty custom arm design 34 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_34`.
- CujoMatty custom arm design 35 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_35`.
- CujoMatty custom arm design 36 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_36`.
- CujoMatty custom arm design 37 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_37`.
- CujoMatty custom arm design 38 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_38`.
- CujoMatty custom arm design 39 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_39`.
- CujoMatty custom arm design 40 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_40`.
- CujoMatty custom arm design 41 — Arm tattoo. Internal ID: `CujoMatty_ArmTats_41`.
- Custom leg design 1 — Leg tattoo. Internal ID: `LegTattoo_One`.
- Custom leg design 2 — Leg tattoo. Internal ID: `LegTattoo_Two`.
- Custom leg design 3 — Leg tattoo. Internal ID: `LegTattoo_Three`.
- Custom leg design 4 — Leg tattoo. Internal ID: `LegTattoo_Four`.
- Custom leg design 5 — Leg tattoo. Internal ID: `LegTattoo_Five`.

### Three jersey sleeve observations (3)

**Optional catalog cleanup.** Long Sleeves, Loose Sleeves and Tight Sleeves were already seen without mods. Their presence does not establish mod provenance or direct assignability. No new mod pool entry is added from these observations.

- Long Sleeves — Not verified. Internal ID: `Gear_JerseyStyle_SleeveLong`.
- Loose Sleeves — Not verified. Internal ID: `Gear_JerseyStyle_SleeveStandard`.
- Tight Sleeves — Not verified. Internal ID: `Gear_JerseyStyle_SleeveTight`.

### No action needed for deliberately excluded entries

The four under-lip balaclavas and Remove Balaclava remain excluded by request. They are not missing support that needs fixing. NFL-style undersocks remain excluded from generic generation; being listed does not enable them.

### Vanilla/locked boundary

Of the 145 established catalog entries in this scan, 43 also appeared in the earlier no-mod observation. Neither overlap nor absence proves menu availability. If a strict vanilla-only inventory is needed, check menus with no equipment mods; do not flag all remaining entries as modded solely from this scan.

## Complete reference

Names below use checked menu labels where available, or earlier verified/curated labels otherwise. Technical earring labels remain technical rather than guessed. Exact IDs are retained for debugging.

## Established catalog / locked gear (145)

### Arm Wear

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Arm Sleeve Full Black<br>`GearArmSleeve_Full_sleeveLongUnderarmor_normal_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Full Secondary Color<br>`GearArmSleeve_Full_sleeveLongUnderarmor_normal_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Full Team Color<br>`GearArmSleeve_Full_sleeveLongUnderarmor_normal_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Full White<br>`GearArmSleeve_Full_sleeveLongUnderarmor_normal_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Half Black<br>`GearArmSleeve_Half_sleeveLongUnderarmor_normal_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Half Secondary Color<br>`GearArmSleeve_Half_sleeveLongUnderarmor_normal_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Half Team Color<br>`GearArmSleeve_Half_sleeveLongUnderarmor_normal_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Half White<br>`GearArmSleeve_Half_sleeveLongUnderarmor_normal_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Quarter Black<br>`GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Quarter Secondary Color<br>`GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Quarter Team Color<br>`GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Quarter White<br>`GearArmSleeve_Quarter_sleeveLongUnderarmor_normal_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Shooter Black<br>`GearArmSleeve_Shooter_sleeveLongUnderarmor_normal_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Shooter Secondary Color<br>`GearArmSleeve_Shooter_sleeveLongUnderarmor_normal_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Shooter Team Color<br>`GearArmSleeve_Shooter_sleeveLongUnderarmor_normal_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Arm Sleeve Shooter White<br>`GearArmSleeve_Shooter_sleeveLongUnderarmor_normal_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Baggy Arm Sleeve Black<br>`GearArmSleeve_Baggy_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Baggy Arm Sleeve Secondary Color<br>`GearArmSleeve_Baggy_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Baggy Arm Sleeve Team Color<br>`GearArmSleeve_Baggy_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Baggy Arm Sleeve White<br>`GearArmSleeve_Baggy_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Black Compression Sleeve<br>`GearArmSleeve_NikeProDriFitSleeve_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Black Honeycomb Padded Sleeve<br>`GearArmSleeve_McDavidPaddedCompressionSleeve_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Black Multi Padded Sleeve<br>`GearArmSleeve_NikeHyperstrongPaddedSleeve_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Black Padded Sleeve<br>`GearArmSleeve_NikePaddedElbowCompressionSleeve_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Black Rolled Sleeve<br>`GearArmSleeve_CompressionRolledUpShirt_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Double Sleeve Black and Primary<br>`GearArmSleeve_NikeProDriFitSleeve2_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Double Sleeve Black and Secondary<br>`GearArmSleeve_NikeProDriFitSleeve2a_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Double Sleeve Primary and Secondary<br>`GearArmSleeve_NikeProDriFitSleeve2_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Double Sleeve Secondary and Primary<br>`GearArmSleeve_NikeProDriFitSleeve2_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Elbow Sleeve Black<br>`GearArmSleeve_Elbow_armTape_normal_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Elbow Sleeve Primary<br>`GearArmSleeve_Elbow_armTape_normal_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Elbow Sleeve White<br>`GearArmSleeve_Elbow_armTape_normal_OffWhite` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Secondary Color Compression Sleeve<br>`GearArmSleeve_NikeProDriFitSleeve_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Secondary Color Honeycomb Padded Sleeve<br>`GearArmSleeve_McDavidPaddedCompressionSleeve_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Secondary Color Multi Padded Sleeve<br>`GearArmSleeve_NikeHyperstrongPaddedSleeve_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Secondary Color Padded Sleeve<br>`GearArmSleeve_NikePaddedElbowCompressionSleeve_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Secondary Color Rolled Sleeve<br>`GearArmSleeve_CompressionRolledUpShirt_SecondaryColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Team Color Compression Sleeve<br>`GearArmSleeve_NikeProDriFitSleeve_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Team Color Honeycomb Padded Sleeve<br>`GearArmSleeve_McDavidPaddedCompressionSleeve_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Team Color Multi Padded Sleeve<br>`GearArmSleeve_NikeHyperstrongPaddedSleeve_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Team Color Padded Sleeve<br>`GearArmSleeve_NikePaddedElbowCompressionSleeve_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Team Color Rolled Sleeve<br>`GearArmSleeve_CompressionRolledUpShirt_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Undershirt Black<br>`GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_Black` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Undershirt Team Color<br>`GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_TeamColor` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Undershirt White<br>`GearArmSleeve_Undershirt_sleeveLongUnderarmor_normal_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Compression Sleeve<br>`GearArmSleeve_NikeProDriFitSleeve_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Honeycomb Padded Sleeve<br>`GearArmSleeve_McDavidPaddedCompressionSleeve_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Multi Padded Sleeve<br>`GearArmSleeve_NikeHyperstrongPaddedSleeve_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Padded Sleeve<br>`GearArmSleeve_NikePaddedElbowCompressionSleeve_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Rolled Sleeve<br>`GearArmSleeve_CompressionRolledUpShirt_White` | Left arm / Right arm | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Cleats

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Nike Vapor Edge Speed 360 2<br>`GearFootwear_shoe_low_NikeEdgeSpeed3062` | LeftShoe / RightShoe | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Eye Black / Face Tape

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Eye Paint<br>`FaceMarks_EyePaint` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Eye Paint 2<br>`FaceMarks_EyePaint2` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Eye Paint 3<br>`FaceMarks_EyePaint3` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Eye Paint Cross<br>`FaceMarks_EyePaintCross` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Eye Tape<br>`FaceMarks_EyeTape` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Eye Tape Left<br>`FaceMarks_EyeTapeRight` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Eye Tape Right<br>`FaceMarks_EyeTapeLeft` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nose and Eye Tape<br>`FaceMarks_NoseEyeTape` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nose Tape<br>`FaceMarks_NoseTape` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nose Tape Eye Paint<br>`FaceMarks_NoseTapeEyePaint` | Facepaint / face tape | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Facemask

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Axiom 2 Bar Jagged<br>`GearFaceMask_Axiom2BarJagged` | FaceMask | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Guardian Cap / Neck Pad

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Guardian Cap Sleeve<br>`GuardianCap_GuardianXT_Sleeve` | Guardian cap / skullcap / Neck pad / necklace | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Guardian Cap Sleeve XT2<br>`GuardianCap_GuardianXT2_Sleeve` | Guardian cap / skullcap / Neck pad / necklace | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Helmet Model

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Light Gladiator<br>`GearHelmet_LightGladiator` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Light LS2<br>`GearHelmet_LightLS2` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| None<br>`GearHelmet_None` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell Axiom<br>`GearHelmet_Axiom` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell Revolution<br>`GearHelmet_Revolution` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell Revolution Speed<br>`GearHelmet_RevolutionSpeed` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell SpeedFlex<br>`GearHelmet_Speed_Flex` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell TK<br>`GearHelmet_RiddellTK` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell VSR4<br>`GearHelmet_Standard` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Riddell VSR4 Softcup<br>`GearHelmet_standardBrady` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Schutt Air Advantage<br>`GearHelmet_Schutt` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Schutt Air XP PRO VTD<br>`GearHelmet_AirXP` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Schutt F7<br>`GearHelmet_SchuttF7` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Schutt F7 Pro<br>`GearHelmet_SchuttF7Pro` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Vicis Zero 2<br>`GearHelmet_VicisZero2` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Vicis Zero 2 Trench<br>`GearHelmet_VicisZero2Trench` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| VICIS ZERO1<br>`GearHelmet_VicisZero1` | HeadWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Mouthpiece

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Battle Hanging Mouthpiece Pacifier Black<br>`GearMouthpiece_PacifierDualHanging_Black2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Blue<br>`GearMouthpiece_PacifierDualHanging_Blue2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Green<br>`GearMouthpiece_PacifierDualHanging_Green2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Light Blue<br>`GearMouthpiece_PacifierDualHanging_LightBlue2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Orange<br>`GearMouthpiece_PacifierDualHanging_Orange2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Pink<br>`GearMouthpiece_PacifierDualHanging_Pink2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Purple<br>`GearMouthpiece_PacifierDualHanging_Purple2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Red<br>`GearMouthpiece_PacifierDualHanging_Red2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Secondary Color<br>`GearMouthpiece_PacifierDualHanging_SecondaryColor2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Team Color<br>`GearMouthpiece_PacifierDualHanging_TeamColor2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier White<br>`GearMouthpiece_PacifierDualHanging_White2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Yellow<br>`GearMouthpiece_PacifierDualHanging_Yellow2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Mouthpiece Pacifier Neon<br>`GearMouthpiece_PacifierDualHanging_Neon2` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Black<br>`GearMouthpiece_PacifierDualHanging_Black` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Black and Green<br>`GearMouthpiece_PacifierDualHanging_White4` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Blue<br>`GearMouthpiece_PacifierDualHanging_Blue` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Cosmic Peach<br>`GearMouthpiece_PacifierDualHanging_White6` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Green<br>`GearMouthpiece_PacifierDualHanging_Green` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Light Blue<br>`GearMouthpiece_PacifierDualHanging_LightBlue` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Neon<br>`GearMouthpiece_PacifierDualHanging_Neon` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Neon Blue and Pink<br>`GearMouthpiece_PacifierDualHanging_White7` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Orange<br>`GearMouthpiece_PacifierDualHanging_Orange` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Pink<br>`GearMouthpiece_PacifierDualHanging_Pink` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Pink and Green<br>`GearMouthpiece_PacifierDualHanging_White9` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Pure Gray<br>`GearMouthpiece_PacifierDualHanging_White11` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Purple<br>`GearMouthpiece_PacifierDualHanging_Purple` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Purple and Green<br>`GearMouthpiece_PacifierDualHanging_White12` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Red<br>`GearMouthpiece_PacifierDualHanging_Red` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Secondary Color<br>`GearMouthpiece_PacifierDualHanging_SecondaryColor` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Smoke Blue<br>`GearMouthpiece_PacifierDualHanging_White8` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Smoke Blue and Pink<br>`GearMouthpiece_PacifierDualHanging_White5` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Smoke Green<br>`GearMouthpiece_PacifierDualHanging_White10` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Team Color<br>`GearMouthpiece_PacifierDualHanging_TeamColor` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier White<br>`GearMouthpiece_PacifierDualHanging_White` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Hanging Mouthpiece Pacifier Yellow<br>`GearMouthpiece_PacifierDualHanging_Yellow` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthguard Black<br>`GearMouthpiece_Mouthguard1_Black` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthguard Secondary Color<br>`GearMouthpiece_Mouthguard1_SecondaryColor` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthguard Team Color<br>`GearMouthpiece_Mouthguard1_TeamColor` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthguard White<br>`GearMouthpiece_Mouthguard1_White` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthpiece Pacifier Black<br>`GearMouthpiece_PacifierDual_Black` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthpiece Pacifier Secondary Color<br>`GearMouthpiece_PacifierDual_SecondaryColor` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthpiece Pacifier Team Color<br>`GearMouthpiece_PacifierDual_TeamColor` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Mouthpiece Pacifier White<br>`GearMouthpiece_PacifierDual_White` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nike Hanging Mouthpiece Pacifier Black<br>`GearMouthpiece_PacifierDualHanging_Black4` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| None<br>`GearMouthpiece_None` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Black<br>`GearMouthpiece_PacifierDualHanging_Black3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Blue<br>`GearMouthpiece_PacifierDualHanging_Blue3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Green<br>`GearMouthpiece_PacifierDualHanging_Green3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Orange<br>`GearMouthpiece_PacifierDualHanging_Orange3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Pink<br>`GearMouthpiece_PacifierDualHanging_Pink3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Purple<br>`GearMouthpiece_PacifierDualHanging_Purple3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Red<br>`GearMouthpiece_PacifierDualHanging_Red3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Secondary Color<br>`GearMouthpiece_PacifierDualHanging_SecondaryColor3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Team Color<br>`GearMouthpiece_PacifierDualHanging_TeamColor3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier White<br>`GearMouthpiece_PacifierDualHanging_White3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Hanging Mouthpiece Pacifier Yellow<br>`GearMouthpiece_PacifierDualHanging_Yellow3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Mouthpiece Pacifier Neon<br>`GearMouthpiece_PacifierDualHanging_Neon3` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Neck Pad

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Q Collar<br>`GearNeckpad_QCollar` | Neck pad / necklace | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Undershirt

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Black Sleeveless Compression Undershirt<br>`Gear_Undershirt_CompressionTCrewSleeveless_Black` | InnerShirt | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Primary Sleeveless Compression Undershirt<br>`Gear_Undershirt_CompressionTCrewSleeveless` | InnerShirt | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Secondary Sleeveless Compression Undershirt<br>`Gear_Undershirt_CompressionTCrewSleeveless_Secondary` | InnerShirt | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Sleeveless Hoodie<br>`Gear_Undershirt_HoodieSleeveless` | InnerShirt | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Sleeveless Compression Undershirt<br>`Gear_Undershirt_CompressionTCrewSleeveless_White` | InnerShirt | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Waist Equipment

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Handwarmer Standard<br>`Handwarmer_Standard` | WaistWear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

## CFB27 Unlocked — Orckestra (120)

### Elbow Wear

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Rubber Bands 1<br>`ElbowGear_RubberBands1` | Left elbow / Right elbow | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Rubber Bands 2<br>`ElbowGear_RubberBands2` | Left elbow / Right elbow | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Rubber Bands 3<br>`ElbowGear_RubberBands3` | Left elbow / Right elbow | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |

### Face Wear

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Black Balaclava<br>`FaceGear_BalaclavaOverNose` | Face covering | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Remove Balaclava<br>`FaceGear_BalaclavaNone` | Face covering | ID + display name checked this scan | Intentionally excluded | No specific gap |
| Secondary Color Balaclava<br>`FaceGear_BalaclavaOverNose_Secondary` | Face covering | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Team Color Balaclava<br>`FaceGear_BalaclavaOverNose_Primary` | Face covering | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| White Balaclava<br>`FaceGear_BalaclavaOverNose_White` | Face covering | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Facepaint

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Nose Tape Custom1<br>`FaceMarks_NoseTape_C1` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom2<br>`FaceMarks_NoseTape_C2` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom3<br>`FaceMarks_NoseTape_C3` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom4<br>`FaceMarks_NoseTape_C4` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom5<br>`FaceMarks_NoseTape_C5` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom6<br>`FaceMarks_NoseTape_C6` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom7<br>`FaceMarks_NoseTape_C7` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom8<br>`FaceMarks_NoseTape_C8` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom9<br>`FaceMarks_NoseTape_C9` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Custom10<br>`FaceMarks_NoseTape_C10` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape GABOS<br>`FaceMarks_NoseTape_G` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Kill Everybody<br>`FaceMarks_NoseTape_KE` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose Tape Trust God<br>`FaceMarks_NoseTape_T` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |

### Jersey / clothing observations

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Jersey Rolled Low Tucked Undershirt<br>`Gear_Low_TuckedUndershirt` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |
| Sleeveless Hoodie All Jerseys<br>`G_Hoodie_Sleeveless_Ravens_ML_PUR` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |
| Tight Sleeves Untucked<br>`Gear_JerseyStyle_SleeveTight_Untucked` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |
| Undershirt LongSleeve Black<br>`G_CompressionT_Crew_LongSleeve_NikeHQ_B_NAV` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |
| Undershirt LongSleeve Secondary Color<br>`G_CompressionT_Crew_LongSleeve_NikeHQ_B_BEI` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |
| Undershirt LongSleeve Team Color<br>`G_CompressionT_Crew_LongSleeve_NikeHQ_B_GRE` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |
| Undershirt LongSleeve White<br>`G_CompressionT_Crew_LongSleeve_NikeHQ_B_GLD` | Not verified | ID + display name checked this scan | Not enabled — verify save slot first | Verify save slot |

### Leg Sleeves

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Compression Pants — variant 2 Black<br>`GearLegBase_Socks_Under_Both_Black2` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants — variant 2 Primary<br>`GearLegBase_Socks_Under_Both_Primary2` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants — variant 2 Secondary<br>`GearLegBase_Socks_Under_Both_Secondary2` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants — variant 2 White<br>`GearLegBase_Socks_Under_Both_White2` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants Black<br>`GearLegBase_Socks_Under_Both_Black` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants Primary<br>`GearLegBase_Socks_Under_Both_Primary` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants Secondary<br>`GearLegBase_Socks_Under_Both_Secondary` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Compression Pants White<br>`GearLegBase_Socks_Under_Both_White` | Lower-body base layer | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| NFL Style Undersock Black<br>`GearLegBase_Socks_Under_NFL_Black` | Lower-body base layer | Earlier mapping; not re-observed | Excluded from generic equipment pools | Not re-observed this scan |
| NFL Style Undersock Primary<br>`GearLegBase_Socks_Under_NFL_Primary` | Lower-body base layer | Earlier mapping; not re-observed | Excluded from generic equipment pools | Not re-observed this scan |
| NFL Style Undersock Secondary<br>`GearLegBase_Socks_Under_NFL_Secondary` | Lower-body base layer | Earlier mapping; not re-observed | Excluded from generic equipment pools | Not re-observed this scan |
| NFL Style Undersock White<br>`GearLegBase_Socks_Under_NFL_White` | Lower-body base layer | Earlier mapping; not re-observed | Excluded from generic equipment pools | Not re-observed this scan |

### Mouthpiece

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Battle Hanging Mouthpiece Pacifier Primary and Sec<br>`GearMouthpiece_PacifierDualHanging_TeamColor4` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Hanging Mouthpiece Pacifier Sec and Primary<br>`GearMouthpiece_PacifierDualHanging_SecondaryColor4` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nike Hanging Mouthpiece Pacifier Primary and Black<br>`GearMouthpiece_PacifierDualHanging_TeamColor5` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nike Hanging Mouthpiece Pacifier Primary and White<br>`GearMouthpiece_PacifierDualHanging_TeamColor6` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nike Hanging Mouthpiece Pacifier Secondary and Black<br>`GearMouthpiece_PacifierDualHanging_TeamColor9` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Nike Hanging Mouthpiece Pacifier Secondary and White<br>`GearMouthpiece_PacifierDualHanging_TeamColor10` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Shock Hanging Mouthpiece Pacifier Primary and Sec<br>`GearMouthpiece_PacifierDualHanging_TeamColor7` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Shock Hanging Mouthpiece Pacifier Primary and White<br>`GearMouthpiece_PacifierDualHanging_TeamColor8` | Mouthpiece | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Neckwear

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Battle Turtleneck Primary Black<br>`NeckWear_Turtleneck_Tight3` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Turtleneck Primary White<br>`NeckWear_Turtleneck_Tight2` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Battle Turtleneck White Primary<br>`NeckWear_Turtleneck_Tight6` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Turtleneck Primary Black<br>`NeckWear_Turtleneck_Tight5` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Turtleneck Primary White<br>`NeckWear_Turtleneck_Tight4` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| NXTRND Turtleneck White Primary <br>`NeckWear_Turtleneck_Tight7` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Scrunched Turtleneck Black<br>`NeckWear_Turtleneck_Scrunched_Black` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Scrunched Turtleneck Primary Color<br>`NeckWear_Turtleneck_Scrunched` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Scrunched Turtleneck Secondary Color<br>`NeckWear_Turtleneck_Scrunched_Secondary` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Scrunched Turtleneck White<br>`NeckWear_Turtleneck_Scrunched_White` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Tight Turtleneck Black<br>`NeckWear_Turtleneck_Tight_Black` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Tight Turtleneck Primary Color<br>`NeckWear_Turtleneck_Tight` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Tight Turtleneck Secondary Color<br>`NeckWear_Turtleneck_Tight_Secondary` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Tight Turtleneck White<br>`NeckWear_Turtleneck_Tight_White` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

### Tattoo

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| CujoMatty custom arm design 21<br>`CujoMatty_ArmTats_21` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 22<br>`CujoMatty_ArmTats_22` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 23<br>`CujoMatty_ArmTats_23` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 24<br>`CujoMatty_ArmTats_24` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 25<br>`CujoMatty_ArmTats_25` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 26<br>`CujoMatty_ArmTats_26` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 27<br>`CujoMatty_ArmTats_27` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 28<br>`CujoMatty_ArmTats_28` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 29<br>`CujoMatty_ArmTats_29` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 30<br>`CujoMatty_ArmTats_30` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 31<br>`CujoMatty_ArmTats_31` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 32<br>`CujoMatty_ArmTats_32` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 33<br>`CujoMatty_ArmTats_33` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 34<br>`CujoMatty_ArmTats_34` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 35<br>`CujoMatty_ArmTats_35` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 36<br>`CujoMatty_ArmTats_36` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 37<br>`CujoMatty_ArmTats_37` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 38<br>`CujoMatty_ArmTats_38` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 39<br>`CujoMatty_ArmTats_39` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 40<br>`CujoMatty_ArmTats_40` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| CujoMatty custom arm design 41<br>`CujoMatty_ArmTats_41` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| Custom leg design 1<br>`LegTattoo_One` | Leg tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| Custom leg design 2<br>`LegTattoo_Two` | Leg tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| Custom leg design 3<br>`LegTattoo_Three` | Leg tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| Custom leg design 4<br>`LegTattoo_Four` | Leg tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| Custom leg design 5<br>`LegTattoo_Five` | Leg tattoo | Earlier mapping; not re-observed | Tattoo selector — selected by default | Not re-observed this scan; Tattoo artwork naming |
| Japanese arm design 12<br>`ArmTattoo_Tattoos_Japanese_12_Arm_v02` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese arm sleeve — design 07<br>`ArmTattoo_Tattoos_Japanese_07_ArmSleeve_v02` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese arm sleeve — design 07, alternate<br>`ArmTattoo_Tattoos_Japanese_07_ArmSleeve_v03` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese arm sleeve — design 08<br>`ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v01` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese arm sleeve — design 08, alternate<br>`ArmTattoo_Tattoos_Japanese_08_ArmSleeve_v02` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese floating arm design — alternate<br>`ArmTattoo_Tattoos_Japanese_ArmFloating_v01` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese floating arm design 09<br>`ArmTattoo_Tattoos_Japanese_09_ArmFloating_v02` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese floating arm design 10<br>`ArmTattoo_Tattoos_Japanese_10_ArmFloating_v01` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese forearm half-sleeve — design 03<br>`ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese forearm half-sleeve — design 03, alternate<br>`ArmTattoo_Tattoos_Japanese_03_ForearmHalfSleeve2` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese full-arm sleeve — design 01<br>`ArmTattoo_Tattoos_Japanese_01_FullSleeveR` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese full-arm sleeve — design 01, alternate<br>`ArmTattoo_Tattoos_Japanese_01_FullSleeveR2` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese full-arm sleeve — design 02<br>`ArmTattoo_Tattoos_Japanese_02_FullSleeveL` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Japanese full-arm sleeve — design 02, alternate<br>`ArmTattoo_Tattoos_Japanese_02_FullSleeveL2` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Hawaiian I<br>`ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Hawaiian II<br>`ArmTattoo_Tattoos_Polynesian_Hawaiian_Arm_v02` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Māori I<br>`ArmTattoo_Tattoos_Polynesian_Maori_Arm_A` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Māori II<br>`ArmTattoo_Tattoos_Polynesian_Maori_Arm_B` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Samoan I — sticker design<br>`ArmTattoo_Tattoos_Polynesian_Samoan_StickerA` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Samoan II — sticker design<br>`ArmTattoo_Tattoos_Polynesian_Samoan_StickerB` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Samoan III<br>`ArmTattoo_Tattoos_Polynesian_Samoan_Arm_v01` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Tongan I<br>`ArmTattoo_Tattoos_Polynesian_Tongan_Arm_A` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Tongan II<br>`ArmTattoo_Tattoos_Polynesian_Tongan_Arm_B` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Tongan III<br>`ArmTattoo_Tattoos_Polynesian_Tongan_Arm_C_v01` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |
| Polynesian Tongan IV<br>`ArmTattoo_Tattoos_Polynesian_Tongan_Arm_C_v02` | Arm tattoo | Earlier mapping; not re-observed | Tattoo selector — deselected by default | Not re-observed this scan |

### Thigh Pads

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Beast Mode Thigh Pads<br>`ThighPad_BeastMode_Logo` | Left thigh / Right thigh | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Cheat Code Thigh Pads<br>`ThighPad_CheatCode_Logo` | Left thigh / Right thigh | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Chosen 1 Thigh Pads<br>`ThighPad_Chosen_Logo` | Left thigh / Right thigh | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Joker Thigh Pads<br>`ThighPad_Joker_Logo` | Left thigh / Right thigh | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Lion Thigh Pads<br>`ThighPad_Lion_Logo` | Left thigh / Right thigh | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Shell Thigh Pads<br>`ThighPad_Shells` | Left thigh / Right thigh | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |

### Towel

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| String Towel<br>`Towel2_South` | Towel | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |

## RAW Accessories — Delonte RAW (57)

### Earring / facepaint combinations

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Earring combination: FaceMarks_EyePaint<br>`FaceMarks_RawEarringsCombo_EyePaint` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_EyePaint2<br>`FaceMarks_RawEarringsCombo_EyePaint2` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_EyePaint3<br>`FaceMarks_RawEarringsCombo_EyePaint3` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_EyePaintCross<br>`FaceMarks_RawEarringsCombo_EyePaintCross` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_EyeTape<br>`FaceMarks_RawEarringsCombo_EyeTape` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_EyeTapeLeft<br>`FaceMarks_RawEarringsCombo_EyeTapeLeft` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_EyeTapeRight<br>`FaceMarks_RawEarringsCombo_EyeTapeRight` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseEyeTape<br>`FaceMarks_RawEarringsCombo_NoseEyeTape` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseTape<br>`FaceMarks_RawEarringsCombo_NoseTape` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseTape_DP<br>`FaceMarks_RawEarringsCombo_NoseTape_DP` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseTape_G<br>`FaceMarks_RawEarringsCombo_NoseTape_G` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseTape_KE<br>`FaceMarks_RawEarringsCombo_NoseTape_KE` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseTape_T<br>`FaceMarks_RawEarringsCombo_NoseTape_T` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_NoseTapeEyePaint<br>`FaceMarks_RawEarringsCombo_NoseTapeEyePaint` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseEyeTape<br>`FaceMarks_RawEarringsCombo_RawNoseEyeTape` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_1hitta<br>`FaceMarks_RawEarringsCombo_NoseTape_1hitta` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_540baby<br>`FaceMarks_RawEarringsCombo_NoseTape_540baby` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_builtdiff<br>`FaceMarks_RawEarringsCombo_NoseTape_builtdiff` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_dontblink<br>`FaceMarks_RawEarringsCombo_NoseTape_dontblink` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_fearnone<br>`FaceMarks_RawEarringsCombo_NoseTape_fearnone` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_imfnopen<br>`FaceMarks_RawEarringsCombo_NoseTape_imfnopen` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_john316<br>`FaceMarks_RawEarringsCombo_NoseTape_john316` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_killall<br>`FaceMarks_RawEarringsCombo_NoseTape_killall` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_luke137<br>`FaceMarks_RawEarringsCombo_NoseTape_luke137` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_nolove<br>`FaceMarks_RawEarringsCombo_NoseTape_nolove` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_notsorry<br>`FaceMarks_RawEarringsCombo_NoseTape_notsorry` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_sickem<br>`FaceMarks_RawEarringsCombo_NoseTape_sickem` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_talkcrazy<br>`FaceMarks_RawEarringsCombo_NoseTape_talkcrazy` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_theproblem<br>`FaceMarks_RawEarringsCombo_NoseTape_theproblem` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |
| Earring combination: FaceMarks_RawNoseTape_watchme<br>`FaceMarks_RawEarringsCombo_NoseTape_watchme` | Not verified | ID + display name checked this scan | Excluded — optional future support | Optional earring support |

### Facepaint

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| DEE DOG Eye Paint<br>`FaceMarks_NoseTape_DP` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - #1 Hitta<br>`FaceMarks_RawNoseTape_1hitta` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - 540 Baby<br>`FaceMarks_RawNoseTape_540baby` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - All Gas<br>`FaceMarks_RawNoseEyeTape` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Built Diff<br>`FaceMarks_RawNoseTape_builtdiff` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Don't Blink<br>`FaceMarks_RawNoseTape_dontblink` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Fear None<br>`FaceMarks_RawNoseTape_fearnone` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - John 3:16<br>`FaceMarks_RawNoseTape_john316` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Luke 1:37<br>`FaceMarks_RawNoseTape_luke137` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - No Love<br>`FaceMarks_RawNoseTape_nolove` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Sick 'Em<br>`FaceMarks_RawNoseTape_sickem` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Talk Crazy<br>`FaceMarks_RawNoseTape_talkcrazy` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - The Problem<br>`FaceMarks_RawNoseTape_theproblem` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape - Watch Me<br>`FaceMarks_RawNoseTape_watchme` | Facepaint / face tape | ID + display name checked this scan | Established facepaint pool mapping | No specific gap |
| Nose and Eye Tape — I'm F'n Open<br>`FaceMarks_RawNoseTape_imfnopen` | Facepaint / face tape | Earlier mapping; not re-observed | Established facepaint pool mapping | Not re-observed this scan |
| Nose and Eye Tape — Kill All<br>`FaceMarks_RawNoseTape_killall` | Facepaint / face tape | Earlier mapping; not re-observed | Established facepaint pool mapping | Not re-observed this scan |
| Nose and Eye Tape — Not Sorry<br>`FaceMarks_RawNoseTape_notsorry` | Facepaint / face tape | Earlier mapping; not re-observed | Established facepaint pool mapping | Not re-observed this scan |

### Guardian Cap

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Black Battle Skullcap<br>`GuardianCap_RawBattleSkullCap` | Guardian cap / skullcap | ID + display name checked this scan | Eligible for generic equipment pools | Check skullcap appearance |
| Black Nike Skullcap<br>`GuardianCap_RawNikeSkullCap` | Guardian cap / skullcap | ID + display name checked this scan | Eligible for generic equipment pools | Check skullcap appearance |
| White Battle Skullcap<br>`GuardianCap_RawBattleSkullCapWhiteV87` | Guardian cap / skullcap | ID + display name checked this scan | Eligible for generic equipment pools | Check skullcap appearance |
| White Nike Skullcap<br>`GuardianCap_RawNikeSkullCapWhiteV87` | Guardian cap / skullcap | ID + display name checked this scan | Eligible for generic equipment pools | Check skullcap appearance |

### Neck Pad

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Raw gold cross necklace<br>`GearNeckpad_Raw_GoldCrossNecklace` | Neck pad / necklace | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |
| Raw silver cross necklace<br>`GearNeckpad_Raw_SilverCrossNecklace` | Neck pad / necklace | Earlier mapping; not re-observed | Eligible for generic equipment pools | Not re-observed this scan |

### Neckwear

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Slim Turtleneck Black<br>`NeckWear_Raw_Turtleneck_Black` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Slim Turtleneck Secondary Team Color<br>`NeckWear_Raw_Turtleneck_Secondary` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Slim Turtleneck Team Color<br>`NeckWear_Raw_Turtleneck` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |
| Slim Turtleneck White<br>`NeckWear_Raw_Turtleneck_White` | Neckwear | ID + display name checked this scan | Eligible for generic equipment pools | No specific gap |

## Source not established (7)

### Face Wear

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Black Balaclava (Under Lip)<br>`FaceGear_BalaclavaUnderLip` | Face covering | ID + display name checked this scan | Intentionally excluded | No specific gap |
| Secondary Color Balaclava (Under Lip)<br>`FaceGear_BalaclavaUnderLip_Secondary` | Face covering | ID + display name checked this scan | Intentionally excluded | No specific gap |
| Team Color Balaclava (Under Lip)<br>`FaceGear_BalaclavaUnderLip_Primary` | Face covering | ID + display name checked this scan | Intentionally excluded | No specific gap |
| White Balaclava (Under Lip)<br>`FaceGear_BalaclavaUnderLip_White` | Face covering | ID + display name checked this scan | Intentionally excluded | No specific gap |

### Jersey / clothing observations

| Item | Location | Verification | Toolkit use | Review |
| --- | --- | --- | --- | --- |
| Long Sleeves<br>`Gear_JerseyStyle_SleeveLong` | Not verified | ID + display name checked this scan | Observation only | Resolve source / slot |
| Loose Sleeves<br>`Gear_JerseyStyle_SleeveStandard` | Not verified | ID + display name checked this scan | Observation only | Resolve source / slot |
| Tight Sleeves<br>`Gear_JerseyStyle_SleeveTight` | Not verified | ID + display name checked this scan | Observation only | Resolve source / slot |
