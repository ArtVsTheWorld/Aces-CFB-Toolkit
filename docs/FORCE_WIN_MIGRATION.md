# Automatic Force Win v3.0 migration audit (Ace's CFB Toolkit v0.6.0)

The Electron handler preserves the CLI's season-context validation, regular/next/specific-week scopes, Week 0 and active-week guards, existing-assignment protections, postseason/championship protections, user skip list, FCS override, involvement levels, model profiles, arbitrary deterministic seed support, rankings/ratings/coaching/depth-chart/rivalry/neutral-site inputs, rule precedence, and clear scopes (remaining, week, exact team).

The migrated core modules are copied without algorithm changes and have source-parity tests against all 15 original Force Win modules. The adapter uses the shared C27_486_1 reader for SeasonInfo, SeasonGame, Team, Coach, Rivalry, ScheduleNeutralStadium, Player, DepthChart, and DepthChartPlayers.

Preview evaluates the original core against in-memory records, writes the original full CSV report, caches exact SeasonGame ForceWin assignments in the main process, and does not save or create a backup. Apply validates the save fingerprint and each previewed old value, creates the original adjacent dated backup before saving, writes only the cached assignments, and emits the original write-mode report.

The GUI exposes evaluation and clearing as one Automatic Force Win tool. CLI compact/expanded console rendering is represented by the searchable GUI preview and is not a separate persistence or algorithm option; report content remains the original full format.
