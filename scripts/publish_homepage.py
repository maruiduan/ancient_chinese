#!/usr/bin/env python3
"""Validate, publish, and verify the homepage; never disguise a failed PUT as success."""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import hashlib
import sys
import urllib.request
import xml.etree.ElementTree as ET

from put_oss_object import put_object

FILES = ('robots.txt', 'sitemap.xml', 'index.html')  # Entry point last.
ORIGIN = 'https://lucca-www.oss-cn-hongkong.aliyuncs.com/'
MODULE_URLS = {'https://guwen.lucca.top/', 'https://en.lucca.top/', 'https://ai.lucca.top/'}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.modules = set()
        self.canonical = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a' and 'card' in attrs.get('class', '').split():
            self.modules.add(attrs.get('href'))
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical = attrs.get('href')


def validate(root: Path):
    bodies = {name: (root / name).read_bytes() for name in FILES}
    links = Links()
    links.feed(bodies['index.html'].decode('utf-8'))
    if not MODULE_URLS.issubset(links.modules):
        raise ValueError('Homepage must contain real navigation links for all live modules')
    if links.canonical != 'https://www.lucca.top/':
        raise ValueError('Homepage canonical URL is incorrect')
    if 'Sitemap: https://www.lucca.top/sitemap.xml' not in bodies['robots.txt'].decode('utf-8').splitlines():
        raise ValueError('Homepage robots.txt must declare its sitemap')
    sitemap = ET.fromstring(bodies['sitemap.xml'])
    locations = [el.text for el in sitemap.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    if 'https://www.lucca.top/' not in locations:
        raise ValueError('Homepage sitemap is missing the canonical URL')
    return bodies


def publish(root: Path, uploader=put_object, opener=urllib.request.urlopen):
    bodies = validate(root)  # Validate all files before making any changes.
    for name in FILES:
        uploader(root / name, 'oss://lucca-www/' + name)
    for name, expected in bodies.items():
        digest = hashlib.sha256(expected).hexdigest()
        request = urllib.request.Request(ORIGIN + name + '?release=' + digest,
                                         headers={'Cache-Control': 'no-cache'})
        with opener(request, timeout=60) as response:
            actual = response.read()
        if actual != expected:
            raise RuntimeError('Homepage public bytes differ from published file: ' + name)
        print('Verified homepage ' + name)


def main():
    try:
        publish(Path(sys.argv[1]) if len(sys.argv) > 1 else Path('www'))
    except (OSError, ValueError, RuntimeError, ET.ParseError) as exc:
        print('Homepage publication failed: ' + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
