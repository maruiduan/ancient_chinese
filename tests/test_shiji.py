import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_shiji  # noqa: E402


class ShijiTests(unittest.TestCase):
    def test_catalog_lists_all_130(self):
        data = json.loads((ROOT / "data" / "shiji.json").read_text(encoding="utf-8"))
        juans = [item["juan"] for vol in data["volumes"] for item in vol["entries"]]
        self.assertEqual(juans, list(range(1, 131)))
        done = {art["id"] for vol in data["volumes"] for art in vol["articles"]}
        self.assertEqual(done, {build_shiji.article_id(j) for j in build_shiji.DONE})
        for vol in data["volumes"]:
            for item in vol["entries"]:
                self.assertTrue(item.get("id") or item.get("note") == "待添加")

    def test_articles_match_source_and_translations(self):
        for entry in build_shiji.load_entries():
            art = json.loads((ROOT / "data" / "articles" / f"{entry['id']}.json").read_text(encoding="utf-8"))
            sents = [s for p in art["paragraphs"] for s in p["sentences"]]
            self.assertEqual(len(sents), build_shiji.sentence_count(entry))
            text = "".join(t["s"] for s in sents for t in s["tokens"])
            self.assertNotIn("□", text)
            self.assertNotIn("索隐", text)
            for s in sents:
                self.assertTrue(s["tr"].strip())
                self.assertNotEqual(s["tr"], "".join(t["s"] for t in s["tokens"]))

    def test_fitted_readings_are_applied(self):
        art = json.loads((ROOT / "data" / "articles" / "s007.json").read_text(encoding="utf-8"))
        toks = [t for p in art["paragraphs"] for s in p["sentences"] for t in s["tokens"]]
        text = "".join(t["s"] for t in toks)
        at = text.index("沛公欲王关中") + 3
        self.assertEqual((toks[at]["s"], toks[at]["py"], toks[at]["level"]), ("王", "wàng", "sentence"))
        at = text.index("玉玦")
        self.assertEqual(toks[at + 1]["s"], "玦")

    def test_xiangyu_proofreading(self):
        art = json.loads((ROOT / "data" / "articles" / "s007.json").read_text(encoding="utf-8"))
        gaodi = json.loads((ROOT / "data" / "articles" / "s008.json").read_text(encoding="utf-8"))
        toks = [t for p in art["paragraphs"] for s in p["sentences"] for t in s["tokens"]]
        text = "".join(t["s"] for t in toks)

        def at(phrase, offset, source=text, tokens=toks):
            return tokens[source.index(phrase) + offset]

        def tr(needle):
            for para in art["paragraphs"]:
                for sent in para["sentences"]:
                    if needle in "".join(t["s"] for t in sent["tokens"]):
                        return sent["tr"]
            self.fail(needle)

        self.assertIn("背过脸", tr("马童面之"))
        self.assertNotIn("面对着", tr("马童面之"))
        self.assertIn("车右", tr("参乘樊哙"))
        self.assertIn("戏下解散", tr("罢戏下"))
        self.assertNotIn("撤兵", tr("罢戏下"))
        self.assertIn("经不住", tr("不胜桮杓"))
        self.assertNotIn("酒量不大", tr("不胜桮杓"))
        self.assertIn("大泽中", tr("起大泽中"))
        self.assertNotIn("大泽乡", tr("起大泽中"))
        self.assertIn("河名", tr("污水上"))

        self.assertEqual(at("戏西", 0)["py"], "xī")
        self.assertEqual(at("戏下", 0)["py"], "xī")
        self.assertEqual(at("会稽", 0)["py"], "kuài")
        self.assertEqual(at("从百余骑", 0)["py"], "zòng")
        self.assertEqual(at("从百余骑", 3)["py"], "jì")
        self.assertEqual(at("沈船", 0)["py"], "chén")
        self.assertEqual(at("不胜桮杓", 1)["py"], "shēng")
        self.assertEqual(at("不可胜计", 2)["py"], "shēng")
        self.assertEqual(at("如恐不胜", 3)["py"], "shēng")
        self.assertEqual(at("不可不语", 3)["py"], "yù")
        self.assertEqual(at("说我", 0)["py"], "shuì")
        self.assertEqual(at("见粮", 0)["py"], "xiàn")
        self.assertEqual(at("以为乐", 2)["py"], "yuè")
        self.assertEqual(at("度三户", 0)["py"], "dù")
        self.assertEqual(at("扛鼎", 0)["py"], "gāng")
        self.assertIn("通背", at("倍德", 0)["ctx"])
        self.assertIn("通早", at("蚤自", 0)["ctx"])
        self.assertIn("通毫", at("秋豪", 1)["ctx"])
        self.assertIn("通座", at("于坐", 1)["ctx"])
        self.assertIn("通拒", at("距关", 0)["ctx"])
        self.assertIn("语气", at("何辞为", 2)["ctx"])
        self.assertIn("尚且", at("死且不", 1)["ctx"])
        self.assertIn("将要", at("且为所", 0)["ctx"])
        self.assertIn("被动", at("为所虏", 0)["ctx"])
        self.assertIn("原因", at("所以遣", 0)["ctx"])
        self.assertIn("背过脸", at("面之", 0)["ctx"])
        self.assertEqual(at("独骑", 1)["py"], "qí")
        self.assertEqual(at("上马骑", 2)["py"], "jì")

        start = 0
        while True:
            i = text.find("涉间", start)
            if i < 0:
                break
            self.assertTrue(toks[i + 1]["ctx"].startswith("人名涉间"))
            self.assertNotIn("之间义", toks[i + 1]["ctx"])
            start = i + 1
        start = 0
        while True:
            i = text.find("田间", start)
            if i < 0:
                break
            self.assertTrue(toks[i + 1]["ctx"].startswith("人名田间"))
            start = i + 1
        for tok in toks:
            if tok["s"] == "还" and not tok.get("punct"):
                self.assertEqual(tok["py"], "huán")
            if tok["s"] == "骑" and not tok.get("punct"):
                self.assertEqual(tok["level"], "sentence")
                self.assertIn(tok["py"], ("jì", "qí"))

        loans = [item["word"] for item in art["lesson"]["phoneticLoans"]]
        words = [item["word"] for item in art["lesson"]["keyFunctionWords"]]
        content = [item["word"] for item in art["lesson"]["keyContentWords"]]
        self.assertIn("面", loans)
        self.assertIn("所以", words)
        self.assertIn("且为所虏", words)
        self.assertIn("参乘", content)

        gtoks = [t for p in gaodi["paragraphs"] for s in p["sentences"] for t in s["tokens"]]
        gtext = "".join(t["s"] for t in gtoks)
        self.assertEqual(at("至戏", 1, gtext, gtoks)["py"], "xī")
        self.assertEqual(at("戏下", 0, gtext, gtoks)["py"], "xī")
        self.assertEqual(at("从百余骑", 0, gtext, gtoks)["py"], "zòng")
        self.assertEqual(at("从百余骑", 3, gtext, gtoks)["py"], "jì")


if __name__ == "__main__":
    unittest.main()
