import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import stamp_assets
import verify_live
from test_release import fixture


class LiveVerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.site = fixture(Path(self.temp.name) / "site")
        stamp_assets.main([str(self.site)])

    def test_verifies_real_expected_files_including_audio_and_hashes(self):
        requested = []
        def read(relative):
            requested.append(relative)
            return (self.site / relative).read_bytes()
        result = verify_live.verify(self.site, "https://example.test/site/", read)
        self.assertGreater(result["verified_public_files"], 10)
        self.assertIn("audio/pu4.ogg", requested)
        self.assertIn("version.json", requested)

    def test_detects_stale_or_corrupt_public_bytes(self):
        def read(relative):
            return b"stale" if relative == "index.html" else (self.site / relative).read_bytes()
        with self.assertRaisesRegex(ValueError, "index.html"):
            verify_live.verify(self.site, "https://example.test/site/", read)

    def test_missing_public_asset_identifies_the_requested_path(self):
        def read(relative):
            if relative == "index.html":
                raise OSError("HTTP 404")
            return (self.site / relative).read_bytes()
        with self.assertRaisesRegex(ValueError, "Cannot read live asset index.html: HTTP 404"):
            verify_live.verify(self.site, "https://example.test/site/", read)

    def test_requires_https(self):
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            verify_live.verify(self.site, "http://example.test/site/")


class FetchRetryTests(unittest.TestCase):

    def test_fetch_with_retry_recovers_from_transient_503(self):
        import io
        import urllib.error
        import verify_live
        calls = []

        class Response(io.BytesIO):
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def opener(request, timeout):
            calls.append(request)
            if len(calls) < 3:
                raise urllib.error.HTTPError("u", 503, "Service Unavailable", None, None)
            return Response(b"ok")

        slept = []
        assert verify_live.fetch_with_retry("u", sleep=slept.append, opener=opener) == b"ok"
        assert slept == [1, 2]


    def test_fetch_with_retry_does_not_retry_404(self):
        import urllib.error
        import verify_live
        calls = []

        def opener(request, timeout):
            calls.append(1)
            raise urllib.error.HTTPError("u", 404, "Not Found", None, None)

        try:
            verify_live.fetch_with_retry("u", sleep=lambda s: None, opener=opener)
        except urllib.error.HTTPError:
            pass
        assert calls == [1]
