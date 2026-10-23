import json, sys, unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from common_reading import common_py


class CommonReadingTest(unittest.TestCase):
    def test_common_over_shuowen(self):
        for ch, sw, want in [("不", "fǒu", "bù"), ("便", "pián", "biàn"), ("數", "shǔ", "shù"),
                             ("間", "jiàn", "jiān"), ("縣", "xuán", "xiàn"), ("屬", "zhǔ", "shǔ"),
                             ("爲", "wèi", "wéi"), ("曰", "yuè", "yuē")]:
            self.assertEqual(common_py(ch, sw), want, ch)

    def test_dict_has_no_rare_defaults(self):
        chars = json.loads((ROOT / "data" / "dict.json").read_text(encoding="utf-8"))["chars"]
        for ch, want in {"不": "bù", "燕": "yān", "便": "biàn", "數": "shù"}.items():
            if ch in chars:
                self.assertEqual(chars[ch]["py"], want, ch)
