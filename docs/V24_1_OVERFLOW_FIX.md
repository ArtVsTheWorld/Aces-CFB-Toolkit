# Equipment continuation storage

Some native dynasty appearances use a main compressed block followed by two or
more linked continuation blocks. Those blocks can be non-adjacent in the fixed
CharacterVisuals pool. The dependency's reader assembles only the first two
blocks, and the former final verification rejected a continuation with another
link. This could reject Apply even when the selected equipment changes were on
unrelated players.

The equipment reader now assembles the complete linked frame. The fixed-pool
writer reserves all needed continuation rows, reuses exclusive prefixes, detaches
shared tails without changing their other owners, and releases all exclusive
continuations when a loadout shrinks. Continuation bytes are never treated as
another player's appearance.

Apply still writes a temporary candidate, reopens it, compares every planned and
untouched appearance, checks other tables and fixed storage metadata, and only
then replaces the active file. References to foreign tables, missing/free rows,
player loadouts or cycles are rejected. New shared tails are rejected. The pool
and outer save are never expanded, and failed verification preserves the source.

Regression coverage includes an anonymous native three-block frame, real
save/reopen tests for unrelated edits, multi-block growth/shrink and shared-tail
copy-on-write, plus portable tests for truncation, cycles, bad targets and newly
shared storage. Test saves and player/save identities are not included in the
fixture.

## Quickstart quarterback gloves

Randomizer and Quickstart now default to the top 30 eligible donors at each
position. Randomizer retains explicit donor counts, selected-player mode and
saved presets. Quickstart's generation, preview metadata, report and help text
use the same count.

Quickstart excludes QBs from additional mod-pool glove rolls. Their gloves come
from donor equipment; other mod categories and the Randomizer's glove controls
remain available. This is an internal Quickstart rule, with no extra controls.

Quickstart performs a final QB glove check after donor/mod additions, corrections
and accessory accents, before constructing the exact preview and Apply plan. If
both hands have gloves, it clears the throwing-hand glove using PLYR_HANDEDNESS.
It retains an existing single glove, bare hands, hand tape and other accessories.
It only visits successfully processed QBs with an exclusive valid appearance
reference, retaining EA protection and all other player scope checks. Patcher and
Randomizer settings and behavior are unchanged by this Quickstart finishing step.

Quickstart then limits gloved QBs across the active dynasty to 1%, rounding the
maximum down. A seeded selection retains only existing worn donor gloves; it
never fills bare hands. Protected and already remembered QBs consume this
allowance and remain untouched. If those existing players already exceed the
limit, no processed QB keeps a glove. This population rule is separate from the
per-player check that prevents two gloves. Both run before preview, report and
Apply assignments are frozen, without adding Quickstart controls or notes.

Tests exercise real mod-pool assignments across all eight mod combinations, both
throwing hands, duplicate on-field outfits, preservation of Base/other equipment,
repeated runs, single gloves and the existing player/reference protections.
