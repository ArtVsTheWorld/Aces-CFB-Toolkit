# Unlocked 0.97 — Catalog Addendum

Observed October 17, 2026 in the user-confirmed Unlocked-only game session. Names below come from structurally checked ItemInfo records, not guesses from resource-path casing. The base October 5 catalog remains a dated reference, not a complete inventory of this update.

## Uniforms used by the new passes

| Display name | Exact saved ItemName | Use |
| --- | --- | --- |
| Jersey Rolled Low Tucked Undershirt | `Gear_Low_TuckedUndershirt` | Source → Lowest |
| Jersey Rolled Lowest | `Gear_JerseyStyle_RolledLowest` | Tucked replacement; incompatible with Cutoff Pants |
| Rolled Jersey Low | `Gear_JerseyStyle_RolledLow` | Source → Lowest Untucked; also cutoff-compatible |
| Jersey Rolled Lowest Untucked | `Gear_JerseyStyle_RolledLowest_Untucked` | Replacement; cutoff-compatible |
| Tight Sleeves Untucked | `Gear_JerseyStyle_SleeveTight_Untucked` | Cutoff-compatible |
| Rolled Jersey | `Gear_JerseyStyle_Rolled` | Cutoff-compatible |
| Pants Above Knee | `GearPants_AboveKnee` | Capped source; compatibility fallback |
| Pants Standard | `GearPants_Standard` | Optional uncapped source |
| Pants Cuttoff | `GearPants_Cutoff` | Replacement; app corrects display spelling to Pants Cutoff |

Uniform slots use the established OuterShirt and OuterPants equipment structure. The None leg base layer is normally omitted or `BottomBase_None`; an unknown active base layer is never considered free. Any active undershirt is required in InnerShirt. UI menu location alone is not used to store gear in tattoo slots.

## Newly cataloged cleats included in the optional Unlocked pool

| Display name | Exact saved ItemName |
| --- | --- |
| Nike Diamond Turf 93 | `GearFootwear_shoe_low_NikeDiamondTurf93` |
| Nike Vapor Edge Kobe 6 | `GearFootwear_shoe_low_NikeKobeVenom` |
| Nike Foamposite Pro | `GearFootwear_shoe_mid_NikeFoamposite` |
| Nike Diamond Turf 2 | `GearFootwear_shoe_mid_NikeDiamondTURF2` |
| Nike Alpha Menace Elite 5 | `GearFootwear_shoe_mid_NikeAlphaMenaceElite5` |
| Nike Alpha Menace Pro 5 | `GearFootwear_shoe_mid_NikeAlphaMenacePro5` |

The Nike classification agrees between the exact ItemName and live display label; assignment uses the existing left/right shoe slots and receiver-brand safeguards. These additions were missing from the earlier checked catalog. They are **not claimed to be six newly created v0.97 asset resources**: mods can expose/reuse existing game assets. They remain outside automatic vanilla and RAW pool additions. Actual in-game fit/artwork still needs checking.

Existing verified choices including Vapor Edge Pro 360 2, Vapor Edge Speed FOTF PE and Vapor Untouchable Pro Customs already belonged to the Unlocked cleat pool and are retained. Existing brand tags remain independent of display-name corrections. No broad footwear wildcard was enabled.

## Observed but not newly generated

- Irish Jamo Sleeves White: `G_CompressionT_Crew_ShortSleeve_BasicJ_WHI`
- Irish Jamo Sleeves Black: `G_CompressionT_Crew_ShortSleeve_BasicJ_BLA`
- Irish Jamo Sleeves Primary: `G_CompressionT_Crew_ShortSleeve_BasicJ_PRI`
- Irish Jamo Sleeves Secondary: `G_CompressionT_Crew_ShortSleeve_BasicJ_SEC`

These labels can be shown in Preview/report text when encountered, but no new Jamo correction/recolor/generation rule is inferred. `BasicJ_JER` appears in the manifest but did not have a verified display-name pair in the bounded scan. Pants On Knee is observed but not part of either requested replacement pass.

## Remaining manual review

1. In-game load and appearance of the new uniform combinations and six additional cleats, particularly all body types and both shoe slots.
2. Jamo slot ownership, coverage and color behavior before adding a new generation or recolor family.
3. Adidas AE 1 and the Leather Turf 80s/F50 repurpose require appearance/football-cleat verification before generation. The scan did not establish their current selected-item records sufficiently; they remain excluded.
4. Mercurial Superfly and the Mercurial Superfly XI Kobe repurpose retain the existing non-football generation exclusions. No assumptions were made from their menu category.
5. Resource names and read-only catalog presence cannot prove that every item is selectable, uniquely supplied by this mod, or compatible with every game version. No encrypted payload decryption was attempted.

Raw scan evidence stays in ignored local outputs. This addendum contains no process addresses, raw bytes or mod binaries.
