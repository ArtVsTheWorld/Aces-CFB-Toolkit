# v20.5 — team gate and independent talent shares

This follow-up replaces the Keep/pinned-slider interaction in V20_5_ROSTER_PROFILES.md. Caliber, age, potential, schemes and generation algorithms are unchanged.

- Choose at least one team before opening roster configuration, managing presets, or generating a preview. The team picker cannot save an empty selection. An empty team scope no longer supplies all dynasty teams to the talent editor. Backend Preview already rejects empty teams and retains that guard.
- Talent sliders now edit one group at a time without touching any other share. Draft totals may be below or above 100%; the window shows how much to allocate/remove, and Save Settings stays disabled unless the total is exactly 100%. Keep/Unlock controls are removed. Importance costs and the preset's overall target are unchanged.
- Reset Defaults explicitly restores the toolkit's importance/roster-size mix for the currently selected teams, not the last committed custom mix. Saving the reset persists that default; Cancel still preserves the previously saved configuration. The shared modal shell now accepts explicit default overrides for this purpose: hidden inputs can change their DOM defaultValue when assigned, so defaults cannot be inferred from restored hidden inputs.
- Older saved configurations keep their valid talent shares; obsolete pin metadata is discarded. Team-selection mode controls are initialized synchronously after restoring actual selected teams, preventing the asynchronous selection-mode setup from racing immediate preset loads. Existing preset settings and generation safety checks remain intact.

Regression smoke coverage checks no-team disabled controls, required team selection, independent slider edits, over/under-allocation validation, exact-100 save, reset/cancel/save/reopen, reset after leaving and returning, preset reload, responsive windows, and a real copied-save Preview/Apply/reopen/History workflow. Source tests also cover independent editing and allocation validation. No source saves or personal settings are modified.

Pre-change source recovery: `outputs/ui-rollback-h1PDaH` (728 verified files). Restore using `node scripts/ui-snapshot.mjs restore outputs/ui-rollback-h1PDaH`; this first preserves newer work and does not modify user saves/settings.

Unpublished development build: `dist/v20.5-roster-generator-free-shares/win-unpacked/Ace's CFB Toolkit.exe`. Keep its adjacent files/resources. No version bump or publication was requested.

Verified: 594 source tests, five copied-save integration checks, development UI smoke, packaged UI smoke, and desktop/narrow-window screenshot review. The packaged smoke output is `outputs/v205-app-smoke-5sYd0C`; source and packaged logs are `outputs/roster-free-shares-source-final.log` and `outputs/roster-free-shares-packaged.log`. Original saves remain unchanged.
