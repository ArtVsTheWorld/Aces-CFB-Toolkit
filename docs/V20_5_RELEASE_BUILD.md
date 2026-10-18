# v20.5 — body distributions, backstories and release build

Latest data refresh: [2038 observation expansion](V20_5_2038_OBSERVATIONS.md), packaged in `dist/v20.5-2038-expanded-release`. The details below describe the earlier expanded-story build, which is retained unchanged.

## Generation changes

Athleticism weights are Balanced 75%, Speed Focused 6%, Size & Strength 6%, Technical 7%, Freak Athlete 3%, Outlier 1%, Field Savant 1%, Drill Specialist 1%. These are seeded per-player probabilities, not exact quotas for every small roster.

From Nothing draws normal appearances from the lower 30% of observed same-position build sizes; FCS Call-Up uses the lower 45%. Other calibers retain the full range. Athleticism preferences operate within that caliber pool. The build score is height in inches times three plus encoded weight; because the weight encoding differs by a constant, ordering matches actual pounds. Complete observed head/body/portrait/height/weight packages are retained, with no arbitrary resizing.

Outliers choose the smaller or larger 5% tail of their position's allowed observed builds, bypassing the normal caliber size filter so an unusually large player can still appear on an underdog roster. Both directions are equally likely. Outlier does not add a ratings boost. Tone preferences, brand corrections and equipment safety remain active. Body choice, profile choice and outlier direction are revalidated against the exact seeded selection before Apply.

## Backstories

The app includes 565 individually authored, unique two-sentence fictional vignettes: the original 250, 300 additional stories in the requested eleven categories, and 15 college-football easter eggs. The bank combines `backstoryBank.js`, `backstoryExpansion.js` and `backstoryEasterEggs.js`. A readable catalog is `docs/catalogs/roster-backstories.md`.

Stories are assigned after ratings, potential, appearance and finishing fixes, using the finished player's actual class/redshirt, OVR, development, athleticism, size, speed/acceleration, strength, personality and position. Eligibility rules exclude contradictory life-stage, body and talent descriptions. Recruiting stars, college statistics, transfers, injuries and scholarship status are not invented. General family/community/interests stories remain safe for any player. More specific stories require the relevant generated facts.

Field Savant raises Awareness, Play Recognition, Ball Carrier Vision and Pursuit to at least 88 while trading away positional execution. Drill Specialist strengthens positional skills while keeping those mental ratings at or below 55 when ability safety permits. Both prefer observed ability-free packages; if none exist, source physical-ability rating floors take priority. Calibration still targets comparable OVR and does not modify mental-ability slots. Run-First Defense is the sixth defensive option; it favors nose tackles, interior power, run-stopping linebackers and run-support safeties without excluding other archetypes.

A deterministic matching pass maximizes distinct stories within each team without relaxing eligibility. Only unusually repetitive rosters that exhaust all compatible choices may repeat a story. The result is revalidated, and editing a story or its eligibility evidence invalidates the plan. Stories are toolkit metadata, not player-table fields: they persist in previews, saved History reviews and CSV reports, not an unverified in-game biography slot.

Reports add OutlierSize, BackstoryID, BackstoryTitle, BackstoryText and BackstoryJSON, including eligibility evidence. Existing full before/after player/visual fields, talent budgets and equipment donor diagnostics remain.

## Verification and packaging

Completed for the expanded build: 604 source tests; five copied-save integration checks; an additional two-test Run-First Defense save/reload and season-gate rerun; development and packaged UI checks (including the new scheme, preset round trips, History backstories and exact Apply); broader packaged configuration/Commentary checks; package/resource/hash verification; and a real isolated updater download/checksum test. Original saves are unchanged. An earlier pre-expansion build also passed an all-138-team / 11,730-player no-write Preview with all OVR targets reached; that full-dynasty run was not repeated for this story expansion. New rosters still need in-game testing.

Prior expanded-story release directory: `dist/v20.5-expanded-stories-release`. The earlier `dist/v20.5-release` build is retained unchanged. The three verified upload files are under `github-release-assets`; release notes are `docs/RELEASE_NOTES_V20_5.md`. The unsigned NSIS installer retains the existing per-user installer and update configuration. Version remains 20.5.0; no source or release was published.

Rollback before this expansion: `outputs/ui-rollback-HOJda1` (735 verified files). `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-HOJda1` first preserves newer source and never touches user saves/settings. The earlier pre-story rollback is still `outputs/ui-rollback-LCY8Pc`.

Installer: `Aces-CFB-Toolkit-Setup-20.5.0.exe` (163,112,775 bytes), SHA-256 `01147c5d0558ba535d272ec52811472e266d2a468cce05862200147ded9cde58`. Verified 470 packaged source/assets plus schemas and commentary data. The installer is unsigned (Windows may show a reputation warning). Installer, blockmap and `latest.yml` are matched upload copies; do not mix them with the earlier build’s update files.
