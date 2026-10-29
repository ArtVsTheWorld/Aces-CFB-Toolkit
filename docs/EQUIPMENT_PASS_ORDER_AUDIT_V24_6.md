# Equipment pass-order audit — v24.6

Reviewed Randomizer, Patcher, Quickstart and Mapper after the October 28 compatibility changes. This is a developer audit; it does not add Quickstart notes or controls.

## Corrected

1. **Patcher checked compatibility too early.** Its full checks preceded Bear’s Pads sleeve changes, Lower Rolled Jersey, Cutoff Pants, accessory recoloring, tattoos and item removal. A final relaxed-tee-only repair missed other new conflicts. Full compatibility now runs once, after all of these passes when Equipment Compatibility is selected. The selected leggings override is retained, while shirt/jersey checks remain active.
2. **Early repairs could unnecessarily destroy gear.** A Longsleeve Undershirt could clear sleeves/wrist/elbow gear before Remove Specific Item(s) removed the shirt itself. Deferring repair preserves gear that is compatible with the final outfit.
3. **Removal can invalidate cutoff pants.** Removing their required undershirt after outfit fitting left an invalid result. Final compatibility honors removal and restores above-knee pants instead of putting the removed undershirt back. This follows the selected Equipment Compatibility pass; an independent removal-only run does not silently enable other passes.
4. **Quickstart’s late color accent could change fit.** RAW colors can reuse different native assets with different restrictions. Accent candidates now retain only colors that introduce no new compatibility issues. Existing accessories are preserved rather than sacrificed for an accent. The selected RAW context is forwarded.
5. **Leg tattoos could defeat the new leggings override.** The tattoo pass normally clears leg layers to show leg tattoos. When the explicit override is enabled and the player has cutoff pants, it now retains the leg layers. Quickstart stays strict.

## Follow-up interactions resolved

The user authorized addressing the remaining interactions on October 28.

- **Recolor and removal:** removal records the original selected element identities before other passes and also matches final selected items. Recoloring or branding cannot evade removal. Identity follows tattoo entries moved into a newly inserted Base layer; no fragile loadout indices are used. Required gear and unsupported slots remain protected
- **Tattoos and cutoff eligibility:** tattoo outcomes are selected once, projected into uniform eligibility, and applied before the cutoff outfit checks. Only an actual selected leg-tattoo outcome can clear a leg layer; cutoff pants never remove leg layers merely to reach a target. The explicit leggings override retains layers on planned/existing cutoff outfits
- **Lower jerseys and existing cutoff pants:** lowering uses the lowest untucked equivalent when the usual tucked replacement would invalidate cutoff pants. Existing pants and compatible shirts stay
- **Mapper overlap and cascading:** frequency selection and matching both use original equipment. A rule cannot manufacture or erase another rule’s source. Different assignments to the same slot on the same player produce a conflict naming the rules and slot, and block Apply. Identical duplicates and disjoint player scopes remain valid. Other slots can still be coordinated in a batch before final compatibility validation

## Deliberate priorities retained

- Explicit removal wins over adding equipment. The tool does not refill removed items and undo the user’s selection
- Protection, existing items, compatibility, limited eligible players and storage skips can keep final counts below a fill target. Apply never rerolls or changes the reviewed plan
- Within one provider, compatible donor equipment is retained and earlier accepted category choices can make a later category ineligible. Category chances remain chances, not guaranteed final prevalence
- Quickstart’s sparse-outfit behavior remains built in, with pool descriptions filtered to the items that survive. No new Quickstart profile notes or controls were introduced

## Confirmed safeguards retained

- Mod providers roll on independent copies of the donor outfit. Randomized arbitration prevents a fixed last-mod winner, claims paired slots together and rejects incompatible combinations
- Generation checks new rolls against existing donor gear in both directions. Shared compatibility cleans the copied outfit; later generated-item checks restore only generated items, never remove donor gear to force a roll
- Unlocked Sock Styles suppresses Mid-Sock Replacement. Tattoos retain the resulting sock style
- Color accents follow team recoloring intentionally, so the small accent is not immediately overwritten. Matching paired gloves/sleeves remain coordinated
- QB glove limits follow donor copying and all pools. Storage skips trigger a cap recheck, because skipped players retain their original gloves
- Non-QB waist-playcall restrictions run after all donor/pool changes
- Equipment None cleanup and capacity fitting occur after all outfit changes. Preview retains only complete accepted player results, and Apply writes that reviewed plan with backup/reopen checks

Regression evidence: `test/equipmentPassInteractions.test.js`, `test/equipmentPassInteractionsSave.test.js`, `test/mapperRuleOverlap.test.js`, `test/equipmentPassOrder.test.js`, `test/armFitAndLegOverride.test.js`, `test/spatsAndElbowDefaults.test.js`, existing arbitration, Mapper, color-accent, tattoo and native Preview/Apply workflows.
