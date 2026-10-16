# Ace's CFB Toolkit v20.0

## Changes

- Equipment Randomizer is now v5.5. App/updater version is 20.0.0; the UI displays v20.0.
- Both donor Browse buttons use the same `CFB 27 Saves (*.*)` file filter as Select Save. The donor dialog accepts dynasty and roster files and does not change the active save. The separate text-file picker remains available for commentary maps.
- User Schedule Only displays actual user-controlled team names in the control explanation and Review, including when Home metadata supplies team objects.
- Before building a Smart Force Win preview, users must confirm if any detected user-controlled team is not in Teams to Skip. The warning names only the unprotected user teams and explains that their games may be forced, including losses. Cancel stops before tool execution. User Schedule Only also requires this confirmation when its user teams are unprotected.
- Fully protected user teams do not cause a warning. Clear Existing Force Wins is unchanged because its clearing scope does not use Teams to Skip. Apply continues to use the explicit approval of the generated preview.

No equipment algorithms, save serialization, or matchup-model calculations changed.

## Verification

- 504 source checks passed, including new picker, team-name, partial/multiple-user protection, User Schedule Only, Clear, and canceled-run regressions.
- Real-save Force Win User Schedule Only Preview/Apply/reopen and Patcher facemask override regressions passed (2 tests).
- All-nine-tools development UI smoke passed, including object-valued team metadata and canceled unprotected-user preview.
- Focused donor/mouthpiece UI smoke passed; donor Browse is required to invoke the CFB save dialog with the donor purpose.
- Both UI smoke suites also passed against packaged renderer/preload files. Packaged startup exited successfully; all 431 bundled source/assets, schemas, commentary map, and update-manifest hashes were verified.

Local installer: `dist/v20.0-release/Aces-CFB-Toolkit-Setup-20.0.0.exe`. Portable: `dist/v20.0-release/Ace's CFB Toolkit 20.0.0.exe`. Matching installer/update upload files are in `dist/v20.0-release/github-release-assets`.

## Rollback

The verified pre-change snapshot is `outputs/ui-rollback-NBSZ9L` (650 files). Preserve newer unrelated changes when restoring individual files. No source has been pushed and no GitHub release has been published for this update.
