# Installer and GitHub Releases

The Windows installer edition of Ace's CFB Toolkit checks the public repository
[ArtVsTheWorld/Aces-CFB-Toolkit](https://github.com/ArtVsTheWorld/Aces-CFB-Toolkit)
each time it opens. Users can also check in **Settings → App Updates**.
It asks before downloading and again before restarting to install. Choosing
Later keeps the existing app usable. Updates cannot restart an active tool run.
Unapplied previews, review decisions, and unsaved session-only tool settings
are lost on restart; saves, backups, saved settings, reports, presets, and
history are retained. The corner notice can be dismissed; update controls
remain available in Settings.

## Source and release downloads

The existing public repository now contains the maintained application source
as well as installer releases. Source belongs in Git commits on `main`;
installer binaries and their update metadata belong in GitHub **Releases**,
not the source tree. Personal settings, saves, reports, credentials, private
diagnostics, and build output are excluded from source control.

Publishing source does not require moving the existing installer release tags
or replacing their assets. The tags created before source publication point
to the original release-only repository commit. Use `main` for the complete
v18.3 source snapshot rather than assuming an older release's automatic
source ZIP contains the app. Tag future releases from their tested source
commits.

App display version v18.3 uses installer/update SemVer **18.3.0**. Existing
portable users must install the Setup edition once to receive automatic
updates; portable copies do not gain this support just by publishing source.

The build uses the existing `cfb-toolkit` data folder and application ID.
Installing does not require moving saves or importing Toolkit settings.
The updater does not download an equal or lower version. Until a release is
published, checking the empty repository can report an update-check error;
this does not stop tools from working.

## Each future update

1. Make and test the requested app changes.
2. Increase `package.json`'s **app version** using valid semantic versioning
   (for example `18.3.0` → `18.3.1`). Update the lockfile with
   `npm install --package-lock-only`. Tool versions alone do not trigger updates.
3. Run tests and `npm run build`.
4. Commit/push the tested source, then create a normal GitHub release tagged
   from that commit. Attach the matching Setup EXE, EXE.blockmap, and latest.yml
   from the same build. Publish it as the latest release, not a prerelease.
5. Installed users are prompted on their next launch. Verify the first real
   upgrade on a test installation before announcing it widely.

Nothing is published by `npm run build` or `npm run dist`.
`npm run build:portable` still builds the manual-update portable edition.
Do not replace assets in an already published release with a different build;
the update manifest contains integrity hashes.

## Distributing a fork

Change `build.publish` to your own update repository and use your own app
identity/branding before shipping a modified installer. Otherwise it can
offer official Ace's Toolkit updates to users of your fork. Keep updater
credentials private and leave the official repository's releases untouched.

## Optional automated release upload

`npm run release` builds and uploads the installer/update assets to a **draft**
release. It requires a GitHub token in the local `GH_TOKEN` environment variable
with permission to publish releases to this repository. Keep tokens private:
never paste them into chat, put them in source, or ship them in the app.
Review the draft in GitHub, then publish it. Users need no token or GitHub account.
Manual browser uploads are sufficient and require no token setup.

## Signing and verification

No signing certificate is currently configured. Windows may display an
unknown-publisher/SmartScreen warning. A trusted code-signing certificate is
recommended for public distribution. The updater verifies downloaded asset
hashes against the release manifest; protect your GitHub account with 2FA
because its release assets are the update trust source.

Local tests cover update prompts, consent, offline failures, progress, busy-run
protection, and installer metadata. A loopback-feed smoke test exercises the
real NSIS updater, downloads the actual installer into an isolated cache,
verifies its SHA-512 hash, and rejects an intentionally incorrect checksum.
It never runs the installer. A true public update/restart requires
publishing a second higher-version release; it cannot be proved using only
the initial same-version installer.

The production dependency audit is clean after updating the metadata parser.
The development/build dependency tree still reports 14 high advisories;
upgrading those build tools is a separate maintenance task, not a change to
the equipment tools or update hosting.
