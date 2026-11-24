#!/usr/bin/env python3
"""Upload www/shared assets used by 拼音闯关 and 龙语群岛."""
from __future__ import annotations

import hashlib
import urllib.request
from pathlib import Path

from put_oss_object import put_object

ORIGIN = 'https://lucca-www.oss-cn-hongkong.aliyuncs.com/'
REQUIRED = (
    'shared/mc-sprites.js',
    'shared/pinyin-audio.js',
    'shared/pinyin-rules.js',
    'shared/three/three.module.js',
    'shared/three/addons/loaders/GLTFLoader.js',
)


def shared_names(root: Path) -> list[str]:
    shared = root / 'shared'
    if not shared.is_dir():
        raise ValueError('www/shared is missing')
    names = sorted(
        p.relative_to(root).as_posix()
        for p in shared.rglob('*')
        if p.is_file() and not p.name.startswith('.')
    )
    missing = [n for n in REQUIRED if n not in names]
    if missing:
        raise ValueError('shared assets missing: ' + ', '.join(missing))
    return names


def publish_shared(root: Path, uploader=put_object, opener=urllib.request.urlopen) -> list[str]:
    names = shared_names(root)
    bodies = {name: (root / name).read_bytes() for name in names}

    def verify(name):
        expected = bodies[name]
        digest = hashlib.sha256(expected).hexdigest()
        request = urllib.request.Request(
            ORIGIN + name + '?release=' + digest,
            headers={'Cache-Control': 'no-cache'},
        )
        with opener(request, timeout=60) as response:
            actual = response.read()
        if actual != expected:
            raise RuntimeError('Shared public bytes differ from published file: ' + name)

    for name in names:
        uploader(root / name, 'oss://lucca-www/' + name)
        verify(name)
    print('Published shared: ' + str(len(names)) + ' files')
    return names
