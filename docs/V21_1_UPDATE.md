# v21.1 — regional roster origins and stable help icons

App/package version: 21.1.0. Requested GitHub tag: `v21.1`.

## Hometown generation

`rosterGenerator/geography.js` follows each selected school's `SchoolPipelineInfluenceList` to its `SchoolPipelineInfluence` records and uses the saved positive `InfluenceValue` weights. It follows local City records, or an asset-table mapping when present, to State/CITY_STATE. Stock City references often point to external game assets not embedded in the dynasty. When that data cannot be read, the local-state bias is explicitly inferred from active-roster home-state frequencies and the school's pipeline footprint. School names never guess location. The source/fallback, original City reference, roster evidence and actual pipeline weights are retained in diagnostics.

Observed hometown/state/HomePipeline tuples are selected independently of football ratings, archetypes, class and potential. Default allocations are 40% local state, 35% weighted school pipelines, 15% bordering states and 10% national. Integer quotas are shuffled by the existing preview seed. Unavailable regional pools are omitted and the remaining allocation is normalized. The national pool prefers outside the local/neighbor/pipeline footprint when possible. These are recruiting preferences, not a requirement that every player be local. Hawaii/Alaska do not invent neighboring states.

Missing pipeline references, missing City data, missing regional hometown observations and old direct generator callers retain safe fallbacks. No new towns, states or pipeline IDs are invented. Town/state/pipeline packages stay together. Health, handedness, progression, talent, names, backstories and all other generator behavior remain separate. The seed deterministically recomputes hometown selection during validation; Apply re-reads the school's evidence and refuses stale or edited geography/assignments before backup or mutation.

Team summaries carry actual origin counts and allocation evidence. CSV GeographyJSON records per-player source and observed hometown tuple, plus each team's geography evidence. Existing PlayerStateJSON continues to record the written hometown/state/pipeline fields. Individual player review already labels those fields Hometown, Home State and Home Pipeline.

## Info icons

All shared help buttons use a 16px inline SVG rather than a font glyph inside a CSS border. Explicit equal min/max dimensions, fixed flex basis, no inherited padding and an aria-hidden, non-interactive SVG prevent stretched circles, font-dependent shapes and accidental checkbox changes. Existing focus/hover/click help, accessible labels, tooltips and Escape behavior remain. Team-selector labels retain their binding/selection behavior while aligning the adjacent help button.

## Verification

- Focused tests cover direct/local and external City references; actual saved pipeline lists/weights; ambiguous custom school names; missing-data fallbacks; complete observed tuples; deterministic seeded assignment; nearby/national diversity; and changed pipeline weights.
- A copied two-team Georgia/Hawaii dynasty Preview/Apply/backup/reopen test checks regional distributions and exact saved hometown fields, CSV diagnostics, original-file hashes and rejection of an edited hometown before any backup/write.
- UI smoke checks measure 16x16 SVG icons across every tool and Settings at Standard/Large/Extra text sizes, plus existing modal, tooltip, keyboard, preset, responsive and Save/Cancel coverage.

No original user dynasty is overwritten during testing. The local fallback is evidence-based, not proof of a school's geographic location when its City asset is external.
