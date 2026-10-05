# v18.5 — Helmet Configuration and Targeted Equipment Corrections

App display version: **18.5**. Installer/update version: **18.5.0**.
Equipment Randomizer: **5.1**. Equipment Patcher: **5.3**.
Commentary ID Patcher: **2.0**.

## Helmet distribution

The existing non-OL helmet pass now has a separate modal editor. Custom
settings use whole-number percentages totaling 100%, with Balance to 100%
and Reset This Mix actions. A global mix can be overridden per position in
the game's normal position order. Cancel does not change committed settings.
The serialized configuration is reused by session state and Config Presets.

Selectable, catalogued models verified by current unmodded-process ItemInfo:

- Riddell SpeedFlex, Axiom, Revolution, Revolution Speed, VSR4, TK.
- Schutt F7, F7 Pro, Air XP PRO VTD, Air Advantage.
- LIGHT Gladiator.
- VICIS Zero 1, standard Zero 2, Zero 2 Trench.

LIGHT LS2 and VSR4 Softcup remain catalogued but are not offered: their
current ItemInfo/menu availability was not verified. No guessed IDs, `None`,
or menu props enter the replacement pool.

The registry centralizes exact model IDs, supported mask families, eligibility,
and known guardian-cap/hanging-mouthpiece compatibility. F7/F7 Pro and Zero
2/Trench have separate mask subsets despite shared broad catalog tags.
Standard Zero 2 is limited to QB/TE/LB/DL; Trench is limited to DL. OL remains
excluded. Unavailable global weights are redistributed proportionally among
allowed models; invalid or entirely unavailable pools fail before writing.

Default Mix and presets without a custom configuration retain the exact
legacy replacement behavior, including the existing Allow Standard Vicis
Zero 2 option. Custom repair-only mode keeps already acceptable helmets even
at zero weight. Balance Existing Helmets moves eligible populations toward
integer target counts using surplus-to-deficit swaps rather than rerolling
everyone. Changes are spread across teams, calculated per position, and kept
separate for FBS and directional FCS cohorts. Preview includes target and
before/after counts/percentages plus position filtering.

## Targeted passes and other changes

- **Bears Pads Sleeve Fit:** default-off, Standard-body-only, exact Double/
  Padded/Compression sleeve families. Shooter Sleeve preserves color; No
  Sleeve and seeded 50/50 replacements are also available. Changes only the
  affected arm item in on-field loadouts. Clearly marked Requires Bears Pads.
- **Remove Handwarmers:** default-off, targets the two known handwarmer
  models only in WaistWear. Does not remove waist playcall bands or alter
  unrelated equipment.
- **Brand Existing Visors:** now default-off.
- **Waist playcall recolor:** white/black/primary variants are represented;
  no verified secondary variant was found, so that request leaves the item
  unchanged rather than fabricating an asset.
- **Commentary map:** 63 unambiguous pairs from valid BASEDEFAULT NIL roster
  players; 7,032 map entries total. No original save was modified.
- **Sidebar:** themed shield-check and trophy icons replace the two raster
  icons. No tool behavior changed with the icons.

The new equipment actions are grouped into existing per-player previews and
included in CSV summaries plus complete before/after RawData audit columns.
Cached plans, NIL/scope/shared-row safeguards, fixed-capacity storage,
fixed-size packed containers, exact candidate verification, and atomic save
publishing are unchanged.

## Vanilla catalog observations

The read-only live scan collected 231 structurally checked ItemInfo
name/display-name pairs. `equipmentVanillaObservation.json` records these
without process addresses or raw memory. This is an observation catalog,
not blanket proof that every loaded item is available in the vanilla menu:
locked built-in items can be loaded without mods. It does not automatically
move mod-dependent accessories into vanilla pools.

## Verification

- **489/489 full automated tests passed**, including 25 new unit/regression
  cases and two real cached Preview/Apply/reload cases.
- Final full run: `node --max-old-space-size=4096 --test --test-concurrency=1 test/*.test.js`.
  Earlier overlapping fixture runs encountered heap/time limits; the serial
  run passed without relaxing assertions or timeouts.
- **414/414 public-source tests passed** again after the final UI adjustments.
- Real workflow cases check seeded replay, read-only Preview, exact backup,
  all planned and unplanned equipment rows, unrelated tables, full CSV audit
  columns, and original packed file size.
- BASEDEFAULT production-path helmet balancing: 7,294 loadout assignments,
  exact cached Apply/reload, identical replay, unchanged other tables,
  byte-identical backup, unchanged source, and fixed storage/container checks.
- Development and packaged UI smokes passed, including modal Save/Cancel,
  position overrides, presets, forward/back navigation, Preview/Apply,
  tool switching, Reset, and default-off controls.
- Windows x64 installer and portable production builds succeeded.
- Development, unpacked, and portable startup smokes passed. Packaged codec
  smoke retained all four original case-alias regression rows exactly.
- All 410 bundled source/assets match the current workspace files. Schemas,
  commentary map, installer size/SHA-512, and matching upload copies verified.
- Real NSIS updater download/checksum smoke passed; no installation or
  restart occurred, and nothing was published.

New helmet variants still require the requested in-game visual check. Source
and save-format checks do not prove every game's rendered appearance.

## Release files

Build output: `dist/v18.5-release/`. Use tag **v18.5.0** and upload the matching
Setup EXE, `.exe.blockmap`, and `latest.yml` from `github-release-assets/`
inside that folder. The portable
EXE remains a separate manual-update download. Personal settings, uploaded
artwork, saves, diagnostics, and reports are not bundled.

Plain-English notes: [Changes since v18.3](PATCH_NOTES_18_4_TO_18_5.md).
Optional next steps: [Future tool/UI ideas](FUTURE_TOOL_IDEAS.md).
