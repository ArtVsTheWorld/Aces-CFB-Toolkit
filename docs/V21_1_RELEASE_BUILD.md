# v21.1 release verification

Prepared October 20, 2026. App/package version 21.1.0; GitHub tag `v21.1`. Release notes: `docs/RELEASE_NOTES_V21_1.md`. Implementation and location-data limitations: `docs/V21_1_UPDATE.md`.

## Installer/update assets

Matching upload copies are in ignored `dist/v21.1-release/github-release-assets`:

- `Aces-CFB-Toolkit-Setup-21.1.0.exe`: 165,869,771 bytes; SHA-256 `E241CC30945A9437984F3C5ACD42DBD845736C8BD47CF0DECF61AC06F544E661`.
- `Aces-CFB-Toolkit-Setup-21.1.0.exe.blockmap`: 174,621 bytes.
- `latest.yml`: 364 bytes; version 21.1.0 and matching installer SHA-512/size.

The NSIS installer retains the existing app identity/userData and update repository. It remains unsigned. No installer is executed on this computer. Only the tested source, standard release assets and release notes are published; personal settings, uploaded artwork, saves, reports, private test output and credentials are excluded.

## Completed checks

- 661 source tests passed, 0 failed (`outputs/v211-source-tests-final.log`). Earlier failures were stale tests pinned to v21.0, updated for the requested release version without relaxing feature/safety assertions.
- 25 focused geography/player-state/generator checks passed (`outputs/v211-geography-unit.log`).
- Two-team Georgia/Hawaii regional Preview/Apply/backup/reopen and CSV checks passed, including rejection of edited hometown data before backup/write (`outputs/v211-geography-save.log`). The test generated 50 Georgia-origin players on Georgia and 55 Hawaii-origin players on Hawaii, with other origins retained. Seeds vary across fresh previews.
- All four existing app-save / independent multi-team generator regression checks passed (`outputs/v211-roster-regression-save.log`). Input-fixture hashes remain unchanged.
- Development and packaged configuration checks passed, including every tool, Settings, hover/focus/click help, 16x16 SVG icons at Standard/Large/Extra text sizes, presets, no-save guards, modal Save/Cancel, light/dark and narrow layouts (`outputs/v211-ui.log`, `outputs/v211-packaged-configuration.log`).
- Actual packaged renderer/preload/handlers completed an 85-player Preview/Apply/reopen, review/history, presets and roster configuration smoke test with zero renderer errors (`outputs/v211-packaged-roster.log`).
- All 485 packaged source/assets, schemas, commentary map and update-file hashes matched the working source (`scripts/verify-v185-release.mjs`).
- Real NSIS updater detected the newer build, waited for download consent, downloaded and verified this installer from an isolated local feed, and rejected an intentionally wrong checksum. Nothing was installed or restarted (`outputs/v211-installer-update.log`).

## Location fallback

Stock school City assets are frequently external game references rather than stored city rows. Local-state bias uses a readable school City when available; otherwise it uses saved roster home-state and school-pipeline evidence. Reports identify this fallback explicitly. No school-name lookup or invented town/pipeline ID is used.
