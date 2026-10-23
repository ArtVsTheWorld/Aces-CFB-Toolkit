# v22.5 — Original EA roster player protection

Player protections now use a bundled identity reference, not the current save’s `IsNIL` flag. NIL Toggle still edits the real flag and has no effect on this reference-based protection.

## Reference and fictional fillers

The owner’s untouched year-one EA dynasty supplies 10,932 real-player identities and 798 fictional fillers. Only players flagged `IsNIL = true` **in that pristine source** enter the real-player set. The flag is extraction evidence, never a runtime identification rule. Sedrick Pittman-Jean is correctly recorded as a fictional filler, not a protected real player.

`src/main/data/originalEaRoster.json` contains asset identities and names, source/content hashes and a format version. It contains no dynasty file, personal settings, logos, ratings, equipment or roster links. `scripts/extract-original-ea-reference.mjs` extracts it read-only from active FBS rosters, rejects ambiguous identities, and checks that the source file remains unchanged. The runtime validates the bundled content hash, counts and unique keys; missing/damaged data fails rather than silently disabling protection.

## Matching

`src/main/services/originalEaPlayers.js` is shared by all existing protected workflows:

- Exact original asset + matching full name: **Original EA Roster Player**.
- Original asset retained with a different name: **Identity Conflict**; conservatively protected, with an explicit reason.
- Known fictional filler asset: **EA Fictional Filler**; not protected, even if its current NIL flag is true.
- Unmatched/missing asset: **Unknown — Not in Reference**; not asserted to be game-generated, and eligible subject to the tool’s other filters.

No row, team, position, class, number, ratings, portrait, name-only or presentation-ID-only fallback is used. Players can transfer and progress without losing recognition. Presentation IDs alone are unsafe: the later example dynasties reuse thousands of original IDs for unrelated generated players. Changing a current NIL flag cannot change identification.

The reference covers the supplied original roster, not every subsequent EA roster update. External editors that erase identities can leave real players unrecognized; external roster replacements that retain an original asset are conservatively flagged as conflicts. Later reference additions require verified clean source data.

## Tool behavior and compatibility

- Equipment Randomizer/Patcher: **Protect Original EA Roster Players** remains checked by default in Player Filters. All correction paths use the same protection, including population plans, shared-visual guards and helmet balancing. Protected players can still supply donor equipment, as before.
- Commentary IDs: original EA identities remain automatically protected. Scoped counts/reasons replace the old NIL exclusions. Analysis signatures include reference provenance.
- Standard Jersey Renumber: the new checked protection control replaces **Allow NIL Jersey Changes**. Individual number locks remain unconditional; team traditions cannot displace protected holders.
- No Duplicates: preserves its prior behavior of being allowed to renumber these players. Its explanatory text now describes original EA players rather than NIL status; individual Player Locks still protect numbers.
- Roster Generator: remains an explicit full-roster replacement, not a protected edit. Its warnings/counts describe original EA players. New fictional identities and the generated false NIL flag remain part of generation.
- Tools without previous NIL-based exclusions retain their existing scope. NIL Toggle continues previewing, backing up and writing only the actual `IsNIL` field.

Old Equipment presets/session defaults migrate the protection checkbox directly. Old Standard Jersey presets invert the former Allow checkbox, preserving intent. New explicit options take precedence over legacy API fields. Imported presets, My Default, navigation and reset use the same migration. No existing preset file is destructively rewritten.

Reviews show reference matches, fictional fillers, unknown identities and conflicts. Equipment/Commentary/Jersey CSVs include identity labels/reasons and reference audits; actual NIL values, where reported, are explicitly separate from identity. Save fingerprints, backups, exact reviewed plans and existing write/rollback guards remain in force.

## Verification

Focused tests cover flag changes in both directions, Sedrick’s filler identity, transfers, changed numbers/classes/ratings, name conflicts, recycled IDs, name collisions, unchanged flags, options and preset polarity. Private-save tests cover all three example dynasties and temporary-copy NIL Toggle → protected equipment/commentary/jersey operations, with backups, exact reopen and original-input hash checks. Development/packaged UI checks cover defaults, Save/Cancel, presets/navigation and responsive layout.
