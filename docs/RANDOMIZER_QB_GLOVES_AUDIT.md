# QB gloves and Quickstart / Randomizer audit — October 29

The two-glove correction and donor-only glove rolls were previously Quickstart-only. Randomizer now skips QB glove pool rolls and checks completed QB outfits after all pool/brand/compatibility work. Two gloves become one on the non-throwing hand. Existing single gloves, bare hands, taped hands, other positions and non-field appearance layers remain unchanged. Original player protections, frozen donor defaults and storage acceptance still apply.

A second cause was brand matching: it searched for a gloved fallback donor even when the chosen QB donor outfit had bare hands. QBs now retain their copied glove presence; the existing brand safety guard can still remove an incompatible glove. Other positions retain their original brand-matching behavior. Quickstart shares this correction and its final glove helper; taped hands are no longer counted as gloves by Quickstart's separate cap.

## Read-only originals, copied-save tests

Two full dynasty fixtures were tested with all three mods, EA protection off, all QB class years, top30 donors and default No Drip settings. Three seeds per fixture produced536 processed QBs per run (3216 player outcomes). No new one-percent Randomizer cap was introduced.

| Fixture | Before: processed QBs wearing gloves | After: processed QBs wearing gloves | Two-glove QBs after |
| --- | --- | --- | --- |
| LSU |109/536 (20.34%) |4/536 (0.75%) |0 |
| ULTIMATEGRIND |52/536 (9.70%) |5/536 (0.93%) |0 |

Both final runs were applied to owned copies, backed up and reopened. Exact reviewed QB appearances were verified. Including all unchanged donor QBs, both reopened copies had5 one-glove QBs out of566 (0.88%), and zero two-glove QBs. Originals remained hash-identical. Other donor choices can naturally produce a different one-glove share; Randomizer deliberately has no automatic one-percent cap.

## Port audit

| Behavior | Outcome |
| --- | --- |
| QB donor-only gloves and final one-glove maximum | Now shared |
| Brand matching adding gloves to bare-handed QBs | Corrected for both tools |
| Taped hands counted as gloves | Corrected in shared detection |
| Sleeve/undershirt/neckwear, cutoff fit and mouthpiece compatibility | Already shared in final Randomizer compatibility checks |
| Non-QB waist playcall restrictions | Already shared, including donor copies |
| OL/DT/K/P pool exclusions, spats, balaclava chance and default item selections | Already shared |
| No Drip defaults and one roll per player | Already shared |
| Top30 donors, EA protection, tracking and frozen donor defaults | Already shared; Randomizer retains explicit donor and protection controls |
| Dynasty-wide1% QB glove cap | Intentionally Quickstart-only |
| Automatic Patcher corrections, tattoos and team tape defaults | Intentionally Quickstart automation; Randomizer remains configurable |
| K/P donor-only entire outfit and default 5% team-color accent | Intentionally Quickstart-only |

Verification artifacts are under outputs/qb-randomizer-*. No published installer was replaced by these tests.
