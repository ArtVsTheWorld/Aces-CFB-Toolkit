# v20.7 — roster configuration, appearance and depth charts

App/package version 20.7.0; Roster Generator remains 1.2. No GitHub publication is included in this implementation task.

## Changes and evidence

**Appearance blocker.** Read-only inspection of `DYNASTY-OCT18-08h25m01-AUTOSAVE` found 85 Jackson State players with a Base loadout containing only four tattoo slots. Earlier code accepted only an empty Base placeholder and therefore rejected this legitimate structure. The adapter now recognizes only the four arm/leg tattoo slots with the expected asset families and keys, resets those slots to their known None values for a new identity, and continues blocking unknown layers/properties. It does not discard arbitrary appearance data or bypass shared-row safety.

**Names.** The authorized 2032/2038 samples now compile anonymous surname frequency pools by observed head-tone group: 1–3, 4, and 5–8. Names are weighted by their observed frequency within the group. Abanikanda and Kamalu were observed only in the darker group in these samples, and are no longer available in the lighter group. First names still come from the selected head's observed first-name pool. These are fictional sample associations, not racial labels or assertions about real people. The catalog contains no newly paired full identities or private save blobs. Name-pool lookup and weighted draws are cached for large rosters.

**Tone preferences.** HB/CB tone 5–7 weights total 95% for Standard and 85% for Big Sky. HBCU's existing distributions, including its K/P exception, remain unchanged. Selection respects available observed builds; small teams retain seeded randomness.

**Position strength.** The editor uses the exact shared `RosterTalent.targets` projection used by generation. It shows group OVR targets and meters beside editable whole-number talent shares. Saving still requires 100%; the arithmetic roster-average target remains unchanged. Valid profile/rating bounds can cause small differences in the actual generated group means. All-Time Team now targets 81 (80–82 acceptable mean range).

**Team-specific settings.** Shared controls remain the default. Customize Teams opens one draft window with a team selector and four section tabs, not nested dialogs. Each team can inherit or override the complete settings set. Switching teams retains drafts; Save commits the batch, Cancel discards it, and Use Shared Settings removes the current override. Overrides are stored as named-team JSON in the existing preset controls. Backend resolution validates selected team names/allowed keys, caches each team's normalized configuration in the exact preview plan, and validates that same configuration on Apply. Preview/CSV summaries retain each team's actual caliber and settings.

## Depth charts

Reorder Depth Chart is on by default and configurable globally/per team. It follows each selected Team's existing DepthChart reference, then its existing Player[] lists. Natural positions take priority for ordinary slots; returners, long snappers, power/third-down backs and rush packages use appropriate ratings. Existing list lengths, array headers, player rows, roster links, and chart references are preserved. No new records are allocated. Statistics and awards remain untouched.

Charts with manual LockedEntries are kept unchanged, as are shared arrays/charts, unknown roles, invalid references, or off-roster existing entries. The preview explains these outcomes. Unknown structures are never guessed. The optional reorder is not a replacement for the game's full hidden auto-depth evaluation; review the resulting chart in-game.

Depth plans are recomputed and compared on Apply. Every changed reference is checked against its old value. Byte-level expected buffers permit only the planned 32-bit Player references to change and verify all other array rows/metadata. Shared candidate writing then reopens and checks the result before atomic replacement, while keeping backups and packed-container safety. CSV `DepthChartJSON` records all slot rankings and exact reference changes.

## Update prompts

The main process now requests renderer consent using a single-use request scoped to the originating live WebContents. Wrong-window, malformed and repeated replies cannot authorize installation. Window close/reload cancels consent. The themed modal waits behind existing configuration dialogs and defaults to Later. Restart warnings still cover unsaved settings and unapplied previews. Download/install require explicit approval; existing busy-operation checks and updater checksum verification remain active. No native MessageBox is used for update consent.

## Testing / rollback

Source and focused tests cover name pools, tone weights, group targets, team overrides, known/unknown Base layers, update consent scope, depth ranking, locked/shared/unknown/off-roster charts and exact reference-bit guards. Production tests use temporary copies for multi-team Preview/Apply/reload and the supplied Jackson State save. UI tests exercise update prompt queuing, live targets, team drafts/tabs, Save/Cancel, preset compatibility, review/history and responsive layouts.

Working-copy diagnostic: `outputs/v207-save-validation-SHoOwA/DYNASTY-V207-JACKSON-STATE` regenerated 85 players at mean 69, with 95 depth entries reordered. The source and its new backup match the original hash. This copy has not yet been verified in-game.

Completed checks: 627 source tests passed (`outputs/v207-source-tests-final.log`); 29 focused updater/roster safety tests passed; all three existing Roster Generator application-save tests passed; the new independent two-team production Apply/reload test passed. Development and packaged renderer/preload/handler checks passed with zero renderer errors, including the new v20.7 interactions. Broader packaged configuration, uniform, color, Commentary and responsive checks passed. Installer contents/update manifests and the isolated real updater download/checksum checks passed. All example-save input hashes remain unchanged. These checks do not substitute for in-game testing.

Local installer/update files are in `dist/v20.7-release/github-release-assets`: the 20.7.0 Setup EXE, its blockmap and matching `latest.yml`. Nothing was published to GitHub or installed on this system.

Before v20.7, 753 files were verified in `outputs/ui-rollback-arDyzc`. Restore with `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-arDyzc`; this first preserves newer source and does not modify personal settings or user saves. The v20.6 installer remains in its original directory.
