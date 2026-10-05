"""Resize the supplied MMC tbak team headers for the bundled Home page."""

from pathlib import Path
import sys

from PIL import Image


SKIP_NAMES = {
    "CAP_BG",
    "NationalChampionshipBackground",
    "PlaycallBackground",
    "PlayoffBackground",
    "TeamBuilder",
}


def main(source: Path, target: Path) -> None:
    if not (source / "tbak_Default.png").is_file():
        raise SystemExit("The tbak directory must contain tbak_Default.png")
    target.mkdir(parents=True, exist_ok=True)
    count = 0
    for image_path in sorted(source.glob("tbak_*.png")):
        name = image_path.stem.removeprefix("tbak_")
        if name in SKIP_NAMES or name.startswith("rtcfp"):
            continue
        with Image.open(image_path) as image:
            image = image.convert("RGB")
            image.thumbnail((1600, 900), Image.Resampling.LANCZOS)
            image.save(target / f"tbak_{name}.webp", "WEBP", quality=82, method=6)
        count += 1
    print(f"Imported {count} team headers ({sum(file.stat().st_size for file in target.glob('tbak_*.webp')):,} bytes).")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: import-team-headers.py SOURCE_TBAK_DIR TARGET_DIR")
    main(Path(sys.argv[1]), Path(sys.argv[2]))
