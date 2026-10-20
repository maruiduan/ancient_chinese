"""Check (and optionally fix) that the self-hosted GW Serif slices cover every character the site shows.

  python3 scripts/font_slices.py          # check; exit 1 with the missing characters
  python3 scripts/font_slices.py --fix    # build one extra slice for the missing characters

--fix needs the source font (Noto Serif SC variable, SIL OFL 1.1). It is downloaded from the
google/fonts GitHub repo into ~/.cache/gw-fonts on first use, or pass --source path/to/font.ttf.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "css/app.css"
SLICES = ROOT / "css/fonts/xcz"
HASHED = re.compile(r"\.[0-9a-f]{12}\.json$")
FACE = re.compile(r'@font-face\{font-family:"GW Serif";[^}]*src:url\(fonts/xcz/(serif-400-\d+\.woff2)\)[^}]*unicode-range:([^}]+)\}')
SOURCE_URL = "https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf"


def site_chars() -> set[str]:
    files = [p for p in (ROOT / "data").rglob("*.json") if not HASHED.search(p.name)]
    files += [ROOT / "js/app.js", ROOT / "index.html"]
    chars: set[str] = set()
    for path in files:
        chars |= {c for c in path.read_text(encoding="utf-8") if ord(c) >= 0x3400}
    return chars


def covered(css: str) -> tuple[set[str], list[str]]:
    cov: set[str] = set()
    names = []
    for name, ranges in FACE.findall(css):
        names.append(name)
        for part in ranges.split(","):
            a, _, b = part.strip()[2:].partition("-")
            cov |= {chr(x) for x in range(int(a, 16), int(b or a, 16) + 1)}
    return cov, names


def missing() -> list[str]:
    cov, names = covered(CSS.read_text(encoding="utf-8"))
    for name in names:
        if not (SLICES / name).is_file():
            raise SystemExit(f"font_slices: css/app.css references missing file css/fonts/xcz/{name}")
    return sorted(site_chars() - cov)


def fix(source: Path | None) -> None:
    chars = missing()
    if not chars:
        print("font_slices: nothing to add")
        return
    if source is None:
        cache = Path.home() / ".cache/gw-fonts"
        cache.mkdir(parents=True, exist_ok=True)
        source = cache / "NotoSerifSC-VF.ttf"
        if not source.is_file():
            print("font_slices: downloading Noto Serif SC (OFL) …")
            urllib.request.urlretrieve(SOURCE_URL, source)
    css = CSS.read_text(encoding="utf-8")
    _, names = covered(css)
    n = max(int(x.split("-")[-1].split(".")[0]) for x in names) + 1
    name = f"serif-400-{n:02d}.woff2"
    text = Path("/tmp") / f"gw-slice-{n}.txt"
    text.write_text("".join(chars), encoding="utf-8")
    inst = source.with_name("NotoSerifSC-400.ttf")
    if not inst.is_file():
        subprocess.run([sys.executable, "-m", "fontTools.varLib.instancer", str(source), "wght=400", "-q", "-o", str(inst)], check=True)
    subprocess.run([sys.executable, "-m", "fontTools.subset", str(inst), f"--text-file={text}", "--flavor=woff2",
                    "--no-hinting", "--desubroutinize", f"--output-file={SLICES / name}"], check=True)
    rng = ",".join(f"U+{ord(c):X}" for c in chars)
    face = f'@font-face{{font-family:"GW Serif";font-weight:400;font-display:swap;src:url(fonts/xcz/{name}) format("woff2");unicode-range:{rng}}}\n'
    last = list(FACE.finditer(css))[-1]
    end = css.index("\n", last.end()) + 1
    CSS.write_text(css[:end] + face + css[end:], encoding="utf-8")
    print(f"font_slices: added css/fonts/xcz/{name} for {len(chars)} characters: {''.join(chars)}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--source", type=Path)
    args = ap.parse_args()
    if args.fix:
        fix(args.source)
        return 0
    chars = missing()
    if chars:
        print(f"font_slices: {len(chars)} characters are not in any GW Serif slice and would fall back to the system font:\n  {''.join(chars)}\n"
              "Run: python3 -m pip install fonttools brotli && python3 scripts/font_slices.py --fix", file=sys.stderr)
        return 1
    print("font_slices: every character is covered")
    return 0


if __name__ == "__main__":
    sys.exit(main())
