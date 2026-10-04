# Legacy CLI status

The bundle-level command-line tool directories and `.bat` launchers are deprecated and frozen. They are retained only as historical references and are not runtime, development, test, or packaging dependencies of the Electron application.

All maintained implementation code now lives under `cfb-toolkit/src/`. Runtime data belongs under `cfb-toolkit/resources/`. Future behavior and data updates must be made in the Electron project rather than the legacy CLI directories.

`test/legacy-reference/` contains frozen, app-local snapshots used solely by parity tests. These snapshots must not be imported by production code.
