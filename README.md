# Ace's CFB Toolkit

A Windows desktop toolkit for College Football 27 Dynasty and Road To Glory save utilities. This repository contains the maintained Electron application source, build resources, and regression tests alongside the official release downloads. Current source: **v24.3**. Source updates and installer releases are published separately.

## Download the app

Download the **Aces-CFB-Toolkit-Setup** EXE from [the latest release](https://github.com/ArtVsTheWorld/Aces-CFB-Toolkit/releases/latest). The installer edition checks for updates when it opens and asks before downloading or restarting. The `.blockmap` and `latest.yml` release attachments are updater files; normal users only need the Setup EXE.

The installer is currently unsigned, so Windows may show an unknown-publisher warning. Keep backups and review proposed changes before applying a tool. Optional Unlocked and Raw Accessories settings require the corresponding external mods, which are **not included** here.

## Build or reuse the source

Prerequisites: Windows, Git, and Node.js 24 with npm. The published source was checked with Node.js **24.18.0**. Electron and build dependencies are installed from the lockfile.

```sh
git clone https://github.com/ArtVsTheWorld/Aces-CFB-Toolkit.git
cd Aces-CFB-Toolkit
npm ci
npm start
```

Development mode does not check for installer updates. Your saves are selected through the app; they do not belong inside this repository.

```sh
# Run tests that do not require private dynasty fixtures
npm run test:source

# Build the Windows installer without publishing
npm run build

# Optional manual-update portable edition
npm run build:portable
```

Build output is written to `dist/`. App display version **23.1** uses installer/update SemVer **23.1.0**. Tools share the app release version instead of separate tool version numbers. No installer is published by the build commands above.

## Project layout

| Folder | Purpose |
| --- | --- |
| `src/main` | Electron main process, save access, tools, reports, backups, and history |
| `src/renderer` | Application UI, shared controls, bundled logos and team headers |
| `src/shared` | Tool registry, IPC contracts, and shared version formatting |
| `resources` | Bundled save schemas and commentary-name map |
| `build` | Application icon and portable loading-screen asset |
| `test` | Unit/parity/regression tests and frozen legacy reference code |
| `scripts` | Source-test runner and maintained build/UI smoke helpers |
| `docs` | Architecture, development, and installer-release guidance |

The original CLI launchers are deprecated and are not required to build or run this app. The maintained implementation is entirely in this project. Reference snapshots under `test/legacy-reference` exist only for regression comparisons.

## Testing and contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development and save-safety expectations. `npm run test:source` runs the portable subset. The full `npm test` suite additionally uses local example saves that are deliberately not published; fixture requirements are explained in the contributor guide.

Personal settings, uploaded team artwork, saves, backups, reports, credentials, installed dependencies, build outputs, and private diagnostic artifacts are excluded. Default bundled artwork is included so a fresh checkout can build the same interface.

v23.1 fixes equipment-save crashes and freezes when returning from a dynasty game to the hub. The confirmed fix preserves all selected equipment while fitting normal game-save compression, including Quickstart with all three supported mod options. It adds RAW Accessories v3.1.4 support, compact expandable equipment previews, percentage progress bars, and background processing to keep the application window responsive. Failed Apply attempts retain the reviewed preview. See [v23.1 release notes](docs/RELEASE_NOTES_V23_1.md).

v23.0 added Equipment Quickstart: a one-size-fits-all Randomizer/Patcher workflow with top-15 donors, built-in No Drip and visor additions/branding, optional mod pools and player memory keyed by the native dynasty LeagueID, shared across renamed saves, autosaves and copies. Successful Quickstart and Randomizer applications mark players as completed; Preview does not. Randomizer and Quickstart previews group equipment sources by donor and category. Patcher configuration uses focused pages and explicit global or position-specific edits; opening a global page does not overwrite individual settings. Mouthpiece Frequency defaults to 85%, combining a chance roll with a per-team limit. Each frequency-based pass offers Fill to Frequency, and tattoo placement chances are configurable. Randomizer protects previously randomized players per dynasty by default; donor randomization is optional.

Optional equipment pools require CFB27 Unlocked v0.97+, RAW Accessories v3.1.4+, or GameDay Gear v2.0+, respectively. Quickstart uses the verified GameDay clear visors when that mod is enabled; existing tinted visors retain their tint.

Previous development notes: [v22.5 draft patch notes](docs/RELEASE_NOTES_V22_5.md), [native schemes and multi-team configuration](docs/V22_5_NATIVE_SCHEMES.md), and [original EA roster player protection](docs/V22_5_ORIGINAL_EA_PROTECTION.md). The draft notes cover changes since [v22.0](docs/RELEASE_NOTES_V22_0.md). Source publication is separate from installer releases; use the Releases page for the latest published installer. Test generated rosters on copied saves in-game before continuing a dynasty.
Previous update: [v20.1 Unlocked uniform passes and compatibility](docs/V20_1_UPDATE.md).
Published v20.0: [v20.0 release notes](docs/RELEASE_NOTES_20_0.md) and [configuration, usability, and safety refinements](docs/V20_0_REFINEMENT.md).
Previous update: [v19.1 user schedules, position-specific facemasks, configurable mod pools and Unlocked socks](docs/V19_1_UPDATE.md).
Earlier changes: [plain-English changes since v18.3](docs/PATCH_NOTES_18_4_TO_18_5.md).

If you distribute a fork, configure your own app identity and update repository before packaging. Do not leave a modified fork pointed at Ace's official installer feed. See [installer release guidance](docs/INSTALLER_UPDATES.md).

## License and credits

Toolkit-owned source code is released under the [MIT license](LICENSE), matching the project's existing package metadata. Creators may fork, modify, and reuse it with the license notice retained. Third-party game/mod identifiers, schemas, artwork, trademarks, and dependency licenses are not relicensed by that notice; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Thanks to Balla for the Team Overall Calculation Tool Option A reference, the `madden-franchise` maintainers, Orckestra's CFB 27 Unlocked, DelonteRAW's Raw Accessories, and the community members who helped test save compatibility.

This is a community project and is not affiliated with or endorsed by EA SPORTS or the represented schools and brands.
