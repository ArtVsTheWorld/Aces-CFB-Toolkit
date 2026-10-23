# v22.5 manual-upload release

Prepared October 23, 2026. App/package version **22.5.0**, displayed as **v22.5**.
Draft release notes are in `RELEASE_NOTES_V22_5.md` and cover changes since v22.0.

## Manual upload

Upload these three matching files together from
`dist/v22.5-release/github-release-assets`:

- `Aces-CFB-Toolkit-Setup-22.5.0.exe`: 166,056,969 bytes; SHA-256
  `73B48685B067B2B60F778E1198556C7AB84349F127A8E6A55A8F4204E8C78D75`.
- `Aces-CFB-Toolkit-Setup-22.5.0.exe.blockmap`: 175,039 bytes.
- `latest.yml`: 364 bytes; version 22.5.0 and matching installer size/SHA-512.

Suggested release tag: `v22.5`, targeting the v22.5 source commit on `main`.
Suggested title: `Ace's CFB Toolkit v22.5`. Publish as a normal latest release,
not a prerelease, for installed users to receive update prompts.

The source push does not create a tag or GitHub release. No installer assets are
uploaded by this handoff; the owner will publish them manually. No installer is
executed, no existing release is changed, and no update is installed locally.
The existing app identity, update repository and user settings location remain.
The installer is unsigned, so Windows may show a reputation/publisher warning.

## Verification

- The working source and clean publication checkout each pass all 771 portable
  source tests, with zero failures. A fresh lockfile-based `npm ci` succeeds.
- All 510 packaged source files/assets, bundled schemas, commentary map and
  package metadata match the current source. Installer filename, size, SHA-512
  and byte-identical upload copies are verified.
- The actual NSIS updater detects the higher version, waits for download consent,
  downloads and verifies this installer from an isolated loopback feed, rejects
  an intentionally incorrect checksum, and never installs or restarts anything.
- The release build passes packaged configuration checks across every tool,
  Save/Cancel/Reset, presets/navigation, filter semantics, scope summaries,
  caption-owned help, and responsive light/dark layouts, including the native
  schemes, unified team editor, and Smart Force Win alignment follow-ups.
- The native-scheme copied dynasty was confirmed to load in-game by the owner,
  including its regenerated roster and depth chart. New mod gear still deserves
  an in-game visual check with the corresponding mods; automated structural
  checks do not prove every visual combination or mod load order.

Packaged `resources/app.asar` SHA-256:
`BADE18587676C734C0A3A56C4A71EAB63552FFAA87B8F4278F87EE3B60B16B13`.

The public source includes maintained code, tests, reviewed item metadata, native
scheme tuning and the original EA identity reference. It excludes personal app
settings, uploaded artwork, saves, reports/history, credentials, mod payloads,
raw process scans, local diagnostics, installed dependencies and build outputs.
Private verification logs and generated fixtures remain under ignored `outputs`.
