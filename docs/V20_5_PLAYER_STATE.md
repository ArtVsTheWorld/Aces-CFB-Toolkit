# v20.6 — generated player identity and state

This follow-up supersedes the original Roster Generator notes wherever they say presentation identity or eligibility history remains unchanged. The source update is app 20.6.0 / Roster Generator 1.2. The earlier local verification build below remains archived as 20.5.0; publishing the updated source does not create an installer release.

## Changes

- **Broadcast identity:** independently implements MyDynasty's documented presentation-ID philosophy: allocate unused IDs from 500000 through the Player field's maximum of 1048575, then rebuild the player asset name from the generated name and ID. Reservations include every existing Player and every team generated in the same operation. Surname commentary still uses the Toolkit's verified commentary matcher. The installed MyDynasty recruit editor provided evidence for the ID range and naming convention; its proprietary implementation was not copied.
- **Health:** generated players start uninjured, with cleared injury durations/history flags, zero fatigue, full season health pools, and healthy wear-and-tear values. Healthy wear values are **10**, not zero; the current-year season-ending injury sentinel is **30**. These values were checked against schema defaults and healthy first-year generated players. Injury ratings remain part of the football profile.
- **Eligibility:** consecutive years with the team comes from the same observed football profile as class/redshirt and progression. This preserves observed transfer-like histories rather than assuming every senior has four years at the same school. No Age or birth-date fields are read or written.
- **Geography:** hometown, home state and recruiting pipeline are copied together from an observed player. No city-reference field is invented: the supported Player schema has no `NearestCity` field. Generation now checks the real schema for every allowlisted field before preparing a roster.
- **Captains:** old captain flags/patches are cleared. New captains honor `Team.DesiredTeamCaptains` (normally six), capped at the generated roster size. Selection prioritizes seniority, leadership and OVR, alternates offense/defense where possible, and assigns a first-year captain patch.
- **Handedness:** retains observed position-specific handedness from the selected football package. When a QB receives another QB's arm/glove equipment with opposite handedness, the corresponding left/right categories are mirrored and compatibility checked again. Shoes and other equipment are not mirrored.
- **Recruiting pitches:** Roster Generator and standalone Dealbreaker Fixer now keep `IdealRecruitingPitch` compatible with the final dealbreaker. Standalone Fixer changes the pitch only when it changes the dealbreaker; protected/unchanged players stay untouched. A valid existing pitch is retained. Other choices use observed compatible combinations with a separate deterministic random stream, leaving the existing dealbreaker distribution and None floor unchanged.

## Evidence and safety

The 2026 EA, 2032 generated and 2038 generated examples were inspected read-only. The profile bank retains observed hometown/state/pipeline, handedness, consecutive years and ideal pitch. Pitch combinations are compiled from the two generated cohorts; combinations below either ten observations or one percent of that dealbreaker's observations are excluded as unreliable veteran-state outliers. This is observed compatibility, not a claim to have independently decoded every hidden recruiting rule.

Statistics, awards, roster links and **all depth charts remain untouched**. The app recommends **reordering the depth chart in-game after regeneration**. Captain selection does not rewrite depth charts.

All added fields appear in existing before/after diagnostics; Roster Generator CSV adds `PlayerStateJSON`. Dealbreaker CSV adds old/new ideal pitches and the reason. Dealbreaker review cards/table display the pitch change.

Both tools use the shared candidate writer, reopen verification, source fingerprints and atomic replacement. Dealbreaker Fixer additionally checks every Player bit/string outside its two approved fields. Roster Generator validates all generated state against the exact preview, including fresh IDs and captain selections. Failed verification leaves the original unchanged.

## Verification

- `npm run test:source`: player-state unit coverage plus the complete portable source suite.
- `node --test test/v205RosterGeneratorAppSave.test.js test/dealbreakerWorkflow.test.js`: multi-team exact Apply/reopen, global presentation-ID uniqueness, health defaults, captain counts, unchanged statistics/awards, matched pitches, protected fields, backups, stale plans and injected-interruption rollback. Writes only temporary copies.
- `electron scripts/smoke-v205-roster-generator.cjs`: real renderer/preload/handler Preview/Apply, configuration, History and responsive layouts.

Game validation is still needed for broadcast audio, hometown presentation, captain patches, injury screens and progression after advancing a week. Toolkit reload checks cannot prove every in-game behavior.

### Completed checks

- **618 source tests passed**: `outputs/v205-player-state-source-final.log`.
- **Four copied-save tests passed**: `outputs/v205-player-state-save-tests-final.log` (three Roster Generator tests and standalone Dealbreaker workflow).
- Development and packaged Roster Generator UI/handler tests passed with zero renderer errors: `outputs/v205-player-state-ui.log` and `outputs/v205-player-state-packaged-ui.log`.
- Broader packaged configuration, uniforms, colors, Commentary and responsive checks passed: `outputs/v205-player-state-broader-ui.log`.
- Verified all 476 packaged source/assets plus schemas/commentary, installer manifest and matching upload files: `outputs/v205-player-state-artifact-verification.log`.
- Real isolated updater download/checksum checks passed; no installer was executed: `outputs/v205-player-state-updater.log`.
- All three original example-save SHA-256 hashes still match the catalog source hashes.

Local installer: `dist/v20.5-player-state-release/Aces-CFB-Toolkit-Setup-20.5.0.exe`, SHA-256 `031e506e01ecb0f8b74324f3605b2e36ecaf8cf83b1b4ded2a1a71b4481612d8`. Nothing was installed or published. Keep this build's installer, blockmap and `latest.yml` together; do not mix update assets from earlier v20.5 builds.

A generated LSU copy from the packaged-handler test is available at `outputs/v205-app-smoke-IQ3Qbw/DYNASTY-V205-UI-TEST` for in-game checking. Its original and backup remain intact.

## Rollback

Before these changes, 744 source/resource files were checksum-snapshotted in `outputs/ui-rollback-8gpJja`.

```powershell
node scripts/ui-snapshot.mjs restore outputs/ui-rollback-8gpJja
```

Restore preserves newer source first and does not modify user saves or personal settings. Existing installer build directories remain available.
