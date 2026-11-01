# Roster Generator appearance blockers (v25.6 work)

## Current behavior: complete appearance replacement

Roster Generator now creates a clean appearance from the selected verified generated-player template. It does not carry the old player's appearance layers or root metadata into the new identity. Unknown custom heads, tattoos, extra layers and metadata inside a readable player-appearance JSON object therefore no longer block regeneration. The original appearance remains in the backup and BeforeRawData report column; the existing appearance audit records the complete reset.

Unreadable/non-player JSON, shared appearance references, invalid roster links, stale previews, field validation and fixed save-storage limits still retain their normal checks. This policy applies only when generating replacement players. Equipment-only tools continue to preserve personal appearance data.

Equipment generation now follows Quickstart with every equipment mod unchecked: top-30 frozen source donors, the CFB 27 Equipment pool and its defaults, No Drip, donor facepaint plus the normal CFB facepaint chance, standard helmet/visor/pants/rolled-jersey/compatibility corrections, the softer sleeve preference, and QB glove safeguards. Mod pools remain off, and specialists retain donor-only generation. Existing donor equipment follows Quickstart's copying policy; unchecking mods does not remove modded gear already present on donors. Source donors are snapshots: they are not edited while constructing new rosters. A source donor selected for roster regeneration still becomes a new person at Apply, like every other selected player.

Quickstart and Roster Generator share the finishing implementation and settings. Roster generation intentionally ignores completed-player memory and source-donor recipient exclusions because all its recipients are newly generated identities. Glove caps apply to the generated roster population; small QB rooms can have a zero-glove allowance. Position, appearance, rating, team and preset controls remain unchanged.

Verification includes complete-reset tests for unknown and malformed layer shapes, retained shared-row protections, and unchanged generated identity/rating choices. Native testing injects an unknown custom face in an owned save copy, regenerates four teams, then verifies exact backed-up Apply/reopen and untouched protected data. Seeded before/after comparisons confirm ordinary Quickstart no-mod and all-mod assignments/previews are unchanged by the shared-code refactor. In-game appearance and game/hub/manual-save behavior still require checking the supplied generated test save.

## Earlier diagnostics and bounded-recognition work (historical)

The sections below describe the earlier v25.6 reviews, before complete replacement became the default. The strict recognition helper remains available for inspection, but Roster Generator no longer requires the old layers to pass that helper before discarding them.

Roster Generator supports the preseason immediately before Week 0 in an existing dynasty. An additional-appearance-layers warning comes from player appearance data, independently of dynasty age or season validation.

Known vanilla and catalogued Unlocked tattoos in verified Base tattoo slots are already supported. Unknown custom assets, unsupported slots, unrecognized item/layer metadata or another appearance-layer type can still block safe regeneration. Clearing tattoos may help an unrecognized tattoo, but will not necessarily remove unsupported layer metadata. Do not bypass the guard without examining the affected data.

The previous blocker carried only a player row and reason, while the app expected a player name. Blockers now include original name, jersey number, original position and visual row. Needs Attention identifies the original player rather than the proposed fictional replacement. Older cached previews fall back to their old-player row information, then a row number if no identity is available. Shared-appearance blockers receive the same identity context. HTML report warnings identify the player too.

Unknown layer details record the loadout index, type/category, extra layer fields and unsupported item slot/asset/field names. These appear in existing CSV diagnostics and the player's AppearanceAuditJSON. No preset/report-column schema changes are required. The initial diagnostics update preserved all appearance writes and generation decisions; unsupported data still blocks Apply.

Verification: 112 focused tests, including seven diagnostic cases, known Unlocked tattoo regressions, old-preview fallbacks, escaping, jersey 0 and original/generated identity distinctions. Complete seeded generation matches v25.5 byte-for-byte for a valid roster; all proposed fields/raw appearance bytes and block decisions also match for an unsupported-layer case. Packaged Electron exercised the actual Roster Generator Preview response flow with a synthetic unsupported-layer result and native read-only preparation; named warning and disabled Apply were checked at desktop/narrow widths in dark/light themes. Two prior saves totaling 24,308 players had no unsupported layers and stayed unchanged. That initial verification predated receipt of the affected save.

## Confirmed edited-appearance case

The affected dynasty is in preseason 2031. Its controlled Air Force roster reproduced the warning for its #7 quarterback. The old implementation rejected his empty Head loadout and the instance tag attached to a known tattoo. An all-roster scan found 26 affected players: 11 empty Head layers, 15 generic PlusHead layers, and three players with tagged Base tattoos. Clearing tattoos alone left every affected player blocked because the Head layers remained. The save does not establish which earlier operation originally wrote those layers.

Regeneration now supports those limited shapes:

- A Head layer must have both Head type/category and no extra layer fields. It may be empty, or contain one generic PlusHead item. Only the observed generic-head naming format is accepted; an optional instance tag must match the asset. Blend/transform arrays may contain only empty object placeholders. Custom/unique heads, other slots, duplicate elements, unknown fields, or meaningful transform/blend data remain blocked.
- A known Base tattoo may include its matching instance tag. A None tattoo may retain an old known tattoo tag left by clearing. Regeneration resets the asset and its tag together to the correct None value. Unknown tattoo assets/metadata retain the existing safeguards.

Supported old Head overrides are removed as part of replacing that player, so they cannot override the newly selected generic face. This removal appears in the existing appearance audit. Other layers and top-level metadata retain the existing policy. Equipment tools are unchanged; users do not need to clear tattoos before regeneration.

Verification includes a genuine before-fix Air Force Preview, the full source-save scan before/after, exact backed-up generation/Apply/reopen on a separate copy for four teams (340 players), and a genuine packaged Air Force Preview with zero blockers and Apply enabled. Every changed player field and appearance matched the reviewed preview, protected data/untouched visual contents were preserved, and the original download stayed unchanged. In-game head/body rendering, game-to-hub return, and manual save/reload remain checks for the supplied test copy; codec/renderer tests do not prove those outcomes.
