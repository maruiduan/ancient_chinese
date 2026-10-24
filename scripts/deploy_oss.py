"""Upload a validated site, then publish its entry points. Never delete old hashes.

HTML, robots.txt and sitemap.xml go through put_oss_object.py so the PUT
re-attaches x-oss-persistent-headers. ossutil 2.4 cp cannot set that header
and would clear the live security headers.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import oss_headers
from stage_site import validate

ENTRY_POINTS = ("index.html", "version.json")
PUT_SCRIPT = Path(__file__).with_name("put_oss_object.py")


def upload_command(site: Path, relative: str, destination: str) -> list[str]:
    path = site / relative
    target = destination.rstrip("/") + "/" + relative
    if oss_headers.requires_persistent(relative):
        return [sys.executable, str(PUT_SCRIPT), str(path), target]
    content_type, cache = oss_headers.object_metadata(relative)
    return ["ossutil", "cp", str(path), target,
            "--content-type", content_type, "--cache-control", cache, "--force", "--no-progress"]


def publish(site: Path, destination: str, runner=None, workers: int = 8) -> None:
    validate(site)
    if runner is None:
        def runner(command):
            subprocess.run(command, check=True, stdout=subprocess.DEVNULL)
    assets = sorted(path.relative_to(site).as_posix() for path in site.rglob("*")
                    if path.is_file() and path.relative_to(site).as_posix() not in ENTRY_POINTS)
    # Any failed upload aborts before either entry point is changed. Old immutable
    # objects remain available to tabs that still hold the preceding asset map.
    with ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(lambda rel: runner(upload_command(site, rel, destination)), assets))
    for relative in ENTRY_POINTS:
        runner(upload_command(site, relative, destination))
    print(f"Published {len(assets)} assets, then index.html and version.json; old objects retained.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    parser.add_argument("destination")
    args = parser.parse_args()
    if not re.fullmatch(r"oss://[a-z0-9][a-z0-9-]+", args.destination):
        parser.error("destination must be an OSS bucket URL")
    publish(args.site.resolve(), args.destination)
