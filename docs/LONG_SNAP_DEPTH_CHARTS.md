# Long Snap Fixer: ratings and depth charts

Long Snap Fixer normalizes out-of-range ratings, then orders each team's existing LS depth-chart slots using the resulting Long Snap ratings. Eligible players must be on that team's roster at TE, C, LG or RG. Ties use overall rating, then stable player row order.

- TE ratings retain the existing 45–99 range and distribution centered near 72
- Centers and guards retain the existing 21–75 range and distribution centered near 48
- LT and RT ratings remain unchanged, including values outside the interior-line range
- Already-valid ratings remain unchanged
- Only LS slots are reordered; roster membership, other depth-chart positions, list sizes and unused capacity remain unchanged

Preview shows rating changes and LS additions, moves and removals together by player. An outgoing tackle may appear because it leaves the LS chart; its rating does not change. Runs with only depth-chart changes still enable Apply and create a backup. Cards, Table, full-run search and CSV include the reviewed changes.

The planner preserves manual LS locks and skips shared or unsupported lists, unreadable locks, invalid roster references and teams without enough eligible players. A compact warning counts skipped teams. Unrelated manual position locks are preserved. These guards do not prevent eligible rating normalization.

Apply uses the cached preview, rejects a changed source, checks the depth-chart plan again, creates a backup and writes a separate candidate. The candidate must retain the fixed container size and match every intended table byte after reopening before replacing the source.

Validation covers ranking, tackle preservation, shared/invalid storage, manual locks, preview immutability, native Apply/reopen, exact player rating bits and LS reference bits, untouched other tables/list padding, chart-only repairs and repeat-run idempotence. `scripts/smoke-v190-configuration.cjs --long-snap-depth-only` runs actual read-only native Preview through the UI and checks Cards, Table and full-run search.

This change is included in v24.6. No in-game test of this new depth-chart behavior is recorded yet.
