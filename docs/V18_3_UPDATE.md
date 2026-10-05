# v18.3 — Equipment Save Reliability

## Patch notes

- Fixed equipment changes that could leave some dynasties stuck on the loading screen. Randomizer and Patcher now keep saves within their original storage and file-size limits.
- Added a stronger lossless compression fallback when equipment changes need more space. If the changes still cannot fit safely, Apply stops and leaves the original save unchanged.
- Mod-added FCS players left unchanged are now listed separately, rather than inflating the Randomizer's main skipped-player count. Real FBS issues and the five normal directional FCS schools remain included.
- Simplified app version numbering: **v18.3** replaces **v0.18.3**. Equipment tool versions remain v5.0.

Start from a working backup if an earlier equipment run produced a crashing or endlessly loading save. Updating the app does not repair a previously written file automatically.

## Confirmed Patcher loading-screen cause

The supplied working backup reserves **9,646,981 bytes** (9,421 KB in Windows). Its compressed payload is 9,614,522 bytes, leaving 32,377 bytes after the 82-byte header. The reported Patcher changes increased the default-compressed payload to 9,724,847 bytes. The dependency's generic writer enlarged the file to **9,724,929 bytes** instead of keeping the original container size.

The internal equipment table remained within its fixed capacity, and all 12,131 logical changes matched the supplied report. Our parser could reopen the larger container, but the game remained on its loading screen. This is a second storage boundary, separate from the fixed CharacterVisuals pool correction documented in [the earlier investigation](V0183_UPDATE.md).

Lossless level-9 compression reduced the exact same decompressed payload to **9,579,135 bytes**, fitting the original container. The user confirmed two successful in-game loads:

1. A diagnostic containing every decompressed byte from the hanging save, with only outer compression/container size corrected.
2. A production shared-Apply replay of all **12,131** original Patcher assignments from the working backup.

Both retain every equipment change. The FBS-only diagnostic hung while the mod-FCS-only diagnostic loaded because only the former exceeded the container reserve; the additional teams themselves were not the cause.

## Shared implementation and safeguards

`saveContainer.js` uses the existing library's table serializer, retains the original FBCHUNKS container, validates its compressed-length header, and never grows the file. Normal compression is retained when it fits. Stronger compression is used only when needed, with exact decompressed-byte equality checks. Unfit data rejects normally instead of truncating or dropping equipment.

Both equipment tools use this through `saveEquipmentCandidate`. Fixed-pool bounds, copy-on-write separation, full planned/unplanned loadout verification, unchanged-other-table checks, original-file fingerprint checks, backups, temporary-candidate cleanup, and atomic publication remain enabled.

Skip-count cleanup is reporting-only. It resolves actual roster membership in expanded non-FBS saves, retains directional FCS/FBS and ambiguous memberships in the main warning, and keeps complete original totals, reasons, and player diagnostics. It does not change player eligibility, shared-visual protection, donor selection, equipment, or random draws. Normal 143-team saves are unaffected.

## Verification

- **456 automated tests passed**, with no failures, cancellations, or skips. Eleven new tests cover packed-container bounds/compression/failure protection, reporting separation, and version compatibility.
- Exact original Patcher replay: 12,131 assignments, matching backup, successful full verification, original 9,646,981-byte file size, and user-confirmed in-game load.
- Fresh CHEE external-donor WR run: 1,213 assignments, repeatable seeded Preview, no Preview writes/backups, exact reopened planned/unplanned equipment, unchanged other tables, read-only donors, matching backup, and no temporary candidate left behind.
- Fresh WK external-donor TE run: 573 assignments, with the same deterministic, read-only Preview, backup, complete reopened equipment, unchanged-table, and donor-protection checks passing.
- Existing fixed-pool, overflow/alias, serialization, equipment parity, and ordinary latest-patch save regressions remain passing.
- Development and packaged UI smoke tests passed. Packaged startup exited successfully.
- Windows NSIS build succeeded. A real updater loopback test verified version detection, installer download/SHA-512, bad-checksum rejection, and no automatic installation/restart.
- Original supplied saves and legacy CLI scripts/launchers were not modified.

Artifacts: `outputs/patcher-gear-probes-mM1UTh`, `outputs/patcher-container-probe-3ym0GJ`, `outputs/v183-pair-audit-baZDAq`, `outputs/v183-verified-mPPmgY`, `outputs/v183-verified-uyFzX0`, and `outputs/v183-followup-test-results.log`.

## Release files

The app displays **v18.3**. Installer/update metadata uses valid SemVer **18.3.0**, which sorts above the previous 0.18.x versions. App identity and persistent data paths are unchanged.

Upload the matching `Aces-CFB-Toolkit-Setup-18.3.0.exe`, its `.blockmap`, and `latest.yml` from `dist/v18.3-installer/github-release-assets` together under GitHub release tag **v18.3.0**. Nothing was published automatically. Personal settings, saves, reports, and diagnostic outputs are not bundled.
