# Contributing

## Getting started

Use Node.js 24 and Windows. Run `npm ci`, `npm run test:source`, and `npm start` from the repository root. The lockfile pins the dependency graph; do not commit `node_modules`, `dist`, or local caches.

The published v18.3 application passed 456 tests in the maintainer's full-fixture environment, plus development/packaged smoke tests and in-game checks. A public checkout does not include those private dynasty saves. The source-only test count is therefore lower and is reported honestly by `npm run test:source`.

## Full-save checks

`npm test` retains the complete suite, including fixture-dependent tests. Those tests expect a sibling directory named `EXAMPLE SAVES VANILLA GAME` containing:

- `DYNASTY-LSUTESTSAVEPRESZN`
- `DYNASTY-LSUTESTSAVEWEEK0`

Use authorized disposable local fixtures. Some checks assert the original fixture's schema, roster sizes, or season context, so arbitrary saves are not necessarily interchangeable. Do not upload user saves to an issue, commit, or public pull request without their permission. The full suite is not claimed to pass without those fixtures.

`scripts/smoke-v180-ui.cjs` and `scripts/smoke-recolor-ui.cjs` also need these fixtures. `scripts/smoke-updates-ui.cjs` uses isolated UI state; `scripts/smoke-update-download.cjs --build=dist` tests a locally built installer's updater against a loopback feed, verifies checksums, and does not install anything.

## Save-safety requirements

- Preview must never modify a save or create a backup.
- Apply must use the exact reviewed plan, check that the input is unchanged, and back up before writing.
- Equipment writes must retain fixed CharacterVisuals storage and the original packed-container size. Never bypass validation to make a test pass.
- Reopen and verify the temporary candidate, including unplanned equipment and unrelated tables, before publishing it.
- A failed validation must leave the user's original save unchanged and clean up its candidate.
- Keep shared/NIL/donor protections and seeded behavior unless a change explicitly requires otherwise.

Add focused tests for new behavior. Synthetic structural fixtures are preferred for public regression cases; private save diagnosis should remain outside version control. All optional mod pools should remain separated from vanilla equipment, and item IDs must be verified rather than guessed.

## Sharing changes

Fork the repository, create a branch, and submit a pull request explaining the change and tests run. Keep changes focused. Do not include secrets, personal configuration, reports, saves, large installer binaries, or diagnostic process dumps.

Build commands do not upload anything. `npm run release` is a separate maintainer publishing command and requires a private GitHub credential. Never place a token in source or send it in an issue or chat.

A distributed fork needs its own `build.publish` repository, app identity, and branding. Keep third-party notices and the MIT notice for reused Toolkit code. Do not change the official release tags or update assets merely to publish source.
