import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class FontSliceCoverage(unittest.TestCase):
    def test_every_character_has_a_font_slice(self):
        run = subprocess.run([sys.executable, str(ROOT / "scripts/font_slices.py")], capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)


if __name__ == "__main__":
    unittest.main()
