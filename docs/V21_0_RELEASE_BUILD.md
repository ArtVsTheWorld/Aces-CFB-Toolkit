# v21.0 release handoff

Prepared October 20, 2026. App/package version: 21.0.0. The last published installer at preparation time was v20.6, so `RELEASE_NOTES_V21_0.md` covers the cumulative changes since that release, including the v20.7 development work.

## Manual GitHub release

- Suggested tag: `v21.0.0` (target the current v21.0 source commit on `main`).
- Title: `Ace's CFB Toolkit v21.0`.
- Copy the Release Notes section from `docs/RELEASE_NOTES_V21_0.md` and edit as desired.
- Upload all three files from `dist/v21.0-release/github-release-assets` together:
  - `Aces-CFB-Toolkit-Setup-21.0.0.exe`
  - `Aces-CFB-Toolkit-Setup-21.0.0.exe.blockmap`
  - `latest.yml`
- Publish as a normal latest release, not a prerelease, for installed users to receive update prompts.

Only source is pushed by this handoff. No GitHub release is created, published, or changed; the installer assets stay local for manual upload. No installer is executed on this computer.

## Build verification

- Setup EXE size: 165,867,591 bytes.
- Setup EXE SHA-256: `E41ED2D74BC6E180A6CC0E93EB27EA2E6A0FE5AD9F803D7B429E96FC0D7D7546`.
- Blockmap: 174,808 bytes. Update manifest: 364 bytes.
- All 484 packaged source/assets match the working source. Package version, bundled schemas, commentary map, installer size/SHA-512 and matching upload copies were verified using `scripts/verify-v185-release.mjs`.
- The real NSIS updater detected the newer version, waited for download consent, downloaded this installer from an isolated loopback feed, verified its checksum, rejected a bad checksum, and never installed or restarted anything.
- Fresh source test suite: 656 passed, 0 failed (`outputs/v210-release-source-tests.log`).
- The copied-save per-team cap Preview/Apply/backup/reopen and CSV audit passed during the preceding implementation checks. Source and packaged configuration/UI smoke coverage includes all tool pages, Save/Cancel, navigation, presets, info icons, selection/filter behavior and responsive layouts.
- Two unrelated old private-fixture assertions in the broader full-save suite remain documented in `docs/V21_0_TEAM_CAPS.md`; they are not failures of the portable source suite or new cap tests.

Build outputs and private verification logs are ignored and are not committed to GitHub. Personal settings, uploaded artwork, saves, reports, history and credentials are not part of the installer/source publication. The source checkout contains the app's default bundled artwork and reviewed observation catalogs, not personal userData.
