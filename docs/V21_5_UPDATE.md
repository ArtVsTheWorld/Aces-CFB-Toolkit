# v21.5 — roster details, family pairs, NIL budgets, Equipment Mapper

## Roster Generator

The application preview leads with the new player, not a list of overwritten fields. Physical ratings and the strongest archetype-weighted position ratings appear alongside hometown, size, class, archetype, development, captain status, athletic profile, NIL cost, and any brother pairing. The original player remains identified by name and jersey number. Other fields and provenance remain expandable and in CSV reports.

An 8% per-team roll can create at most one pair of brothers. Both retain their complete observed head/body packages: candidates must already have the exact same skin tone, state, pipeline, and distinct first names. This preserves the school's regional allocation. The shared surname must fit both observed surname pools; full-name collisions are rejected. Both receive the same complete hometown/state/pipeline tuple. Commentary and presentation asset names are rebuilt after surname assignment. The pair is replay-validated before Apply.

`CurrentNILCompensation` is a 0–1023 unsigned 10-bit Player field in the supported schema. A seeded, rating- and position-weighted capped largest-remainder allocation redistributes the selected roster's original total exactly. Quarterbacks have the highest position premium. Zero, tiny, full-capacity, and single-player budgets remain valid. The generator's normal exact field, protected-byte, and candidate-reopen checks cover the field. Other NIL contract/finance fields are unchanged. Reports include original/new costs, the team total, and brother rows.

## Equipment Mapper

This tool has its own handler, library, configuration, rules, and review. It does not run randomization or correction passes. It shares the equipment catalog, compatibility primitives, plan cache, fixed-capacity CharacterVisuals writer, candidate verification, backup creation, and atomic file replacement.

The library scans readable player gear from active and inactive players and unassigned PlayerOnField equipment rows. Coach wardrobe layers are excluded. It does not use the bundled catalog as an inclusion whitelist, manufacture items, or expose head/body appearance layers as equipment. Items without an explicit slot are included; a single verified catalog slot or unambiguous observation elsewhere in the save can resolve a missing slot. Ambiguous slots are visible but read-only. Only active-roster players are modification targets.

Visible rows group the same item across left/right slots, blend metadata, facemask configurations, and placement overrides. Verified catalog aliases also share one row. Each row has aggregate usage/wearer counts, a compact exact-slot selector where needed, and collapsed saved-configuration choices. Canonical SHA-256 IDs still identify the complete original slot elements and dependency context internally; no item IDs or appearance metadata are discarded to achieve presentation deduplication.

Rules run in queue order. Same Item (the new UI default) matches the exact asset in the chosen slot regardless of saved blend/placement settings. Exact Configuration additionally includes element metadata and dependency context. Same Item — Include Other Colors uses verified color-family variants in that same exact slot; it is not a fuzzy name search. Source and replacement slots must match exactly in both the picker and backend: left cannot become right. Keep Current Colors selects only a verified color-family variant actually present in the save; missing variants block the mapping instead of guessing IDs. Unchanged implicit-slot elements remain untouched in their original saved form.

A copied helmet includes its observed compatible facemask. Shoes and waist gear carry their corresponding override or explicitly remove a stale override when the source has none. All such changes appear in the audit. Other on-field slots, root appearance data, non-on-field layers, player fields, and other tables remain untouched.

Gloves, cleats and arm sleeves can be copied or replaced as pairs using observed configurations for each exact side. New glove rules default to paired copying; existing saved rules retain their original behavior. Pair selection never invents an opposite-side item. Saved-configuration descriptions expose item IDs, blends, palettes and relevant dependency settings; readable category labels combine sides and brand labels are normalized for presentation.

Replacement rules have a whole-number 0–100% cap, defaulting to 100%. Each team's denominator is its distinct matching players, not its entire roster or individual sides; a pair counts once. Fractional player counts round down. Capped selections use stable ranking and are independent of player iteration order. Eligibility for capped rules is measured against the original saved gear. Reports and reviews include matched/selected counts per team. Uncapped rules preserve queued-rule chaining.

## Play Now roster files

Roster Generator accepts supported CFB 27 roster containers as well as dynasties. The roster adapter preserves the original container header and capacity and requires an exact untouched TDF decode/encode round trip before editing. Generation reuses the existing presets, player-generation logic, Standard jersey allocation and active-roster top-20 equipment donors without mod pools. Only explicitly verified PLAY and player-visual mappings are persisted. Dynasty-only skill-cap, ability-package, NIL, recruiting and progression fields are not written. Roster depth charts remain unchanged; reorder them in-game afterward.

The roster writer preserves player/team entity links, age fields, unselected players, coach blobs, teams and depth-chart data. Names, supported ratings, class/redshirt status, development, archetype, commentary identity, presentation identity, body/head data and equipment are encoded through the roster-specific format rather than the dynasty table writer. Unsupported appearance metadata fails closed. Apply checks source fingerprints, creates a backup, verifies the complete candidate after reopening and atomically replaces the target. Dynasty season restrictions remain unchanged; Play Now rosters have no season restriction. Other dynasty tools are not enabled for roster files by this change.

### Roster load integrity correction

Initial parser round trips missed two container requirements: the unpacked length at 0x12 and the CRC-32/BZIP2 checksum at 0x1a (both 32-bit little-endian). The checksum covers the complete unpacked TDF, including the compressed bytes of nested appearance blobs. Recompressing those blobs changes the outer checksum even when their decoded appearance is identical. This explains why outer-only recompression loaded while the initial generated and appearance-only copies were silently rejected by the game.

The checksum algorithm was verified against both the original Official roster and the user's separately game-written ONEEDIT roster. It uses non-reflected polynomial 0x04c11db7, initial/final XOR 0xffffffff, and standard check vector `123456789` → `fc891918`; it is not ZIP/gzip CRC-32. The writer now refreshes length and checksum on every pack, preserves the remaining metadata and fixed file capacity, and verifies both before decoding a reopened candidate. Invalid source files fail closed rather than having their checks bypassed. No dynasty writer was changed.

The user confirmed that the corrected LSU test copy loads successfully and shows the generated quarterback. Its entire compressed payload matches the previously rejected HEADERTEST; only the four checksum bytes differ. This establishes the checksum failure independently of our parser. Regression coverage includes stale checksums with changed and unchanged payload lengths, nested-gzip-only changes, independent checksum calculations and both game-written fixtures.

Compatibility is checked on the final batch, including brand-sensitive cleats/gloves, helmet/facemask pairs, helmet accessories, mouthpieces/balaclavas, arm coverage, overlapping accessories, RAW backplates/flak jackets, and cutoff pants. Existing unrelated conflicts are not repaired automatically. Any newly introduced conflict blocks the whole Apply until the user changes their rules or targets. Shared CharacterVisuals rows are reported and blocked rather than editing another player indirectly. Uncatalogued brand-specific or helmet pairings cannot be safely copied without verified compatibility.

Mapping presets use the existing save/load/import/export system. Item IDs must still exist in a new save. Individual targets include their original player/team identities: row numbers alone cannot silently target different people in another file. Team and position filters compose with manual player selections. Empty selected-target scopes are rejected; All Matching Players is explicit.

Preview exercises the production visual encoder without writing. Apply rechecks source fingerprints/old values, backs up, writes a candidate, reopens it, compares every planned visual row and unplanned table, and only then replaces the original save. Failed or stale operations leave the original unchanged. CSV contains rules, blocked reasons, complete element edits, full before/after RawData, and source fingerprint; saved History reviews use the common infrastructure.

The library is browseable outside the normal equipment season window; Preview/Apply retain the shared equipment season restriction. The redesigned main page uses the shared numbered tool sections, rule queue, presets, affected-player summary, and Preview command bar. The library paginates all results in groups of 100 unique items; target searches show up to 100 players at once, with search and bulk checkbox selection. Equipment Replacement and Copy From Player use compact source cards and real target-filter tabs, not section-jump navigation. Cancel discards modal drafts, and item selectors stay within a single configuration window.

## Verification

### ELJAX's Equipment Truck

The dedicated `eljax` inventory contains 12 sleeves and two visors. All exact save IDs, capitalization and color labels were verified against the user's six equipped Ohio State receivers in GEARTRUCK, alongside live menu labels. Each sleeve family was observed in both arm slots. No resource-path guesses or unverified case aliases are generated.

The Randomizer's Equipment Truck toggle starts off. Its Configure Pool window reuses the shared mod-pool editor, with independent whole-number chances and item selections for sleeves and visors. Defaults are 10% per category. The sleeve roll applies a matching pair; the visor roll is independent. No facepaint category is invented and none of these items enter the Unlocked or RAW addition pools. As with other pools, this controls new additions rather than donor-copied gear.

The shared catalog supplies readable names to previews, Mapper and reports. Existing color-family lookup recolors each sleeve family across White, Black, Primary and Secondary without changing its design or side. The visors retain their exact style. New Truck additions clear stale donor palette/blend overrides, matching the game's equipped elements. They use the existing sleeve-coverage checks, No Drip handling and final generated-item audit. Reports preserve the flag, resolved pool settings, surviving additions and complete before/after equipment.

Focused regression coverage is in `test/equipmentTruck.test.js`. `scripts/validate-equipment-truck.mjs` runs four full recolor themes plus a Truck-enabled Randomizer run on fresh copies of the supplied save; it verifies deterministic previews, exact Apply/reopen, backups, unchanged other tables and an unchanged original. Packaged smoke checks the third pool's disabled default, labels, item counts, whole-number validation, Save/Cancel, presets, review, navigation and small-window layout. In-game appearance of newly generated combinations still needs a manual check with Equipment Truck enabled.

Focused tests include `test/v215EquipmentMapper.test.js`, `v215MapperLibrary.test.js`, `v215MapperPairsCaps.test.js`, `v215RosterCodec.test.js`, `v215RosterBudgets.test.js` and `v215RosterGeneration.test.js`. Private copied-save workflows include `test/v215SaveWorkflow.test.js` and `v215RosterFileSave.test.js`: actual Preview/Apply/reopen, backup equality, protected data and original-fixture checks. Hidden Electron smoke uses `scripts/smoke-v215.cjs`, including grouped items, pagination, exact-side pickers, paired glove defaults, cap controls, compact modals, presets and actual Apply. Source suite: `npm run test:source`.

In-game checks remain necessary for visual appearance of newly mapped combinations; passing structural and compatibility tests is not a claim that the game was launched for this update. No original test save is overwritten and nothing is published automatically.

## Recovery

The published v21.1 source commit is `cb3201fec1d638c382bb48a7503570eb439a6e96`. Before v21.5 edits, a verified source-only local snapshot was also created using `scripts/ui-snapshot.mjs`; its machine-local path is recorded in the working task notes, not distributed. Restore snapshots only after preserving newer work. Normal per-Apply dynasty backups remain separate.
