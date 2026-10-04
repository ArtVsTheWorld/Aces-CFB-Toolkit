# Ace's CFB Toolkit

A Windows desktop toolkit for College Football 27 Dynasty and Road To Glory save utilities. This repository contains the complete maintained Electron application source for **v18.3**, its build resources, and regression tests, alongside the official release downloads.

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

Build output is written to `dist/`. App display version **18.3** uses installer/update SemVer **18.3.0**. No installer is published by the build commands above.

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

If you distribute a fork, configure your own app identity and update repository before packaging. Do not leave a modified fork pointed at Ace's official installer feed. See [installer release guidance](docs/INSTALLER_UPDATES.md).

## License and credits

Toolkit-owned source code is released under the [MIT license](LICENSE), matching the project's existing package metadata. Creators may fork, modify, and reuse it with the license notice retained. Third-party game/mod identifiers, schemas, artwork, trademarks, and dependency licenses are not relicensed by that notice; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Thanks to Balla for the Team Overall Calculation Tool Option A reference, the `madden-franchise` maintainers, Orckestra's CFB 27 Unlocked, DelonteRAW's Raw Accessories, and the community members who helped test save compatibility.

This is a community project and is not affiliated with or endorsed by EA SPORTS or the represented schools and brands.
