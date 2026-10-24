import base64
import hashlib
import hmac
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import oss_headers
import put_oss_object

ROOT = Path(__file__).resolve().parents[1]


class PersistentHeaderTests(unittest.TestCase):
    def test_aliyun_example_encoding(self):
        encoded = oss_headers.encode_persistent_headers([
            ("myheader1", "myvalue1"),
            ("myheader2", "myvalue2"),
        ])
        self.assertEqual(encoded, "myheader1:bXl2YWx1ZTE=,myheader2:bXl2YWx1ZTI=")
        self.assertEqual(oss_headers.decode_persistent_headers(encoded), {
            "myheader1": "myvalue1",
            "myheader2": "myvalue2",
        })

    def test_live_policies_round_trip(self):
        guwen = oss_headers.decode_persistent_headers(
            oss_headers.persistent_header_value(oss_headers.GUWEN_BUCKET, "index.html"))
        www = oss_headers.decode_persistent_headers(
            oss_headers.persistent_header_value(oss_headers.WWW_BUCKET, "index.html"))
        robots = oss_headers.decode_persistent_headers(
            oss_headers.persistent_header_value(oss_headers.GUWEN_BUCKET, "robots.txt"))
        sitemap = oss_headers.decode_persistent_headers(
            oss_headers.persistent_header_value(oss_headers.WWW_BUCKET, "sitemap.xml"))
        common = {
            "strict-transport-security": "max-age=31536000; includeSubDomains",
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "x-frame-options": "SAMEORIGIN",
            "permissions-policy": "geolocation=(), microphone=(), camera=()",
        }
        self.assertEqual(robots, common)
        self.assertEqual(sitemap, common)
        self.assertEqual({k: v for k, v in guwen.items() if k != "content-security-policy"}, common)
        self.assertEqual({k: v for k, v in www.items() if k != "content-security-policy"}, common)
        self.assertIn("https://hm.baidu.com", guwen["content-security-policy"])
        self.assertIn("https://busuanzi.ibruce.info", guwen["content-security-policy"])
        self.assertIn("https://api.lucca.top", guwen["content-security-policy"])
        self.assertIn("'unsafe-inline'", guwen["content-security-policy"])
        self.assertIn("https://hm.baidu.com", www["content-security-policy"])
        self.assertIn("https://busuanzi.ibruce.info", www["content-security-policy"])
        self.assertIn("'unsafe-inline'", www["content-security-policy"])
        self.assertNotIn("https://api.lucca.top", www["content-security-policy"])
        self.assertNotIn("media-src", www["content-security-policy"])
        self.assertIsNone(oss_headers.persistent_header_value(oss_headers.GUWEN_BUCKET, "js/app.js"))
        self.assertFalse(oss_headers.requires_persistent("css/app.css"))
        self.assertTrue(oss_headers.requires_persistent("stats.html"))

    def test_signature_v1_includes_persistent_headers_and_not_cache_control(self):
        headers = {
            "Content-Type": "text/plain",
            "Content-MD5": "abc",
            "Cache-Control": "no-cache, must-revalidate",
            "Date": "Wed, 28 Feb 2018 02:03:25 GMT",
            "x-oss-persistent-headers": "myheader1:bXl2YWx1ZTE=,myheader2:bXl2YWx1ZTI=",
        }
        signed = put_oss_object.string_to_sign("PUT", headers, "examplebucket", "tmp")
        self.assertEqual(
            signed,
            "PUT\n"
            "abc\n"
            "text/plain\n"
            "Wed, 28 Feb 2018 02:03:25 GMT\n"
            "x-oss-persistent-headers:myheader1:bXl2YWx1ZTE=,myheader2:bXl2YWx1ZTI=\n"
            "/examplebucket/tmp",
        )
        self.assertNotIn("no-cache", signed)
        expected = base64.b64encode(hmac.new(b"secret", signed.encode(), hashlib.sha1).digest()).decode()
        self.assertEqual(put_oss_object.sign_v1(signed, "secret"), expected)

    def test_put_headers_refuse_to_omit_persistent_metadata(self):
        headers = put_oss_object.request_headers("guwen-lucca", "index.html", b"<html></html>", now="Wed, 28 Feb 2018 02:03:25 GMT")
        decoded = oss_headers.decode_persistent_headers(headers["x-oss-persistent-headers"])
        self.assertEqual(headers["Content-Type"], "text/html; charset=utf-8")
        self.assertEqual(headers["Cache-Control"], "no-cache, must-revalidate")
        self.assertIn("content-security-policy", decoded)
        self.assertNotIn("cache-control", decoded)
        self.assertNotIn("content-type", decoded)
        plain = put_oss_object.request_headers("guwen-lucca", "js/app.js", b"void 0;", now="Wed, 28 Feb 2018 02:03:25 GMT")
        self.assertNotIn("x-oss-persistent-headers", plain)

    def test_published_sitemaps_list_real_canonical_urls_only(self):
        for folder, origin in ((ROOT, "https://guwen.lucca.top"), (ROOT / "www", "https://www.lucca.top")):
            robots = (folder / "robots.txt").read_text(encoding="utf-8")
            sitemap = (folder / "sitemap.xml").read_text(encoding="utf-8")
            self.assertIn(f"Sitemap: {origin}/sitemap.xml\n", robots)
            self.assertNotIn("<", robots)
            locs = [line for line in sitemap.split("<loc>") if "</loc>" in line]
            locs = [item.split("</loc>", 1)[0] for item in locs]
            self.assertTrue(locs)
            for loc in locs:
                self.assertTrue(loc.startswith(origin + "/"), loc)
                self.assertNotIn("#", loc)
                self.assertNotIn("oss-", loc)
            self.assertIn(origin + "/", locs)


if __name__ == "__main__":
    unittest.main()
