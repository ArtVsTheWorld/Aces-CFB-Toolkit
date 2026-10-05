# Post-PoC architecture review and Team Boost migration

## Coupling found

The PoC used generic IPC channel names, but main-process execution still directly called `runLongSnap`; the renderer collected Long Snap options and rendered its fields explicitly; report ownership was guessed from a Long Snap filename prefix; the smoke check assumed exactly eight tools; and runners duplicated C27_486_1 opening, UID lookup, table reads, backup orchestration, and CSV path construction. Results had no common shape, and no user-facing execution record existed outside raw JSONL logs.

## Refactoring performed

- `tools/handlers.js` is now the single allowlist mapping available registry IDs to optional `prepare` and required `run` handlers. IPC remains generic (`tools:prepare`, `tools:run`).
- `services/save.js` centralizes manual-save validation, C27_486_1 opening, Unique-ID table access, concurrent table reads, and save-derived team discovery/resolution.
- `ReportService` owns CSV creation, sidecar ownership metadata, and listing without filename assumptions.
- Both migrated runners use the established shared backup service. Neither assumes another tool supports preview or produces the same details.
- The common result envelope is `status`, `mode`, paths, `summary`, compact `historySummary`, `resultKind`, and tool-defined `details`. Shared cards render `summary`; detail renderers remain tool-specific.
- Persistent `HistoryStore` records only run identity, time, tool/version, input, mode/status, compact summary, backup/report paths, and log reference. It stores no save snapshots or table details.
- The dashboard shows four recent executions, and History provides a compact list plus selected-run details.
- White Helmet Fix v2.0 is registered under Player Appearance & Identity as planned and has no execution handler.

## Team Boost CLI audit and GUI mapping

The CLI accepts one manual Dynasty/RTG save, rejects `-AUTOSAVE`, defaults to preview and nonphysical ratings, generates an unsigned 32-bit seed when absent, then loads Player UID 1612938518 and Team UID 3359508968 under C27_486_1. It validates Player fields, builds team names, resolves an exact or unique partial team name, requests minimum adjustment (default 1, −99..99), maximum (default 3, minimum..99), and rating group (nonphysical/all/physical). It applies `patchTeamRatings` to in-memory records, writes the twelve-column CSV in both modes, and only in write mode with effective changes creates a sibling collision-safe backup before saving.

GUI controls are: Active Save context; searchable save-derived team input backed by a datalist; bounded paired number inputs for minimum/maximum; exclusive rating-group dropdown; unsigned 32-bit numeric seed; separate Preview and Back up & Apply buttons. Conditional validation prevents maximum below minimum. The result shows team, players processed/changed, individual changes, net points, fallback profiles, exact mode/range/seed, backup/report paths, and a rating-change table. Negative deltas are visually distinct. No CLI default, random order, clamp, archetype fallback, position label, report column, or apply condition was changed.

The next recommended migration remains Commentary ID Patcher because it reuses the two-table/save/report pipeline while adding the first explicit review-and-decision stage, which is the next meaningful architecture test.
