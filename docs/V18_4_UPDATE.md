# v18.4 — Equipment Encoding Reliability

## User-friendly patch notes

- Fixed an Equipment Randomizer preview error that could say **“Equipment row … lost data during encoding.”** on certain saves.
- Equipment names are now preserved exactly when changes are prepared and saved. The shared fix also protects Equipment Patcher.
- Existing backup and save-verification protections remain in place. No players or saves are blacklisted to avoid the error.

The app displays **v18.4**; installer/update metadata is **18.4.0**. Individual
equipment tool versions remain v5.0. Helmet customization is planned, not
implemented in this release; see [the proposed design](HELMET_DISTRIBUTION_PLAN.md).

## Actual root cause

The supplied save has literal, game-generated equipment strings including
`GearLegsBase_leftsleeve` and `GearLegsBase_rightsleeve`. The dependency's ISON
encoder performs its interned-string lookup case-insensitively. It consequently
replaced those spellings with `GearLegsBase_LeftSleeve` and
`GearLegsBase_RightSleeve` when re-encoding the loadout. Strict round-trip
validation correctly rejected the discrepancy before any save write.

Four original loadouts already reproduce this discrepancy even without a
Randomizer mutation. Donor copying propagates the values to different
recipients, explaining why the reported row can vary between runs. A broad
legacy-encoder reproduction also failed on a recipient loadout with precisely
this itemAssetName discrepancy; no other fields differed.

The shared encoding adapter now uses ISON's existing literal-string format
for a string whose interned representation would change its capitalization.
Other tokens remain intact, and the existing decoder, exact JSON comparison,
fixed-capacity allocation, candidate verification and atomic publishing remain
unchanged. Numeric truncation, structural loss, invalid storage and unplanned
changes are still rejected. No dependency files or legacy CLI scripts were edited.

## Verification

- **462 full automated tests passed**, including six new tests. **389 public-source tests passed.**
- Regression coverage includes left/right aliases, nested arrays, case-sensitive keys, Unicode, unchanged canonical encodings, real inline/overflow writes and repeated save/reopen. Actual string loss and numeric truncation remain rejected.
- Initial unconstrained testing encountered resource-contention timeouts and a test-process memory limit. The final complete run used `node --max-old-space-size=4096 --test --test-concurrency=2 test/*.test.js`; it passed without relaxing assertions or test timeouts.
- Rexx's supplied original remained byte-identical throughout diagnostics.
- Default Randomizer on a workspace copy: **2,253** loadout changes, identical seeded replay, no Preview write/backup, exact cached Apply/reload, byte-identical backup, unchanged other tables and unchanged container size. **User confirmed this corrected copy loads normally in-game.**
- Broad external-donor Randomizer on a copy: **12,011** loadout changes; the same exactness, determinism, backup, storage and untouched-table checks passed. Donor save remained unchanged.
- All-pass Patcher on a copy: **11,896** loadout changes; identical seeded replay, exact cached Apply/reload, backup and storage checks passed.
- A broader in-memory ordinary Randomizer preview also completed **10,993** player changes.
- Packaged codec smoke exercised all four original case-alias rows with the shipped dictionary and lookup assets, exact candidate verification/reopen, unchanged original and fixed file size.
- Development and packaged UI smoke tests passed; development, unpacked packaged app and portable startup smoke tests passed.
- Real updater download smoke passed: matching SHA-512, bad-checksum rejection, no automatic installation/restart.
- Windows x64 installer and portable production builds succeeded.

Rexx's exact settings were unavailable. The extra external-donor and all-pass
Patcher copies were structurally verified but have not separately been tested
in-game. No claim is made that this fixes unrelated invalid equipment or save
conditions; existing safety checks remain fail-closed.

## Release files

Build output: `dist/v18.4-release/`.

Upload these three matching files together under GitHub release **v18.4.0**:

- `github-release-assets/Aces-CFB-Toolkit-Setup-18.4.0.exe`
- `github-release-assets/Aces-CFB-Toolkit-Setup-18.4.0.exe.blockmap`
- `github-release-assets/latest.yml`

Optional portable download: `Ace's CFB Toolkit 18.4.0.exe`.

Nothing was published automatically. Personal settings, saves, reports,
diagnostic artifacts and this planning document are not bundled into the app.
