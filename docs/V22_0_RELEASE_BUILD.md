# v22.0 manual-upload installer

Prepared October 22, 2026. App/package version 22.0.0, displayed as v22.0.

Removed the optional-mod credits paragraph from About only. Required-mod labels, tool help, catalog attribution and third-party source notices remain intact. The About page retains its GitHub source link.

## Upload files

Upload all three files from `dist/v22.0-release/github-release-assets` to the same GitHub release:

- `Aces-CFB-Toolkit-Setup-22.0.0.exe`: 165,893,467 bytes; SHA-256 `2E21B7DC593D337EFD8FEEB932E634706ADF0A0F07F19899CFD0C06DBF033F43`.
- `Aces-CFB-Toolkit-Setup-22.0.0.exe.blockmap`: 174,912 bytes.
- `latest.yml`: 364 bytes, version 22.0.0 with matching installer filename, size and SHA-512.

The installer retains the existing app identity, update repository and per-user settings location. It remains unsigned. No installer was executed, no GitHub release was published, and no files were uploaded. The About correction is included in the follow-up v22.0 source synchronization, with focused and packaged UI regression coverage. Source publication is separate from release-asset publication.

## Verification

- All 42 focused About/icon, UI-contract and updater tests passed, including About credit removal and retained source link. The full 713-test source suite passed during the preceding v22.0 source handoff; this small About-only change was followed by focused and packaged UI verification.
- All 497 packaged source/assets, bundled schemas, commentary map and package metadata matched the working source.
- Installer manifest, file size and SHA-512 verified. Upload copies are byte-identical to the generated originals.
- Packaged renderer/preload/tool-handler smoke passed, including the About page, Equipment Truck configuration, actual Mapper Preview/Apply/backup, presets, responsive controls and roster previews.
- Real NSIS updater downloaded and verified this installer from an isolated loopback feed, rejected an intentionally incorrect checksum and did not execute/install/restart anything. Test settings, cache and saves were isolated from personal data.

The packaged `resources/app.asar` SHA-256 is `ADE59297FFAE1D1BD06D810285BC1CE998683B8DD4480CF346F62FC20593C429`.

Private logs and test artifacts are under ignored `outputs/v220-*`; personal settings, uploaded artwork, saves, reports and credentials are not bundled.
