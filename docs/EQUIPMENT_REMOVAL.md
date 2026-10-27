# Remove Specific Item(s) catalog

The removal picker includes 686 named items in optional equipment categories. It combines the wearable catalog, RAW Jamo aliases, tattoo choices, the separate vanilla/modded facepaint pools, verified undershirt aliases and named optional-item families from the offline inventories. Generation pools and defaults are unchanged.

The October 27 audit cross-checks 1,123 named asset IDs from all bundled equipment inventories plus both versions of `gear-catalog-readable`. Every named asset is accounted for: 686 offered, 344 protected required-equipment IDs, 27 empty/default choices and 66 items in categories without a supported None option. Run `node scripts/audit-equipment-removal.mjs` to repeat the check. The regression test also requires all known alternate display names for offered items to be searchable.

New coverage includes NeckWear turtlenecks and Q Collar, InnerPants leg sleeves/compression layers, Relaxed Tee colors, long-sleeve/Irish Jamo aliases, facepaint/tape/earring combinations and named GuardianCap variants. RAW Jamo IDs that also identify stock sleeves retain both display names. Additional names from the readable reference and inventories are searchable without expanding visible labels. The reference dates to October 5; newer verified mappings take precedence.

Required helmets, facemasks and cleats remain unavailable even where a catalogued None asset exists. Socks, jerseys, pants, shoulder pads and HeadBand waist playcalls have no supported None category in these inventories. Empty choices such as No Tattoo are not offered. These are intentional exclusions rather than missing names.

The actual saved slot must support None before removal can occur. Named backing assets with unresolved assignment suitability require an explicit optional saved slot; the tool does not infer permission to remove required clothing from an asset label. Existing player filters, protections, shared-appearance checks, full preview/apply plans and storage validation remain in place.

The removal search, category filter, All and Clear controls use the same 38px height. Desktop controls align along their bottom edge; narrow layouts retain equal heights over two rows.
