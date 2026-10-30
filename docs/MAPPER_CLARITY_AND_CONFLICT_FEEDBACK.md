# Equipment Mapper: clearer rules and conflict feedback

Included in v25.5. Existing rules, saved presets, matching, frequency selection and Apply confirmation remain compatible.

## Whole-category selections

Browse Equipment and the rule's item pickers now put **All [Category]** first in each category. Turtlenecks have their own category, separate from other neckwear. The selection shows its item count and an expandable list of included names. That list loads when opened, keeping the main catalog light.

- Select a category as the existing item to replace or remove every supported style and color in that category.
- Select a category as the item to assign, or as the replacement, to spread its items evenly across the matching players. Each player keeps their allocated item across their outfits. Paired category selections stay matched on both sides.
- Only equipment from the selected mods participates. None entries are excluded. Existing removal restrictions still apply; helmets, facemasks, cleats, socks, pants and jersey styles cannot be removed.
- Existing player filters, Only When Wearing, frequency, color and team-brand checks still apply. Categories can also serve as Only When Wearing conditions. Each category selection stays within its chosen equipment slot; use the normal side selector for categories with multiple sides or slots.

Distribution is balanced within the eligible item set before no-op, compatibility and storage outcomes. Different team brands or Keep Current Colors can produce different eligible sets. Final Preview and conflict review show the actual changes, including any proposed outfit fixes; they do not silently substitute the allocated category item.

Existing single-item IDs, exact matching, legacy replacement caps and presets retain their behavior. Category selections use stable IDs; actual catalog members are resolved from the selected mods rather than trusting an item list stored in the preset. Saves contain only real equipment items, never category markers.

Verification: 1,110 portable tests and 52 final focused tests passed, including 13 category tests. Three native copied-save runs assigned, removed and replaced turtlenecks for 83 players each, with exact backups/reopened assignments, untouched visuals and other table data preserved. Packaged UI checks covered the first All entry for every active category, lazy member names, Assign/Remove action switches, category preset round trips, old exact/cap round trips, Cancel, real Preview and conflict review, plus dark/light narrow layouts. Evidence: outputs/mapper-category-selections/final-verification.json.

- Queue and Review show a complete sentence describing the action, whether existing-item colors are included, and the Only When Wearing condition. Preview repeats this sentence; several queued rules collapse into one expandable list.
- Preview counts unique players matching the rules, players to update, and players left unchanged. Outfits, paired sides and overlapping rules do not count the same player twice. A collapsed explanation counts frequency exclusions, players already wearing the requested item, blocking issues, and storage skips. These are full-run counts, independent of search and pagination.
- Known incompatibilities identify the specific issue. Identical messages group into a reason plus player count; individual warnings remain in the report. General operating notes live under Run Notes.
- Warned players carry the Roster Generator’s red asterisk in Cards and Table views. Its title and accessible label give the reason, and it is keyboard focusable. Color stays red independently of the chosen accent.
- Apply confirmation includes up to three distinct reasons, with a reference to other preview conflicts when needed. It still requires explicit Apply Anyway; structural errors still block Apply.

Example: removing the Compression Tee from 327 cutoff-pants players shows “Cutoff pants require an undershirt. (327 players)”. This does not alter the compatibility rule or silently change their pants.

## Conflict review

Known outfit conflicts now open a review window before Apply. **Review Fix** is selected by default. Identical conflicts share a group choice; each player can have an individual exception. Search, team filters and 50-player pages keep large reviews manageable.

- **Review Fix:** keep the requested mapping and show the exact extra outfit changes needed to make it compatible. For example, removing an undershirt from someone wearing cutoff pants proposes replacing their pants with above-knee pants. The preview lists that additional change before anything is written.
- **Skip:** leave the player's equipment unchanged, including their other queued mappings.
- **Apply Anyway:** keep the original requested mapping and its red warning. Final Apply still asks for explicit confirmation.

Fixes use verified items from the selected mods' catalog. Explicitly requested slots stay protected, including assignments that already match the player's current item. If no known fix preserves those requests, Review Fix is unavailable for that player; choose Skip, Apply Anyway, or edit the rule. Unknown structures, shared storage, stale previews and file-safety errors cannot be bypassed with Apply Anyway.

Build Reviewed Preview runs the normal encoding and storage checks again. It does not write the save. Choices can be reopened and changed; rebuilding always starts from the original mapping, so outfit fixes do not accumulate. Settings and preset formats remain unchanged.

Verification: 1,097 portable tests passed, followed by 35 final focused tests. Native tests on copies of DYNASTY-DGA183 fixed all 327 original conflicts, and a mixed run retained 325 fixes, one Apply Anyway and one unchanged skipped player. Exact reopened outfits, unchanged player data and untouched visuals, original save hashes and backup hashes were checked. Separate native guards verified that unfinished review and missing confirmation cannot apply. Packaged renderer checks covered default choices, extra-change disclosure, individual exceptions, pagination/search, Cancel, all-Skip, repeated edits, unavailable fixes and final confirmation. Dark/light layouts at 1500, 760 and 520 pixels stayed contained. Evidence: outputs/mapper-conflict-review/final-verification.json. In-game loading and appearance have not been checked for these new test copies.

Verified 1084 portable tests, final focused reporting tests, native Apply/backup/reopen and confirmation guards, plus real packaged renderer tests against a copied DYNASTY-DGA183. Three real-save before/after core comparisons (removal, safe replacement, half-frequency) preserve all edits, blocked players, warned players, allocations and statistics. Original user save remains unchanged. Evidence: outputs/mapper-conflict-reasons/final-verification.json.
