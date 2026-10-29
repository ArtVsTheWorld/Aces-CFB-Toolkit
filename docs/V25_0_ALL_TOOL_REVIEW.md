# v25.0 all-tool performance and explanation review

This pass covers all 13 executable tool variants. It supplements the earlier v25.0 equipment first-visit and repeat-visit work. Version remains 25.0.0; this is an unpublished review build.

## Loading review

Settings need player names and filter choices, not every rating and appearance field. A shared `PLAYER_PICKER_FIELDS` allowlist now supplies those settings reads. Each tool adds fields it actually needs. Preview and Apply continue reading their complete inputs independently.

The controlled read-only LSU comparison uses two preparations per tool, the same bundled schema, and a clean private tracking file. Commentary measures its initial filter catalog rather than the separate Analyze action. Mapper enables all three mods. Force Win uses the Week 0 fixture. The complete prepared data is deeply equal for **all 13 variants**, excluding Mapper's intentionally unique session token.

The timings below are the second sample from each run, rounded to milliseconds. Two samples are evidence of the targeted improvement, not a broad hardware benchmark or a claim about total Preview/Apply times.

| Tool | Settings change / review outcome | Before → after |
| --- | --- | --- |
| Jersey Renumber | Read identity/filter fields for setup; retain full numbering inputs for runs | 1,005 → 466 ms |
| Jersey No Duplicates | Same settings optimization; independent numbering engine retained | 1,011 → 447 ms |
| Commentary IDs | Initial filters use a narrow player read; Analyze still reads its full matching inputs | 1,057 → 451 ms |
| Equipment Randomizer | Already uses narrow settings reads; retains every usable donor in the chooser | No new speed claim |
| Equipment Quickstart | Earlier top-30 donor/settings optimization retained | No new speed claim |
| Equipment Patcher | Earlier narrow settings read/cache retained | No new speed claim |
| Equipment Mapper | Narrow player fields; keep complete outfit validation and detached target session | 1,653 → 1,081 ms |
| Roster Generator | Narrow settings player read; full model/generation/appearance reads retained | 1,043 → 513 ms |
| Team Boost | Read identity plus supported rating fields, rather than all player fields | 1,085 → 565 ms |
| Long Snap Fixer | No heavy tool prepare path; existing home metadata reuse retained | No new speed claim |
| NIL Toggle | Read player scope/identity and NIL flag for setup | 1,013 → 441 ms |
| Dealbreaker Fixer | Read scope/dealbreaker fields for setup; avoid unused appearance reads | 1,136 → 461 ms |
| Smart Force Win | Settings already read team/season tables without a full player model | No new speed claim |

Evidence: `outputs/v250-all-tools-{before,after,comparison}.json` and `v250-all-tools-benchmark.mjs`. The source save hashes are checked before and after preparation. Unchanged paths vary between samples; their fluctuations are not counted as gains.

## Preview and Apply review

- Shared CSV writing no longer copies the full report row array just to prepend headings. A bounded per-report cache avoids repeatedly escaping short identical cells. Chunked writes, quoting, Unicode, temporary-file cleanup and final rename are retained. This applies to reports produced by every tool in both run stages.
- A five-pair synthetic 200,000-row / 20-column report comparison produced byte-identical 42,977,971-byte files. Median writing time fell from about **481 to 321 ms**. This is report-writing time, not a 33% reduction in whole runs. See `outputs/v250-csv-benchmark.json`.
- Commentary matching reuses repeated first/surname lookups within one analysis. First names retain their stricter rules; returned results are independent objects. There is no cross-save or persistent name-result cache.
- Mapper rules build their team, position and player-membership sets once per expanded rule instead of repeatedly rebuilding numeric player lists for every candidate.
- Number assignment, rating generation, force-win evaluation, depth-chart ordering and equipment storage algorithms retain their existing safety behavior. No fresh-read, backup, stale-preview, structural validation or reopen check was removed to obtain a speed gain.

Native copied-save verification covers Preview, Apply, backup and exact reopening across every tool variant. Originals remain read-only. The East Point appearance regression now seeds the reported tattoo layer on its owned copy, so the user's evolving live fixture cannot silently remove the condition being tested. Older native assertions were brought up to date with the existing original-EA identity protection, None-placeholder compaction and built-in jersey-tradition priority.

## Explanation review

Every tool has a short explanation, examples and relevant exceptions in searchable Help. Longer settings introductions and tooltips now explain the outcome in ordinary terms. Examples include Keep Current Colors, donor versus pool gear, separate mixing chances, probability versus Fill to Frequency, positive/negative boosts, roster talent shares, weekly force-win limits, numbering promotions and player filters.

Help starts with one open introduction and collapsed tool topics. Search and the Tool filter open matching topics, and clearing them restores the initial view. Existing warning visibility, detailed reports and advanced controls remain available. The new help also explains presets, import/export and Save as My Default without describing save-file internals.

Real packaged UI checks visit all 13 variants, open and cancel their available settings, preserve controls, test the Help search/filter, and verify Patcher tattoo defaults. Separate tests cover the full Mapper flow and multi-team roster editing, including narrow windows and both themes.

## Requested behavior changes

- Individual **Save Team Settings** keeps the team draft and returns to the team list. **Save All Team Settings** commits the complete window and closes it. Cancel still discards the window's drafts.
- Pool additions cannot give OL, DT, K or P balaclavas, turtlenecks, string towels or gloves. Taped hands remain allowed for OL/DT, but not K/P. These are pool-only rules: donor copies and deliberate Mapper operations retain their existing behavior.
- Wrist Brace Support Black remains in the catalog but is not selected in default pools. The default filter also excludes any future color variants. Existing pool catalogs did not offer this item, so no new pool category was added.
- Tattoos default to **30% with Fill to Frequency on** in Patcher and Quickstart. Explicit saved Patcher percentages and Fill choices are retained. The Patcher pass still requires selection; Quickstart adds tattoos only when Unlocked is enabled.

## Verification

- Portable source suite: **1,019 passed**, no failures or skips.
- Native copied-save suite: **18 passed**, no failures or skips.
- Focused final Help/defaults/compatibility checks: **40 passed**.
- Packaged all-tool Help/settings, Mapper and roster configuration UI checks are recorded in `outputs/v250-*-ui.log` and their corresponding empty `.err` files.
- Review package source/schema/map hashes match; earlier archive and installer hashes are checked by `outputs/verify-ui-review.mjs`.

Review executable: `dist/v25.0-all-tools-review/win-unpacked/Ace's CFB Toolkit.exe`. No source push or installer publication is part of this request. In-game visual/quit-and-reload testing remains outside the automated checks.
