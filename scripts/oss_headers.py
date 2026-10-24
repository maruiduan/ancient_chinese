"""Object metadata for OSS uploads.

HTML, robots.txt and sitemap.xml on the lucca buckets already answer with
security headers stored as x-oss-persistent-headers. A PutObject that omits
that request header deletes them. ossutil 2.4 can set Cache-Control and
Content-Type, but it cannot send x-oss-persistent-headers.

Values below are the headers currently served (2026-10-24), not a new policy.
robots.txt and sitemap.xml carry the same non-CSP set as en.lucca.top and
ai.lucca.top. HTML keeps each bucket's own Content-Security-Policy.
"""
from __future__ import annotations

import base64
import mimetypes
import re
from pathlib import Path

GUWEN_BUCKET = "guwen-lucca"
WWW_BUCKET = "lucca-www"

# Response header names are lowercase, matching the live objects.
COMMON_HEADERS: tuple[tuple[str, str], ...] = (
    ("strict-transport-security", "max-age=31536000; includeSubDomains"),
    ("x-content-type-options", "nosniff"),
    ("referrer-policy", "strict-origin-when-cross-origin"),
    ("x-frame-options", "SAMEORIGIN"),
    ("permissions-policy", "geolocation=(), microphone=(), camera=()"),
)

GUWEN_CSP = (
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; "
    "img-src 'self' data: blob: https:; font-src 'self' data:; media-src 'self' blob:; "
    "style-src 'self' 'unsafe-inline'; "
    "script-src 'self' 'unsafe-inline' https://hm.baidu.com https://busuanzi.ibruce.info; "
    "connect-src 'self' https://hm.baidu.com https://api.lucca.top; form-action 'self'"
)
WWW_CSP = (
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; "
    "img-src 'self' data: https:; font-src 'self' data:; "
    "style-src 'self' 'unsafe-inline'; "
    "script-src 'self' 'unsafe-inline' https://hm.baidu.com https://busuanzi.ibruce.info; "
    "connect-src 'self' https://hm.baidu.com; form-action 'self'"
)

HASHED_NAME = re.compile(r"\.[0-9a-f]{12}\.[A-Za-z0-9]+$")
PROTECTED_NAMES = {"robots.txt", "sitemap.xml"}


def requires_persistent(key: str) -> bool:
    name = Path(key).name.lower()
    return name.endswith(".html") or name in PROTECTED_NAMES


def encode_persistent_headers(pairs: tuple[tuple[str, str], ...] | list[tuple[str, str]]) -> str:
    """Format required by OSS: name:base64(value),name:base64(value)."""
    parts = []
    for name, value in pairs:
        if name.lower().startswith("x-oss-") or not name or ":" in name or "," in name:
            raise ValueError(f"persistent header name is not allowed: {name}")
        encoded = base64.b64encode(value.encode("utf-8")).decode("ascii")
        parts.append(f"{name}:{encoded}")
    return ",".join(parts)


def decode_persistent_headers(value: str) -> dict[str, str]:
    decoded = {}
    for part in value.split(","):
        name, separator, payload = part.partition(":")
        if not separator:
            raise ValueError(f"malformed persistent header: {part}")
        decoded[name.lower()] = base64.b64decode(payload).decode("utf-8")
    return decoded


def persistent_pairs(bucket: str, key: str) -> tuple[tuple[str, str], ...] | None:
    if not requires_persistent(key):
        return None
    pairs = list(COMMON_HEADERS)
    if Path(key).suffix.lower() == ".html":
        pairs.append(("content-security-policy", WWW_CSP if bucket == WWW_BUCKET else GUWEN_CSP))
    return tuple(pairs)


def persistent_header_value(bucket: str, key: str) -> str | None:
    pairs = persistent_pairs(bucket, key)
    if pairs is None:
        return None
    return encode_persistent_headers(pairs)


def object_metadata(name: str) -> tuple[str, str]:
    """Content-Type and Cache-Control. Unhashed public files stay revalidated."""
    path = Path(name)
    hashed = bool(HASHED_NAME.search(path.name))
    cache = "public, max-age=31536000, immutable" if hashed else "no-cache, must-revalidate"
    types = {
        ".js": "application/javascript",
        ".json": "application/json",
        ".ogg": "audio/ogg",
        ".txt": "text/plain",
        ".xml": "application/xml",
        ".html": "text/html",
    }
    content_type = types.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    if content_type.startswith("text/") or content_type == "application/json":
        content_type += "; charset=utf-8"
    return content_type, cache
