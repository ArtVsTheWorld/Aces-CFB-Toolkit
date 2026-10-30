# CFB 27 Equipment defaults and app review — October 29, 2026

## Defaults

The pool is named **CFB 27 Equipment** in the application, source cards, previews, reports and current checklist. Saved `vanilla` keys remain stable.

- Arm Sleeves: existing Baggy styles plus Quarter, Half, Long Arm Tape and Short Arm Tape; 20 selected choices at the existing 10% default.
- Wrist Gear: Lite/Max/Normal wrist tape, Large glove tape and Normal wrist bands; 18 choices at 10%. Large glove tape rolls only for DL/OL/LB/TE/FB, including legacy position codes.
- Unlocked cross wrist tape: 3%.
- Unlocked String Towel: enabled at 1%, only for WR/CB/FS/SS.
- Randomizer and Quickstart share fresh defaults. Explicit saved selections, empty lists, zero chances and custom percentages are preserved. Reset to Defaults adopts the fresh values.
- Pool targeting restrictions leave copied donor equipment and deliberate Mapper selections under their existing rules.

## Reproduced issues and fixes

1. Wrist equipment could overlap rubber wrist bands stored in elbow slots. Generation now rejects either addition order; Compatibility preserves the wrist item and clears the overlapping elbow-slot band.
2. Pool masks could invalidate a donor mouthpiece and rely on later removal. Pools now skip an incompatible mask/mouthpiece proposal rather than causing a later correction to remove existing gear. Known unsupported hanging-mouthpiece/guardian-cap helmet combinations are also rejected.
3. Mapper's catalog selection and compatibility checks could disagree about installed Unlocked. Slot checks, semantics, warnings and readable preview labels now use the selected mods. GuardianCap is checked in addition to the historical HelmetAccessory slot.
4. Generic Recolor Accessories was being treated as evidence of Unlocked, potentially interpreting original vintage neck rolls as masks. Generic recoloring no longer supplies that inference; explicit mod selection or an actual Unlocked-specific correction does. Shared Patcher preview labels use the same evidence.
5. Saved per-item roll groups were not honored by every category. Sleeves, elbow gear, facepaint, RAW and GameDay categories now honor their own group chances while retaining fair same-slot provider arbitration.
6. Quickstart could retain pool source-card entries for equipment that later correction/recolor passes removed. Cards/audits now filter against the final accepted on-field outfits. RAW-context names also flow through Quickstart preview changes.
7. Overlapping settings loads could double-count cache bytes. Concurrent fills now replace the previous byte accounting. Clearing the cache also invalidates pending fills so they cannot repopulate discarded results.

Automatic generation skips known conflicts. Mapper retains the previously requested red warning and explicit confirmation override for intentional incompatible mappings; invalid slots and unsupported storage still block Apply.

## Review across all tools

All available tools were exercised in isolated packaged UI checks for settings, modal Save/Cancel preservation and Help. Long Snap Fixer now has a separately verified maintenance screen. The portable suite checks tool validation, targeting, exact preview plans, stale saves, shared visuals and safe application paths. Areas reviewed include:

| Tool | Review focus |
|---|---|
| Jersey Renumber | Standard/no-duplicates modes, promotion settings, protection, exact plans |
| Jersey No Duplicates | Duplicate repair, locks, source/save identity |
| Commentary IDs | Player filters, delayed UI responses, exact reviewed assignments |
| Equipment Randomizer | New defaults, eligible positions, donor freeze, brands, QB gloves, all pool providers |
| Equipment Quickstart | Shared defaults, correction order, recoloring, final source cards, memory/storage skips |
| Equipment Patcher | Compatibility/removal/recolor order, original neck-roll context, full catalog aliases |
| Equipment Mapper | Selected-mod catalog, combinations, pairing, frequency, slot safety and warning confirmation |
| Roster Generator | Existing caliber/physical-rating bounds, appearances, saved team settings and modal flow |
| Team Boost | Position-relevant attributes, grouping, positive/negative display and exact plans |
| Long Snap Fixer | Temporarily paused; run actions blocked while the reported base-game issue is investigated |
| NIL Toggle | Scoped choices and reviewed assignments |
| Dealbreaker Fixer | Values, player protection and UI/filter state |
| Smart Force Win | Game/protection filters, schedule context and exact plans |

## Verification

- Broad portable source suite: 1,066 passed, no failures/skips. Final alias additions are additionally covered by 15 focused tests.
- Packaged UI: all 13 tool settings/Cancel checks and 14 Help sections; pool naming, new defaults, presets, per-item chance groups, and light/dark at 1500/760/520 widths.
- Copied-save tests verify Preview leaves the source unchanged, backup matches the source, Apply/reopen matches the reviewed assignments, untouched records remain unchanged, and the supplied originals retain their hashes.
- Full Quickstart with all mods and original-EA protection off: 11,523 processed players; assertions check final compatibility, allowed positions, surviving source-card entries and no two-glove QBs.
- Additional native Mapper/Patcher spot checks verify queued combinations, the incompatibility-confirmation gate, recolor/compatibility and exact Apply/reopen behavior.

These changes are included in v25.5; the verification observations above record the earlier review builds. Game appearance, load/quit behavior and long-term dynasty progression require in-game review; portable and save-codec checks do not prove rendering behavior.

Evidence: `outputs/equipment-pool-reaudit/review-source-final.log`, `review-final-focused.log`, `ui-defaults-review.log`, `native-defaults-review*.json`, `native-mapper-patcher-review.json`, and `defaults-review-final-verification.json`.
