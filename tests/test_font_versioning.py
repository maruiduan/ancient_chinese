import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import stamp_assets  # noqa: E402


class FontVersioningTest(unittest.TestCase):
    def test_css_points_at_hashed_fonts_and_rerun_is_stable(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "css/fonts/xcz").mkdir(parents=True)
            font = root / "css/fonts/xcz/a.woff2"
            font.write_bytes(b"font-bytes")
            css = root / "css/app.css"
            css.write_text('@font-face{src:url(fonts/xcz/a.woff2) format("woff2")}', encoding="utf-8")
            expected = f"url(fonts/xcz/a.{stamp_assets.digest(b'font-bytes')}.woff2)"
            for _ in range(2):
                stamp_assets.version_font_urls(root)
                self.assertIn(expected, css.read_text(encoding="utf-8"))
            font.write_bytes(b"changed")
            stamp_assets.reset_tree(root)
            stamp_assets.version_font_urls(root)
            self.assertIn(f"url(fonts/xcz/a.{stamp_assets.digest(b'changed')}.woff2)", css.read_text(encoding="utf-8"))

    def test_preload_follows_only_the_hashed_first_screen_slice(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "css/fonts/xcz").mkdir(parents=True)
            (root / "js").mkdir()
            (root / "css/fonts/xcz/serif-400-00.woff2").write_bytes(b"ascii")
            (root / "css/fonts/xcz/serif-400-01.woff2").write_bytes(b"cjk-slice")
            (root / "css/app.css").write_text(
                '@font-face{font-display:swap;src:url(fonts/xcz/serif-400-00.woff2)}'
                '@font-face{font-display:swap;src:url(fonts/xcz/serif-400-01.woff2)}',
                encoding="utf-8")
            (root / "js/app.js").write_text("void 0;")
            (root / "js/asset-urls.js").write_text("")
            (root / "favicon.svg").write_text("<svg/>")
            (root / "index.html").write_text(
                '<html data-build="">'
                '<link rel="preload" href="css/fonts/xcz/serif-400-01.woff2" as="font" type="font/woff2" crossorigin />'
                '<link href="favicon.svg"><link href="css/app.css">'
                '<script src="js/asset-urls.js"></script><script src="js/app.js"></script></html>',
                encoding="utf-8")
            self.assertEqual(stamp_assets.main([str(root)]), 0)
            index = (root / "index.html").read_text(encoding="utf-8")
            hrefs = re.findall(r'rel="preload"[^>]*href="([^"]+)"', index)
            expected = stamp_assets.hashed_path(
                "css/fonts/xcz/serif-400-01.woff2", stamp_assets.digest(b"cjk-slice"))
            self.assertEqual(hrefs, [expected])
            self.assertNotIn("serif-400-00", index)
            self.assertEqual(index.count('rel="preload"'), 1)
            self.assertIn("crossorigin", index)
            self.assertIn(Path(expected).name, (root / "css/app.css").read_text(encoding="utf-8"))
            self.assertTrue((root / expected).is_file())
            self.assertEqual(stamp_assets.main([str(root)]), 0)
            self.assertEqual((root / "index.html").read_text(encoding="utf-8"), index)


if __name__ == "__main__":
    unittest.main()
