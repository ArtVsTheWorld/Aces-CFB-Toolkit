# v0.18.2 — Equipment Save Reliability

> Superseded by v0.18.3. Subsequent in-game testing found that v0.18.2's alias detachment could grow the fixed equipment storage pool. The parser-only tests below did not detect that game-invalid layout. Do not distribute this older build; see V0183_UPDATE.md for the confirmed correction and in-game isolation results.

## User-facing patch notes

- Fixed Equipment Patcher Apply failures when a corrected loadout no longer needs extra equipment storage.
- Fixed Equipment Randomizer save verification failures in saves where different equipment rows share the same stored byte block.
- Equipment changes now separate shared storage before writing, so changing one loadout cannot accidentally change another.
- Preview matching, backups, staged save verification, and failure protection remain enabled. Equipment generation rules and user settings are unchanged.

## Diagnosis

These were distinct structural issues in the shared read/write pipeline, not defective equipment selections or equivalent JSON formatting.

### Astro — continuation bytes mistaken for a loadout

In the supplied UWDYNTEST save, logical CharacterVisuals row 12955 belongs to Thomas Essert. Its compressed payload is 377 bytes; the main block holds 375 compressed bytes plus the two-byte size header. Overflow row 14161 supplies the final two compressed bytes. The remaining bytes in that continuation block contain residual, unrelated equipment-frame data.

The dependency's standalone decoder could find that residual Zstd frame and expose it as another loadout. The Patcher snapshot treated the storage row as normal equipment. A valid mouthpiece reroll to `GearMouthpiece_PacifierDual_SecondaryColor` makes the main loadout fit inline. Releasing the continuation leaves its record with an empty-row free-list link (table 0), which is not an equipment reference. The old preview can capture the dependency's incidental `{}` write on that storage row as a second assignment. Replaying it reproduces the exact unsafe-overflow-reference error.

The initial reference is valid and single-owner, not a corrupt/shared overflow reference. The failure was a false logical assignment after legitimate storage release. Continuation rows are now identified from references, excluded from logical equipment snapshots, and never encoded as JSON loadouts. Storage release uses the record free-list API without writing `{}` into a continuation.

### Cash — different rows alias one physical equipment block

CHEE rows 178 and 1086 both point at CharacterVisuals table3 byte offset 409422. They are separate logical rows with a shared byte block. The old writer changes that block through row 1086 while leaving row 178's cached preview-time value unchanged. After save/reload, row 178 reads the changed loadout.

The captured field-by-field comparison shows actual gear changes, not harmless normalization: for example, facemask `GearFaceMask_F72BarJagged` becomes `GearFaceMask_F7Pro3BarRB`, clear Oakley visor becomes `OakleyPrizm24K_Visor`, empty mouthpiece becomes a hanging secondary-color mouthpiece, and arm sleeves, elbow gear, wrist gear, neckwear, cleats and gloves also differ. The exact gear choices vary with the random seed. The complete comparison is saved in the diagnosis artifacts.

## Shared correction

The equipment storage layer continues using the existing ISON/Zstd codec, with semantic encode/decode checks. It writes fixed-size physical blocks instead of running the dependency's variable-length table3 compactor over aliased/overflow-backed buffers. That compactor also conflates a decoded main-plus-continuation buffer with the main block's physical length, potentially shifting unrelated data.

Copy-on-write separates shared/overlapping main blocks and shared continuation blocks. Unique blocks can be reused in place; new storage is allocated through the existing free list. Existing legitimate shared tails remain supported, but writes never create new sharing. Invalid/cyclic links, loadout/storage role conflicts, exhausted storage, data loss, and oversized writes still fail closed.

Apply still backs up before mutation, writes a temporary candidate, reopens it, checks planned and unplanned logical loadouts, verifies other tables, checks the original file hash, and only then publishes the candidate. Failures remove the candidate and leave the input unchanged.

Exact historical run settings were unavailable. Validation therefore covers a mouthpiece-release run, a broad Patcher run, and an all-class Randomizer run with both optional equipment pools, plus deterministic seeded replays and focused structural regressions. Both supplied originals are preserved. In-game loading should still be checked by the users before broad distribution.

## Additional Patcher case — SEASON-BACKUP-100126

The existing v0.18.2 implementation successfully applies this save without any additional production-code changes. A seed-53 broad Patcher run enabled all correction passes, existing mouthpiece rerolls, and all-player scope. It produced **12,136 approved loadout assignments**, with no differences after save/reload across planned or unplanned logical rows.

Reported row 129 belongs to WR Kentrell Hutchinson. It begins as a unique inline block at offset 48633, with no overflow link or physical aliases. In the tested preview, both arm sleeves and both gloves changed to white, and the mouthpiece changed from standard white to hanging primary-color gear. All **five field changes** reopened exactly as approved. The same physical offset remains valid; its compressed payload changes from 188 to 266 bytes. This is not evidence that row 129 itself has the same physical alias as CHEE row 178; it confirms that the existing shared writer also covers this inline Patcher case.

Preview did not modify the copy or create a backup; Apply's backup matched the original; every other table remained unchanged; no temporary candidate remained. The supplied original SHA-256 is still `56323ef9612781e39cd1c5559c0ae76e5e434b0281bc3993b359273e5fef14bf`.

The complete original/expected/reopened field comparison and results are in `outputs/v182-season-patcher-tDsKg4`. The reusable validator is `scripts/validate-v182-season-patcher.mjs`. Exact historical user settings were not supplied, so this is a broad-run verification rather than a claim to have reconstructed that specific configuration.

A new regression uses the compact loadout's actual sparse equipment data shape (without player identity or save/row hardcoding) and verifies a simultaneous inline mutation next to a loadout growing into overflow. It checks all planned fields, stable physical storage, and all unplanned loadouts through the normal staged save/reopen validator. Production source, algorithms, safeguards, app/tool versions, and the already-built v0.18.2 installer are unchanged.

## Verified results

- Automated suite: **441 passed, 0 failed, 0 cancelled**, rerun after the additional Patcher case with `node --test --test-concurrency=2 test/*.test.js`. Eight new tests cover actual continuation-frame residue, inline aliases, shared overflow, repeated growth/shrink, adjacent inline/overflow mutations, full storage capacity, invalid links, exhaustion, and reopened validation. Existing failure/rollback and ordinary equipment tests remain passing.
- UWDYNTEST broad Patcher: **11,463 approved loadout assignments** applied and reopened exactly. The seed-30 mouthpiece-release scenario also passed. Preview made no save/backup writes, seeded analyses matched, the backup hash matched the original, and Player/Team tables stayed unchanged.
- CHEE broad Randomizer: **10,681 approved loadout assignments** applied and reopened exactly, including row 178 and all unplanned loadouts. Seeded repeat, read-only Preview, backup hash, unchanged Player/Team tables, and a subsequent Preview passed.
- Both supplied originals retain their original SHA-256 hashes: UWDYNTEST `972a7bf88669d7b2d536e19d1006826a945e7deaf187080365067c1d2db4bae3`; CHEE `b39ae694e96b14715a2b0838ffbf0b736577684d2ab6a4b3e89a0b63b9fa6d71`.
- Production x64 Windows NSIS installer built successfully. Development and packaged UI smoke tests, packaged startup, and the real updater's loopback download/checksum/rejection test passed. Packaged equipment storage sources match the tested source; personal settings, saves, and reports are not bundled.

Large all-player diagnostic runs can take several minutes because they repeat analysis, write detailed reports, reopen the complete save, compare every loadout, and analyze again. Exact historical user options and in-game load tests remain unavailable; the supplied save-copy checks do not claim to replace in-game verification.

## Release files

The three matching upload assets are in `dist/v0.18.2-installer/github-release-assets`: Setup EXE, EXE.blockmap, and latest.yml. Publish them together under GitHub release tag **v0.18.2**, as a normal/latest release, without editing names or the manifest. Previous releases are unchanged. Nothing has been uploaded automatically.
