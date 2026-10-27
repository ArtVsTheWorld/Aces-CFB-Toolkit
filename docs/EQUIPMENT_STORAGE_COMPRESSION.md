# Lossless appearance storage compaction

An equipment run can fit after donor randomization but exhaust CharacterVisuals
continuation rows during later corrections. GameDay Gear's additional literal
asset names can push more appearances above the 375-byte compressed payload
limit of a 377-byte main block. The fixed pool and record capacity must remain
unchanged.

The existing JSON-to-ISON conversion already removes JSON whitespace and uses
native numeric and string representations. Raising Zstandard compression alone
does not necessarily save an allocation. This implementation instead orders
ISON object members consistently before compression. It moves complete named
key/value byte ranges, recursively, and preserves every scalar token, string
spelling, duplicate-key order and array position. It does not remove slots,
cosmetics, metadata, defaults or players.

`reorderVisualIson` operates on the native ISON bytes after exact-case encoding.
`encodeStorageFriendlyVisualData` keeps the existing result for inline writes and
only selects a compact alternative when it reduces the required storage blocks.
It uses the game's existing dictionary and native frame format. The alternate
representation must decode to every expected JSON value before it is accepted.
Unknown ISON representations retain the existing encoding and safety guard.

The ordinary fixed-pool writer then releases unused continuation rows and retains
copy-on-write protection for aliases/shared tails. Apply still backs up the
source, writes a temporary candidate, reopens it, checks every changed and
untouched appearance, verifies other tables and container capacity, checks for
concurrent source edits, and only then publishes the candidate.

Tests cover an independently native-encoded anonymous appearance fixture,
literal/interned strings, duplicate and prototype-named keys, exact numeric bits,
nested arrays, malformed data, decoder mismatches, actual native save/reopen and
subsequent edits. Changed appearances are compared by all JSON values and array
order; untouched appearances retain byte-for-byte text checks.

After the user's in-game None-placeholder test passed, equipment previews now
remove whole `loadoutElements` entries whose asset equals `None` or ends `_None`
(case-insensitive), only within appearances processed by the selected tool.
Other entries, metadata and order remain intact. Empty and absent slots remain
equivalent in undershirt population rules and Mapper's empty-item choices.

Passes build complete appearance drafts before allocating native storage. Final
encoding verifies every proposed JSON value, processes shrinking appearances
first, and preflights both logical continuation rows and physical copy-on-write
blocks. A capacity-limited player keeps their entire original appearance, is
excluded from the accepted preview/report/Apply assignments and player memory,
and contributes only to the skipped-player count. Malformed data, unsafe encoding
and invalid storage links remain fatal. Apply replays the accepted allocation
order and never makes new skip decisions. Native full-pool tests save and reopen
an accepted edit while confirming the oversized player's original data survives.

Compatibility also replaces four known Unlocked relaxed-tee colors with their
matching sleeveless compression shirts for six incompatible rolled jersey styles.
Jerseys and shirt metadata remain intact. The compatibility pass rechecks after
uniform and recolor changes so later passes cannot restore the invalid pairing.

The Patcher also offers Remove Specific Item(s) with searchable optional-item categories, saved with presets and the shared player/team filters. Helmets, facemasks and cleats are excluded, and other items require a supported None option. It starts off and requires at least one chosen item. Removal runs after the other selected passes, handles all appearance layers, and clears dependent waist/shoe overrides when their parent is removed. Full BeforeRawData/AfterRawData audits and accepted-plan verification remain unchanged.
