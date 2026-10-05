# Commentary ID Patcher v1.6 migration audit

## Preserved CLI workflow

The original entry point accepts one manual Dynasty/RTG save and rejects `-AUTOSAVE`; selects preview or write; configures phonetic last-name matching (default off), exact first-name fallback (on), preserve-unmatched (off), and True Freshmen only (off); accepts a custom map and positive Player/Team table Unique IDs; loads C27_486_1; validates Player UID 1612938518 and Team UID 3359508968 by their required fields; builds explicit and row-fallback team mappings; and runs the unchanged matcher/patcher. NIL players, TeamIndex 255 entries, Omar Omar QB placeholders, and out-of-scope freshmen are skipped exactly as before.

Matching order remains exact last name, suffix-stripped last name, optional conservative phonetic last name, optional exact first name, then no match. The phonetic key, spelling equivalences, edit-distance ranking, map order tie-break, commentary IDs, and no-match ID 0 behavior are unchanged. The bundled map contains the same 6,103 entries and legacy custom-map syntax remains accepted.

The CLI only asks for per-player approval when a proposed change used phonetic matching. Exact, suffix, first-name, unmatched-to-zero, and preserve-unmatched outcomes are automatic. The GUI exposes precisely that distinction: every proposal is visible, but only phonetic change rows have decisions. They begin unresolved because the CLI confirmation default is No. Apply and completed Preview are blocked until all are explicitly accepted or rejected. Bulk Accept/Reject and Reset only affect those same phonetic rows and introduce no matching rule.

## Electron flow

1. Configure and Analyze through generic `tools:prepare`. The backend revalidates paths, UIDs, map contents, tables, and record fields.
2. Review a searchable table containing team, player, current ID, proposed ID/name, method/source, and decision. “Show all” mirrors CLI `--all` visibility without changing the always-complete CSV.
3. Complete Preview or Apply through generic `tools:run`. The backend recalculates from disk and compares a SHA-256 analysis signature covering save path, settings, and every proposal. Changed inputs require re-analysis. Rejected phonetic rows are restored to their old ID and marked unapproved exactly like the CLI interactive rejection branch.

Preview never calls `franchise.save()` and creates no backup. Apply creates the established sibling `-BACKUP-MMDDYY[-N]` copy before assigning approved changes and saving. Both modes generate the original nine-column report (`Row, Team, Player, OldID, NewID, Method, Source, MatchedName, Approved`) for every scanned player. Completed runs use the existing logger, report metadata, generic summaries, and Execution History.

Unsaved review protection is intentionally local: once a user changes a phonetic decision, changing Active Save, leaving Commentary ID Patcher, or starting a new analysis requires confirmation. It does not introduce global form-state machinery.

## Compatibility findings

No calculation or matcher discrepancy was found. A bundled real save produced 11,730 scanned players, 98.7% map coverage, and 102 proposed changes in both implementations. The GUI CSV and CLI CSV were byte-for-byte identical for the same options. A controlled map produced four phonetic proposals; unresolved execution was blocked and explicit rejection preserved all four current IDs. Disposable apply verification proved the backup matched the original input bytes and the saved output changed.

The only intentional interaction difference is that GUI phonetic decisions are collected in one review table instead of sequential terminal confirmations. Their defaults and resulting record/report behavior are the same.
