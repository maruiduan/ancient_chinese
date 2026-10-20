import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import build_shiji as b  # noqa: E402


def rows(trad, simp):
    return [b.tokens_for(trad, simp)]


class ReadingPositionTest(unittest.TestCase):
    def run_rule(self, rule, trad="王徒好其言。", simp="王徒好其言。"):
        sents = rows(trad, simp)
        b.AUTOPOS.clear()
        b.apply_readings({"id": "t"}, sents, {"defaults": [], "readings": [rule]})
        return sents[0]

    def test_off_by_one_is_corrected(self):
        toks = self.run_rule({"ctx": "王徒好其言", "at": 3, "py": "hào"})
        self.assertEqual(toks[2]["py"], "hào")
        self.assertEqual(len(b.AUTOPOS), 1)

    def test_traditional_context_matches(self):
        toks = self.run_rule({"ctx": "鄉者", "at": 0, "py": "xiàng", "loan": "向"},
                             trad="鄉者疑之。", simp="乡者疑之。")
        self.assertEqual(toks[0]["py"], "xiàng")

    def test_unplaceable_still_fails(self):
        with self.assertRaises(SystemExit):
            self.run_rule({"ctx": "王徒好其言", "at": 0, "py": "shuì"})


if __name__ == "__main__":
    unittest.main()
