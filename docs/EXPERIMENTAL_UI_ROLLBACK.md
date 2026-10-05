# Experimental UI rollback

The stable baseline is Ace's CFB Toolkit v0.14.0 at commit `f7b0883`.

- Stable tag: `stable-v0.14.0`
- Stable branch: `master`
- Experimental branch: `ui-redesign-experimental`

The stable implementation was committed before any redesign files were changed. Generated packages and `node_modules` are intentionally excluded from Git; the existing stable `dist/Ace's CFB Toolkit 0.14.0.exe` remains available separately.

## Return to the stable UI

Commit or stash any experimental work you want to keep, then run:

```powershell
git switch master
```

To inspect the exact protected baseline on a separate branch:

```powershell
git switch -c stable-ui-copy stable-v0.14.0
```

## Return to the redesign

```powershell
git switch ui-redesign-experimental
```

The experimental package uses `Experimental` in its artifact filename so it does not overwrite the stable portable executable.
