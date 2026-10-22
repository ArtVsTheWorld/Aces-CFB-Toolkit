# v22.0 source handoff

App/package version is 22.0.0, displayed as v22.0. This source update includes the work developed as v21.5 since the published v21.1 baseline. Cumulative draft notes are in RELEASE_NOTES_V22_0.md; implementation details are in V21_5_UPDATE.md.

Only source is pushed by this handoff. No GitHub release, tag or installer assets are created or published. The user will post their own release notes. The latest public installer remains separate from the source version until the user releases an updated installer.

The latest local unpacked test app is `dist/v22.0-test/win-unpacked/Ace's CFB Toolkit.exe`. Close any running Toolkit first and keep the entire win-unpacked folder together. The build uses the existing app identity and settings location; personal settings and uploaded artwork are not bundled.

## Verification

- Clean publication checkout: `npm ci` succeeded and `npm run test:source` passed **713 tests, 0 failed**.
- The local v22.0 unpacked build passed packaged renderer/tool-handler smoke. All **497 packaged source/assets**, the schemas, commentary map and package version matched the working source.
- `resources/app.asar` SHA-256: `381F4F8FA64AF655FEBEC79A087E0FA5342E999EDF188EA7C21FDB5ED38D56D5`.

- The source suite covers the shared equipment safety pipeline, Mapper rules/selection/caps, Play Now checksum handling, Roster Generator family and NIL budgets, Equipment Truck catalog/pools/recolors, and the revised icons/author credits.
- Five Equipment Truck copied-save runs passed: White, Black, Primary and Secondary recolors plus the Truck-enabled Randomizer. Previews were read-only; Apply/reopen matched exactly; backups and nonvisual tables were verified; original GEARTRUCK remained unchanged.
- The earlier Play Now load fix was confirmed in-game by the user, including LSU's generated quarterback. It refreshes the roster checksum instead of weakening validation.
- Packaged UI smoke covers actual Mapper Preview/Apply/backup, reusable mappings, card/table switching, pool Save/Cancel, presets, review/navigation persistence and responsive Equipment Truck controls.
- Gear appearance with Equipment Truck enabled still deserves a manual in-game check. Structural/automated UI verification is not a claim of in-game visual verification.

Publication excludes saves, userData, reports/history, credentials, process scans, local diagnostics, installers and installed dependencies. The maintained source, tests, reviewed item catalogs and default bundled artwork are included. Historical development notes keep their original version labels.
