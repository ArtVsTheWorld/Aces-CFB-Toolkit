# v21.0 local test build

App/package: **21.0 / 21.0.0**. Nothing was published to GitHub.

## Artifacts

- Portable: `dist/v21.0-test/Ace's CFB Toolkit 21.0.0.exe`
- Unpacked: `dist/v21.0-test/win-unpacked/Ace's CFB Toolkit.exe` (keep the entire folder).
- Portable SHA-256: `8663AE9B1E9D851DE0D342E710D6D616BF5E843D30EF5B8C93635BDF647A3223`

## Verification

- Per-team cap follow-up: `test/equipmentTeamPopulationCaps.test.js` (9 focused checks), copied-save Preview/Apply/reopen and CSV audit in `outputs/v210-team-caps-save-final.log`, and packaged UI/configuration checks in `outputs/v210-team-caps-packaged-ui-final.log` passed. See `docs/V21_0_TEAM_CAPS.md` for behavior and regression coverage.
- Source suite passed 655/655 before the final whole-percentage precision fix (`outputs/v210-team-caps-source-final.log`); all 46 focused population/tattoo/uniform tests and the copied-save workflow passed again after that fix. The full private-fixture suite passed 764/766; the two unrelated legacy assertions are documented in `docs/V21_0_TEAM_CAPS.md`.
- Portable/unpacked refreshed with the team-level changes: `outputs/v210-team-caps-build-final.log`. All 484 packaged source files match the current source byte-for-byte; package version remains 21.0.0.
- 647 source tests passed after follow-up fixes: `outputs/v210-followup-tests-final.log`.
- Updated packaged configuration and lazy-selection checks: `outputs/v210-followup-packaged-config.log`.
- Updated packaged copied-save Preview/Apply/reopen: `outputs/v210-followup-packaged-apply.log`.
- Final focused UI/source checks passed: `outputs/v210-final-ui-source.log`.
- Development configuration checks: `outputs/v210-help-ui.log`.
- Actual packaged renderer/preload configuration checks: `outputs/v210-packaged-configuration.log`.
- Packaged Roster Generator Preview/Apply/reopen on an isolated copied save: `outputs/v210-packaged-ui.log`. No original dynasty was overwritten.
- Configuration coverage includes all main tools, personal settings, hover/focus/click help, Escape, modal Save/Cancel/defaults, selection semantics, presets, navigation, no-save guards, and light/dark/narrow layouts.
- All 484 packaged source files were byte-hash matched to current `src/`; package version is 21.0.0. Engine schemas and commentary data are present. The archive excludes outputs, reports, private saves, tests and docs.

Irish Jamo defaults to a 0% chance in both normalized configuration and the legacy generation entry point. Explicit saved custom choices are preserved. The cross wrist item is sourced from repeated live ItemInfo records; no extra color variants are inferred. Its visual fit still needs an in-game check.

Before changes, source and package metadata were copied to ignored local
`outputs/v210-source-rollback-20261020-041748`. This snapshot is not packaged.
