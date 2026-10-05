# Equipment catalog — October 5, 2026

[Searchable human-readable catalog and manual-review checklist](gear-catalog-readable.html)

[Markdown reference for reading/sharing](gear-catalog-readable.md)

[Verified observations and established mod pools](equipment-modded-2026-10-05.json)

The live session had CFB27 Unlocked **0.96** by **Orckestra** and RAW Accessories **v2.0.4** by **Delonte RAW**, as confirmed by the user. Scans used ordinary read/query access only: no game writes, injection, suspension, elevation, or raw memory dumps. The distributed catalog contains filtered equipment names/labels, not process addresses.

## How to read the catalog

- `items`: live ItemInfo records whose repeated ItemName fields and DisplayName at +56 agree. Grouped as established `catalog` gear (which can include locked assets), `unlocked`, `raw`, or `unresolved`.
- `observedWithoutMods`: also present in the earlier checked unmodded observations. This alone does **not** prove vanilla menu availability: locked items can be loaded without their mod.
- `resourceManifests`: which supplied mods contain that exact resource. A mod may change a vanilla asset rather than introduce a new selection.
- `knownModPools`: the Toolkit's established mod-specific gear, facepaint and tattoo mappings, including entries not freshly re-observed in this session. `observedInCurrentSession` distinguishes them.
- `generationEligible: false`: observation only, excluded, or not yet verified for generation. Do not turn these into generated equipment just because a name was found.

The supplied RAW manifest is **2.0.2**, not the running **v2.0.4**. It is deliberately identified as older evidence; the two new white skullcaps were verified from live records plus the user's explicit RAW provenance. Black Nike/Battle skullcaps were rechecked. All four use the established **GuardianCap** slot and now have proper display names and white/black recolor pairs.

RAW earring/facepaint combination assets are cataloged but remain excluded from the facepaint-only generation pool. Under-lip balaclavas remain excluded. Unresolved items are not added to any pool. This is a checked catalog of loaded records, not a claim that every possible game/menu asset was resident or that every appearance has been tested in-game.

The readable reference merges 251 live observations with 78 earlier mappings not re-observed, deduplicated to 329 entries. It distinguishes separate facepaint/tattoo pools from the generic `generationEligible` flag; an observed facepaint record with `generationEligible: false` is not by itself evidence that the established facepaint pool excludes it. Earlier mappings are not marked broken simply because they were absent from this scan. Rebuild the HTML/Markdown with `node scripts/render-equipment-reference.mjs`.

## Reproducing the filtered catalog

Use `scripts/scan-equipment-process.ps1` for the current CollegeFB27 PID, resume bounded scans with `NextScanOffset`, then merge them with `scripts/merge-equipment-scans.mjs`. Check ItemInfo records with `scripts/probe-equipment-records.ps1`, resuming as needed. Finally pass those probe files to `scripts/catalog-modded-observations.mjs`. Keep raw diagnostic addresses in ignored `outputs`, not in release assets. Never reuse addresses from a different game session.
