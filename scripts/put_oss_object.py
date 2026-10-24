#!/usr/bin/env python3
"""PUT one object and, for HTML / robots.txt / sitemap.xml, restore persistent headers.

ossutil 2.4.0 cp is a normal PutObject. It can set Content-Type and Cache-Control,
but not x-oss-persistent-headers, so it clears HSTS, nosniff, Referrer-Policy,
X-Frame-Options, Permissions-Policy and CSP already stored on the object.

Credentials: OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET.
Optional: OSS_SESSION_TOKEN, OSS_ENDPOINT (default Hong Kong).
"""
from __future__ import annotations

import base64
import email.utils
import hashlib
import hmac
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import oss_headers


def string_to_sign(method: str, headers: dict[str, str], bucket: str, key: str) -> str:
    """OSS signature version 1. Cache-Control is not part of the string."""
    canon = []
    for name, value in headers.items():
        lower = name.lower()
        if lower.startswith("x-oss-"):
            canon.append((lower, value))
    canon.sort(key=lambda item: item[0])
    canon_text = "".join(f"{name}:{value}\n" for name, value in canon)
    content_md5 = headers.get("Content-MD5", "")
    content_type = headers.get("Content-Type", "")
    date = headers.get("x-oss-date") or headers.get("Date") or ""
    resource = f"/{bucket}/{key}"
    return "\n".join([method, content_md5, content_type, date, canon_text + resource])


def sign_v1(text: str, secret: str) -> str:
    digest = hmac.new(secret.encode("utf-8"), text.encode("utf-8"), hashlib.sha1).digest()
    return base64.b64encode(digest).decode("ascii")


def request_headers(bucket: str, key: str, body: bytes, now: str | None = None) -> dict[str, str]:
    content_type, cache = oss_headers.object_metadata(key)
    headers = {
        "Content-Type": content_type,
        "Content-MD5": base64.b64encode(hashlib.md5(body).digest()).decode("ascii"),
        "Cache-Control": cache,
        "Date": now or email.utils.formatdate(usegmt=True),
    }
    persistent = oss_headers.persistent_header_value(bucket, key)
    if oss_headers.requires_persistent(key) and not persistent:
        raise RuntimeError(f"refusing to PUT {key} without persistent headers")
    if persistent:
        headers["x-oss-persistent-headers"] = persistent
    token = os.environ.get("OSS_SESSION_TOKEN") or ""
    if token:
        headers["x-oss-security-token"] = token
    return headers


def parse_destination(destination: str) -> tuple[str, str]:
    parsed = urllib.parse.urlparse(destination)
    if parsed.scheme != "oss" or not parsed.netloc or not parsed.path.startswith("/"):
        raise ValueError("destination must be oss://bucket/key")
    bucket, key = parsed.netloc, parsed.path[1:]
    if not key or key.endswith("/"):
        raise ValueError("destination must include an object key")
    return bucket, key


def put_object(local: Path, destination: str, attempts: int = 3, sleep=time.sleep, opener=None) -> None:
    bucket, key = parse_destination(destination)
    body = local.read_bytes()
    access_key = os.environ.get("OSS_ACCESS_KEY_ID") or ""
    secret = os.environ.get("OSS_ACCESS_KEY_SECRET") or ""
    if not access_key or not secret:
        raise RuntimeError("OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET required")
    endpoint = os.environ.get("OSS_ENDPOINT", "https://oss-cn-hongkong.aliyuncs.com")
    host = urllib.parse.urlparse(endpoint).netloc or endpoint
    url = f"https://{bucket}.{host}/{urllib.parse.quote(key, safe='/')}"
    opener = opener or urllib.request.urlopen
    headers = request_headers(bucket, key, body)
    signed = string_to_sign("PUT", headers, bucket, key)
    headers["Authorization"] = f"OSS {access_key}:{sign_v1(signed, secret)}"
    for attempt in range(attempts):
        request = urllib.request.Request(url, data=body, headers=headers, method="PUT")
        try:
            with opener(request, timeout=60) as response:
                response.read()
            names = ",".join(sorted(oss_headers.decode_persistent_headers(headers["x-oss-persistent-headers"]))) if "x-oss-persistent-headers" in headers else "-"
            print(f"put {bucket}/{key} {headers['Content-Type']} {headers['Cache-Control']} persistent:{names}")
            return
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:400]
            if exc.code not in {408, 429, 500, 502, 503, 504} or attempt == attempts - 1:
                raise RuntimeError(f"OSS PUT {bucket}/{key} failed: {exc.code} {detail}") from exc
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            if attempt == attempts - 1:
                raise RuntimeError(f"OSS PUT {bucket}/{key} failed: {exc}") from exc
        sleep(2 ** attempt)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 2:
        print("用法：python3 scripts/put_oss_object.py <本地文件> oss://bucket/key", file=sys.stderr)
        return 2
    local, destination = Path(argv[0]), argv[1]
    if not local.is_file():
        print(f"没有 {local}", file=sys.stderr)
        return 1
    try:
        put_object(local, destination)
    except (RuntimeError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
