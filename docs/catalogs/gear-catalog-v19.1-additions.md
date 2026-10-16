# Gear catalog — v19.1 additions

These entries supplement the earlier [readable gear catalog](gear-catalog-readable.html). This is a development reference, not an app screen.

| Item shown in Toolkit | Mod | Exact item ID | Save slot / use |
| --- | --- | --- | --- |
| Battle Backplate | RAW Accessories 2.0.4 by Delonte RAW | `GearBackplate_RawBattle` | BackPlate; Randomizer only without a flak jacket |
| Gear Pro-Tec Backplate | RAW Accessories 2.0.4 | `GearBackplate_RawGearProTec` | BackPlate; same jacket protection |
| Gold Rush Backplate | RAW Accessories 2.0.4 | `GearBackplate_RawGoldRush` | BackPlate; same jacket protection |
| X Tech Backplate | RAW Accessories 2.0.4 | `GearBackplate_RawXTech` | BackPlate; same jacket protection |
| Xenith Backplate | RAW Accessories 2.0.4 | `GearBackplate_RawXenith` | BackPlate; same jacket protection |
| Crew Cut | CFB27 Unlocked 0.96 by Orckestra | `Socks_CrewCut` | InnerSocks; replaces vanilla Mid Socks in the new pass; optional Randomizer item |
| High Socks (CFB27 Unlocked) | CFB27 Unlocked 0.96 | `Socks_High` | InnerSocks; replaces vanilla High Socks in the new pass; optional Randomizer item |

Vanilla Mid Socks are `Gear_Socks_Mid`; vanilla High Socks are `Gear_Socks_High`. They remain separate from the Unlocked entries even though both high-sock items have the same menu label.

## Verified evidence

- Read-only live ItemInfo records, with repeated exact-case ItemName fields and matching DisplayName at +56, confirm every ID/label above. The game labels the backplates “Battle,” “Gear Pro-Tec,” “Gold Rush,” “X Tech,” and “Xenith.” Toolkit labels add “Backplate” for clarity.
- Each ID matches an exclusive item resource in its respective supplied mod manifest. New backplates do not enter Unlocked or vanilla pools; mod socks do not enter RAW or vanilla pools.
- The attached `CFB27_Unlocked_96(1).fbmod` has the same SHA-256 as the previously inspected 0.96 file: `371e4ce2bbae9dd37bf5d2895abab6ac5720c5cd1543ec51d634e3ff19a9bc80`. Its 1,933 payloads remain encrypted; this is not a newly decoded asset database.
- RAW 2.0.4 SHA-256: `ec1c7f4ad5b15d5a06b4061080eb66485a17245599bbf51e37bebb090a332e91`. Its five new backplate resources independently confirm RAW provenance.

## Manual review remaining

Check the appearance of these seven items on a copied dynasty in-game with the intended mods installed. Exact IDs and labels are verified, but live slot-vector extraction was inconclusive. Slot assignments use the established BackPlate/InnerSocks conventions and the user's sock-height menu identification; toolkit write/reopen validation cannot prove their in-game appearance or fit. Other manifest-only items, including Layered/Mini Crew Cut, have not been indiscriminately added.

Tattoos use their own Left/Right ArmTattoo and LegTattoo slots in the Base layer. Sharing an equipment-menu section does not mean sharing a save slot. Leg tattoos preserve sock styles and retain the existing bare-leg adjustment; the tattoo correction now runs last so later passes cannot undo it.
