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


if __name__ == "__main__":
    unittest.main()
