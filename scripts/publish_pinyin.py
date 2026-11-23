#!/usr/bin/env python3
"""Publish www/pinyin to oss://lucca-www/pinyin/ and verify the public bytes.

Unchanged objects are skipped: a simple PutObject ETag is the MD5 of the body,
so a HEAD tells us whether the public copy already matches. Assets go first and
index.html last, so a visitor never gets an entry point whose files are missing.
"""
from __future__ import annotations

import hashlib
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from put_oss_object import put_object

BUCKET = 'lucca-www'
PREFIX = 'pinyin/'
ORIGIN = 'https://lucca-www.oss-cn-hongkong.aliyuncs.com/'
ENTRY = 'index.html'


def files(root: Path) -> list[Path]:
    found = sorted(p for p in root.rglob('*') if p.is_file() and not p.name.startswith('.'))
    if not any(p.relative_to(root).as_posix() == ENTRY for p in found):
        raise ValueError('www/pinyin/index.html is missing')
    return sorted(found, key=lambda p: (p.relative_to(root).as_posix() == ENTRY, p.relative_to(root).as_posix()))


def validate(root: Path) -> list[Path]:
    paths = files(root)
    page = (root / ENTRY).read_text(encoding='utf-8')
    names = {p.relative_to(root).as_posix() for p in paths}
    for ref in __import__('re').findall(r'(?:src|href)="([^":#?]+)"', page):
        if ref.startswith('/') or ref.startswith('http'):
            continue
        if ref not in names:
            raise ValueError('index.html references a missing file: ' + ref)
    if 'https://www.lucca.top/' not in page:
        raise ValueError('pinyin page must link back to www.lucca.top')
    return paths


def public_etag(key: str, opener=urllib.request.urlopen) -> str | None:
    request = urllib.request.Request(ORIGIN + urllib.parse.quote(key), method='HEAD', headers={'Cache-Control': 'no-cache'})
    try:
        with opener(request, timeout=30) as response:
            return (response.headers.get('ETag') or '').strip('"').lower()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


def publish(root: Path, uploader=put_object, etag=public_etag) -> int:
    paths = validate(root)  # Validate everything before any PUT.

    def one(path: Path) -> bool:
        key = PREFIX + path.relative_to(root).as_posix()
        if etag(key) == hashlib.md5(path.read_bytes()).hexdigest():
            return False
        uploader(path, f'oss://{BUCKET}/{key}')
        return True

    assets, entry = paths[:-1], paths[-1]
    with ThreadPoolExecutor(8) as pool:
        changed = sum(pool.map(one, assets))
    changed += one(entry)
    bad = [p for p in paths if etag(PREFIX + p.relative_to(root).as_posix()) != hashlib.md5(p.read_bytes()).hexdigest()]
    if bad:
        raise RuntimeError('Public bytes differ after publish: ' + ', '.join(p.name for p in bad[:5]))
    print(f'Published pinyin: {changed} changed, {len(paths)} verified')
    return changed


def main() -> int:
    try:
        publish(Path(sys.argv[1]) if len(sys.argv) > 1 else Path('www/pinyin'))
    except (OSError, ValueError, RuntimeError) as exc:
        print('Pinyin publication failed: ' + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
